import { createClient } from "@supabase/supabase-js";

// Used only for the password reset flow. Every other backend interaction
// goes through api/client.ts -> FastAPI.
//
// flowType is "implicit", not "pkce", deliberately: PKCE requires the same
// browser that requested the reset to also redeem the link, via a code
// verifier stored in that browser's local storage. In practice, users often
// click the emailed link from their phone's mail app (a different browser/
// webview than whatever they used to request the reset), which breaks that
// requirement -- the exchange silently never happens because the verifier
// doesn't exist there. Implicit flow puts the token directly in the URL
// instead, so it works regardless of which browser/device opens the link.
// Trade-off: the access token is briefly visible in the URL/browser history,
// which PKCE avoids -- acceptable here since this is a short-lived,
// single-use recovery token, not a long-lived session.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  },
);