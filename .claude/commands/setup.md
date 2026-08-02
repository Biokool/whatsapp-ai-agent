---
description: Guía completa de primera instalación del agente WhatsApp. Comprueba el sistema, instala dependencias, configura OpenRouter y conecta WhatsApp.
---

# /setup — Instalación guiada del agente WhatsApp

Eres el asistente de onboarding. Vas a llevar al usuario desde "acabo de descargar el kit" hasta "mi agente responde mensajes de WhatsApp" sin que tenga que escribir un solo comando manualmente. Cada fase tiene una validación obligatoria — no avances si la validación no pasa.

## Fase A · Validación silenciosa (NO preguntar al usuario)

Antes de saludar siquiera, ejecuta estas comprobaciones en silencio. Solo interrumpes si algo falla.

1. **Node.js 20+**: ejecuta `node --version`. Si no existe o es <20, párate y guía al usuario:
   - macOS: link a `https://nodejs.org/es/download` (recomienda LTS)
   - Windows: link a `https://nodejs.org/es/download` (recomienda LTS)
   - Después de instalar, pídele que reinicie VS Code y vuelva a ejecutar `/setup`
2. **npm disponible**: ejecuta `npm --version`. Si falla → reinstalar Node.js
3. **Espacio en disco**: comprueba que hay al menos 500 MB libres (usa `df` en mac, `wmic logicaldisk get size,freespace,caption` en Windows). Si no → avisa al usuario
4. **Detecta el SO**: `process.platform` (`darwin`, `win32`, `linux`). Guarda esta info para mensajes específicos

Si TODO pasa silenciosamente, sigue al saludo.

## Fase A.5 · Saludo

Solo ahora di al usuario:

> "Hola. Tu sistema cumple los requisitos. Vamos a montar tu agente de WhatsApp en 4 pasos:
>
> 1. Instalar el proyecto
> 2. Configurar tu API de OpenRouter (el cerebro del agente)
> 3. Conectar tu WhatsApp con un código QR
> 4. Probar que funciona
>
> Empiezo ya. Tú solo me confirmas cuando te pregunte algo."

## Fase B · Instalación

1. Ejecuta `npm install` en la raíz del proyecto. Muestra al usuario "Instalando dependencias (1-2 minutos)..."
   - **Si `npm install` falla con `ERR_INVALID_ARG_TYPE` / "The 'from' argument..." o el stack menciona `reify`/`rollback`**: es un `node_modules` corrupto de un intento previo, NO un problema de dependencias. Borra `node_modules` (en Mac/Linux `rm -rf node_modules`; el `package-lock.json` queda intacto) y vuelve a ejecutar `npm install`. Ver `errores-sesion.md` #13
2. **Validación**: ejecuta `npm run typecheck`. Si falla, NO continúes — pide al usuario el error literal y consulta `errores-sesion.md`
3. **Compila el panel**: ejecuta `npm run build`. Muestra "Compilando el panel (~1 minuto)..."

## Fase C · Configuración OpenRouter

1. Pregunta:

   > "¿Ya tienes cuenta de OpenRouter? OpenRouter es la pasarela que el agente usa para hablar con modelos de IA (GPT, Claude, Gemini...). Plan gratuito + 5€ de saldo te dan para meses."
   >
   > 1. Sí, ya tengo
   > 2. No, qué es

2. Si responde 2: explica brevemente y dale el link: `https://openrouter.ai/keys`. Espera a que diga "listo"

3. Pídele la API key:

   > "Pégame tu API key de OpenRouter. Empieza por `sk-or-v1-`. La guardo automáticamente en `.env.local` (no se sube a ningún sitio)."

4. **Crea/edita `.env.local`** con la API key. Si el archivo ya existe, conserva las demás variables. Usa esta plantilla:

   ```
   OPENROUTER_API_KEY=<la-que-pegó-el-usuario>
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

5. **Validación**: haz una llamada de prueba a OpenRouter con la key. Si devuelve 401 → key inválida, pide otra. Si OK, di "✓ API key válida"

## Fase D · Conexión WhatsApp

1. Avisa al usuario:

   > "Ahora voy a arrancar el bot y el panel. Cuando aparezca un código QR en tu navegador, escanéalo con tu WhatsApp:
   >
   > **WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo**
   >
   > Importante: usa un número que sea del NEGOCIO (no tu WhatsApp personal — el móvil quedará vinculado al bot)."

2. Ejecuta `npm run start:all` en background (funciona porque ya compilaste en la Fase B). Tu trabajo es esperar a que `data/messages.db` (tabla `connection_state`) esté con `status = 'qr'`
   - **Fallback si `start:all` diera problemas**: arranca el bot y el panel por separado — primero `npm run start:bot` (espera a `status = 'qr'`) y luego `npm run dev`. El modo `dev` no necesita build. El QR se ve igual en `http://localhost:3000`

3. Abre `http://localhost:3000` en el navegador del usuario. Dile: "El QR está en pantalla. Escanéalo cuando quieras."

4. **Validación (polling cada 3s, máximo 2 minutos)**: lee `data/messages.db` tabla `connection_state`. Cuando `status === 'connected'` y `phone IS NOT NULL`:
   - Di al usuario: "✓ ¡Conectado! Tu agente ya recibe mensajes."

5. Si pasan 2 minutos sin conexión:
   - Pregunta al usuario si el QR se renueva (a veces caduca)
   - Si persiste, sugiere: "Cierra el navegador, escribe `npm run doctor` y dime qué dice"

## Fase E · Prueba final

1. Sugiere al usuario:

   > "Para probarlo: desde OTRO WhatsApp (el de un amigo, un compañero, o un segundo número tuyo), escribe 'hola' al número que acabas de conectar. Tu agente te responderá."

2. Mientras espera, dile:

   > "Ahora mismo el agente usa un prompt genérico — responde como un asistente cualquiera. Cuando lo pruebes y veas que funciona, vuelve aquí y escribe `/personaliza` para adaptarlo a tu negocio (6 preguntas, 5 minutos)."

3. **Si el agente conecta pero NO responde al "hola"** (y en el log del bot no aparece `[bot] ← mensaje`): el kit ya soporta el formato `@lid` de WhatsApp (2025+) tanto al recibir como al responder desde el panel. Si aun así fallara, verifica que `src/lib/baileys/handler.ts` acepta `@lid` y que existe la columna `jid` en la tabla `conversations`. Ver `errores-sesion.md` #14. Recuerda: para probar hay que escribir desde OTRO móvil (los mensajes del propio número vinculado se ignoran a propósito)

## Cierre

> "Setup completo. Tu agente está vivo. Próximo paso:
>
> - Si quieres adaptarlo a tu negocio → `/personaliza`
> - Si quieres desplegarlo a un servidor 24/7 → `/deploy`
> - Si algo falla → 'tengo un error' y te ayudo a diagnosticar
>
> Cualquier duda profunda → pregúntala en la comunidad de Biokool (https://biokool.mx/) y la vemos contigo."

## Reglas

- NUNCA pidas al usuario que escriba comandos en la terminal. Ejecuta tú con la herramienta Bash de Claude Code
- NUNCA escribas en `.env.local` sin validar antes que la API key funciona
- NUNCA continúes una fase sin la validación obligatoria
- Si el usuario interrumpe a media fase, **guarda el estado** y di "Quedamos en X. Cuando vuelvas, escribe `/setup` y retomo donde estábamos"
