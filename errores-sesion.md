# Errores de sesión · WhatsApp AI Agent Kit

Post-mortem de los errores que se han ido encontrando construyendo y operando el kit. Documentar cada error nuevo aquí siguiendo el formato. La regla del kit: cada error vivido se traduce en una "regla absoluta" en `CLAUDE.md` o en una mitigación en el código.

Las primeras 10 entradas documentan los errores que el equipo de Biokool pisó construyendo el sistema varias veces hasta dejarlo blindado. Están ya mitigadas en el código del kit; las documentamos aquí para que el usuario entienda por qué hay tantas decisiones "raras" en `src/lib/baileys/`.

---

## #1 · Code 405 en Baileys — versión desactualizada

**Qué pasó**: el bot conectaba al primer intento pero a partir del segundo arranque WhatsApp rechazaba con `code: 405`. Pasó incluso con versiones de Baileys recientes.

**Cuándo se vio**: en cualquier momento entre 1 y 4 semanas después de instalar — depende de cuándo WhatsApp endurezca el protocolo.

**Corrección**: llamar a `fetchLatestBaileysVersion()` al arrancar y pasar la versión descargada a `makeWASocket({ version })`.

**Patrón aprendido**: nunca usar la versión hardcodeada de Baileys. Siempre descargar la última en runtime. Aplica a CUALQUIER proyecto con Baileys.

---

## #2 · Code 440 en bucle infinito tras pairing

**Qué pasó**: justo después de escanear el QR, el bot se conectaba 5-10 segundos y se desconectaba. Reintentar inmediatamente provocaba el mismo ciclo eterno.

**Cuándo se vio**: en TODOS los primeros intentos cuando pasábamos un `browser` fingerprint custom (ej. `["Mi App", "Chrome", "1.0"]`).

**Corrección doble**:

1. Usar fingerprint conocido: `Browsers.macOS("Desktop")` en `makeWASocket`
2. Backoff específico para code 440: 15 segundos en lugar de los 5 segundos para el resto de codes

**Patrón aprendido**: WhatsApp Web es paranoico con dispositivos. Solo deja entrar fingerprints conocidos. Y reconectar muy rápido tras el pairing dispara connectionReplaced. Espera 15s.

---

## #3 · Code 515 confundido con error

**Qué pasó**: pensamos que el bot fallaba porque los logs mostraban `code: 515` durante el pairing. Intentamos arreglarlo y rompimos cosas.

**Cuándo se vio**: durante el primer escaneo del QR, siempre.

**Corrección**: NO es error. Es la señal de pairing exitoso. WhatsApp pide reconectar al WebSocket "definitivo". El bot solo necesita reconectar limpio, sin reportar como error.

**Patrón aprendido**: leer la documentación de Baileys con detalle antes de tratar cualquier code como bug. No todos los disconnect codes son errores.

---

## #4 · QR no aparece en el frontend (race condition)

**Qué pasó**: el QR se generaba (visible en la terminal en ASCII) pero NUNCA aparecía en el dashboard `/api/connection/status`.

**Cuándo se vio**: en frontends conectándose por polling cada 2 segundos.

**Causa**: el bot pasa de estado `qr` → `connecting` en milisegundos. Si la API solo devolvía el QR cuando `status === 'qr'`, el frontend casi nunca lo veía.

**Corrección**: API defensiva. Si existe `qr_string` en la DB, devolver el QR aunque `status` sea `connecting` (no solo `qr`). Esto es lo que hace `src/app/api/connection/status/route.ts`.

**Patrón aprendido**: con state machines y polling, ser defensivo. Mostrar datos si existen, no solo si el estado es perfecto.

---

## #5 · OPENROUTER_API_KEY undefined por ES module hoisting

**Qué pasó**: el bot arrancaba sin error, conectaba a WhatsApp, pero al primer mensaje crasheaba con 401 de OpenRouter. La key estaba en `.env.local` pero `process.env.OPENROUTER_API_KEY` devolvía `undefined`.

**Cuándo se vio**: siempre que importábamos el cliente OpenRouter en `start-bot.ts`.

**Causa**: los `import` de ES modules se hoistean al inicio del archivo, ANTES de cualquier código de inicialización. Si `openrouter.ts` lee `process.env.OPENROUTER_API_KEY` en su top-level, lo lee antes de que `loadEnv()` se ejecute → undefined.

