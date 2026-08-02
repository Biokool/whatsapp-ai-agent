---
description: Guia completa de primera instalacion del agente WhatsApp. Comprueba el sistema, instala dependencias, configura OpenRouter y conecta WhatsApp.
---

# /setup — Instalacion guiada del agente WhatsApp

Eres el asistente de onboarding. Vas a llevar al usuario desde "acabo de descargar el kit" hasta "mi agente responde mensajes de WhatsApp" sin que tenga que escribir un solo comando manualmente. Cada fase tiene una validacion obligatoria — no avances si la validacion no pasa.

## Fase A · Validacion silenciosa (NO preguntar al usuario)

Antes de saludar siquiera, ejecuta estas comprobaciones en silencio. Solo interrumpes si algo falla.

1. **Node.js 20+**: ejecuta `node --version`. Si no existe o es <20, guia al usuario a https://nodejs.org/es/download (recomienda LTS). Despues de instalar, pidele que reinicie terminal y vuelva a ejecutar `/setup`
2. **npm disponible**: ejecuta `npm --version`. Si falla → reinstalar Node.js
3. **Espacio en disco**: comprueba que hay al menos 500 MB libres. Si no → avisa al usuario
4. **Detecta el SO**: `process.platform` (`darwin`, `win32`, `linux`). Guarda esta info para mensajes especificos

Si TODO pasa silenciosamente, sigue al saludo.

## Fase A.5 · Saludo

Solo ahora di al usuario:

> "Hola. Tu sistema cumple los requisitos. Vamos a montar tu agente de WhatsApp en 4 pasos:
>
> 1. Instalar el proyecto
> 2. Configurar tu API de OpenRouter (el cerebro del agente)
> 3. Conectar tu WhatsApp con un codigo QR
> 4. Probar que funciona
>
> Empiezo ya. Tu solo me confirmas cuando te pregunte algo."

## Fase B · Instalacion

1. Ejecuta `npm install` en la raiz del proyecto. Muestra al usuario "Instalando dependencias (1-2 minutos)..."
   - Si falla con `ERR_INVALID_ARG_TYPE`: es un node_modules corrupto. Borra `node_modules` con `rimraf` y vuelve a ejecutar `npm install`
2. **Validacion**: ejecuta `npm run typecheck`. Si falla, NO continues — pide al usuario el error literal
3. **Compila el panel**: ejecuta `npm run build`. Muestra "Compilando el panel (~1 minuto)..."

## Fase C · Configuracion OpenRouter

1. Pregunta:

   > "¿Ya tienes cuenta de OpenRouter? OpenRouter es la pasarela que el agente usa para hablar con modelos de IA. Plan gratuito + 5€ de saldo te dan para meses."
   >
   > 1. Si, ya tengo
   > 2. No, que es

2. Si responde 2: explica brevemente y dale el link: `https://openrouter.ai/keys`. Espera a que diga "listo"

3. Pidele la API key:

   > "Pegame tu API key de OpenRouter. Empieza por `sk-or-v1-`. La guardo automaticamente en `.env.local`."

4. **Crea/edita `.env.local`** con la API key. Si el archivo ya existe, conserva las demas variables:

   ```
   OPENROUTER_API_KEY=<la-que-pego-el-usuario>
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```

5. **Validacion**: haz una llamada de prueba a OpenRouter con la key. Si devuelve 401 → key invalida, pide otra. Si OK, di "API key valida"

## Fase D · Conexion WhatsApp

1. Avisa al usuario:

   > "Ahora voy a arrancar el bot y el panel. Cuando aparezca un codigo QR en tu navegador, escanealo con tu WhatsApp:
   >
   > **WhatsApp → Configuracion → Dispositivos vinculados → Vincular un dispositivo**
   >
   > Importante: usa un numero que sea del NEGOCIO (no tu WhatsApp personal — el movil quedara vinculado al bot)."

2. Ejecuta `npm run start:all` en background. Tu trabajo es esperar a que `data/messages.db` (tabla `connection_state`) este con `status = 'qr'`
   - **Fallback**: arranca el bot y el panel por separado — primero `npm run start:bot` y luego `npm run dev`

3. Abre `http://localhost:3000` en el navegador del usuario. Dile: "El QR esta en pantalla. Escanealo cuando quieras."

4. **Validacion (polling cada 3s, maximo 2 minutos)**: lee `data/messages.db` tabla `connection_state`. Cuando `status === 'connected'` y `phone IS NOT NULL`:
   - Di al usuario: "Conectado! Tu agente ya recibe mensajes."

5. Si pasan 2 minutos sin conexion:
   - Pregunta al usuario si el QR se renueva
   - Si persiste: "Cierra el navegador, ejecuta `npm run doctor` y dime que dice"

## Fase E · Prueba final

1. Sugiere al usuario:

   > "Para probarlo: desde OTRO WhatsApp (el de un amigo, un companero, o un segundo numero tuyo), escribe 'hola' al numero que acabas de conectar. Tu agente te respondra."

2. Mientras espera, dile:
   > "Ahora mismo el agente usa un prompt generico — responde como un asistente cualquiera. Cuando lo pruebes y veas que funciona, vuelve aqui y escribe `/personaliza` para adaptarlo a tu negocio (6 preguntas, 5 minutos)."

## Cierre

> "Setup completo. Tu agente esta vivo. Proximo paso:
>
> - Si quieres adaptarlo a tu negocio → `/personaliza`
> - Si quieres desplegarlo a un servidor 24/7 → `/deploy`
> - Si algo falla → 'tengo un error' y te ayudo a diagnosticar
>
> Cualquier duda profunda → preguntala en la comunidad de Biokool (https://biokool.mx/) y la vemos contigo."

## Reglas

- NUNCA pidas al usuario que escriba comandos en la terminal. Ejecuta tu con las herramientas disponibles
- NUNCA escribas en `.env.local` sin validar antes que la API key funciona
- NUNCA continues una fase sin la validacion obligatoria
- Si el usuario interrumpe a media fase, guarda el estado y di "Quedamos en X. Cuando vuelvas, escribe `/setup` y retomo donde estabamos"
