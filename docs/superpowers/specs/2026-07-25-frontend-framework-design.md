# Frontend Framework Design Spec — Phase 02 Enhancement

**Date:** 2026-07-25
**Phase:** 02 — Contracts + Configuration (Frontend Enhancement)
**Status:** DRAFT — Awaiting Review

---

## 1. Executive Summary

Enhance the existing Next.js 16 + React 19 dashboard with professional UI components and state management. The current dashboard is a functional "Lead Monitor" with 11 custom components. This design adds:

- **shadcn/ui** — Copy-paste UI components (Radix UI + Tailwind)
- **TanStack Query** — Server state management (caching, polling, mutations)
- **TanStack Table** — Headless data tables
- **Recharts** — React-native charts
- **React Hook Form + Zod** — Form validation

**Key Decision:** Stay with Next.js + React. Baileys runs in a separate process — no conflicts with any frontend framework.

---

## 2. Architecture Overview

### 2.1 Current Architecture

```
Browser (React 19)
    ↓ (polling every 2s)
Next.js API Routes (Node.js)
    ↓ (SQLite)
Baileys Bot Process (separate)
    ↓ (WebSocket)
WhatsApp
```

### 2.2 Enhanced Architecture

```
Browser (React 19 + shadcn/ui)
    ↓ (TanStack Query — polling, caching, mutations)
Next.js API Routes (Node.js)
    ↓ (SQLite / PostgreSQL in future)
Baileys Bot Process (separate)
    ↓ (WebSocket)
WhatsApp
```

### 2.3 Component Architecture (SOLID)

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers)
│   ├── page.tsx                  # "/" → ConnectionGate
│   ├── dashboard/                # Dashboard routes (future)
│   │   ├── page.tsx              # Main dashboard
│   │   ├── analytics/page.tsx    # Analytics tab
│   │   ├── funnel/page.tsx       # Funnel/CRM tab
│   │   └── settings/page.tsx     # Settings tab
│   ├── docs/page.tsx             # Documentation viewer
│   └── api/                      # API routes (existing)
├── components/
│   ├── ui/                       # shadcn/ui components (copy-paste)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── toast.tsx
│   │   └── ... (add as needed)
│   ├── features/                 # Feature-specific components
│   │   ├── connection/
│   │   │   ├── ConnectionGate.tsx
│   │   │   └── QRScreen.tsx
│   │   ├── conversations/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ConversationPanel.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── ModeToggle.tsx
│   │   ├── analytics/
│   │   │   ├── MetricsCards.tsx
│   │   │   ├── ConversationChart.tsx
│   │   │   └── ResponseTimeChart.tsx
│   │   ├── funnel/
│   │   │   ├── LeadBoard.tsx
│   │   │   └── LeadCard.tsx
│   │   └── layout/
│   │       ├── DashboardHeader.tsx
│   │       ├── Sidebar.tsx
│   │       └── MobileNav.tsx
│   └── shared/                   # Shared components
│       ├── DocsSidebar.tsx
│       └── MarkdownRenderer.tsx
├── hooks/                        # Custom React hooks
│   ├── use-conversations.ts      # TanStack Query: conversations
│   ├── use-messages.ts           # TanStack Query: messages
│   ├── use-connection.ts         # TanStack Query: connection status
│   ├── use-mode.ts               # TanStack Query: mode toggle
│   └── use-debounce.ts           # Utility hook
├── lib/                          # Utilities
│   ├── query-client.ts           # TanStack Query client config
│   ├── validations.ts            # Zod schemas
│   └── utils.ts                  # shadcn/ui utility (cn)
├── core/                         # Domain types (Phase 02)
│   └── types/
│       ├── conversation.ts
│       ├── message.ts
│       └── connection.ts
└── config/
    └── environment.ts            # Environment validation
```

---

## 3. Component Design (SOLID Principles)

### 3.1 Single Responsibility — Each Component Has One Job

| Component | Responsibility | Does NOT |
|-----------|---------------|----------|
| `ConnectionGate` | Gate based on connection status | Fetch data, render dashboard |
| `QRScreen` | Display QR code | Handle connection logic |
| `ConversationList` | List conversations, handle selection | Display messages, send messages |
| `ConversationPanel` | Display messages, send input | List conversations, manage connection |
| `MessageBubble` | Render single message | Manage conversation state |
| `ModeToggle` | Switch AI/Human mode | Display messages |
| `MetricsCards` | Display summary metrics | Fetch data (uses hook) |
| `ConversationChart` | Render chart | Fetch data (uses hook) |

### 3.2 Open/Closed — Extend Without Modification

```tsx
// Example: MessageBubble is open for extension
// Add new message types without modifying existing code

