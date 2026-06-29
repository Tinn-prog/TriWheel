"use client";

import { ReactNode } from "react";
import { AdminPageHeader } from "./adminUi";

export function AdminModuleShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <>
      <AdminPageHeader description={description} title={title} />
      {children}
    </>
  );
}

export { statusClass } from "./adminUi";
