# Arquitectura del Sistema - WhatsApp AI Agent

> **Documento Ejecutivo** | Versión 1.0 | Julio 2026

---

## Resumen Ejecutivo

El sistema **WhatsApp AI Agent** es una plataforma de automatización de comunicación que integra un agente de inteligencia artificial con WhatsApp Business API a través de Evolution API, orquestado por N8N para flujos de trabajo automatizados.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL (WhatsApp)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVOLUTION API (Puerto 8081)                         │
│                     WhatsApp Business API Gateway                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Gestión de instancias WhatsApp                                          │
│  • Envío/recepción de mensajes                                             │
│  • Webhooks para eventos                                                   │
│  • Gestión de medios (imágenes, documentos, etc.)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          N8N (Puerto 5678)                                 │
│                    Motor de Orquestación de Flujos                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Webhooks entrantes (mensajes de WhatsApp)                               │
│  • Procesamiento de lenguaje natural                                       │
│  • Integración con LLM (OpenRouter)                                        │
│  • Gestión de conversaciones                                               │
│  • Flujos de automatización personalizables                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPENROUTER / LLM                                    │
│                      Inteligencia Artificial                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Procesamiento de lenguaje natural                                       │
│  • Generación de respuestas                                                │
│  • Tool calling (funciones especiales)                                     │
│  • Modelos: GPT-4o-mini, Claude, Gemini                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS (PostgreSQL)                            │
│                    Almacenamiento de Datos                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Instancias de WhatsApp                                                  │
│  • Historial de conversaciones                                             │
│  • Datos de contactos                                                      │
│  • Configuración del sistema                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Evolution API

**Función:** Gateway de WhatsApp Business API

| Característica | Detalle |
|----------------|---------|
| **Versión** | atendai/evolution-api:latest |
| **Puerto** | 8081 (externo) / 8080 (interno Docker) |
| **Base de datos** | PostgreSQL 13 |
| **API Key** | `429683C4C977415CAAFCCE10F7D57E11` |
| **URL Admin** | http://localhost:8081/manager/ |

**Responsabilidades:**
- Gestión de instancias de WhatsApp (crear, eliminar, reconectar)
- Envío y recepción de mensajes
- Gestión de medios (imágenes, documentos, audio, video)
- Webhooks para eventos en tiempo real
- Autenticación y seguridad

**Endpoints Principales:**
```
POST   /instance/create          - Crear instancia
DELETE /instance/delete/{name}   - Eliminar instancia
POST   /message/sendText         - Enviar texto
POST   /message/sendMedia        - Enviar medios
GET    /instance/connectionState  - Estado de conexión
POST   /webhook/set              - Configurar webhook
```

### 2. N8N (Next Generation Node)

**Función:** Motor de orquestación y automatización

| Característica | Detalle |
|----------------|---------|
| **Versión** | n8nio/n8n:latest |
| **Puerto** | 5678 |
| **Base de datos** | SQLite (interno) |
| **URL Editor** | http://localhost:5678/workflow/ |
| **Webhook Base** | http://localhost:5678/webhook/ |

**Responsabilidades:**
- Recepción de webhooks de Evolution API
- Procesamiento y enrutamiento de mensajes
- Integración con LLM para generación de respuestas
- Gestión de estado de conversaciones
- Flujos de automatización personalizables
- Conexión con servicios externos (Google Sheets, Calendly, etc.)

**Flujo Principal:**
```
Webhook Entrada → Validación → Procesamiento LLM → Generación Respuesta → Envío
       │              │              │                    │                │
       ▼              ▼              ▼                    ▼                ▼
   Evolution     Autenticar     OpenRouter          Tool Calling     Evolution
     API           Token          API                 (si aplica)        API
```

### 3. Base de Datos (PostgreSQL)

**Función:** Almacenamiento persistente de datos

| Característica | Detalle |
|----------------|---------|
| **Versión** | PostgreSQL 13 |
| **Puerto** | 5432 (interno Docker) |
| **Base de datos** | evolution_db |
| **Usuario** | postgres |
| **Contraseña** | typebot |

**Esquema Principal:**
```sql
-- Instancias de WhatsApp
CREATE TABLE instances (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    status VARCHAR(50),
    created_at TIMESTAMP
);

-- Conversaciones
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    instance_id UUID REFERENCES instances(id),
    contact_phone VARCHAR(20),
    status VARCHAR(50),
    created_at TIMESTAMP
);

-- Mensajes
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    direction VARCHAR(10), -- 'inbound' o 'outbound'
    content TEXT,
    media_url VARCHAR(500),
    created_at TIMESTAMP
);
```

### 4. LLM (OpenRouter)

**Función:** Inteligencia artificial para procesamiento de lenguaje natural

| Característica | Detalle |
|----------------|---------|
| **Proveedor** | OpenRouter |
| **Modelo Principal** | openai/gpt-4o-mini |
| **Modelo Fallback** | anthropic/claude-haiku-4-5 |
| **API Key** | Configurada en servers.json |