**Corrección**: poner el loader en su propio módulo `scripts/env-loader.ts` (side-effect only, sin exports) e importarlo PRIMERO en `start-bot.ts`:

```ts
import "./env-loader";  // ← debe ser el PRIMER import
import { ... } from "../src/lib/db";
```

Los imports siguen orden de declaración dentro del bloque hoisted. Como env-loader no tiene exports, solo ejecuta side effects (poblar process.env) antes de que cualquier otro módulo evalúe `process.env`.

**Patrón aprendido**: nunca leer `process.env` en el top-level de un módulo si depende de un loader externo. O bien usar `dotenv/config` como primer import, o estructurar el código para que las variables se lean dentro de funciones (que se llaman después).

---

## #6 · Procesos zombies en Windows tras Ctrl+C

**Qué pasó**: en Windows, al pulsar Ctrl+C en la terminal donde corre `npm run start:all`, el proceso padre moría pero los hijos de `tsx` quedaban vivos. Al volver a arrancar, había dos bots peleando por la misma sesión Baileys → caos.

**Cuándo se vio**: SOLO en Windows. En macOS Ctrl+C limpia bien los hijos.

**Corrección**: documentar en `docs/07-errores-comunes.md` cómo detectarlo y matarlos manualmente:

```
tasklist | findstr node
taskkill /PID <X> /F
```

El `scripts/doctor.ts` también detecta este caso en Windows.

**Patrón aprendido**: en Windows, los signals (SIGINT, SIGTERM) no se propagan a hijos como en Unix. Si hay procesos hijos críticos, considerar usar herramientas como `tree-kill` o documentar el cleanup manual.

---

## #7 · better-sqlite3 falla compilando en Linux/Nixpacks

**Qué pasó**: el deploy a EasyPanel fallaba en la fase de build con "Cannot find pre-built binary for better-sqlite3". El log mostraba errores de gcc.

**Cuándo se vio**: la primera vez que deployamos a Hostinger VPS con EasyPanel + Nixpacks.

**Causa**: better-sqlite3 se compila nativamente con node-gyp, que requiere python3 + gcc + gnumake. Nixpacks por defecto NO los incluye.

**Corrección**: declarar los paquetes en `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "npm-10_x", "python3", "gcc", "gnumake"]
```

**Patrón aprendido**: cualquier dependencia con código nativo C/C++ requiere el toolchain de build en el entorno de deploy. Siempre verificar que el `nixpacks.toml` (o el Dockerfile) los incluye.

---

## #8 · Node 18 default en Nixpacks rompe Next 16 / Baileys

**Qué pasó**: la app deployaba pero a runtime devolvía errores de sintaxis ES2022 o "experimental fetch not enabled".

**Cuándo se vio**: la primera vez con `nixpacks.toml` que no especificaba versión de Node.

**Causa**: Nixpacks defaulteaba a Node 18. Next.js 16, Baileys 6.7+ y Tailwind 4 necesitan Node 20+.

**Corrección**: fix doble:

1. `engines.node >= 20.9.0` en `package.json`
2. `.nvmrc` con `22`
3. `nixpacks.toml` con `NIXPACKS_NODE_VERSION = "22"` Y `nodejs_22` en `nixPkgs`

**Patrón aprendido**: nunca confiar en la versión default del entorno de deploy. Declarar SIEMPRE explícitamente.

---

## #9 · Modelos `:free` de OpenRouter dan 429 en producción

**Qué pasó**: en local con tráfico bajo, los modelos `qwen-...:free` y `gemma-...:free` funcionaban. En producción con 2-3 conversaciones simultáneas, OpenRouter devolvía 429 constantemente.

**Cuándo se vio**: la primera prueba con tráfico real (más de 1 lead simultáneo).

**Causa**: los modelos `:free` tienen rate limit muy estricto (50 req/día sin créditos cargados, 1000 con créditos). En producción real, se saturan a la primera.

**Corrección**: recomendar `openai/gpt-4o-mini` desde el día 1. Coste: $0.15/M tokens input, $0.60/M tokens output. Para un agente con 50 leads/día: 2-5€/mes. Documentar en `.env.example`, en `/setup`, en `docs/`, en `doctor.ts`.

