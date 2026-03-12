# Google Sign-In Setup

The Sign in with Google buttons on `/login` and `/signup` use **Supabase Auth** with the Google provider. Configure the following:

## 1. Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers** → **Google**
3. Enable Google and enter:
   - **Client ID:** `228507567723-k911m65qu005r6f73gesubonno3561g2.apps.googleusercontent.com`
   - **Client Secret:** (from your `client_secret_*.json` file, `web.client_secret`)

## 2. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Credentials
2. Open your OAuth 2.0 Client ID (Web application)
3. **Authorized redirect URIs** – add exactly (no trailing slash, no path):
   - `https://pfrpliybqegikexwuokl.supabase.co/auth/v1/callback`
4. **Authorized JavaScript origins** – add each separately (no trailing slash, no path, no whitespace):
   - `https://ordrmoor.netlify.app`
   - `https://linkxtr.netlify.app`
   - `http://localhost:5173`

**Common mistakes:** Do NOT add a trailing `/`, do NOT include a path (e.g. `/login`), and ensure there is no extra space or newline when pasting.

## Notes

- **Login:** Existing users with `tenant_slug` in metadata will be redirected to the admin dashboard.
- **Signup:** If the Google user already has a tenant, they go to admin. New Google users are prompted to use the email form to create a restaurant.
