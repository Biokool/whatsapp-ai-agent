---
description: Adapta el agente al negocio del usuario mediante 6 preguntas conversacionales. Guarda las respuestas en prompts/negocio.md.
---

# /personaliza — Adapta el agente a tu negocio

Vas a hacer 6 preguntas al usuario en orden, una a una. Después de la última, vas a escribir un archivo `prompts/negocio.md` con sus respuestas y reiniciar el bot para que las cargue. Aplica el patrón conversacional: una sola pregunta visible cada vez. No las saques todas a la vez.

## Antes de empezar — Verificaciones

1. Comprueba que existe `prompts/negocio.example.md`. Si no existe, avisa al usuario y para
2. Si `prompts/negocio.md` ya existe (el usuario lo personalizó antes):
   > "Veo que ya personalizaste antes. ¿Qué quieres hacer?
   >
   > 1. Volver a empezar de cero (sobrescribir)
   > 2. Solo cambiar 1-2 cosas (te pregunto qué)
   > 3. Cancelar"
   - Si elige 2: ofrece editar puntualmente las secciones (nombre, propuesta de valor, etc.)
   - Si elige 1: continúa con las 6 preguntas
3. Saluda:
   > "Vamos a adaptar el agente a tu negocio. Te haré 6 preguntas. Responde en lenguaje natural, sin formato — yo me encargo de estructurarlo."

## Las 6 preguntas (una a una, en orden)

### Pregunta 1 · Nombre del negocio

> "1/6 — ¿Cómo se llama tu negocio?
>
> (Ejemplo: 'Agencia Lobo', 'Pedro Marketing', 'ClickFlow Digital')"

Espera respuesta. Guárdala como `nombre`.

### Pregunta 2 · A qué se dedica

> "2/6 — ¿A qué se dedica tu negocio? En 1 frase corta.
>
> (Ejemplo: 'Ayudamos a agencias de marketing a automatizar reportes con IA')"

Espera respuesta. Guárdala como `actividad`.

### Pregunta 3 · Propuesta de valor

> "3/6 — ¿Cuál es la propuesta principal que ofreces a tus clientes? El beneficio concreto que reciben.
>
> (Ejemplo: 'Les damos un sistema que les ahorra 10h semanales y multiplica su capacidad sin contratar')"

Espera respuesta. Guárdala como `propuesta_valor`.

### Pregunta 4 · Preguntas de calificación

> "4/6 — ¿Qué preguntas tendría que hacerle el agente a un lead nuevo para saber si te interesa trabajar con él? Dime 3-4 preguntas concretas.
>
> (Ejemplo: '¿A qué se dedica tu negocio? ¿Cuántos clientes activos tienes? ¿Qué facturas al mes? ¿Cuál es tu mayor dolor ahora mismo?')"

Espera respuesta. Guárdala como `preguntas_calificacion`. Si responde con menos de 2 preguntas, pídele que añada al menos 2 más.

### Pregunta 5 · Criterios de lead bueno vs malo

> "5/6 — ¿Qué señales indican un lead bueno (te interesa cerrarlo) vs uno malo (no es tu cliente ideal)?
>
> (Ejemplo: 'BUENO: tiene negocio activo, factura más de 5k/mes, urgencia alta. MALO: solo curiosea, no tiene negocio aún, busca algo gratis')"

Espera respuesta. Guárdala como `criterios_lead`.

### Pregunta 6 · Acción cuando el lead encaja

> "6/6 — Cuando el lead encaja y quiere avanzar, ¿qué quieres que pase exactamente?
>
> 1. Le mando un link a Cal.com (o Calendly) para que agende llamada
> 2. Le derivo a un humano (a ti o a tu equipo) por WhatsApp
> 3. Otra cosa (descríbeme)"

Espera respuesta. Guárdala como `accion_lead`. Si elige 1, pídele el link de Cal.com.

## Después de las 6 preguntas

1. **Resumen y confirmación**: muéstrale las 6 respuestas formateadas. Pregunta:

   > "¿Está todo correcto?
   >
   > 1. Sí, guarda
   > 2. Corregir algo (¿qué?)"

2. **Escribe `prompts/negocio.md`** con la siguiente estructura (sustituyendo `<VALOR>` por la respuesta del usuario):

```markdown
---
nombre: <nombre>
actividad: <actividad>
generado: <ISO timestamp>
---

# Datos del negocio

## Nombre

<nombre>

## A qué se dedica

<actividad>

## Propuesta de valor

<propuesta_valor>

## Preguntas de calificación al lead

<preguntas_calificacion>

## Criterios de lead bueno vs malo

<criterios_lead>

## Acción cuando el lead encaja

<accion_lead>
```

3. **Validación**: lee el archivo recién creado y verifica que tiene las 6 secciones. Si falta alguna → reinténtalo

4. **Si el usuario eligió la opción 1 en pregunta 6**: actualiza `CAL_BOOKING_URL` en `.env.local` con el link que dio

5. **Reinicia el bot** para que cargue el nuevo prompt:
   - Si `npm run start:all` está corriendo, mátalo
   - Vuelve a arrancarlo
   - Espera a que `connection_state.status === 'connected'`

6. **Test final**:
   > "✓ Listo. He personalizado el agente con los datos de **<nombre>**. Para probarlo: desde otro WhatsApp, escríbele 'hola' a tu número conectado. Ahora debería responder con personalidad propia.
   >
   > Si quieres ajustar algo más, vuelve a ejecutar `/personaliza`.
   >
   > Cuando estés listo para desplegar 24/7 → `/deploy`."

## Reglas

- Una pregunta a la vez. NUNCA enseñes las 6 a la vez
- Si el usuario responde algo muy corto/genérico, pídele más detalle ("¿puedes ser más concreto? por ejemplo...")
- NUNCA modifiques `src/lib/system-prompt.ts`. El system prompt lee `prompts/negocio.md` automáticamente
- Si el usuario no sabe responder a una pregunta, sugiérele que mire `prompts/ejemplos/` (hay 3 casos completos: agencia-ia, ecommerce, infoproducto) para inspirarse
- Si el usuario se atasca y no sabe cómo definir su negocio → derívale al equipo de Biokool: "Esto lo trabajamos contigo, sin presión. Pregúntalo en la comunidad de Biokool (https://biokool.mx/)"
