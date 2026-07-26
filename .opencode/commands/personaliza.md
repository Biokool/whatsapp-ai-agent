---
description: Adapta el agente al negocio del usuario mediante 6 preguntas conversacionales. Guarda las respuestas en prompts/negocio.md.
---

# /personaliza — Adapta el agente a tu negocio

Vas a hacer 6 preguntas al usuario en orden, una a una. Despues de la ultima, vas a escribir un archivo `prompts/negocio.md` con sus respuestas y reiniciar el bot para que las cargue. Aplica el patron conversacional: una sola pregunta visible cada vez. No las saques todas a la vez.

## Antes de empezar — Verificaciones

1. Comprueba que existe `prompts/negocio.example.md`. Si no existe, avisa al usuario y para
2. Si `prompts/negocio.md` ya existe (el usuario lo personalizo antes):
   > "Veo que ya personalizaste antes. ¿Que quieres hacer?
   >
   > 1. Volver a empezar de cero (sobrescribir)
   > 2. Solo cambiar 1-2 cosas (te pregunto que)
   > 3. Cancelar"
   - Si elige 2: ofrece editar puntualmente las secciones (nombre, propuesta de valor, etc.)
   - Si elige 1: continua con las 6 preguntas
3. Saluda:
   > "Vamos a adaptar el agente a tu negocio. Te hare 6 preguntas. Responde en lenguaje natural, sin formato — yo me encargo de estructurarlo."

## Las 6 preguntas (una a una, en orden)

### Pregunta 1 · Nombre del negocio

> "1/6 — ¿Como se llama tu negocio?
>
> (Ejemplo: 'Agencia Lobo', 'Pedro Marketing', 'ClickFlow Digital')"

Espera respuesta. Guardala como `nombre`.

### Pregunta 2 · A que se dedica

> "2/6 — ¿A que se dedica tu negocio? En 1 frase corta.
>
> (Ejemplo: 'Ayudamos a agencias de marketing a automatizar reportes con IA')"

Espera respuesta. Guardala como `actividad`.

### Pregunta 3 · Propuesta de valor

> "3/6 — ¿Cual es la propuesta principal que ofreces a tus clientes? El beneficio concreto que reciben.
>
> (Ejemplo: 'Les damos un sistema que les ahorra 10h semanales y multiplica su capacidad sin contratar')"

Espera respuesta. Guardala como `propuesta_valor`.

### Pregunta 4 · Preguntas de calificacion

> "4/6 — ¿Que preguntas tendria que hacerle el agente a un lead nuevo para saber si te interesa trabajar con el? Dime 3-4 preguntas concretas.
>
> (Ejemplo: '¿A que se dedica tu negocio? ¿Cuantos clientes activos tienes? ¿Que facturas al mes? ¿Cual es tu mayor dolor ahora mismo?')"

Espera respuesta. Guardala como `preguntas_calificacion`. Si responde con menos de 2 preguntas, pidele que anada al menos 2 mas.

### Pregunta 5 · Criterios de lead bueno vs malo

> "5/6 — ¿Que senales indican un lead bueno (te interesa cerrarlo) vs uno malo (no es tu cliente ideal)?
>
> (Ejemplo: 'BUENO: tiene negocio activo, factura mas de 5k/mes, urgencia alta. MALO: solo curiosea, no tiene negocio aun, busca algo gratis')"

Espera respuesta. Guardala como `criterios_lead`.

### Pregunta 6 · Accion cuando el lead encaja

> "6/6 — Cuando el lead encaja y quiere avanzar, ¿que quieres que pase exactamente?
>
> 1. Le mando un link a Cal.com (o Calendly) para que agende llamada
> 2. Le derivo a un humano (a ti o a tu equipo) por WhatsApp
> 3. Otra cosa (descríbeme)"

Espera respuesta. Guardala como `accion_lead`. Si elige 1, pidele el link de Cal.com.

## Despues de las 6 preguntas

1. **Resumen y confirmacion**: muestrale las 6 respuestas formateadas. Pregunta:
   > "¿Esta todo correcto?
   >
   > 1. Si, guarda
   > 2. Corregir algo (¿que?)"

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

## A que se dedica
<actividad>

## Propuesta de valor
<propuesta_valor>

## Preguntas de calificacion al lead
<preguntas_calificacion>

## Criterios de lead bueno vs malo
<criterios_lead>

## Accion cuando el lead encaja
<accion_lead>
```

3. **Validacion**: lee el archivo recien creado y verifica que tiene las 6 secciones. Si falta alguna → reintentalo

4. **Si el usuario eligio la opcion 1 en pregunta 6**: actualiza `CAL_BOOKING_URL` en `.env.local` con el link que dio

5. **Reinicia el bot** para que cargue el nuevo prompt:
   - Si `npm run start:all` esta corriendo, matalo
   - Vuelve a arrancarlo
   - Espera a que `connection_state.status === 'connected'`

6. **Test final**:
   > "Listo. He personalizado el agente con los datos de **<nombre>**. Para probarlo: desde otro WhatsApp, escribele 'hola' a tu numero conectado. Ahora deberia responder con personalidad propia.
   >
   > Si quieres ajustar algo mas, vuelve a ejecutar `/personaliza`.
   >
   > Cuando estes listo para desplegar 24/7 → `/deploy`."

## Reglas

- Una pregunta a la vez. NUNCA ensenes las 6 a la vez
- Si el usuario responde algo muy corto/generico, pidele mas detalle ("¿puedes ser mas concreto? por ejemplo...")
- NUNCA modifiques `src/lib/system-prompt.ts`. El system prompt lee `prompts/negocio.md` automaticamente
- Si el usuario no sabe responder a una pregunta, sugierele que mire `prompts/ejemplos/` (hay 3 casos completos) para inspirarse
- Si el usuario se atasca y no sabe como definir su negocio → derivele al equipo de Biokool: "Esto lo trabajamos contigo, sin presion. Preguntalo en la comunidad de Biokool (https://biokool.mx/)"