// types/message.ts
type MessageRole = "user" | "assistant" | "human" | "system";

// MessageBubble.tsx — handles all roles via props
<MessageBubble role={message.role} content={message.content} />

// To add a new role (e.g., "tool"), extend the type and add styling
// No existing code changes needed
```

### 3.3 Interface Segregation — Small, Composable Interfaces

```tsx
// Each component has a minimal, focused interface

// ConversationList only needs what it displays
interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// MessageBubble only needs what it renders
interface MessageBubbleProps {
  role: "user" | "assistant" | "human";
  content: string;
  timestamp: string;
}
```

### 3.4 Dependency Inversion — Abstractions Over Implementations

```tsx
// hooks/use-conversations.ts — abstracts data fetching
// Component doesn't know WHERE data comes from (API, WebSocket, mock)

function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/conversations").then(r => r.json()),
    refetchInterval: 2000, // Polling
  });
}

// Component uses the hook, not the API directly
function ConversationList() {
  const { data, isLoading, error } = useConversations();
  // ... render
}
```

---

## 4. State Management Design (TanStack Query)

### 4.1 Query Keys

```typescript
// Organized query keys for cache management
const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    detail: (id: string) => ["conversations", id] as const,
  },
  messages: {
    all: (conversationId: string) => ["messages", conversationId] as const,
  },
  connection: {
    status: ["connection", "status"] as const,
  },
  health: {
    status: ["health"] as const,
  },
} as const;
```

### 4.2 Query Hooks

```typescript
// use-conversations.ts
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: fetchConversations,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

// use-messages.ts
export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.all(conversationId!),
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
    refetchInterval: 2000,
  });
}

