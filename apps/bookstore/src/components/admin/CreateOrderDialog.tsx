import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createManualOrder, CreateManualOrderInput } from '@/services/user';
import { useToast } from '@/hooks/use-toast'
import { X, Plus } from 'lucide-react'

interface OrderForm {
  userId: string
  bookId: string
  price: string
  paymentReference: string
  status: string
}

const CreateOrderDialog = ({
  onOrderCreated,
}: {
  onOrderCreated?: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<OrderForm[]>([
    { userId: '', bookId: '', price: '', paymentReference: '', status: '' },
  ])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation<unknown, unknown, CreateManualOrderInput>({
    mutationFn: createManualOrder,
    onSuccess: () => {
      toast({ title: 'Order created successfully' })
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to create order',
        description: err?.response?.data?.error || err.message,
        variant: 'destructive',
      })
    },
  })

  const addOrderForm = () => {
    setOrders([...orders, { userId: '', bookId: '', price: '', paymentReference: '', status: '' }])
  }

  const removeOrderForm = (index: number) => {
    setOrders(orders.filter((_, i) => i !== index))
  }

  const updateOrder = (index: number, field: keyof OrderForm, value: string) => {
    const newOrders = [...orders]
    newOrders[index][field] = value
    setOrders(newOrders)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validOrders = orders.filter((order) => order.userId && order.bookId && order.price)
    
    if (validOrders.length === 0) {
      toast({
        title: 'No valid orders',
        description: 'At least one order must have userId, bookId, and price',
        variant: 'destructive',
      })
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const order of validOrders) {
      try {
        await mutation.mutateAsync({
          userId: Number(order.userId),
          bookId: Number(order.bookId),
          price: Number(order.price),
          paymentReference: order.paymentReference || undefined,
          status: order.status || undefined,
        })
        successCount++
      } catch {
        errorCount++
      }
    }

    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    
    if (errorCount === 0) {
      toast({ title: `✅ Successfully created ${successCount} order(s)` })
      setOpen(false)
      setOrders([{ userId: '', bookId: '', price: '', paymentReference: '', status: '' }])
      onOrderCreated?.()
    } else {
      toast({
        title: `⚠️ Partial success`,
        description: `${successCount} created, ${errorCount} failed`,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Orders</DialogTitle>
          <DialogDescription>
            Create one or multiple orders for failed transactions. Fill in at least userId, bookId, and price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {orders.map((order, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 relative">
                <div className="absolute top-2 right-2">
                  {orders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOrderForm(index)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="User ID"
                    value={order.userId}
                    onChange={(e) => updateOrder(index, 'userId', e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="Book ID"
                    value={order.bookId}
                    onChange={(e) => updateOrder(index, 'bookId', e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="Price"
                    value={order.price}
                    onChange={(e) => updateOrder(index, 'price', e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                  <Input
                    placeholder="Payment Reference (optional)"
                    value={order.paymentReference}
                    onChange={(e) => updateOrder(index, 'paymentReference', e.target.value)}
                  />
                  <Input
                    placeholder="Status (optional)"
                    value={order.status}
                    onChange={(e) => updateOrder(index, 'status', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOrderForm}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Order
          </Button>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Create {orders.length > 1 ? `${orders.length} Orders` : 'Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateOrderDialog
