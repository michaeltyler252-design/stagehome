"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthToken(): { token: string | null; ready: boolean } {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("accessToken");
    if (!stored) {
      router.push("/sign-in");
      return;
    }
    setToken(stored);
    setReady(true);
  }, [router]);

  return { token, ready };
}