// use-connection.ts
export function useConnection() {
  return useQuery({
    queryKey: queryKeys.connection.status,
    queryFn: fetchConnectionStatus,
    refetchInterval: (query) => {
      // Stop polling when connected
      return query.state.data?.status === "connected" ? false : 2000;
    },
  });
}
```

### 4.3 Mutations

```typescript
// use-mode.ts
export function useModeToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, mode }: { conversationId: string; mode: string }) =>
      fetch(`/api/mode/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      }).then(r => r.json()),

    // Optimistic update
    onMutate: async ({ conversationId, mode }) => {
      await queryClient.cancelQueries(queryKeys.conversations.all);
      const previous = queryClient.getQueryData(queryKeys.conversations.all);
      queryClient.setQueryData(queryKeys.conversations.all, (old: any) =>
        old?.map((c: any) =>
          c.id === conversationId ? { ...c, mode } : c
        )
      );
      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKeys.conversations.all, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries(queryKeys.conversations.all);
    },
  });
}
```

---

## 5. Data Table Design (TanStack Table)

### 5.1 Analytics Table Example

```tsx
// features/analytics/ConversationTable.tsx
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

const columns = [
  { accessorKey: "name", header: "Nombre" },
  { accessorKey: "phone", header: "Teléfono" },
  { accessorKey: "messageCount", header: "Mensajes" },
  { accessorKey: "lastActivity", header: "Última Actividad" },
  { accessorKey: "mode", header: "Modo" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <Badge variant={row.original.status === "active" ? "default" : "secondary"} />,
  },
];

export function ConversationTable({ data }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 6. Form Design (React Hook Form + Zod)

### 6.1 Settings Form Example

```tsx
// features/settings/SettingsForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const settingsSchema = z.object({
  businessName: z.string().min(1, "Nombre requerido"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Teléfono inválido"),
  welcomeMessage: z.string().min(10, "Mínimo 10 caracteres"),
  maxResponseTime: z.number().min(1).max(300),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export function SettingsForm() {
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: "Biokool",
      phone: "+5215664436277",
      welcomeMessage: "¡Hola! Bienvenido a Biokool...",
      maxResponseTime: 30,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField control={form.control} name="businessName" render={({ field }) => (
        <FormItem>
          <FormLabel>Nombre del Negocio</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      {/* ... more fields */}
      <Button type="submit">Guardar</Button>
    </form>
  );
}
```

---

## 7. Migration Plan (Incremental)

### Phase 2A: Foundation (No Breaking Changes)

| Step | Action | Files |
|------|--------|-------|
| 1 | Install shadcn/ui CLI | `npx shadcn@latest init` |
| 2 | Add base components | `button`, `card`, `input`, `badge`, `table` |
| 3 | Add TanStack Query provider | `src/app/layout.tsx`, `src/lib/query-client.ts` |
| 4 | Create first query hook | `src/hooks/use-connection.ts` |
| 5 | Refactor ConnectionGate to use hook | `src/components/ConnectionGate.tsx` |
| 6 | Verify connection flow works | Manual test |

### Phase 2B: Refactor Existing Components

| Step | Action | Files |
|------|--------|-------|
| 1 | Refactor ConversationList | Use `useConversations` hook |
| 2 | Refactor ConversationPanel | Use `useMessages` hook |
| 3 | Refactor ModeToggle | Use `useModeToggle` mutation |
| 4 | Refactor DashboardHeader | Use `useConnection` hook |
| 5 | Refactor QRScreen | Use `useConnection` hook |
| 6 | Move components to `features/` | Reorganize directory |
| 7 | Verify all functionality works | Manual test |

### Phase 2C: Add New Features

| Step | Action | Files |
|------|--------|-------|
| 1 | Add Analytics page | `src/app/dashboard/analytics/page.tsx` |
| 2 | Add Funnel/CRM page | `src/app/dashboard/funnel/page.tsx` |
| 3 | Add Settings page | `src/app/dashboard/settings/page.tsx` |
| 4 | Add TanStack Table | Conversation table |
| 5 | Add Recharts | Metrics charts |
| 6 | Add React Hook Form | Settings form |
| 7 | Verify all new features | Manual test |

---

## 8. SOLID Principles Compliance

| Principle | Implementation | Verification |
|-----------|---------------|--------------|
| **Single Responsibility** | Each component has ONE job. Each hook has ONE concern. | Code review: no component does multiple things |
| **Open/Closed** | New message types = extend type + add styling. No existing code changes. | Add a test message type without modifying MessageBubble |
| **Liskov Substitution** | All UI components follow shadcn/ui patterns. Can swap Button variants freely. | Replace `variant="default"` with `variant="destructive"` — works |
| **Interface Segregation** | Each component has minimal props. No "god props" object. | TypeScript errors if you pass unnecessary props |
| **Dependency Inversion** | Components use hooks, not fetch() directly. Hooks abstract data source. | Mock the hook in tests — component still works |

---

## 9. Anti-Patterns Avoided

| Anti-Pattern | How We Avoid It |
|--------------|-----------------|
| Overengineering | Add components only when needed (YAGNI) |
| Premature optimization | TanStack Query handles caching automatically |
| Duplicated logic | Shared hooks, shared UI components |
| Monolithic workflows | Each feature is independent (conversations, analytics, funnel) |
| Hardcoded configuration | Environment variables via `src/config/environment.ts` |
| Hidden dependencies | Explicit imports, clear component boundaries |

---

## 10. Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "react-hook-form": "^7.0.0",
    "@hookform/resolvers": "^3.0.0",
    "recharts": "^2.0.0",
    "zod": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  }
}
```

**Note:** shadcn/ui components are copy-paste, not npm packages. They use the above utilities.

---

## 11. Rollback Strategy

If the enhancement causes issues:

1. **Git revert** — All changes are in git, revert to previous commit
2. **Incremental adoption** — Each phase is independent, can stop at any point
3. **No database changes** — Frontend-only, no data migration needed
4. **No API changes** — Backend stays the same, only frontend consumes it differently

---

## 12. Success Criteria

- [ ] All existing functionality works (connection, conversations, messages, mode toggle)
- [ ] Components are in `features/` directory with clear boundaries
- [ ] TanStack Query handles all data fetching (no raw `fetch()` in components)
- [ ] All forms have Zod validation
- [ ] Analytics page shows charts and tables
- [ ] Funnel/CRM page shows lead board
- [ ] Settings page has validated form
- [ ] Mobile responsive (bottom nav, safe areas)
- [ ] No TypeScript errors
- [ ] No console errors in browser

---

**Generated by:** AI-BOS Phase 02 — Contracts + Configuration (Frontend Enhancement)
**Date:** 2026-07-25
**Status:** DRAFT — Awaiting Review
