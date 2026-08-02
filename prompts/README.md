# Carpeta `prompts/`

Aquí vive la "personalidad" de tu agente. En vez de tocar código TypeScript, el agente lee este archivo Markdown al arrancar y lo inyecta en el system prompt del LLM.

## Archivos

| Archivo                    | Para qué                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `negocio.md`               | **EL TUYO.** Se autorrellena con `/personaliza`. Si no existe, el agente usa un prompt genérico |
| `negocio.example.md`       | Plantilla vacía con las 6 secciones que el agente espera                                        |
| `ejemplos/agencia-ia.md`   | Ejemplo completo: agencia de IA que califica leads                                              |
| `ejemplos/ecommerce.md`    | Ejemplo completo: tienda online con consulta de stock                                           |
| `ejemplos/infoproducto.md` | Ejemplo completo: vendedor de cursos online                                                     |

## Cómo crear/cambiar tu `negocio.md`

### Opción A · Con Claude Code (recomendado)

Escribe `/personaliza` en Claude Code. Te hará 6 preguntas y rellena el archivo por ti.

### Opción B · Manual

1. Copia `negocio.example.md` a `negocio.md`
2. Rellena las 6 secciones a mano
3. Reinicia el bot (`npm run start:all`)

### Opción C · Copia un ejemplo

1. Copia `ejemplos/agencia-ia.md` (o el que más se parezca a tu caso) a `negocio.md`
2. Cambia los datos para que encajen con TU negocio
3. Reinicia el bot

## Cómo se usa el archivo

`src/lib/system-prompt.ts` lee `negocio.md` al arrancar y lo inyecta en el system prompt que se le pasa al LLM. Si cambias `negocio.md`, necesitas reiniciar el bot para que cargue los nuevos datos.

## Reglas

- Escribe en **lenguaje natural**, no en código
- Sé **concreto**: en vez de "ayudo a empresas", di "ayudo a agencias de marketing de 5-20 empleados a automatizar reportes mensuales"
- Las preguntas de calificación deben ser **2-4 máximo**: el lead no quiere que le entrevisten
- Define con claridad qué hace al agente derivar a humano (precios específicos, casos especiales, quejas)
