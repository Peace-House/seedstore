import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    metadata: {
      user_id: string;
      cart_items: string[];
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'initialize') {
      const { amount, email, userId, cartItems } = await req.json();

      console.log('Initializing Paystack payment:', { amount, email, userId });

      // Initialize payment with Paystack
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Convert to kobo (smallest currency unit)
          metadata: {
            user_id: userId,
            cart_items: cartItems,
          },
          callback_url: `${url.origin}/checkout/success`,
        }),
      });

      const data = await response.json() as PaystackInitializeResponse;

      if (!data.status) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      console.log('Payment initialized successfully:', data.data.reference);

      return new Response(
        JSON.stringify({
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const reference = url.searchParams.get('reference');
      if (!reference) {
        throw new Error('Payment reference is required');
      }

      console.log('Verifying payment:', reference);

      // Verify payment with Paystack
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        }
      );

      const data = await response.json() as PaystackVerifyResponse;

      if (!data.status || data.data.status !== 'success') {
        throw new Error('Payment verification failed');
      }

      console.log('Payment verified successfully');

      const { user_id, cart_items } = data.data.metadata;
      const amount = data.data.amount / 100; // Convert from kobo to main currency

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id,
          total_amount: amount,
          status: 'completed',
          stripe_payment_intent_id: reference, // Reusing this column for Paystack reference
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Get cart items details
      const { data: cartItemsData, error: cartError } = await supabase
        .from('cart_items')
        .select('book_id, books(price)')
        .in('id', cart_items)
        .eq('user_id', user_id);

      if (cartError) throw cartError;

      // Create order items
      const orderItems = cartItemsData.map((item: any) => ({
        order_id: order.id,
        book_id: item.book_id,
        price: item.books.price,
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (orderItemsError) throw orderItemsError;

      // Clear user's cart
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user_id);

      if (deleteError) throw deleteError;

      console.log('Order created successfully:', order.id);

      return new Response(
        JSON.stringify({ success: true, order_id: order.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action. Use ?action=initialize or ?action=verify');
  } catch (error) {
    console.error('Error processing payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
