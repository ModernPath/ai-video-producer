// REQ-STB-037: the script studio is now the workspace's Script panel — one page for the whole film
// (USER 2026-07-25: "I need to navigate between the screens… script view changes them, but I cant
// control easily the music etc on editor"). This route stays alive so old links/bookmarks land right.
import { redirect } from "next/navigation";

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/p/${id}`);
}
