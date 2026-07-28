// REQ-PLT-002 — who am I, and how do I leave. Renders nothing when there is no session, so the
// sign-in screen and share links stay chrome-free.
import { auth, signOut } from "../auth";

export async function UserChip() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  return (
    <div
      className="mono"
      style={{ position: "fixed", top: 10, right: 14, zIndex: 50, display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}
    >
      <span className="muted">{email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button type="submit" className="mono" style={{ fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>
          sign out
        </button>
      </form>
    </div>
  );
}
