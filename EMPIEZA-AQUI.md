# Empieza aquí

Bienvenido. Vas a montar tu propio agente de IA conectado a WhatsApp en menos de 15 minutos. No vas a tocar código — solo seguir 3 pasos.

---

## Paso 1 · Abre esta carpeta con VS Code

VS Code es el editor donde vas a tener todo. Es gratuito.

- **¿No lo tienes?** Descárgalo aquí: https://code.visualstudio.com/Download
- Una vez instalado, en VS Code: `Archivo → Abrir carpeta...` y elige la carpeta de este kit

---

## Paso 2 · Abre Claude Code y escribe `/setup`

Claude Code es la extensión que va a hacer todo el trabajo por ti dentro de VS Code.

- **¿No la tienes?** Instálala desde el marketplace de VS Code: busca "Claude Code" y dale a "Instalar"
- **Importante**: Claude Code requiere **suscripción Claude Pro** (~$20/mes) o cuenta API de Anthropic. No tiene tier gratuito. Si no quieres pagar Claude, salta al final de este archivo (opción `npm run wizard`)
- Ábrela con el atajo de teclado o desde el panel lateral
- En el chat de Claude Code escribe: `/setup`

Claude te va a guiar paso a paso. Te pedirá una API key de OpenRouter (gratis con 5€ de saldo) y se encarga del resto: instala dependencias, conecta tu WhatsApp, te abre el panel de control.

> **Windows**: instala también [Git for Windows](https://git-scm.com/download/win) — Claude Code necesita Bash en Windows. Solo es darle siguiente al instalador.

---

## Paso 3 · Personaliza tu agente con `/personaliza`

Cuando el bot ya esté conectado a WhatsApp, escribe en Claude Code: `/personaliza`

Te hará 6 preguntas sobre tu negocio (nombre, propuesta de valor, qué leads te interesan, etc.) y adaptará el agente para ti. Sin tocar archivos. Sin programar.

---

## Si algo falla

Escribe en Claude Code: **"el bot no responde"** o **"tengo un error"**. Claude tiene contexto del kit y te ayudará a diagnosticar.

Si no usas Claude Code, abre la Terminal (macOS) o PowerShell (Windows) en esta carpeta y ejecuta:

```
npm run wizard
```

Es la versión CLI del mismo asistente.

---

## ¿Y luego?

Cuando tengas el bot funcionando en tu ordenador, el siguiente paso es desplegarlo a un servidor para que funcione 24/7. Escribe `/deploy` y te guío hasta Hostinger.

---

> Cualquier duda → pregúntala en la [comunidad de Biokool](https://biokool.mx/). Allí te ayudamos a aplicarlo a tu caso real.

— El equipo de Biokool
