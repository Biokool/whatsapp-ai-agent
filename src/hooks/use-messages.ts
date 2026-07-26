"use client";

import { useQuery } from "@tanstack/react-query";
import type { Message } from "@/core/types";

async function fetchMessages(conversationId: number): Promise<Message[]> {
  const res = await fetch(`/api/messages/${conversationId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  return data.messages;
}

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}
