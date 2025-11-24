import React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';

const Footer: React.FC = () => (
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
        <h3 className="text-lg font-bold mb-2">Contact Info</h3>
        <p className="text-sm mb-1">123 Faith Avenue, Hope City, Country</p>
        <p className="text-sm mb-1">Email: contact@livingseed.org</p>
      </div>
      {/* Newsletter */}
      <div>
        <h3 className="text-lg font-bold mb-2">Newsletter</h3>
        <p className="text-sm mb-2">Sign up for our weekly newsletter to stay updated on all news and events. Email updates on Living Journals, Gleanings and Programs</p>
        <form className="flex flex-col gap-2">
          <Input type="email" placeholder="Your email address" className="px-3 py-2 border-primary rounded-full bg-transparent text-primary placeholder:text-primary" />
          <Button variant='default' type="submit" className=" rounded-full transition">Subscribe</Button>
        </form>
      </div>
    </div>
    <div className="container mx-auto text-center text-sm text-primary mt-8">
      &copy; {new Date().getFullYear()} Livingseed Community. All rights reserved.
    </div>
  </footer>
);

export default Footer;
