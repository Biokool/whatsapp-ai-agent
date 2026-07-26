# Biokool WhatsApp AI Agent Kit

> Tu agente de WhatsApp con IA, listo para desplegar en una tarde — sin programar.

**Kit exclusivo para alumnos de Biokool.** Si eres parte de Biokool, estás en el sitio correcto. Cualquier duda, la resuelves en [biokool.mx](https://biokool.mx/).

---

## Qué hace este kit

Te entrega un **agente de IA conectado a WhatsApp** que:

- Recibe los mensajes que escriben a tu número de empresa
- Los responde automáticamente con un modelo de IA (GPT, Claude, Gemini... a elegir)
- Califica leads haciendo las preguntas que tú definas
- Guarda los leads en Google Sheets
- Agenda llamadas con Cal.com cuando el lead encaja
- Te avisa cuando tiene que derivar a humano

Todo corre en **tu ordenador** primero (para probar) y luego en **tu propio servidor 24/7** (Hostinger VPS + EasyPanel + Cloudflare Access).

---

## Lo que necesitas

| Requisito | Para qué | Coste |
|---|---|---|
| **Node.js 20+** | Motor del kit | Gratis |
| **VS Code** | Editor donde abres el kit | Gratis |
| **Claude Code** (recomendado) | El setup guiado se hace desde aquí | **Requiere suscripción Claude Pro/Max o API pay-per-use** (~$20/mes Pro) |
| **Cuenta OpenRouter** | El cerebro de IA del agente | Gratis + 5€ de saldo (suficiente para meses) |
| **VPS (opcional)** | Si quieres tenerlo 24/7 | 5,49-7,99 €/mes en Hostinger |
| **WhatsApp del negocio** | Un número, NO el personal | Gratis o 10€/mes una SIM aparte |

> **Nota Windows**: si trabajas en Windows, instala también [Git for Windows](https://git-scm.com/download/win) o [WSL2](https://learn.microsoft.com/es-es/windows/wsl/install). Claude Code necesita un shell con Bash.

---

## Cómo usarlo · 3 pasos

### Paso 1 · Instalar

Abre [EMPIEZA-AQUI.md](EMPIEZA-AQUI.md). 3 instrucciones en lenguaje humano. Si tienes Claude Code, escribe `/setup` y te lleva de la mano.

Si prefieres CLI: `npm install && npm run wizard`

### Paso 2 · Conectar tu WhatsApp

`/setup` (o `npm run wizard`) te lleva hasta el momento del QR. Lo escaneas desde el WhatsApp del negocio y listo.

> ⚠️ Usa un número de WhatsApp del **negocio** — el móvil queda vinculado al bot.

### Paso 3 · Personalizar a tu negocio

En Claude Code: `/personaliza`. Te hace 6 preguntas y deja el agente adaptado a TU caso. Sin tocar código.

¿Quieres un ejemplo? Mira `prompts/ejemplos/`:
- `agencia-ia.md` — servicios B2B (agencia)
- `ecommerce.md` — tienda online
- `infoproducto.md` — venta de cursos

---

## Cómo conversar con Claude Code dentro del kit

Una vez instalado, abre la carpeta en VS Code + Claude Code y escribe cualquiera de estas en lenguaje natural:

- *"empieza"* / *"qué hago"* → Claude te sugiere `/setup`
- *"personaliza el agente"* → Claude lanza `/personaliza`
- *"desplegar a producción"* → Claude lanza `/deploy`
- *"el bot no responde"* → Claude ejecuta `npm run doctor` y diagnostica
- *"quiero cambiar el modelo"* → Claude edita `.env.local`
- *"añade una tool que consulte stock"* → Claude crea una tool nueva por ti

---

## Preguntas frecuentes

**¿Funciona en Windows?**
Sí. Todo el kit es cross-platform Node.js. Probado en Mac y Windows.

**¿Necesito saber programar?**
No. El target es alguien que abre VS Code por primera vez. Claude Code se encarga del trabajo técnico.

**¿Es la API oficial de WhatsApp?**
NO. Es **Baileys** (conexión tipo WhatsApp Web, escaneando QR). Funciona perfecto para responder a leads que ya te escriben. Para outbound masivo a desconocidos → necesitas la API oficial de Meta. Detalle en `docs/07-errores-comunes.md`.

**¿Cuánto cuesta correrlo 24/7?**
Entre **8-13 €/mes**: 5,49-7,99€ de VPS (Hostinger KVM 1/KVM 2) + 2-5€ de OpenRouter por agente. Un VPS KVM 2 puede albergar 5-10 agentes simultáneos (el cuello de botella real son las vCPU, no la RAM).

**¿Puedo correr varios bots con distintos números?**
Sí. Una instancia del kit por número de WhatsApp. Si vendes esto a clientes, una app de EasyPanel por cliente.

**¿Esto se puede vender a clientes?**
Sí, esa es exactamente la idea. Tarifas de mercado a 2026:
- **Diagnóstico**: 150-300 €
- **Implementación con tools**: 800-1.500 €
- **Mantenimiento mensual**: 80-200 €/mes
- Con 10 clientes a 150€/mes de mantenimiento → **1.500€/mes recurrentes** con ~30€ de coste real

**¿Y si algo falla?**
Ejecuta `npm run doctor`. Si no se arregla, dile a Claude Code "tengo un error: [pega el mensaje]". Si sigue sin resolverse → pregunta en la [comunidad de Biokool](https://biokool.mx/).

**¿Por qué OpenRouter y no API directa de OpenAI/Anthropic?**
OpenRouter te deja cambiar de modelo (GPT, Claude, Gemini, Llama, DeepSeek...) cambiando UNA línea del `.env.local`. Sin cambiar código. Es la flexibilidad máxima.

---

## Estructura del proyecto

```
whatsapp-ai-agent-kit/
├── EMPIEZA-AQUI.md          ← Punto de entrada del usuario
├── README.md                ← Este archivo
├── CLAUDE.md                ← Instrucciones del agente
├── AGENTS.md                ← Reglas persistentes del proyecto
├── AI-BOS-STATE.md          ← Estado del progreso
├── errores-sesion.md        ← Post-mortem: los errores ya resueltos
├── package.json             ← Engines + scripts + deps
├── nixpacks.toml            ← Configuración de deploy a EasyPanel
│
├── .opencode/
│   ├── commands/
│   │   ├── setup.md         ← /setup
│   │   ├── personaliza.md   ← /personaliza
│   │   └── deploy.md        ← /deploy
│   └── skills/
│       └── ai-bos/
│           └── SKILL.md     ← Protocolo de ejecución AI-BOS
│
├── src/
│   ├── app/                 ← Next.js 16 (dashboard + APIs)
│   ├── components/               ← UI (ConnectionGate, QRScreen, Dashboard...)
│   └── lib/
│       ├── db.ts                 ← SQLite + WAL + helpers tipados
│       ├── baileys/              ← Cliente WhatsApp Web (10 lecciones aplicadas)
│       ├── openrouter.ts         ← LLM con tool calling
│       ├── system-prompt.ts      ← Lee prompts/negocio.md automáticamente
│       └── tools/                ← guardarLead · calificar · agendar · derivarHumano
│
├── scripts/
│   ├── env-loader.ts             ← Side-effect: carga .env.local
│   ├── start-bot.ts              ← Arranca el proceso Baileys
│   ├── wizard.ts                 ← CLI fallback (sin Claude Code)
│   ├── check-system.ts           ← Verifica requisitos del SO
│   └── doctor.ts                 ← Diagnóstico de errores comunes
│
├── prompts/
│   ├── README.md
│   ├── negocio.example.md        ← Plantilla con las 6 secciones
│   └── ejemplos/                 ← 3 casos completos rellenados
│
├── docs/
│   ├── 01-instalar.md
│   ├── 02-conectar-whatsapp.md
│   ├── 03-personalizar-prompt.md
│   ├── 04-configurar-tools.md
│   ├── 05-cloudflare-access.md
│   ├── 06-deploy-hostinger.md
│   └── 07-errores-comunes.md
│
├── data/                         ← Runtime (no se sube a Git)
└── auth/                         ← Sesión Baileys (no se sube a Git)
```

---

## Stack técnico

- **Next.js 16** + React 19 + Tailwind 4 (dashboard)
- **@whiskeysockets/baileys** 6.7+ (WhatsApp Web)
- **better-sqlite3** + WAL (base de datos local)
- **OpenRouter** SDK (hub de modelos de IA)
- **tsx + concurrently** (arrancar bot + dashboard juntos)
- **Nixpacks** (deploy sin Docker)

Todas las decisiones técnicas y las lecciones aprendidas han sido desarrolladas por el equipo de Biokool y ya están aplicadas en el código (ver `errores-sesion.md`).

---

## Créditos y atribución

Construido por **el equipo de Biokool** ([canal de YouTube](https://www.youtube.com/@juanpe.divisual)).

Este kit ha sido desarrollado **íntegramente por el equipo de Biokool**: arquitectura, código, documentación y todas las lecciones aprendidas pisando los errores uno a uno hasta dejarlo blindado y cross-platform, con una experiencia de instalación guiada por Claude Code.

Stack open-source:
- [Baileys](https://github.com/WhiskeySockets/Baileys) — cliente WhatsApp Web
- [Next.js](https://nextjs.org/) — framework React
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite para Node
- [OpenRouter](https://openrouter.ai/) — hub de modelos LLM
- [Nixpacks](https://nixpacks.com/) — build sin Docker

---

## Licencia y uso

Kit **exclusivo para alumnos de Biokool**. No es de uso libre ni código abierto.

**Lo que SÍ puedes hacer** (como cliente de Biokool):
- Usarlo para tus propios proyectos y negocio.
- Montar agentes para tus clientes y **cobrar por ello** (es justo el modelo que enseñamos).

**Lo que NO puedes hacer:**
- Compartir, revender, redistribuir o publicar el kit (ni su código) fuera de Biokool.
- Pasárselo a alguien que no sea alumno.

El acceso al kit es parte de tu relación con Biokool. Cuídalo.

---

## Soporte de Biokool

¿Te atascas o quieres aplicar esto a un caso real? Para eso está la **[comunidad de Biokool](https://biokool.mx/)**:

- Resuelve dudas (técnicas y de negocio) con el equipo y el resto de alumnos
- Comparte tu primer agente y recibe feedback
- Aprende a vender el servicio: prompts que convierten, cómo cerrar clientes, despliegue blindado

Todo el soporte vive en Biokool. Eres cliente: aprovéchalo.