**Patrón aprendido**: los tier gratuitos sirven para aprender, no para servir clientes reales. Comunicarlo claro y temprano evita frustración.

---

## #10 · Dashboard sin auth = riesgo total

**Qué pasó**: el primer deploy a producción quedó expuesto en `panel.midominio.com` sin login. Cualquiera con el link podía leer todas las conversaciones de WhatsApp y enviar mensajes en nombre del dueño.

**Cuándo se vio**: durante una prueba con usuarios beta del kit. Uno compartió la URL con un amigo, el amigo entró sin login.

**Causa**: el kit no incluye auth nativa (sería complicar el setup para no-programadores).

**Corrección**: hacer obligatorio configurar Cloudflare Access antes de meter conversaciones reales en producción. Documentar en `/deploy` como paso bloqueante. Crear `docs/05-cloudflare-access.md` con paso a paso.

**Patrón aprendido**: cuando el kit deja agujeros de seguridad por simplicidad, hay que cerrarlos con servicios externos gratuitos (Cloudflare Access, Tailscale, basic auth proxy) y marcar la configuración como bloqueante, no opcional.

---

## #11 · WhatsApp Business Platform · cambio de pricing per-conversación → per-mensaje

**Qué pasó**: el kit y los materiales formativos mencionaban "1.000 conversaciones gratis/mes" y "conversaciones de 24 horas" como modelo de pricing. Meta cambió ese modelo el **1 de julio de 2025** y migró completamente a **per-message billing** durante 2025-2026.

**Cuándo se vio**: auditoría de mayo 2026.

**Causa**: Meta anunció el cambio gradual a per-message a inicios de 2024 con efecto julio 2025. El modelo viejo dejó de aplicar.

**Corrección (mayo 2026)**:

- **Service messages** (respuestas dentro de la ventana de 24h iniciada por el usuario): **gratis ilimitadas globalmente**
- **Marketing / Utility / Authentication**: per-message desde el primer envío, con precio por país
- **Ventana Click-to-WhatsApp (72h)**: si el usuario llega por un anuncio de Meta (Facebook/Instagram), TODA la mensajería es gratis durante 72h — incluido marketing
- **Utility templates** dentro de service window (24h iniciada por usuario) → **gratis** desde finales de 2024

**Precios España mayo 2026** (orientativos, verificar en Meta Business Manager):

- Marketing: ~€0.05/mensaje
- Utility/Authentication: ~€0.017/mensaje
- Service: gratis

**Patrón aprendido**: el pricing de Meta cambia. Cualquier coste documentado en el kit caduca rápido — referenciar la fuente oficial (developers.facebook.com/docs/whatsapp/pricing) y dar solo orden de magnitud, no precios exactos al céntimo.

---

## #12 · Detección ML de WhatsApp más agresiva (2025-2026)

**Qué pasó**: WhatsApp endureció en 2025-2026 sus modelos de detección de bots no oficiales. Hay reportes documentados de bans en bots Baileys con 3+ años en producción.

**Cuándo se vio**: monitorización de issues GitHub de Baileys + reportes de comunidad (mayo 2026).

**Causa**: WhatsApp añadió vectores de detección con ML que pesan:

- Reply-ratio bajo (<10%): muchos mensajes salientes, pocas respuestas
- Contact-graph distance: mensajes a desconocidos
- Patrones temporales robóticos
- Volumen alto sin pausas humanas

**Corrección**:

- Documentar explícitamente los vectores en `docs/07-errores-comunes.md` (sección "Riesgo de ban" al principio)
- Marcar como CRÍTICO usar números secundarios, nunca personales
- Para outbound a escala recomendar siempre Meta API oficial
- Subir el tono del aviso en slides/explainer del vídeo de YouTube

**Patrón aprendido**: las reglas de "uso seguro de Baileys" envejecen mal. Lo que era seguro en 2023 no lo es en 2026. Revisar cada 6 meses contra fuentes oficiales (Issues de Baileys, comunidad).

---

## #13 · `npm install` falla con `ERR_INVALID_ARG_TYPE` en el rollback de npm

