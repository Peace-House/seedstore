
# Bookstore & Reader Monorepo

This repository contains two main apps:

- **Bookstore**: A Vite-based React app for browsing, searching, and purchasing eBooks.
- **Reader**: A Next.js app for reading ePub books with advanced features like highlights and annotations.

---

## Features

**Bookstore**
- Browse and search eBooks
- Add to cart and purchase
- Download free books

**Reader**
- Read ePub books in the browser
- Highlight, annotate, and search within books
- Custom themes and typography

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io/installation)
- [Git](https://git-scm.com/downloads)

### Clone the repo
```bash
git clone <your-repo-url>
cd <repo-folder>
```

### Install dependencies
```bash
pnpm install
```

### Setup environment variables
Copy `.env.local.example` to `.env.local` in each app (`apps/bookstore`, `apps/reader`) and fill in the required values.

### Run locally
```bash
pnpm --filter @flow/bookstore dev   # Start the Bookstore (Vite)
pnpm --filter @flow/reader dev      # Start the Reader (Next.js)
```

Or run both with:
```bash
pnpm dev
```

---

## Deployment

Deploy each app separately (e.g., Vercel, Netlify, Docker). Set environment variables for cross-app navigation (e.g., READER_URL in Bookstore, STORE_URL in Reader).

---

## Contributing

Pull requests and issues are welcome!

---

## Credits

- [Epub.js](https://github.com/futurepress/epub.js/)
- [React](https://github.com/facebook/react)
- [Next.js](https://nextjs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org)
