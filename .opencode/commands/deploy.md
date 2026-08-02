---
description: Guia paso a paso para desplegar el agente a un VPS de Hostinger con EasyPanel para que funcione 24/7. Incluye Cloudflare Access para proteger el dashboard.
---

# /deploy — Despliegue a produccion 24/7

Vas a guiar al usuario hasta tener su agente corriendo. Hay dos opciones:

1. **Local con Docker** (recomendado para desarrollo) — 5 minutos
2. **VPS con EasyPanel** (produccion 24/7) — 45-60 minutos

Pregunta al usuario cual prefiere antes de empezar.

---

## Opcion A · Local con Docker (recomendado)

### Pre-checks

1. Verifica que Docker Desktop esta corriendo
2. Verifica que el bot funciona localmente (`npm run start:all` conecta)
3. Verifica que `/personaliza` esta completo

### Pasos

1. Detiene el bot local si esta corriendo:

   ```
   # En la terminal, Ctrl+C o:
   docker compose -f docker-compose.local.yml down
   ```

2. Construye la imagen:

   ```
   docker compose -f docker-compose.local.yml build
   ```

3. Arranca en background:

   ```
   docker compose -f docker-compose.local.yml up -d
   ```

4. Verifica:

   ```
   docker compose -f docker-compose.local.yml logs -f
   ```

   Deberia mostrar `[bot] conectado como <telefono>`

5. Abre `http://localhost:3000` — el dashboard esta funcionando

### Comandos utiles

```
docker compose -f docker-compose.local.yml down        # Detener
docker compose -f docker-compose.local.yml logs -f     # Ver logs
docker compose -f docker-compose.local.yml build       # Reconstruir
```

### Ventajas

- Persiste sesion WhatsApp (carpeta `auth/`)
- Persiste conversaciones (carpeta `data/`)
- Se levanta automaticamente al reiniciar Docker Desktop
- Sin dependencia de Node.js instalado (solo Docker)

### NOTA: Cloudflare NO aplica en local

Cloudflare Access solo es necesario cuando el dashboard esta expuesto a internet (VPS). En local, el dashboard solo es accesible desde tu maquina.

---

## Opcion B · VPS con EasyPanel (produccion 24/7)

## Parte 0 · Requisitos tecnicos (git + acceso a GitHub)

EasyPanel lee el codigo desde un repositorio Git, asi que la Parte 3 necesita **git instalado** y **una forma de autenticarte con GitHub**.

### 1. ¿Esta git instalado?

Ejecuta `git --version`.

- Si responde una version → OK, sigue.
- Si falla:
  - **Windows**: descarga e instala desde `https://git-scm.com/download/win` (deja todas las opciones por defecto). Tras instalar, reinicia terminal y vuelve a `/deploy`.
  - **macOS**: ejecuta `xcode-select --install`. Alternativa: `https://git-scm.com/download/mac`.
  - **Linux**: `sudo apt install git`

### 2. ¿Hay forma de autenticarse con GitHub?

Para hacer push a un repo privado necesitas credenciales. Comprueba si esta la GitHub CLI: ejecuta `gh auth status`.

- **`gh` instalado y con "Logged in"** → camino facil. Podras crear el repo y subir todo en un solo paso.
- **`gh` instalado pero NO logueado** → guia al usuario: `gh auth login` (elige GitHub.com → HTTPS → "Login with a web browser", pega el codigo).
- **`gh` NO instalado** → dos opciones:
  - **Recomendado**: instalar la GitHub CLI (`winget install GitHub.cli` en Windows; `brew install gh` en Mac; o `https://cli.github.com`) y luego `gh auth login`.
  - **Plan B sin `gh`** (token): el usuario crea un Personal Access Token en `https://github.com/settings/personal-access-tokens/new` (fine-grained, solo el repo del agente, permiso Contents: Read and write).

### 3. No avances a la Parte 3 sin esto

Si git no esta instalado o no hay forma de autenticarse, **parate aqui** y resuelvelo primero. Las Partes 1 y 2 (VPS + EasyPanel) no necesitan git, asi que el usuario puede ir contratando el VPS mientras instala git/gh en paralelo.

## Parte 1 · Contratar VPS en Hostinger

> "Ve a hostinger.es y entra a VPS. El plan **KVM 2** vale para 5-10 agentes simultaneos (~7€/mes). Si vas a usar el VPS solo para ESTE agente, KVM 1 es suficiente (~5€/mes).
>
> Una vez compres:
>
> - Sistema operativo: **Ubuntu 24.04 con Docker** (NO el de plantillas — Ubuntu limpio con Docker)
> - Datacenter: el mas cercano a tus clientes
> - Anota la IP del VPS (la veras en el panel de Hostinger)
>
> Avisame cuando lo tengas listo."

Espera a que diga "ya lo tengo" o similar. Pidele la IP del VPS.

## Parte 2 · Instalar EasyPanel

> "Conectate al VPS por SSH (Hostinger te da un boton 'Terminal' en su panel — el mas facil) y ejecuta este comando (lo copias y pegas):
>
> ```
> curl -sSL https://get.easypanel.io | sh
> ```
>
> Tarda 2-3 minutos. Cuando termine, EasyPanel te dara una URL del tipo `http://<IP_VPS>:3000`. Abrela en el navegador y crea tu cuenta de admin.
>
> Avisame cuando estes dentro del dashboard de EasyPanel."

