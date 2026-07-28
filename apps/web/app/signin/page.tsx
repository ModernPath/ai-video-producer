// REQ-PLT-002 — the sign-in screen. One provider, one domain, no email/password to phish.
import { config } from "@avd/shared/config";
import { signIn } from "../../auth";

export const dynamic = "force-dynamic";

/** Auth.js sends users back here with ?error=… ; AccessDenied is our own domain gate firing. */
const MESSAGES: Record<string, string> = {
  AccessDenied: `That account is not on ${config.platform.allowedEmailDomain}. Sign in with your work account.`,
  Verification: "That sign-in link has expired. Try again.",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "18vh 24px" }}>
      <p className="mono muted" style={{ fontSize: 12 }}>ai video producer</p>
      <h1 className="disp" style={{ fontSize: 30, marginTop: 6 }}>Sign in</h1>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Restricted to {config.platform.allowedEmailDomain} accounts.
      </p>

      {message && (
        <p
          role="alert"
          className="mono"
          style={{ marginTop: 20, padding: "10px 12px", fontSize: 12, lineHeight: 1.5, border: "1px solid var(--accent)", borderRadius: 6 }}
        >
          {message}
        </p>
      )}

      <form
        style={{ marginTop: 28 }}
        action={async () => {
          "use server";
          // `redirectTo` is validated by Auth.js against the app origin — a caller cannot use the
          // callbackUrl query param to bounce a signed-in user off-site.
          await signIn("google", { redirectTo: callbackUrl ?? "/" });
        }}
      >
        <button type="submit" style={{ width: "100%", padding: "12px 16px", fontSize: 14, cursor: "pointer" }}>
          Continue with Google
        </button>
      </form>
    </main>
  );
}
