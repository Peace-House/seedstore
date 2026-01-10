# Livingseed Bookstore - User Walkthrough Guide

> A presentation guide for showcasing the Livingseed digital bookstore platform

---

## 🏠 1. Homepage Experience

### First Impressions
When users land on the homepage, they're greeted with:

- **Hero Section**: A welcoming headline "Discover Your Next Favorite Read" with a gradient accent
- **Call-to-Action**: 
  - New visitors see "Get Started" and "Browse Library" buttons
  - Logged-in users see a "Most read" horizontal scrollable book carousel
- **Navigation Bar**: Clean, minimal navigation with access to all sections

### Book Discovery
- **Featured Books**: Special highlighted books for logged-in users
- **All Books Section**: Complete catalog with book cards showing:
  - Cover image
  - Title and author
  - Price in user's local currency
  - Quick "Add to Cart" action

---

## 🔐 2. Authentication

### Sign Up Flow
1. Click "Get Started" on the homepage
2. Fill in registration details:
   - First Name & Last Name
   - Email address
   - PHCode (optional - for existing Livingseed members)
   - Phone Number
   - Country of Residence (defaults to Nigeria)
   - State (for Nigerian users)
   - Password (minimum 6 characters)
3. Receive email verification
4. Click verification link to activate account

### Login Options
Users can log in using either:
- **Email + Password**: Standard authentication
- **PHCode + Password**: For existing Livingseed members with a PHCode identifier

### Password Recovery
1. Click "Forgot Password?" on login page
2. Enter registered email address
3. Receive 6-digit OTP via email
4. Enter OTP code (15-minute validity with countdown timer)
5. Set new password
6. Automatically logged in upon success

---

## 📚 3. Book Browsing & Search

### Browse the Catalog
- **Grid/List View Toggle**: Switch between grid layout and list layout
- **Search Bar**: Real-time search by:
  - Book title
  - Author name
  - Category
- **Category Filters**: Browse books by genre/category
- **Price Filtering**: Set minimum and maximum price range

### Book Details Page
Click any book to view:
- **Large Cover Image**: High-quality book cover
- **Book Information**:
  - Title and Author
  - Description/Synopsis
  - Published Date
  - Format (ePub, PDF)
  - Page Count
  - ISBN
- **Pricing**: Displayed in user's local currency
- **Actions**:
  - "Add to Cart" - for purchase
  - "Read Now" - if already purchased (opens reader)
  - "Add to Library" - for free books

### Related Books
- Automatically shows similar books based on category/author
- Easy navigation to explore more content

---

## 🛒 4. Shopping Cart

### Adding to Cart
- Click "Add to Cart" from book card or detail page
- Toast notification confirms addition
- Cart icon in navbar shows item count

### Cart Page Features
- **Item List**: All books in cart with:
  - Cover thumbnail
  - Title and author
  - Price
  - Remove button (trash icon)
- **Order Summary**:
  - Subtotal calculation
  - Total in local currency
- **Actions**:
  - "Continue Shopping" - return to browse
  - "Proceed to Checkout" - start payment

---

## 💳 5. Checkout & Payment

### Checkout Flow
1. Review order summary
2. Select payment method:

#### Paystack (Card Payment)
- Accepts Visa, Mastercard, Verve
- Secure redirect to Paystack payment page
- Instant confirmation

#### MTN Mobile Money
- Enter MTN phone number
- Approve payment on mobile device
- Status polling with real-time updates

### Payment Confirmation
- Success: Redirected to payment callback page
- Books automatically added to library
- Email receipt sent

---

## 📖 6. My Library

### Accessing Purchased Books
- Click "Library" in navigation (logged-in users only)
- View all purchased and free books

### Library Features
- **Visual Bookshelf**: Books displayed on virtual wooden shelves
- **Drag & Drop Reordering**: 
  - Hold the grip icon on any book
  - Drag to new position
  - Order persists across sessions
- **Book Actions**:
  - Click "Read Now" to open in reader
  - See progress indicator if partially read

### Reading Progress
- Each book shows reading progress percentage
- Continue reading from where you left off

---

## 📱 7. The Reader Experience

### Opening a Book
- Click "Read Now" from Library or Book Detail page
- Opens in dedicated full-screen reader

### Reader Features
- **Page Navigation**: Swipe or use arrow keys
- **Progress Tracking**: Automatically saves your position
- **Bookmarks**: Mark pages for quick return
- **Highlights**: Select text to highlight
- **Search**: Find text within the book
- **Font Settings**: Adjust size and style
- **Theme**: Light/Dark mode toggle

---

## ⚙️ 8. Account Settings

### Profile Management
- **Personal Info**: Update first name, last name, phone number
- **Email**: View registered email (read-only)

### Connected Devices
- View all devices where you're logged in
- See device details:
  - Device type (Mobile, Desktop, Laptop)
  - Browser/Platform
  - Last active time
  - IP address/Location
- Remove devices you don't recognize

### Notification Preferences
Toggle settings for:
- Email notifications
- Order updates
- Promotional messages
- New book releases
- Login alerts

### Change Password
- Enter current password
- Set new password
- Confirm new password
- Immediate update

### Logout
- Sign out from current device
- Option to sign out from all devices

---

## 🌍 9. Multi-Currency Support

### Automatic Detection
- Country detected on first visit
- Prices displayed in local currency

### Currency Display
- **Nigerian Users**: NGN (₦)
- **Ghanaian Users**: GHS (GH₵)
- **US Users**: USD ($)
- And more...

### Pricing
- Each book has localized pricing
- Checkout reflects selected currency
- Payment processed in local currency

---

## 📱 10. Mobile Experience

### Responsive Design
- Full functionality on all screen sizes
- Touch-optimized interfaces
- Swipe gestures in reader

### Mobile Navigation
- Hamburger menu for compact navigation
- Bottom navigation bar for quick access
- Mobile-optimized checkout flow

---

## 🔒 11. Security Features

### Account Protection
- Secure password hashing
- Session management
- Login alerts to email
- Device tracking

### Payment Security
- PCI-compliant payment processors
- No card details stored locally
- Encrypted transactions

---

## 📞 Support & Help

### Getting Help
- Footer links to contact information
- Email support available
- Help documentation

---

## Quick Demo Script

### 5-Minute Demo Flow

1. **Homepage Tour** (1 min)
   - Show hero section
   - Scroll to book catalog
   - Point out pricing and layout

2. **Authentication** (1 min)
   - Show sign-up form
   - Demonstrate PHCode login option
   - Mention email verification

3. **Book Purchase Flow** (2 min)
   - Click on a book
   - Show detail page
   - Add to cart
   - Show cart summary
   - Explain payment options

4. **Library & Reader** (1 min)
   - Open library
   - Show drag-and-drop reordering
   - Open a book in reader
   - Demonstrate navigation

### Key Talking Points

✅ **Convenience**: Access books anywhere, anytime  
✅ **Local Currency**: Pay in your currency  
✅ **Multiple Payment Options**: Cards and Mobile Money  
✅ **Offline Reading**: Downloaded books available offline  
✅ **Progress Sync**: Never lose your place  
✅ **Secure**: Enterprise-grade security  

---

## Screenshots Reference

For the presentation, capture screenshots of:

1. Homepage hero section
2. Book catalog grid
3. Book detail page
4. Shopping cart
5. Checkout with payment options
6. Library bookshelf view
7. Reader with a book open
8. Settings page
9. Mobile view of homepage
10. Mobile reader view

---

*Document Version: 1.0*  
*Last Updated: January 2025*
