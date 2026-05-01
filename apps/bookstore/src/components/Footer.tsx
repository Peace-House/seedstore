import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { subscribeToNewsletter } from '@/services/newsletter'
import { sendSupportMessage } from '@/services/support'

const Footer: React.FC = () => {
  const [email, setEmail] = useState('')
  const [support, setSupport] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const subscribeMutation = useMutation({
    mutationFn: subscribeToNewsletter,
    onSuccess: (data) => {
      toast.success(data.message)
      setEmail('')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(
        error?.response?.data?.error ||
          'Failed to subscribe. Please try again.',
      )
    },
  })

  const supportMutation = useMutation({
    mutationFn: sendSupportMessage,
    onSuccess: (data) => {
      toast.success(data.message)
      setSupport({ name: '', email: '', subject: '', message: '' })
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(
        error?.response?.data?.error ||
          'Failed to send message. Please try again.',
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    subscribeMutation.mutate(email)
  }

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !support.name.trim() ||
      !support.email.trim() ||
      !support.subject.trim() ||
      !support.message.trim()
    ) {
      toast.error('Please fill in all fields')
      return
    }
    supportMutation.mutate(support)
  }

  return (
    <footer className="text-primary  from-primary/40 via-primary/20 mt-24 w-full bg-gradient-to-t to-transparent py-10">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-4">
        <div>
          {/* About Section */}
          <div>
            <h3 className="mb-2 text-lg font-bold">About Livingseed</h3>
            <p className="mb-4 text-sm">
              We are a community of people loving each other and our Lord. Be
              completely humble and gentle, be patient, bearing with one another
              in love.
            </p>
          </div>
          {/* Contact Info */}
          <div>
            <h3 className="mb-2 text-lg font-bold">Contact</h3>
            <a
              href="https://www.google.com/maps/search/?api=1&query=19+Gyado+Hospital+Road+Gboko+Benue+State+Nigeria"
              target="_blank"
              rel="noopener noreferrer"
              className="group mb-1 flex items-start gap-1 text-sm hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 h-4 w-4 flex-shrink-0 group-hover:text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>
                19, Gyado Hospital Road, Box 971, Gboko, Benue State, Nigeria
              </span>
            </a>
            <p className="mb-1 mt-2 text-sm">
              Email:{' '}
              <a href="mailto:info@livingseed.org" className="hover:underline">
                info@livingseed.org
              </a>
            </p>
          </div>
        </div>
        {/* Quicklinks */}
        <div className="md:text-center">
          <h3 className="mb-2 text-lg font-bold">Quicklinks</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://livingseed.org/about-us/"
                className="hover:underline"
              >
                About us
              </a>
            </li>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="http://registration.livingsseed.org/"
                className="hover:underline"
              >
                Registration
              </a>
            </li>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://blog.livingseed.org/"
                className="hover:underline"
              >
                Our Blog
              </a>
            </li>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://livingseed.org/event"
                className="hover:underline"
              >
                Upcoming Programs
              </a>
            </li>
            <li>
              <Link to="/resolve-purchase" className="hover:underline">
                Resolve book purchase issue
              </Link>
            </li>
          </ul>
        </div>
        {/* Request Support */}
        <div>
          <h3 className="mb-2 text-lg font-bold">Request Support</h3>
          <form onSubmit={handleSupportSubmit} className="flex flex-col gap-2">
            <Input
              type="text"
              placeholder="Your name"
              value={support.name}
              onChange={(e) =>
                setSupport((s) => ({ ...s, name: e.target.value }))
              }
              className="border-primary text-primary placeholder:text-primary rounded-full bg-transparent px-3 py-2"
              disabled={supportMutation.isPending}
            />
            <Input
              type="email"
              placeholder="Your email"
              value={support.email}
              onChange={(e) =>
                setSupport((s) => ({ ...s, email: e.target.value }))
              }
              className="border-primary text-primary placeholder:text-primary rounded-full bg-transparent px-3 py-2"
              disabled={supportMutation.isPending}
            />
            <Input
              type="text"
              placeholder="Subject"
              value={support.subject}
              onChange={(e) =>
                setSupport((s) => ({ ...s, subject: e.target.value }))
              }
              className="border-primary text-primary placeholder:text-primary rounded-full bg-transparent px-3 py-2"
              disabled={supportMutation.isPending}
            />
            <textarea
              placeholder="Your message"
              value={support.message}
              onChange={(e) =>
                setSupport((s) => ({ ...s, message: e.target.value }))
              }
              rows={4}
              className="border-primary text-primary placeholder:text-primary rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-current disabled:opacity-50"
              disabled={supportMutation.isPending}
            />
            <Button
              variant="default"
              type="submit"
              className="rounded-full transition"
              disabled={supportMutation.isPending}
            >
              {supportMutation.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
        {/* Newsletter */}
        <div>
          <h3 className="mb-2 text-lg font-bold">Newsletter</h3>
          <p className="mb-2 text-sm">
            Sign up for our weekly newsletter to stay updated on all news and
            events. Email updates on Living Journals, Gleanings and Programs
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-primary text-primary placeholder:text-primary rounded-full bg-transparent px-3 py-2"
              disabled={subscribeMutation.isPending}
            />
            <Button
              variant="default"
              type="submit"
              className="rounded-full transition"
              disabled={subscribeMutation.isPending || !email.trim()}
            >
              {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </div>
      <div className="text-primary container mx-auto mt-8 text-center text-sm">
        &copy; {new Date().getFullYear()} Livingseed Community. All rights
        reserved.
      </div>
    </footer>
  )
}

export default Footer