**Qué pasó**: en el primer `/setup`, `npm install` abortó con `npm error code ERR_INVALID_ARG_TYPE` / `The "from" argument must be of type string. Received undefined`. El stack apuntaba a `@npmcli/arborist/.../reify.js` → `rollbackMoveBackRetiredUnchanged` → `path.relative`. No es un error del `package.json` (estaba correcto) ni de la red.

**Cuándo se vio**: primera instalación en macOS (Node 22, npm 10.9.7) con una carpeta `node_modules` ya presente, a medio poblar de un intento anterior interrumpido.

**Causa**: el `node_modules` quedó en un estado parcial/corrupto. npm intenta "retirar" (renombrar a `.node_modules.*`) los paquetes existentes y restaurarlos si algo falla; cuando ese estado intermedio está inconsistente, el propio rollback peta en `path.relative` al recibir `undefined`. El mensaje de error oculta la causa real (instalación previa a medias), no es un bug que el usuario pueda "arreglar" reintentando el mismo comando.

**Corrección**: NO repetir `npm install` tal cual (vuelve a fallar). Borrar el `node_modules` parcial y reinstalar desde el `package-lock.json` intacto:

```
rm -rf node_modules .node_modules.*   # (Claude Code lo ejecuta; en kit-code usar rimraf/fs.rmSync)
npm install
```

Si persistiera, añadir `npm cache verify`. Validar después con `npm run typecheck` (debe salir exit 0).

**Patrón aprendido**: un fallo de npm en fase de _reify/rollback_ casi siempre significa `node_modules` corrupto, no un problema de dependencias. Reflejo: limpiar `node_modules` y reinstalar, nunca reintentar el mismo `install` a ciegas. Para Claude Code en `/setup`: si `npm install` falla, leer el stack — si menciona `reify`/`rollback`, limpiar y reinstalar antes que cualquier otra cosa.

---

## #14 · El bot conecta pero NO responde a mensajes — direcciones @lid de WhatsApp

**Qué pasó**: tras `/setup`, el bot conectaba perfecto (`status=connected`, sin errores en el log), pero al enviarle un "hola" desde otro móvil no respondía nada. El log no mostraba ni una línea `[bot] ← mensaje de...`, como si no llegara nada.

**Cuándo se vio**: primer `/setup` real en una cuenta con **LID activado** (junio 2026). La cuenta tenía tanto `id` clásico (`...@s.whatsapp.net`) como `lid` (`...@lid`) en `auth/creds.json` → señal de que WhatsApp ya le había asignado LID.

**Causa**: WhatsApp desplegó en 2025-2026 un nuevo formato de direcciones, **LID** (Linked ID, identificador de privacidad). En cuentas con LID activado, los mensajes entrantes 1:1 llegan con `remoteJid` terminado en `@lid` en vez de `@s.whatsapp.net`. El handler (`src/lib/baileys/handler.ts`) tenía un filtro `if (!remoteJid.endsWith("@s.whatsapp.net")) continue;` que **descartaba en silencio** todos los mensajes `@lid`, ANTES de loguear nada. Por eso parecía que no llegaba nada: sí llegaban, pero se tiraban. Pista decisiva: en `auth/` aparecía una `session-<numero-largo>.json` (el LID del contacto) creada justo al enviar el mensaje, prueba de que el mensaje SÍ llegaba y solo se descartaba en el filtro.

**Cómo se diagnosticó**: el logger interno de Baileys está en `silent` (correcto, es ruidoso), así que un mensaje descartado no deja rastro. Se confirmó con un log temporal al principio de `handleIncomingMessages` que volcaba `event.type` y los `remoteJid` crudos de cada upsert → apareció `type=notify n=1 jids=[<id>@lid]`, confirmando el formato LID.

**Corrección** (en `src/lib/baileys/handler.ts`):

1. Aceptar AMBOS formatos 1:1:
   ```ts
   if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) continue;
   ```
2. Excluir explícitamente `@g.us`, `@broadcast` y `@newsletter` (antes solo se filtraba `@g.us`).
3. Extraer el identificador de conversación robustamente para ambos formatos:
   ```ts
   const phone = remoteJid.split("@")[0].split(":")[0];
   ```
   La respuesta de la IA se envía al `remoteJid` original (Baileys 6.7+ envía bien a jids `@lid`), así que responder en automático funciona igual.

