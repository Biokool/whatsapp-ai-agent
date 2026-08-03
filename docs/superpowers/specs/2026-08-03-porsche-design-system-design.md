# Design — Sistema de Estilos Porsche DS v4 (Tokens + Tailwind)

Fecha: 2026-08-03
Estado: Aprobado (3 secciones validadas por el humano)

## Contexto

El WhatsApp AI Agent Kit (Biokool) necesita un sistema de estilos completo basado en el
[Porsche Design System v4](https://designsystem.porsche.com/v4/), con dos temas
(claro/oscuro) funcionales. El estado actual es: Tailwind 4 (v4.3.3) + shadcn/ui (7 archivos
dead code), paleta `navy-*`/`ai-green-*` hardcodeada solo-oscuro, sin ningún mecanismo de
tema, tipografía Google Fonts (Inter/Geist), iconos Material Symbols.

## Decisiones (aprobadas por el humano)

1. **Enfoque**: tokens + Tailwind. Replicar la paleta, tipografía, radios, sombras, spacing y
   foco de Porsche DS como CSS variables en `globals.css` con `light-dark()`. Mantener la
   arquitectura actual de componentes. Sin dependencia del CDN de Porsche.
2. **Tipografía**: fuente libre similar a Porsche Next (Archivo), self-hosted con `next/font`.
3. **Control de tema**: toggle manual + sistema (claro / oscuro / seguir sistema),
   persistido en localStorage.
4. **Mecanismo de tema**: script inline anti-FOUC en `<head>` + CSS `light-dark()` + clases
   `.scheme-*` (patrón Porsche). Sin dependencias nuevas.
5. **Colores de marca**: base neutra Porsche + `ai-green`/`human-blue` conservados como
   acentos semánticos para modo IA/HUMANO, burbujas, badges y CTA.
6. **Iconos**: migrar Material Symbols → lucide-react (ya instalado).
7. **Alcance**: base completa + restyling de todos los componentes de feature + shadcn/ui
   adaptados a Porsche (funcionales).

## Tokens de color (light-dark)

| Rol             | Claro                       | Oscuro                        |
| --------------- | --------------------------- | ----------------------------- |
| `canvas`        | `#FFFFFF`                   | `hsl(225 66.7% 1.2%)`         |
| `surface`       | `hsl(240 10% 95%)`          | `hsl(240 2% 10%)`             |
| `surface-hover` | `hsl(240 5% 70% / 0.148)`   | `hsl(240 2% 43% / 0.228)`     |
| `surface-shade` | `hsl(234 9.8% 60% / 0.06)`  | `hsl(240 3.7% 26.5% / 0.154)` |
| `primary`       | `hsl(225 66.7% 1.2%)`       | `hsl(225 100% 99%)`           |
| `text-subtle`   | `hsl(240 7.1% 11% / 0.7)`   | `hsl(240 12.5% 96.9% / 0.67)` |
| `text-faint`    | `hsl(240 6.1% 7% / 0.6)`    | `hsl(240 12.5% 96.9% / 0.56)` |
| `border`        | `hsl(240 5.3% 14.9% / 0.5)` | `hsl(240 12.5% 96.9% / 0.45)` |
| `focus`         | `#1A44EA`                   | `#1A44EA`                     |
| `backdrop`      | `hsl(240 5.3% 14.9% / 0.5)` | `hsl(240 5.3% 14.9% / 0.5)`   |

Semánticos (info/success/warning/error), cada familia con 5 pasos:
base, `-medium` (0.6α), `-low` (0.18α), `-frosted`, `-frosted-soft`.

| Familia   | Light (base)           | Dark (base)            |
| --------- | ---------------------- | ---------------------- |
| `info`    | `hsl(228 83.2% 51%)`   | `hsl(210 100% 54.5%)`  |
| `success` | `hsl(115 77.5% 27.8%)` | `hsl(157 84.9% 41.6%)` |
| `warning` | `hsl(28 97.7% 34.1%)`  | `hsl(28 90.2% 56.1%)`  |
| `error`   | `hsl(357 78% 41%)`     | `hsl(0 96.9% 62%)`     |

Acentos de marca (con variante por tema):

| Rol                   | Claro     | Oscuro    |
| --------------------- | --------- | --------- |
| `ai-green`            | `#0d9e6e` | `#10b981` |
| `ai-green-contrast`   | `#FFFFFF` | `#031427` |
| `human-blue`          | `#3131c0` | `#6d7dff` |
| `human-blue-contrast` | `#FFFFFF` | `#0b1c30` |

## Tipografía

- Fuente: **Archivo** (sans geométrica libre, próxima a Porsche Next), self-hosted `next/font`.
- Pesos: 400 / 600 / 700.
- Escala fluida Porsche (replicada):
  - `2xs: 0.75rem` · `xs: 0.875rem` · `sm: 1rem` (estáticas)
  - `md: clamp(1.13rem, 0.21vw + 1.08rem, 1.33rem)`
  - `lg: clamp(1.27rem, 0.51vw + 1.16rem, 1.78rem)`
  - `xl: clamp(1.42rem, 0.94vw + 1.23rem, 2.37rem)`
  - `2xl: clamp(1.6rem, 1.56vw + 1.29rem, 3.16rem)`
  - `3xl: clamp(1.8rem, 2.41vw + 1.32rem, 4.21rem)`
- Line-height base: `calc(6px + 2.125ex)`.

## Radios, sombras, foco, spacing, motion

- Radios: `sm 4px`, `md 8px`, `lg 12px` (controles default), `xl 16px` (notificaciones),
  `2xl 24px` (tiles/modal), `full` (píldora).
- Sombras: `sm 0 3px 8px rgba(0,0,0,.16)`, `md 0 4px 16px`, `lg 0 8px 40px`.
- Foco: `outline: 2px solid #1A44EA` + `outline-offset: 2px`, solo `:focus-visible`.
- Spacing estática: 1/4/8/16/32/48/80px. Fluida: `clamp()` por paso.
- Motion: `0.25s`/`0.4s`/`0.6s`, easing `cubic-bezier(0.25,0.1,0.25,1)`.

## Mecanismo de tema

- Script inline en `<head>` (anti-FOUC): lee `localStorage`, aplica
  `.scheme-light`/`.scheme-dark`/`.scheme-light-dark` a `<html>`.
- Colores resueltos con `light-dark()` nativo + clases `.scheme-*` (patrón Porsche).
- `html { color-scheme: light dark }` por defecto.
- Componente `ThemeToggle` (lucide `Sun`/`Moon`/`Monitor`) en el header del dashboard.

## Sistema de componentes

### Botones (ui/button.tsx)

- Variantes: `default` (primary: bg `primary`, texto `canvas`, hover `contrast-high`),
  `secondary` (bg `frosted-strong`, texto `primary`, hover `frosted`, blur),
  `ghost` (sin fondo, hover `frosted-strong`), `destructive` (bg `error`),
  `link` (solo texto, subrayado hover).
- Tamaños: `default` h56 padding-x28 radio12 · `sm` h36 px16 radio8 ·
  `icon` h56 píldora · `icon-sm` h36 píldora.
- Disabled `opacity-40`; foco `#1A44EA` offset 2; transiciones 0.25s.

### Inputs y formularios

- Input/Textarea/Select: h56 (36 compact), radio12 (8 compact), bg `frosted`,
  borde `contrast-lower` → hover `primary`; error → borde `error` + mensaje debajo.
- Checkbox/Radio: caja 28px (18 compact), checked fondo `primary`, check `canvas`.
- Switch: track 48×28, knob 20, checked `success`.
- Labels arriba, required = asterisco rojo; validación al blur; single-column.

### Notificaciones

- Toast: abajo-izquierda, auto 6s, radio16, fondo `*-frosted` + blur, sombra `lg`.
- Inline notification: junto al contenido, radio16, icono + acción + dismiss.
- Banner: arriba-centro para errores/warnings críticos.

### Badge / Tag (píldora)

- Variantes `secondary`/`primary`/`success`/`error`/`info`/`warning` + versión `-frosted`.
- Alto ~24px, padding 4px 12px, texto `xs`, radio píldora.

### Card, Dialog, Tabs, Dropdown

- Card: radio24, `surface`/`canvas`, borde `contrast-low`.
- Dialog: radio24, overlay `backdrop` 50% + blur, fondo `canvas`.
- Tabs: con fondo `surface` (radio8) o sin fondo (radio12); activo `frosted-strong`.
- Dropdown: fondo `canvas`, radio12, sombra `drop-shadow`.

## Migración de componentes (mapeo token viejo → nuevo)

| Token actual                      | Nuevo                                       |
| --------------------------------- | ------------------------------------------- |
| `bg-navy-950`                     | `bg-canvas`                                 |
| `bg-navy-900/800`                 | `bg-surface`                                |
| `bg-navy-700/600`                 | `bg-surface-hover` / `bg-surface-shade`     |
| `border-navy-500`                 | `border-border`                             |
| `text-navy-200`                   | `text-primary`                              |
| `text-navy-300/400`               | `text-text-subtle` / `text-text-faint`      |
| `bg-ai-green`                     | `bg-ai-green` (acento marca por tema)       |
| `bg-human-blue`                   | `bg-human-blue`                             |
| `bg-red-dark/20`+`text-red-alert` | `bg-error-low`+`text-error`                 |
| `bg-amber-warm`                   | `bg-warning`                                |
| `ai-glow`, scrollbars             | sombras/foco Porsche + scrollbar con tokens |

Componentes de feature a migrar (orden): Sidebar → DashboardHeader → Dashboard →
ConversationList → ConversationPanel → MessageBubble → ModeToggle → QRScreen/ConnectionGate
→ N8nSettings → KnowledgeSection → KnowledgeBaseCard → DocumentList → UploadZone →
DocsSidebar → MarkdownRenderer. Además layout.tsx (script tema + fuentes + body) y los 7
shadcn/ui actualizados y funcionales.

## Verificación

- `npm run typecheck` — 0 errores.
- Suite de tests completa verde.
- Revisión visual claro/oscuro de todos los componentes.
