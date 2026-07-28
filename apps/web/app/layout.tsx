import type { Metadata } from "next";
import type { ReactNode } from "react";
import { UserChip } from "../components/UserChip";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Video Director",
  description: "Idea → script → storyboard → generated shots → finished video.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserChip />
        {children}
      </body>
    </html>
  );
}
