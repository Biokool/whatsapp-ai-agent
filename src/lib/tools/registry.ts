// src/lib/tools/registry.ts
import { z } from "zod";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutorDeps,
  ToolSpec,
} from "@/core/types/tool";
import type { CalendarProvider } from "@/lib/calendar/types";
import type { ToolDefinition } from "./index";
import { runTool } from "./executor";
import { dataToolSpecs } from "./data-tools";
import { calendarToolSpecs } from "./calendar-tools";
import { transferToHumanSpec } from "./transfer-to-human";

export function buildToolDefinition(spec: ToolSpec): ToolDefinition {
  return {
    type: "function",
    function: {
      name: spec.name,
      description: spec.description,
      parameters: z.toJSONSchema(spec.inputSchema) as ToolDefinition["function"]["parameters"],
    },
  };
}

export class ToolRegistry {
  private readonly specs = new Map<string, ToolSpec>();

  constructor(initial: ToolSpec[] = []) {
    for (const spec of initial) this.specs.set(spec.name, spec);
  }

  register(spec: ToolSpec): void {
    this.specs.set(spec.name, spec);
  }

  definitions(): ToolDefinition[] {
    return [...this.specs.values()].map(buildToolDefinition);
  }

  async run(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
    deps: ToolExecutorDeps = {}
  ): Promise<ToolExecutionResult> {
    const spec = this.specs.get(name);
    if (!spec) {
      return { status: "FAILURE", ok: false, error: `Tool desconocida: ${name}` };
    }
    return runTool(spec, args, ctx, deps);
  }
}

export function buildRegistry(calendar: CalendarProvider): ToolRegistry {
  const registry = new ToolRegistry();
  for (const spec of dataToolSpecs) registry.register(spec);
  for (const spec of calendarToolSpecs(calendar)) registry.register(spec);
  registry.register(transferToHumanSpec);
  return registry;
}