**Segundo bug, misma raíz — la respuesta del HUMANO desde el panel no llegaba**: el camino de salida humana es panel → tabla `outbox` → loop del bot (`src/lib/baileys/outbox.ts`). Ese loop reconstruía el destino como `` `${item.phone}@s.whatsapp.net` `` (hardcodeado). Para un contacto LID, `phone` es el número LID, así que enviaba a `<lid>@s.whatsapp.net` — dirección inexistente. Lo engañoso: **Baileys NO lanza error** al enviar a ese JID, lo marca como `sent=1` y loguea "outbox enviado", pero el contacto nunca lo recibe (fallo silencioso). Corrección:

1. Nueva columna `jid TEXT` en la tabla `conversations` (con migración `ALTER TABLE` para DBs existentes) que guarda el `remoteJid` completo del contacto.
2. `handler.ts` rellena ese `jid` en cada mensaje entrante (`getOrCreateConversation(phone, pushName, remoteJid)`), lo que además backfillea filas antiguas.
3. `outbox.ts` envía a `getConversationById(item.conversation_id).jid` con fallback a `` `${phone}@s.whatsapp.net` `` para filas legacy.

**Cómo validar el camino de salida**: el log "outbox enviado" NO prueba entrega (sale igual aunque el JID sea inválido). La única confirmación fiable es que el destinatario reciba el mensaje en su móvil.

**Limitación conocida**: para contactos por LID, el campo `phone` guardado es el número LID (no el teléfono real). La conversación funciona y el agente responde; en el dashboard se muestra el `pushName` (nombre de WhatsApp) del contacto, así que el display sigue siendo legible.

**Patrón aprendido**: refuerza el #1/#2/#3 y el #12 — el protocolo de WhatsApp Web cambia y rompe supuestos. NUNCA asumir que los JIDs 1:1 terminan solo en `@s.whatsapp.net`. Si el bot conecta pero "no responde a nada" y el log no muestra `← mensaje`, sospechar inmediatamente de `@lid` y comprobar `auth/creds.json` (¿tiene `me.lid`?) y las `session-*.json` recién creadas. Revisar este filtro cada vez que WhatsApp/Baileys saquen versión mayor.

---

## #15 · `next build` falla con `database is locked` (SQLITE_BUSY)

**Qué pasó**: en el primer `/setup`, `npm run start:all` moría al instante con `Could not find a production build`. Al ejecutar `npm run build` para resolverlo, el build fallaba con `SqliteError: database is locked` (`code: SQLITE_BUSY`) y `Failed to collect page data for /api/connection/disconnect`.

**Cuándo se vio**: primer build del proyecto (Next 16 + Turbopack). El paso "Collecting page data" lanza ~10 workers en paralelo.

**Causa**: doble. (1) `start:all` usa `next start` (producción), que exige un build previo que no existía. (2) El build en sí: las rutas API abren la base de datos en el momento de importarse (`src/lib/db.ts` hace `new Database()` + `db.exec(CREATE TABLE...)` + `INSERT OR IGNORE` a nivel de módulo). Durante "Collecting page data", Next importa esas rutas en varios workers a la vez; todos intentan escribir en `messages.db` simultáneamente y, sin `busy_timeout` configurado, SQLite corta en seco con SQLITE_BUSY (WAL permite varios lectores pero un solo escritor; sin timeout, el segundo escritor no espera, falla).

**Corrección** (dos partes):

1. **El arreglo de fondo — init perezoso de la DB** (`src/lib/db.ts`): se reescribió para que la conexión, el esquema y los `prepare()` NO se creen al importar el módulo, sino la primera vez que se llama a una función (patrón `build()` + `ctx()` memoizado). Durante `next build`, importar las rutas API ya NO abre la DB (los handlers no se ejecutan al compilar), así que el lock es imposible **por diseño**. Verificable: tras un build, `data/messages.db` ni siquiera se crea.
2. **Red de seguridad en runtime**: `db.pragma("busy_timeout = 5000")` para la contención normal entre bot y dashboard ya en ejecución. OJO: el `busy_timeout` por sí solo NO arreglaba el build — era no determinista (un build pasaba y el siguiente fallaba), porque la carrera al inicializar el WAL de un archivo nuevo entre ~10 workers no la cubre. El init perezoso es lo que lo resuelve de verdad.
3. En el flujo `/setup`, compilar (`npm run build`) en la fase de instalación, antes de `start:all`. Fallback local: `npm run start:bot` + `npm run dev` (dev no necesita build).

