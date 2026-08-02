import type { ToolProvider } from "@/core/types/agent";
import { toolDefinitions, executeTool } from "@/lib/tools";

export class DefaultToolProvider implements ToolProvider {
  list() {
    return toolDefinitions;
  }

  execute(
    name: string,
    args: Record<string, unknown>,
    context: { conversationId: string; tenantId: string }
  ): Promise<Record<string, unknown>> {
    return executeTool(name, args, { conversationId: context.conversationId });
  }
}
