"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DriverActiveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/driver");
  }, [router]);

  return null;
}