**Patrón aprendido**: NUNCA hagas I/O con efectos (abrir DB, escribir, crear tablas) en el cuerpo de un módulo que Next vaya a importar en build — hazlo perezoso (en la primera llamada). `busy_timeout` ayuda en runtime pero no es solución para carreras de inicialización. Y `next start` SIEMPRE requiere `next build` antes.

---

## #16 · Deploy en EasyPanel/Nixpacks falla: `tsconfig.tsbuildinfo ... not a directory`

**Qué pasó**: primer deploy real a EasyPanel (Nixpacks). Las fases `setup` e `install` (`npm ci`, 268 paquetes) pasaban, pero la fase `build` moría con:
`runc run failed: ... error mounting ... to rootfs at "/app/tsconfig.tsbuildinfo": create mountpoint ... not a directory` → `process "npm run build" did not complete successfully: exit code 1`.

**Cuándo se vio**: primer despliegue a un servidor real (en local el build iba bien porque no hay cache mounts de BuildKit).

**Causa**: el archivo `tsconfig.tsbuildinfo` (caché de compilación incremental de TypeScript) se había **versionado por error** en el repo. Nixpacks añade en su Dockerfile un cache mount de BuildKit con `target=/app/tsconfig.tsbuildinfo` para acelerar builds. Pero como el `COPY . /app/.` ya había colocado ahí un archivo regular, BuildKit no puede crear el mountpoint sobre un fichero existente → "not a directory". Es un choque entre el artefacto versionado y el cache mount.

**Corrección**:

1. Añadir `*.tsbuildinfo` al `.gitignore`.
2. Sacarlo del repo: `git rm --cached tsconfig.tsbuildinfo` (se regenera solo en local; no debe versionarse).
3. Commit + push y redesplegar. El build pasa.

**Bonus de seguridad detectado**: EasyPanel inyecta las variables de entorno como `--build-arg`, así que aparecen **en texto plano en el log de build** (incluida `OPENROUTER_API_KEY`). No es ideal. Si la key queda expuesta en un log compartido, **rótala** en openrouter.ai/keys y actualízala en EasyPanel.

**Patrón aprendido**: NUNCA versionar artefactos de build/caché (`*.tsbuildinfo`, `.next/`, `node_modules/`, `out/`). Además de ensuciar el repo, rompen builds reproducibles y chocan con los cache mounts de Nixpacks/Docker. Regla: si una herramienta lo genera, va al `.gitignore`.

---

## #17 · n8n sube archivos a Google Drive como `text/plain` vacío (bug MIME)

**Qué pasó**: un PDF subido vía el webhook `upload-document` del workflow `Document Upload Handler` aparecía en Google Drive como archivo vacío (`mimeType: "text/plain"`, `size: "0"`). El upload "completaba" sin error y devolvía un `fileId` válido, así que el RAG y las versiones registraban la subida como exitosa pero el fichero en la nube estaba roto. Verificación empírica: `GET drive/v3/files/{id}?fields=mimeType,size` devolvía `text/plain` + `0`.

**Cuándo se vio**: producción (Biokool), tras montar el pipeline App → webhook n8n → GDrive → Postgres. Los archivos con extensión `.pdf` y `Content-Type: application/pdf` se subían vacíos.

**Causa raíz triple**:

