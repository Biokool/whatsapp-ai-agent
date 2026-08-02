# 03 · Personalizar el agente para tu negocio

El agente recién instalado responde con un prompt genérico tipo "asistente amable". Para que entienda **TU** negocio, hay que rellenar el archivo `prompts/negocio.md`.

## Cómo funciona

El archivo `src/lib/system-prompt.ts` lee `prompts/negocio.md` al arrancar y lo inyecta en el system prompt del modelo de IA. **No tocas código** — solo escribes en lenguaje natural en un archivo Markdown.

## Opción 1 · Con Claude Code (recomendado, 5 min)

En VS Code, abre Claude Code y escribe:

```
/personaliza
```

Te hará 6 preguntas en orden:

1. ¿Cómo se llama tu negocio?
2. ¿A qué se dedica?
3. ¿Cuál es tu propuesta de valor?
4. ¿Qué preguntas hay que hacerle al lead para calificarlo?
5. ¿Qué criterios indican un lead bueno vs uno malo?
6. ¿Qué quieres que pase cuando el lead encaja?

Responde en lenguaje natural. Claude escribe el archivo por ti.

## Opción 2 · Manual (15 min)

1. Copia un ejemplo que se parezca a tu caso:
   - `prompts/ejemplos/agencia-ia.md` — servicios B2B
   - `prompts/ejemplos/ecommerce.md` — venta online
   - `prompts/ejemplos/infoproducto.md` — cursos/formaciones
2. Pégalo como `prompts/negocio.md`
3. Edita las 6 secciones para que reflejen tu negocio real

## Opción 3 · Desde cero (avanzado)

1. Copia `prompts/negocio.example.md` a `prompts/negocio.md`
2. Rellena las 6 secciones a mano

## Después de personalizar

**Tienes que reiniciar el bot** para que cargue el nuevo prompt:

1. En la terminal donde corre el bot, pulsa `Ctrl + C`
2. Vuelve a ejecutar `npm run start:all`

Ahora prueba enviando un mensaje desde otro WhatsApp. Debería responder con la personalidad de tu negocio.

## Tips para escribir un buen `negocio.md`

- **Sé concreto**. En vez de "ayudamos a empresas", di "ayudamos a agencias de marketing de 5-20 empleados a automatizar reportes mensuales"
- **2-4 preguntas máximo** para calificar. Más es interrogatorio
- **Define con claridad** qué hace que un lead encaje. Si no, el agente intentará venderle a todo el mundo
- **Sé honesto** con los criterios de NO encaje. El agente debe responder cordialmente sin agendar si no califica

## Iterar

Si después de probar ves que el agente:

- **Pregunta cosas innecesarias** → simplifica las preguntas en negocio.md
- **No engancha** → mejora la propuesta de valor (más concreta, beneficio claro)
- **Es demasiado vendedor** → añade en el archivo "Tono: conversacional, sin presión, sin urgencia falsa"
- **No deriva a humano cuando debería** → especifica más casos en "criterios de lead malo"

Cualquier cambio en `negocio.md` requiere reiniciar el bot.

## Siguiente paso

Sigue a [04-configurar-tools.md](04-configurar-tools.md) para conectar Google Sheets y Cal.com.

---

## Knowledge Base (Documentación del Negocio)

Además del prompt, puedes subir **catálogos, FAQs, documentación técnica o páginas web** para que el agente los consulte automáticamente.

### Cómo funciona

1. **Sube documentos o agrega URLs** al Dashboard (pestaña Knowledge)
2. El sistema los procesa y genera embeddings vectoriales
3. Cuando alguien pregunta algo relevante, el agente consulta los documentos
4. La respuesta incluye información de tus catálogos

### Tipos de fuentes de conocimiento

| Tipo                            | Ejemplo                                | Por qué                               |
| ------------------------------- | -------------------------------------- | ------------------------------------- |
| **Catálogo de productos (PDF)** | Lista de productos con precios y specs | El agente puede citar precios exactos |
| **FAQ (TXT/MD)**                | Preguntas frecuentes de clientes       | Respuestas consistentes y rápidas     |
| **Manual técnico (PDF)**        | Instrucciones de uso o instalación     | Soporte técnico automatizado          |
| **Lista de servicios (TXT)**    | Descripción de servicios con precios   | Cotizaciones automáticas              |
| **Páginas web (URL)**           | Documentación online, blog, wiki       | Contenido siempre actualizado         |

### Formatos soportados

**Archivos:**

- **PDF** (recomendado para catálogos)
- **TXT** (texto plano)
- **MD** (Markdown)

**URLs:**

- Cualquier página web pública
- Documentación online
- Wikis y blogs

**Tamaño máximo:** 10MB por archivo

### Cómo agregar conocimiento

#### Opción 1: Subir archivo

1. Abre http://localhost:3000
2. Ve a la pestaña **Knowledge** (icono 🎓 en el sidebar)
3. Click **+ Nuevo** para crear una Knowledge Base
4. Escribe un nombre descriptivo (ej: "Catálogo Biokool 2026")
5. Click en la KB para expandirla
6. Arrastra un PDF o haz click para seleccionar
7. Espera a que el status cambie a **Listo** con el conteo de chunks

#### Opción 2: Agregar URL

1. En la KB expandida, haz click en **+ Agregar desde URL**
2. Escribe la URL de la página web (ej: `https://biokool.mx/productos`)
3. Haz click en **Agregar**
4. El sistema extraerá el contenido y lo procesará
5. Espera a que el status cambie a **Listo**

### Tips para mejores resultados

- **Documentos bien estructurados** funcionan mejor
- **Incluye precios y especificaciones** en tablas o listas
- **Evita PDFs escaneados** (imágenes) — el sistema extrae texto
- **Divide documentos grandes** en archivos separados por tema
- **Nombra claramente** cada Knowledge Base para organizar
- **Para URLs**: usa páginas con contenido estático (evita páginas que cambian mucho)

### Ejemplo de uso

**Pregunta del usuario:** "¿Cuánto cuesta el sistema de climatización Biokool X200?"

**Sin Knowledge Base:** "No tengo información sobre precios. Te recomiendo contactar a un vendedor."

**Con Knowledge Base:** "El sistema de climatización Biokool X200 tiene un precio de $15,999 MXN. Incluye compresor inverter de 3 toneladas, 2 evaporadores y control WiFi. La instalación tiene un costo adicional de $3,500 MXN."
