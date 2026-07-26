"use client";

import { useQuery } from "@tanstack/react-query";
import type { ConnectionPayload } from "@/core/types";

async function fetchConnectionStatus(): Promise<ConnectionPayload> {
  const res = await fetch("/api/connection/status", { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export function useConnection() {
  return useQuery({
    queryKey: ["connection", "status"],
    queryFn: fetchConnectionStatus,
    refetchInterval: (query) => {
      // Stop polling when connected
      return query.state.data?.status === "connected" ? false : 2000;
    },
    retry: 3,
    retryDelay: 1000,
  });
}