## Parte 3 · Subir el kit a Git

EasyPanel necesita leer el codigo desde un repositorio Git.

### Opcion A · Repositorio privado en GitHub (recomendado)

**Pasos comunes (siempre):**

- `git init` en la carpeta del kit (si no hay `.git`)
- Configura identidad si falta: `git config user.name "..."` y `git config user.email "..."`
- `git add -A`, luego **VERIFICACION DE SEGURIDAD**: `git status --short` y comprueba que NO aparecen `.env.local`, `data/` ni `auth/` (el `.gitignore` ya los excluye; `.env.example` SI se sube y es correcto)
- `git commit -m "Initial commit — WhatsApp AI Agent Kit"`

**Si `gh` estaba autenticado:** crea el repo privado Y sube en un solo comando:

```
gh repo create <nombre> --private --source=. --remote=origin --push
```

**Si NO hay `gh`:**

> "Crea un repositorio nuevo, **privado**, en github.com (sin README). Pasame la URL."

Cuando de la URL:

- `git branch -M main`
- `git remote add origin <URL>`
- `git push -u origin main`

**Aviso de seguridad**: nunca subas `.env.local`.

## Parte 4 · Crear la app en EasyPanel

> "Volvamos a EasyPanel. Vamos a crear una nueva app:
>
> 1. Click en **Create > App**
> 2. Source: **GitHub**
> 3. Conecta tu cuenta de GitHub (te abrira una ventana de OAuth)
> 4. Selecciona el repositorio y rama `main`
> 5. Build path: `/` (raiz)
> 6. Builder: **Nixpacks**
> 7. Aun NO le des a 'Deploy' — primero configura las variables y volumenes"

### Variables de entorno

> "En la pestana **Environment**, pega estas variables:
>
> ```
> OPENROUTER_API_KEY=<tu key actual>
> OPENROUTER_MODEL=openai/gpt-4o-mini
> ```
>
> Y opcionales (si las usas):
>
> ```
> GOOGLE_SHEETS_WEBHOOK_URL=...
> CAL_BOOKING_URL=...
> ```
>
> **Importante**: copia la API key de tu `.env.local` actual. NO uses una nueva."

### Volumenes persistentes (PASO CRITICO)

> "En la pestana **Mounts** (o **Volumes**), anade DOS rutas como volumenes persistentes:
>
> 1. `/app/data` → guarda la base de datos (todas las conversaciones)
> 2. `/app/auth` → guarda la sesion de WhatsApp (sin esto, cada redeploy te obliga a re-escanear el QR)
>
> Si te saltas esto, perderas conversaciones y tendras que reconectar WhatsApp constantemente."

### Dominio

> "En la pestana **Domains**, anade el dominio que vayas a usar. Anotalo — lo usaremos para Cloudflare Access."

### Deploy

> "Ahora si: click en **Deploy**. Tarda 3-5 minutos. Cuando termine, abre el dominio en el navegador.
>
> Veras el QR de WhatsApp como en local. Escanealo desde el movil del negocio.
>
> Avisame cuando hayas conectado."

## Parte 5 · Cloudflare Access (proteger el dashboard)

> "Tu dashboard ahora esta expuesto en internet. Cualquiera con el link puede ver todas las conversaciones de WhatsApp y enviar mensajes en tu nombre. Vamos a blindarlo con Cloudflare Access — es gratis y tarda 5 minutos."

### Pasos

1. Crea cuenta en `dash.cloudflare.com` si no tienes
2. Anade tu dominio a Cloudflare (te pedira cambiar los nameservers)
3. En el panel: **Zero Trust → Access → Applications → Add an application → Self-hosted**
4. Nombre: "WhatsApp Panel"
5. Dominio: el que pusiste en EasyPanel
6. Policy: "Allow" con regla "Emails ending in `@tudominio.com`" (o lista explícita)
7. **Identity provider: Email One-Time PIN** (viene activado por defecto)
8. Guardar

### Validacion

> "Abre el dominio en una ventana de incognito. Cloudflare deberia pedirte login. Solo si tu email esta en la regla, entrara al dashboard. Compruebalo con un email NO autorizado para asegurarte de que rechaza correctamente."

## Cierre

> "Despliegue completo. Tu agente esta corriendo 24/7 con:
>
> - Dashboard protegido con login
> - Base de datos persistente
> - Sesion WhatsApp persistente
>
> A partir de ahora, cada vez que hagas un cambio en el codigo local:
>
> ```
> git add .
> git commit -m 'cambios'
> git push
> ```
>
> EasyPanel redespliega automaticamente.
>
> ¿Cuanto te ha costado correrlo 24/7? 7-13€/mes. ¿Cuanto puedes cobrar a tu cliente? 80-200€/mes de mantenimiento + 800-1.500€ de implementacion.
>
> Si quieres ayuda para vender este servicio → la comunidad de Biokool: https://biokool.mx/"

## Reglas

- Si el usuario se atasca en SSH/Git → senal de que no tiene experiencia tecnica. Sugierele pedir ayuda en la comunidad
- NUNCA pidas al usuario que escriba la API key en el chat. Pide que la copie de su `.env.local` directamente al panel de EasyPanel
- NUNCA recomiendes deployar SIN Cloudflare Access
