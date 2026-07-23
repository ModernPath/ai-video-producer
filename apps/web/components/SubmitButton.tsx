"use client";
// Fixes BACKLOG item: double-submits + silent pre-hydration clicks — pending state
// disables the button while the server action runs.
import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

export function SubmitButton({
  children, primary, disabled, small, pendingLabel, name, value, title, style: styleOverride, className,
}: {
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
  small?: boolean;
  pendingLabel?: string;
  name?: string; // submitted only when THIS button triggers the form
  value?: string;
  title?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const style: CSSProperties = {
    background: primary ? "var(--accent)" : "#1e232d",
    border: `1px solid ${primary ? "var(--accent)" : "var(--line)"}`,
    color: primary ? "#12151b" : "var(--ink)",
    borderRadius: 7,
    padding: small ? "3px 9px" : "6px 12px",
    fontSize: small ? 11 : 12,
    fontWeight: 600,
    cursor: pending || disabled ? "default" : "pointer",
    opacity: pending || disabled ? 0.55 : 1,
    ...styleOverride,
  };
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      style={style}
      {...(name !== undefined ? { name } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(title !== undefined ? { title } : {})}
      {...(className !== undefined ? { className } : {})}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
