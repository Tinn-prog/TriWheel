import { ReactNode } from "react";
import { DriverLocationSyncBridge } from "./DriverLocationSyncBridge";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DriverLocationSyncBridge />
      {children}
    </>
  );
}
