# Deploying Both Apps to Vercel with Redirects

This guide explains how to deploy both the `reader` and `website` apps in this monorepo to Vercel, including setting up Vercel redirects for seamless navigation between them.

---

## Prerequisites
- Vercel account ([vercel.com](https://vercel.com/))
- Access to this repository (GitHub, GitLab, or Bitbucket)
- Vercel CLI (optional, for local testing): `npm i -g vercel`

---

## 1. Prepare Your Apps

Both `apps/reader` and `apps/website` are Next.js apps. Ensure they build and run locally:

```sh
pnpm install
pnpm --filter @flow/reader build
pnpm --filter @flow/website build
```

---

## 2. Connect the Monorepo to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **New Project**.
2. Import your repository.
3. Vercel will detect the monorepo and prompt you to set up each app as a separate project.

### For Each App:
- **Project Name:** Use `reader` and `website` for clarity.
- **Root Directory:**
  - For Reader: `apps/reader`
  - For Website: `apps/website`
- **Build Command:** `pnpm build`
- **Install Command:** `pnpm install`
- **Output Directory:** `.next`
- **Environment Variables:** Copy from your local `.env.local` files if needed.

---

## 3. Configure Redirects (Vercel Routing)

To redirect between apps (e.g., `/read` on the website goes to the reader app):

### Option 1: Vercel Project-Level Redirects

1. In the `apps/website` project, add a `vercel.json` file:

```json
{
  "redirects": [
    {
      "source": "/read/:path*",
      "destination": "https://reader-your-vercel-domain.vercel.app/:path*",
      "permanent": false
    }
  ]
}
```

- Replace `reader-your-vercel-domain` with your actual Vercel reader app domain.
- Commit and push this file.

### Option 2: Next.js Redirects (in `next.config.js`)

In `apps/website/next.config.js`:

```js
module.exports = {
  async redirects() {
    return [
      {
        source: '/read/:path*',
        destination: 'https://reader-your-vercel-domain.vercel.app/:path*',
        permanent: false,
      },
    ]
  },
}
```

---

## 4. Deploy

- Push your changes to the main branch.
- Vercel will automatically build and deploy both apps.
- Visit your Vercel dashboard to see deployment status and domains.

---

## 5. Test Redirects

- Go to your website app domain and visit `/read` (e.g., `https://website-your-vercel-domain.vercel.app/read`).
- You should be redirected to the reader app.

---

## 6. (Optional) Custom Domains

- Assign custom domains to each app in the Vercel dashboard.
- Update the redirect destinations to use your custom domains if desired.

---

## Troubleshooting
- Check Vercel build logs for errors.
- Ensure all environment variables are set in the Vercel dashboard.
- For monorepo issues, see [Vercel Monorepos Guide](https://vercel.com/docs/projects/monorepos).

---

## References
- [Vercel Monorepos](https://vercel.com/docs/projects/monorepos)
- [Vercel Redirects](https://vercel.com/docs/edge-network/redirects)
- [Next.js Redirects](https://nextjs.org/docs/pages/api-reference/next-config-js/redirects)
