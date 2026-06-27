import { supabase } from "./supabaseClient";
import { captchaEnabled, getCaptchaToken } from "./captcha";

// Anonymous, per-device identity. The first time the app needs to persist anything it
// silently signs in anonymously; the session is stored and reused on later loads, giving
// this device a stable user id that row-level security scopes all data to.
// No login UI — completely transparent to the player.

let authPromise: Promise<string | null> | null = null;

export function ensureAuth(): Promise<string | null> {
  if (!authPromise) {
    authPromise = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session.user.id;

        // Supabase requires an hCaptcha token when captcha protection is on.
        const captchaToken = captchaEnabled ? await getCaptchaToken() : null;
        const { data: signIn, error } = await supabase.auth.signInAnonymously(
          captchaToken ? { options: { captchaToken } } : undefined,
        );
        if (error) {
          // Reset so a later call can retry (e.g. transient captcha/network failure).
          authPromise = null;
          return null;
        }
        return signIn.user?.id ?? null;
      } catch {
        authPromise = null;
        return null;
      }
    })();
  }
  return authPromise;
}