**Capacidades:**
- Comprensión de mensajes en múltiples idiomas
- Generación de respuestas contextuales
- Tool calling para ejecutar acciones
- Clasificación de intención del usuario
- Extracción de información estructurada

---

## Flujo de Mensajes

### Mensaje Entrante (WhatsApp → Sistema)

```
1. Usuario envía mensaje por WhatsApp
           │
           ▼
2. Evolution API recibe el mensaje
           │
           ▼
3. Webhook notifica a N8N
           │
           ▼
4. N8N procesa el mensaje:
   a. Valida la instancia
   b. Busca/crea conversación
   c. Almacena mensaje en BD
   d. Envía al LLM para procesar
   e. Genera respuesta
   f. Ejecuta tools si es necesario
           │
           ▼
5. N8N envía respuesta a Evolution API
           │
           ▼
6. Evolution API entrega mensaje al usuario
```

### Mensaje Saliente (Sistema → WhatsApp)

```
1. Agente humano escribe respuesta (Dashboard)
           │
           ▼
2. Dashboard envía a N8N API
           │
           ▼
3. N8N encola mensaje en BD
           │
           ▼
4. Evolution API envía por WhatsApp
           │
           ▼
5. Confirmación de entrega
```

---

## Endpoints y Conexiones

### Evolution API

| Servicio | URL Local | URL Producción |
|----------|-----------|----------------|
| Admin Panel | http://localhost:8081/manager/ | https://api.yourdomain.com/manager/ |
| API REST | http://localhost:8081 | https://api.yourdomain.com |
| Webhook | http://localhost:5678/webhook/whatsapp | https://n8n.yourdomain.com/webhook/whatsapp |

### N8N

| Servicio | URL Local | URL Producción |
|----------|-----------|----------------|
| Editor | http://localhost:5678/workflow/ | https://n8n.yourdomain.com/workflow/ |
| API | http://localhost:5678/api/v1 | https://n8n.yourdomain.com/api/v1 |
| Webhooks | http://localhost:5678/webhook/ | https://n8n.yourdomain.com/webhook/ |

### Dashboard

| Servicio | URL Local | URL Producción |
|----------|-----------|----------------|
| App | http://localhost:3000 | https://app.yourdomain.com |
| PKM Docs | http://localhost:3456 | https://docs.yourdomain.com |

---

## Seguridad

### Autenticación

- **Evolution API:** API Key en header `apiKey`
- **N8N:** Basic Auth o Token
- **Dashboard:** Sesión JWT (futuro)

### Variables Sensibles

| Variable | Ubicación | Descripción |
|----------|-----------|-------------|
| `EVOLUTION_API_KEY` | .env | API Key de Evolution |
| `OPENROUTER_API_KEY` | .env | API Key de LLM |
| `DB_PASSWORD` | .env | Contraseña PostgreSQL |
| `N8N_AUTH` | .env | Credenciales N8N |

---

## Despliegue Local (Docker)

### Servicios Activos

```bash
# Verificar servicios
docker ps

# Resultado esperado:
# evolution_api    atendai/evolution-api:latest    Up    0.0.0.0:8081->8080
# n8n              n8nio/n8n:latest                Up    0.0.0.0:5678->5678
# postgres_db      postgres:13                     Up    5432/tcp
# n8n-ngrok        ngrok/ngrok:latest              Up    0.0.0.0:4040->4040
```

### Comandos Útiles

```bash
# Ver logs de Evolution API
docker logs evolution_api -f

# Ver logs de N8N
docker logs n8n -f

# Reiniciar Evolution API
docker restart evolution_api

# Acceder al shell de PostgreSQL
docker exec -it postgres_db psql -U postgres -d evolution_db
```

---

## Switching entre Entornos

El sistema soporta múltiples entornos configurados en `config/servers.json`:

1. **Local** - Desarrollo con Docker local
2. **Staging** - Pruebas en servidor de pre-producción
3. **Production** - Servidor de producción

Para cambiar de entorno:
1. Editar `config/servers.json`
2. Cambiar `active: true` al entorno deseado
3. Reiniciar los servicios del dashboard

---

## Roadmap

### Fase 1: Configuración Local ✅
- [x] Evolution API configurada
- [x] N8N operativo
- [x] Base de datos conectada
- [x] LLM integrado

### Fase 2: Flujos de Trabajo
- [ ] Configurar webhook en Evolution API
- [ ] Crear workflow principal en N8N
- [ ] Integrar tool calling con LLM
- [ ] Configurar gestos de conversación

### Fase 3: Dashboard
- [ ] Panel de monitoreo en tiempo real
- [ ] Gestión de conversaciones
- [ ] Métricas y analytics

### Fase 4: Producción
- [ ] Configurar dominios y SSL
- [ ] Implementar autenticación
- [ ] Monitoreo y alertas
- [ ] Backup automático

---

## Contacto Soporte

- **Documentación:** http://localhost:3456
- **Evolution API Manager:** http://localhost:8081/manager/
- **N8N Editor:** http://localhost:5678/workflow/

---

*Documento generado por PKM - WhatsApp AI Agent*
