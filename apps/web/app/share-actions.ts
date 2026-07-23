"use server";

// REQ-ASM-007 / INV-ASM-005 — create a share link for a succeeded export and land on
// the public page. The exports-list Share button is wired by the integrator.
import { redirect } from "next/navigation";
import { createShareLink } from "@avd/asm";
import { db } from "../lib/db";

export async function shareExportAction(formData: FormData) {
  const exportJobId = String(formData.get("exportJobId") ?? "");
  if (!exportJobId) return;
  const link = await createShareLink(db(), { exportJobId }); // conflict-throws unless succeeded
  redirect(`/s/${link.token}`);
}
