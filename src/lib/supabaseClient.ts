import { createClient } from "@supabase/supabase-js";

// Public, client-side config. The publishable ("anon") key is designed to be embedded
// in front-end apps and shipped in the bundle — it only grants what row-level security
// allows. NEVER put the sb_secret_… key here; it bypasses RLS and must stay server-side.
const SUPABASE_URL = "https://zzkzvjouljwiytkptoaf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kTQ6xt7boxYs0jz5wGsjKw_sY1IGVgK";

// Persist the (anonymous) session so a device keeps the same identity across reloads —
// that's what scopes saved games and occasions to this device via row-level security.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } },
});
