// REQ-PLT-002 / ADR-005 — Auth.js session-cookie auth, Google only, one workspace domain.
//
// No database adapter: sessions are JWTs. That is deliberate — the middleware runs on the edge
// runtime and a Postgres adapter cannot, and the app has no per-user data model yet (one dev org,
// resolved by name — REQ-PLT-001). When users become first-class, an adapter goes here and the
// middleware moves to the split-config pattern.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedSignIn } from "@avd/plt/access";
import { config as appConfig } from "@avd/shared/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // A HINT that pre-filters the account chooser. It is not the gate — the client can drop
          // it — so `signIn` below re-checks the domain against the verified claim.
          hd: appConfig.platform.allowedEmailDomain,
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: { signIn: "/signin", error: "/signin" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    signIn({ profile }) {
      return isAllowedSignIn({ email: profile?.email, emailVerified: profile?.email_verified });
    },
  },
  trustHost: true, // behind the Kamal proxy; AUTH_URL pins the canonical origin
});
