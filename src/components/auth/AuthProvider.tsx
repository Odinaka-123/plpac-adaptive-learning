"use client";

import { useEffect } from "react";
import { initAuthListener } from "@/lib/authListener";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}