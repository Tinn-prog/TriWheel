"use client";

import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function LogoutConfirmButton({
  className,
  label = "Logout",
  onConfirm,
}: {
  className?: string;
  label?: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        {label}
      </button>
      <ConfirmDialog
        cancelLabel="Stay signed in"
        confirmLabel="Logout"
        description="You will need to sign in again to access your dashboard."
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
        open={open}
        title="Log out of TriWheel?"
        tone="danger"
      />
    </>
  );
}