1. **typeVersion del nodo Google Drive.** El nodo del workflow declaraba parámetros de la versión V2 (`inputDataFieldName: "file"`) pero con `typeVersion` 2, que en n8n ejecuta la implementación **V1** (`GoogleDriveV1.node.js`). V1 no conoce `inputDataFieldName` (esa UI/parametría es de V2), así que caía en su rama "no binary" (`binaryData=false`) → subía un fichero de texto con el contenido vacío → GDrive lo clasificaba como `text/plain` de 0 bytes.
2. **n8n ejecuta el webhook desde la snapshot publicada.** Los webhooks activos NO se ejecutan desde `workflow_entity.nodes` sino desde la fila de `workflow_history` (snapshot, `versionId`). Editar el nodo en la UI solo actualiza `workflow_entity.nodes`; la ejecución del webhook sigue usando la snapshot vieja hasta que se actualice también la fila de historial. Por eso el `typeVersion` no "hacía efecto" en las ejecuciones.
3. **Bug real de n8n en V1** (`GoogleDriveV1.node.js` dist, línea 2233): `if (metadata.mimeType) mimeType = binaryData.mimeType;` — asignaba el mime del `binaryData` (indefinido en la rama streaming) en lugar de `metadata.mimeType`. Con ese bug, incluso el V1 "con binario" perdía el mime correcto.

**Corrección**:

1. `typeVersion` 2 → **3** en el nodo GDrive, en `workflow_entity.nodes` Y en la snapshot de `workflow_history` (versionId `afc396e7-12d4-4af0-82f4-6d887e5261c0`). Con typeVersion 3 n8n ejecuta `GoogleDriveV2.node.js` → `actions/file/upload.operation.js` → `helpers/utils.getItemBinaryData`, que detecta `binaryData.id` (modo streaming v2) y usa `metadata.fileSize/fileName/mimeType` correctamente.
2. Parche al dist del contenedor del bug de V1 (línea 2233): `mimeType = metadata.mimeType;` (aunque ya no se usa en producción, evitaba fallos silenciosos en cualquier workflow con typeVersion 1/2).
3. Verificado E2E: el `fileId` devuelto ahora reporta `mimeType: "application/pdf"` y `size: 381` (bytes reales del PDF), la cadena continúa a Postgres (`document_versions` en NeonTech vía n8n y en Supabase vía la app), y el RAG termina con `documents.status = ready` + chunks insertados y recuperables por `match_document_chunks`.

**Detalle del entorno (Docker)**: el contenedor n8n usa **pnpm** y los ficheros de `node_modules` son **root-owned**. Los parches al dist se aplican escribiendo el script localmente, `docker cp` al contenedor y ejecutándolo con `docker exec -u root n8n node <script>`. PowerShell rompe el JS inline en `docker exec sh -c`, así que nunca se pasa JS inline. Los parches se pierden si se recrea el contenedor: o se re-aplican, o se actualiza n8n a una versión con el fix upstream.

**Patrón aprendido**: con n8n, "cambié el nodo pero no hace efecto" casi siempre significa que la ejecución del webhook usa la **snapshot publicada en `workflow_history`**, no `workflow_entity.nodes`. Al editar nodos de un workflow activo, actualizar AMBAS filas (o usar el botón "Publish" / API con `versionId`). Y al subir binarios, respetar el `typeVersion` del nodo frente a los parámetros de UI que se ven en el editor — los parámetros V2 con runtime V1 se ignoran en silencio.

---

## #18 · El frontend se queda en "Procesando..." aunque el documento ya está `ready`

**Qué pasó**: tras subir un PDF, el ciclo completo se ejecutaba bien (GDrive `application/pdf`, `document_versions`, chunks RAG, `documents.status = ready`), pero la UI del dashboard seguía mostrando "Procesando..." de forma indefinida. El usuario tenía que recargar la página para ver "Listo".

**Cuándo se vio**: producción (Biokool), subiendo FICHA TECNICA KOOLKAT.pdf. El ingest completo tardaba ~3-9s.

**Causa**: el estado en DB y en la API era correcto (`ready`); el fallo era **100% client-side**, por la combinación de dos opciones de TanStack Query:

1. `src/components/providers.tsx`: `refetchOnWindowFocus: false` → al volver a la pestaña del navegador **no se re-consultaba** la API.
2. `src/hooks/use-documents.ts`: el `refetchInterval` devolvía `false` cuando `document.visibilityState === "hidden"` → si la pestaña perdía foco durante el ingest (muy común: el usuario sube el archivo y cambia de pestaña mientras procesa), el polling **se apagaba y nunca se reanudaba** (por el punto 1).

Resultado: el status quedaba congelado en "Procesando..." hasta recargar la página.

