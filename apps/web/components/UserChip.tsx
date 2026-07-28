// REQ-PLT-002 — who am I, and how do I leave. Renders nothing when there is no session, so the
// sign-in screen and public share links stay chrome-free.
//
// Deliberately NOT positioned. It shipped as a `position: fixed` overlay in the top-right corner and
// landed on top of the workspace command bar, which owns that corner (USER 2026-07-28). A floating
// element cannot know what it is covering; every surface that HAS chrome places this inside it, and
// the two that do not put it in their own header line.
import { auth, signOut } from "../auth";

export async function UserChip() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, whiteSpace: "nowrap" }}>
      <span className="muted">{email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button
          type="submit"
          className="mono"
          title="Sign out"
          style={{
            fontSize: 11, padding: "4px 9px", cursor: "pointer", borderRadius: 7,
            background: "var(--panel-2)", color: "var(--ink)", border: "1px solid var(--line)",
          }}
        >
          sign out
        </button>
      </form>
    </span>
  );
}
