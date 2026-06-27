// Invisible hCaptcha, used only to satisfy Supabase's captcha requirement on anonymous
// sign-in. We load hCaptcha's API on demand and execute an invisible widget to mint a
// token — no UI of our own, and it only runs the first time a device signs in (the
// session persists afterwards). Pure async so it composes with the auth bootstrap.

// Public hCaptcha SITE key (safe to embed). Pairs with the secret configured in Supabase.
// An empty value disables the captcha path (sign-in is attempted without a token).
const HCAPTCHA_SITE_KEY = "68241724-fc76-4b28-aa6a-b974bcacd85a";

const SCRIPT_SRC = "https://js.hcaptcha.com/1/api.js?render=explicit";

interface HCaptchaApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string, opts?: { async?: boolean }) => Promise<{ response: string }>;
  remove?: (id: string) => void;
}

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
  }
}

export const captchaEnabled = HCAPTCHA_SITE_KEY.length > 0;

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.hcaptcha) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("hCaptcha failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

/** Returns an hCaptcha token, or null if the captcha path is off or fails. */
export async function getCaptchaToken(): Promise<string | null> {
  if (!captchaEnabled) return null;
  try {
    await loadScript();
    if (!window.hcaptcha) return null;
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);
    const id = window.hcaptcha.render(container, {
      sitekey: HCAPTCHA_SITE_KEY,
      size: "invisible",
    });
    const { response } = await window.hcaptcha.execute(id, { async: true });
    window.hcaptcha.remove?.(id);
    container.remove();
    return response;
  } catch {
    return null;
  }
}