**Cómo se diagnosticó**: se verificó que la API `/api/knowledge-bases/{id}/documents` devolvía `status: "ready"` y que Supabase tenía `ready` + 8 chunks. El bug no estaba en backend ni en la API — solo en el refresco del cliente.

**Corrección**:

1. `providers.tsx`: `refetchOnWindowFocus: true` (volver a la pestaña re-consulta queries stale).
2. `use-documents.ts`: eliminar el check de `visibilityState === "hidden"` y añadir `refetchIntervalInBackground: true` (el polling sigue aunque la pestaña esté oculta).

**Verificación**: subida E2E vía la ruta real del frontend → `pending → processing → ready` en ~3s, visible por polling continuo. Datos de prueba limpiados tras validar.

**Patrón aprendido**: con TanStack Query, `refetchOnWindowFocus: false` + un `refetchInterval` condicionado a `visibilityState === "hidden"` es una combinación que congela la UI cuando la pestaña pierde foco. Para estados asíncronos largos (procesamiento de documentos, subidas), el polling debe seguir en background (`refetchIntervalInBackground: true`) y la app debe re-consultar al volver al foco.

---

## Resumen de causas raíz

Mirando los 10 errores en conjunto:

| Causa raíz                    | Errores              | Patrón general                                                                                                                          |
| ----------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp Web protocol cambia  | #1, #2, #3, #12, #14 | Confiar en Baileys actualizado + browser fingerprint conocido + leer disconnect codes con calma + aceptar nuevos formatos de JID (@lid) |
| State machines mal manejadas  | #4                   | API defensiva: mostrar datos si existen, no solo si el estado es "perfecto"                                                             |
| Carga de entorno              | #5                   | Side-effect modules antes que cualquier otro import                                                                                     |
| Diferencias entre plataformas | #6, #7, #8           | Declarar explícitamente versiones + toolchain en cada entorno de deploy                                                                 |
| Falsos amigos comerciales     | #9                   | "Gratis ilimitado" en realidad no existe — comunicar costes reales temprano                                                             |
| Seguridad por defecto         | #10                  | Cualquier panel expuesto necesita auth, sin excepciones                                                                                 |
| Estado local corrupto         | #13                  | Fallo de npm en reify/rollback = `node_modules` a medias → limpiar y reinstalar, no reintentar                                          |
| Concurrencia SQLite           | #15                  | WAL no basta: sin `busy_timeout` hay SQLITE_BUSY cuando varios procesos/workers escriben. Y `next start` exige `next build` antes       |
| Artefactos versionados        | #16                  | Nunca subir `*.tsbuildinfo`/`.next`/`node_modules` — rompen los cache mounts de Nixpacks en el deploy                                   |
| Snapshot vs nodos en n8n      | #17                  | Los webhooks activos se ejecutan desde la snapshot de `workflow_history`, no de `workflow_entity.nodes`. typeVersion/params: mantener sincronizados ambos o la edición "no hace efecto". Y los parámetros de UI de una versión no se respetan si el runtime del nodo es otra versión |
| Binarios en n8n               | #17                  | Nunca interponer un nodo `Code` entre el webhook y el nodo de subida si puede transformar el binario; subir directo con `binaryData: true` y respetar `typeVersion` para que `getItemBinaryData` use streaming (`binaryData.id`) y el `metadata.mimeType` real |
| Estado UI congelado           | #18                  | `refetchOnWindowFocus: false` + `refetchInterval` que se apaga con `visibilityState === "hidden"` congela estados asíncronos largos al perder el foco. Usar `refetchIntervalInBackground: true` y `refetchOnWindowFocus: true` |

---

## Formato para añadir errores nuevos

Cuando encuentres un error nuevo:

```markdown
## #N · Título corto

**Qué pasó**: descripción del síntoma observable

**Cuándo se vio**: contexto temporal/situacional

**Causa**: explicación técnica de la raíz

**Corrección**: solución concreta aplicada (con código si aplica)

**Patrón aprendido**: la lección general que evita errores similares
```

Cada error nuevo idealmente se traduce también en:

1. Una mitigación en el código (para que no pase a futuros usuarios)
2. Una entrada en `docs/07-errores-comunes.md` (para que el usuario lo encuentre buscando)
3. Una regla absoluta en `CLAUDE.md` si aplica (para que Claude Code no caiga en el mismo error)
