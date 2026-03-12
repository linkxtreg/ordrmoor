import { supabase } from '/utils/supabase/client';

/** Initiate Google OAuth sign-in. Redirects to Google, then back to redirectPath. */
export async function signInWithGoogle(redirectPath: string = '/login'): Promise<void> {
  const redirectTo = `${window.location.origin}${redirectPath}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.href = data.url;
  }
}
