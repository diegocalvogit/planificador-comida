# Planificador de comidas de casa — *Mesa Semanal*

Página web de una sola pieza (`index.html`, sin dependencias ni build) para organizar las comidas de casa a partir del repertorio de platos de la familia.

## Qué hace

**1 · Platos** — Tabla con los 23 platos del repertorio: descripción, tipo de alimento, momento recomendado (comida, cena o ambos) e ingredientes. Se puede buscar, filtrar por momento y por grupo nutricional, y añadir platos nuevos.

**2 · Semana** — Reparto de lunes a domingo con comida y cena (14 huecos). El botón *Generar semana* propone un menú que respeta el momento recomendado de cada plato y los criterios de equilibrio semanal:

| Grupo | Objetivo semanal |
| --- | --- |
| Legumbres | 2–3 |
| Arroces | 1–2 |
| Pescado blanco y marisco | 3–4 |
| Pescado azul | 1–2 |
| Carne blanca | 3–4 |
| Carne roja o magra | 1–2 |
| Huevo | 2–3 |

Ningún plato se repite en la misma semana y se evita coincidir el mismo grupo en la comida y la cena del mismo día. Cualquier hueco se puede cambiar a mano por otro plato del repertorio.

**3 · Compra** — Lista derivada de forma determinista de los ingredientes de los platos asignados: agrupada por sección del súper (frutería, pescadería, carnicería, lácteos, panadería, despensa) y con cada ingrediente marcable como *ya lo tengo en casa*. Lo que se marca desaparece de la lista a comprar. Un ingrediente aparece si, y solo si, está en la tabla de platos.

## Datos

Los platos, sus ingredientes y la sección del súper de cada ingrediente están en el propio `index.html`, en las constantes `BASE`, `SECCION` y `GRUPOS`. Para cambiar el repertorio se editan ahí.

El menú de la semana, la despensa y los platos añadidos se guardan en el `localStorage` del navegador: no salen del dispositivo y no se comparten entre navegadores ni personas.

## Cómo usarlo

Abrir `index.html` en cualquier navegador. No necesita servidor. Para publicarlo, GitHub Pages sirviendo la rama `main` desde la raíz.

## Origen

El repertorio procede del documento *Listado de Platos Clasificados — Menú Equilibrado*, con la clasificación nutricional y el momento recomendado de cada plato.
