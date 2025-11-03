# Guide: Setting Up GitHub OAuth Redirect for Monorepo with Multiple Apps (Vercel)

This guide explains how to configure GitHub OAuth (or any OAuth provider) so that both your `reader` and `website` apps in a monorepo can handle authentication and redirects in a unified flow on Vercel.

---

## 1. Register Your OAuth App (GitHub Example)
- Go to https://github.com/settings/developers and create a new OAuth App.
- **Homepage URL:** Use your main domain (e.g., `https://yourdomain.com`)
- **Authorization callback URL:**
  - For monorepo, you can use a shared callback endpoint (e.g., `https://yourdomain.com/api/auth/callback/github`)
  - Or, if each app handles auth separately:
    - `https://reader-yourdomain.vercel.app/api/auth/callback/github`
    - `https://website-yourdomain.vercel.app/api/auth/callback/github`
- Save the Client ID and Client Secret.

---

## 2. Configure Environment Variables
Set these in the Vercel dashboard for each app (or in `.env.local` for local dev):

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=https://reader-yourdomain.vercel.app  # or website domain
```

If you want both apps to share the same OAuth app, use the same credentials in both.

---

## 3. Implement Redirect Logic

### Option 1: Shared Auth Flow (Recommended)
- Use a single app (e.g., `website`) to handle login and callback.
- After successful login, redirect the user to the correct app (e.g., `reader`) with a token or session.
- Pass the token via URL (e.g., `https://reader-yourdomain.vercel.app?auth_token=...`).
- The reader app should read the token from the URL and store it (as implemented).

### Option 2: Per-App Auth
- Each app has its own callback URL and handles its own session.
- Set the callback URL in GitHub for each app.

---

## 4. Vercel Redirects (Optional)
If you want `/read` on the website to redirect to the reader app:

**apps/website/vercel.json**
```json
{
  "redirects": [
    {
      "source": "/read/:path*",
      "destination": "https://reader-yourdomain.vercel.app/:path*",
      "permanent": false
    }
  ]
}
```

---

## 5. Example Auth Flow
1. User clicks "Login with GitHub" on the website.
2. After GitHub login, the callback endpoint issues a token and redirects to the reader app:
   - `https://reader-yourdomain.vercel.app?auth_token=...`
3. The reader app stores the token and uses it for API requests.

---

## 6. Security Notes
- Always use HTTPS in production.
- Never expose client secrets to the browser.
- Use secure cookies or localStorage for tokens.

---

## References
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Vercel Redirects](https://vercel.com/docs/edge-network/redirects)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
