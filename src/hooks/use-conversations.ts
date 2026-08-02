"use client";

import { useQuery } from "@tanstack/react-query";
import type { Conversation } from "@/core/types";

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/conversations", { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return data.conversations;
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return false;
      }
      return 5000;
    },
    staleTime: 3000,
  });
}
