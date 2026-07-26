"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/core/types";

async function toggleMode(conversationId: string, mode: "AI" | "HUMAN"): Promise<void> {
  const res = await fetch(`/api/mode/${conversationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
}

export function useModeToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, mode }: { conversationId: string; mode: "AI" | "HUMAN" }) =>
      toggleMode(conversationId, mode),

    // Optimistic update
    onMutate: async ({ conversationId, mode }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previous = queryClient.getQueryData<Conversation[]>(["conversations"]);

      queryClient.setQueryData<Conversation[]>(["conversations"], (old) =>
        old?.map((c) => (c.id === conversationId ? { ...c, mode } : c))
      );

      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["conversations"], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
