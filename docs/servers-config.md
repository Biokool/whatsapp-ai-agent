# Guía Rápida - Ejecución de Servicios

> **Reference Card** | Copia rápida para ejecutar todos los servicios

---

## Estado Actual de Servicios Docker

```
┌─────────────────┬──────────────────────────────┬─────────┬────────────────────┐
│ Servicio        │ Imagen                       │ Puerto  │ URL                │
├─────────────────┼──────────────────────────────┼─────────┼────────────────────┤
│ Evolution API   │ atendai/evolution-api        │ 8081    │ localhost:8081     │
│ N8N             │ n8nio/n8n                    │ 5678    │ localhost:5678     │
│ PostgreSQL      │ postgres:13                  │ 5432    │ (interno)          │
│ N8N Ngrok       │ ngrok/ngrok                  │ 4040    │ localhost:4040     │
└─────────────────┴──────────────────────────────┴─────────┴────────────────────┘
```

---

## Comandos Rápidos

### Verificar Estado

```powershell
# Ver todos los contenedores
docker ps

# Ver solo nombres
docker ps --format "{{.Names}}"

# Verificar puertos
netstat -ano | findstr "8081 5678 3000"
```

### Acceder a Servicios

```powershell
# Evolution API Manager
Start-Process "http://localhost:8081/manager/"

# N8N Editor
Start-Process "http://localhost:5678/workflow/"

# Dashboard WhatsApp
Start-Process "http://localhost:3000"

# PKM Documentos
Start-Process "http://localhost:3456"
```

### Logs en Tiempo Real

```powershell
# Evolution API
docker logs evolution_api -f --tail 50

# N8N
docker logs n8n -f --tail 50

# PostgreSQL
docker logs postgres_db -f --tail 50
```

### Reiniciar Servicios

```powershell
# Reiniciar todo
docker restart evolution_api n8n postgres_db

# Reiniciar uno específico
docker restart evolution_api
```

---

## API Keys y Credenciales

### Evolution API

```
API Key: 429683C4C977415CAAFCCE10F7D57E11
Instance: aimalobato (o la que crees)
```

### OpenRouter (LLM)

```
API Key: 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
Modelo: openai/gpt-4o-mini
```

### PostgreSQL

```
Host: localhost (o postgres_db en Docker)
Port: 5432
DB: evolution_db
User: postgres
Password: typebot
```

---

## Endpoints de la API

### Evolution API - Mensajes

```bash
# Enviar mensaje de texto
curl -X POST http://localhost:8081/message/sendText/aimalobato \
  -H "Content-Type: application/json" \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "number": "521234567890",
    "text": "Hola desde la API"
  }'

# Enviar imagen
curl -X POST http://localhost:8081/message/sendMedia/aimalobato \
  -H "Content-Type: application/json" \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "number": "521234567890",
    "mediatype": "image",
    "media": "https://ejemplo.com/imagen.jpg",
    "caption": "Imagen de prueba"
  }'
```

### Evolution API - Instancias

```bash
# Listar instancias
curl http://localhost:8081/instance/fetchInstances \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11"

# Crear instancia
curl -X POST http://localhost:8081/instance/create \
  -H "Content-Type: application/json" \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "instanceName": "aimalobato",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'

# Verificar estado
curl http://localhost:8081/instance/connectionState/aimalobato \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11"
```

### N8N - Webhooks

```bash
# Webhook de prueba
curl -X POST http://localhost:5678/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Listar workflows
curl http://localhost:5678/api/v1/workflows \
  -H "Accept: application/json"
```

---

## Flujo de Configuración

### Paso 1: Verificar Servicios Docker

```powershell
docker ps
# Esperado: evolution_api, n8n, postgres_db corriendo
```

### Paso 2: Acceder a Evolution API

```
1. Abrir http://localhost:8081/manager/
2. Crear instancia "aimalobato"
3. Escanear QR con WhatsApp
4. Verificar estado: connected
```

### Paso 3: Configurar Webhook en N8N

```
1. Abrir http://localhost:5678/workflow/
2. Importar workflow de WhatsApp
3. Configurar webhook URL
4. Activar workflow
```

### Paso 4: Configurar Webhook en Evolution

```bash
curl -X POST http://localhost:8081/webhook/set/aimalobato \
  -H "Content-Type: application/json" \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "url": "http://localhost:5678/webhook/whatsapp",
    "events": ["messages.upsert"]
  }'
```

### Paso 5: Probar el Sistema

```
1. Enviar mensaje a tu número de WhatsApp
2. Verificar en N8N que el webhook recibió el evento
3. Verificar respuesta del agente
4. Verificar en Evolution API que el mensaje se envió
```

---

## Troubleshooting

### Evolution API no responde

```powershell
docker restart evolution_api
docker logs evolution_api --tail 20
```

### N8N no carga

```powershell
docker restart n8n
docker logs n8n --tail 20
```

### QR no aparece

```powershell
# Verificar estado de instancia
curl http://localhost:8081/instance/connectionState/aimalobato \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11"

# Recrear instancia si es necesario
curl -X DELETE http://localhost:8081/instance/delete/aimalobato \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11"
```

### Webhook no recibe eventos

```powershell
# Verificar que N8N está activo
curl http://localhost:5678/healthz

# Verificar webhook en Evolution
curl http://localhost:8081/webhook/find/aimalobato \
  -H "apiKey: 429683C4C977415CAAFCCE10F7D57E11"
```

---

## Archivos Importantes

| Archivo                       | Descripción                                |
| ----------------------------- | ------------------------------------------ |
| `config/servers.json`         | Configuración de servidores (local/remote) |
| `.env.local`                  | Variables de entorno del bot               |
| `docs/architecture-system.md` | Documentación completa de arquitectura     |
| `docs/servers-config.md`      | Este archivo                               |

---

_Última actualización: Julio 2026_
