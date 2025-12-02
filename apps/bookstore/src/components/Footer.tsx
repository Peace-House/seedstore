import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { subscribeToNewsletter } from '@/services/newsletter';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const subscribeMutation = useMutation({
    mutationFn: subscribeToNewsletter,
    onSuccess: (data) => {
      toast.success(data.message);
      setEmail('');
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error?.response?.data?.error || 'Failed to subscribe. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    subscribeMutation.mutate(email);
  };

  return (
    <footer className="w-full  text-primary py-10 mt-24 from-primary/40 via-primary/20 to-transparent bg-gradient-to-t">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4">
        {/* About Section */}
        <div>
          <h3 className="text-lg font-bold mb-2">About Livingseed</h3>
          <p className="text-sm mb-4">
            We are a community of people loving each other and our Lord. Be completely humble and gentle, be patient, bearing with one another in love. We are a community Lord.
          </p>
        </div>
        {/* Quicklinks */}
        <div className='text-center'>
          <h3 className="text-lg font-bold mb-2">Quicklinks</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://livingseed.org/about-us/" className="hover:underline">About us</a></li>
            <li><a href="http://registration.livingsseed.org/" className="hover:underline">Registration</a></li>
            <li><a href="https://blog.livingseed.org/" className="hover:underline">Our Blog</a></li>
            <li><a href="https://livingseed.org/event" className="hover:underline">Upcoming Programs</a></li>
          </ul>
        </div>
          {/* Contact Info */}
          <div>
          <h3 className="text-lg font-bold mb-2">Contact</h3>
          <p className="text-sm mb-1">19, Gyado Hospital Road, Box 971, Gboko, Benue State, Nigeria</p>
          <p className="text-sm mb-1">Email: webmaster@livingseed.org</p>
        </div>
        {/* Newsletter */}
        <div>
          <h3 className="text-lg font-bold mb-2">Newsletter</h3>
          <p className="text-sm mb-2">Sign up for our weekly newsletter to stay updated on all news and events. Email updates on Living Journals, Gleanings and Programs</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 border-primary rounded-full bg-transparent text-primary placeholder:text-primary"
              disabled={subscribeMutation.isPending}
            />
            <Button
              variant='default'
              type="submit"
              className="rounded-full transition"
              disabled={subscribeMutation.isPending || !email.trim()}
            >
              {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </div>
      <div className="container mx-auto text-center text-sm text-primary mt-8">
        &copy; {new Date().getFullYear()} Livingseed Community. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
