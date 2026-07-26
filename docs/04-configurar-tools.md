# 04 · Configurar las tools (Google Sheets + Cal.com)

El agente trae 4 tools (acciones que puede ejecutar). Funciona sin configurarlas, pero su valor se desbloquea cuando las activas.

## Antes de las tools · Modelo de IA

Antes de activar tools, asegúrate de que el modelo elegido en `OPENROUTER_MODEL` (en `.env.local`) **soporta tool calling**. Estas son las opciones recomendadas a mayo 2026:

| Modelo | Input $/M tokens | Output $/M tokens | Contexto | Cuándo |
|---|---|---|---|---|
| `openai/gpt-4o-mini` | $0.15 | $0.60 | 128K | **Default**. Mejor relación precio/calidad para 2-4 líneas en español |
| `google/gemini-2.5-flash` | $0.30 | $2.50 | 1M | Si necesitas contexto largo (historial muy extenso) |
| `anthropic/claude-haiku-4.5` | $1.00 | $5.00 | 200K | Si necesitas tool-use complejo o razonamiento extendido |

**Los modelos `:free`** existen pero tienen rate limit estricto (50 req/día sin créditos, 1.000 req/día con $10+ cargados). Sirven para probar el kit pero **no para clientes reales** — se saturan en cuanto hay 2-3 conversaciones simultáneas.

Para cambiar el modelo: edita `OPENROUTER_MODEL` en `.env.local`, reinicia el bot.

---

## Las 4 tools

| Tool | Qué hace | Configuración necesaria |
|---|---|---|
| `guardarLead` | Guarda lead en Google Sheets | Webhook de Apps Script |
| `calificar` | Calcula score 1-10 del lead | Ninguna — funciona de serie |
| `agendar` | Envía link de Cal.com personalizado | URL de Cal.com / Calendly |
| `derivarHumano` | Pasa la conversación a modo HUMAN | Ninguna — funciona de serie |

## Configurar `guardarLead` con Google Sheets

### Paso 1 · Crear la hoja de cálculo

1. Abre https://sheets.new (crea hoja nueva)
2. Renómbrala a "Leads WhatsApp" o similar
3. En la fila 1, pon estos headers: `Fecha`, `Nombre`, `Teléfono`, `Negocio`, `Facturación`, `Dolor`

### Paso 2 · Crear el script de Apps Script

1. En la hoja, menú `Extensiones → Apps Script`
2. Borra el código por defecto y pega:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.fecha || new Date().toISOString(),
    data.nombre || '',
    data.telefono || '',
    data.negocio || '',
    data.facturacion || '',
    data.dolor || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Pulsa `Guardar` (disquete arriba)

### Paso 3 · Desplegar como Web App

1. Click en `Implementar → Nueva implementación`
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo** (tu cuenta)
4. Quién tiene acceso: **Cualquier usuario**
5. Click `Implementar`
6. Autoriza el script cuando te lo pida (verás un aviso que es normal)
7. Copia la **URL de la web app**

### Paso 4 · Pegar la URL en `.env.local`

Abre `.env.local` y pega la URL en `GOOGLE_SHEETS_WEBHOOK_URL`:

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
```

Reinicia el bot (`Ctrl + C` y `npm run start:all`).

### Probar

Desde otro WhatsApp, escribe al agente algo como "Hola, tengo una agencia de marketing y me interesa". El agente debería ejecutar `guardarLead` y verás la fila nueva en tu hoja de Google Sheets en cuestión de segundos.

## Configurar `agendar` con Cal.com

### Paso 1 · Crear cuenta en Cal.com

1. Crea cuenta gratuita en https://cal.com
2. Crea un evento (ej: "Diagnóstico 30 min")
3. Configúralo con disponibilidad, duración, etc.

### Paso 2 · Copiar el link público

En el evento, copia el link público. Tendrá esta forma:

```
https://cal.com/tu-usuario/diagnostico
```

### Paso 3 · Pegarlo en `.env.local`

```
CAL_BOOKING_URL=https://cal.com/tu-usuario/diagnostico
```

Reinicia el bot. La tool `agendar` ya está activa.

## Alternativa · Calendly

El kit también funciona con Calendly. Solo pega tu link de Calendly en `CAL_BOOKING_URL`:

```
CAL_BOOKING_URL=https://calendly.com/tu-usuario/30min
```

## Tools que NO necesitan configuración

- **`calificar`**: la lógica de scoring está en `src/lib/tools/calificar.ts`. Puedes ajustar los pesos (negocio activo +3, factura más de 5k +3, etc.) editando ese archivo
- **`derivarHumano`**: funciona de serie. Cuando el agente la invoca, cambia el modo de la conversación a HUMAN en el dashboard

## Tools custom (avanzado)

Si quieres añadir una tool nueva (consultar stock, mandar email, lo que sea):

1. Crea `src/lib/tools/mi-tool.ts` siguiendo el patrón de las otras 4
2. Regístrala en `src/lib/tools/index.ts` (`toolDefinitions` y `handlers`)
3. Reinicia el bot

Si no sabes hacerlo, pide ayuda en Claude Code: "añádeme una tool que consulte stock de un Google Sheet" — te lo monta.

## Siguiente paso

Sigue a [05-cloudflare-access.md](05-cloudflare-access.md) para proteger el dashboard con login antes de desplegar a producción.
