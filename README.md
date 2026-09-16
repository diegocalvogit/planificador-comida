# Planificador de comidas de casa — *Mesa Semanal*

Página web de una sola pieza, sin dependencias ni build, para organizar las comidas de casa. Los datos viven en ficheros CSV dentro de `datos/`, legibles y editables directamente desde GitHub.

**En internet:** https://diegocalvogit.github.io/planificador-comida/

## Estructura

```
index.html                     la aplicación entera
datos/platos.csv               repertorio de platos con sus ingredientes
datos/ingredientes.csv         a qué sección del súper pertenece cada ingrediente
datos/equilibrio.csv           objetivos semanales por grupo nutricional
datos/semanas.csv              histórico de semanas planificadas
datos/despensa.csv             ingredientes que hay en casa
scripts/actualizar-respaldo.py sincroniza la copia de los CSV incrustada en index.html
```

Los CSV usan **`;` como separador** (el que espera Excel en español) y **`|` para las listas** dentro de una celda. Ningún valor puede contener `;`.

## Las cuatro pestañas

**Platos** — Los 23 platos del repertorio: descripción, tipo de alimento, momento recomendado (comida, cena o ambos) e ingredientes. Se busca, se filtra por momento y por grupo, y se pueden añadir platos nuevos.

**Semana** — Reparto de lunes a domingo con comida y cena, 14 huecos. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

*Generar semana* propone un reparto que respeta el momento recomendado de cada plato, no repite plato dentro de la semana, evita que el mismo grupo caiga en la comida y la cena del mismo día, y persigue los objetivos de `datos/equilibrio.csv`:

| Grupo | Objetivo semanal |
| --- | --- |
| Legumbres | 2–3 |
| Arroces | 1–2 |
| Pescado blanco y marisco | 3–4 |
| Pescado azul | 1–2 |
| Carne blanca | 3–4 |
| Carne roja o magra | 1–2 |
| Huevo | 2–3 |

Cualquier hueco se cambia a mano pulsando sobre él.

**Compra** — Lista derivada de forma determinista de los ingredientes de los platos de la semana abierta, agrupada por sección del súper. Un ingrediente aparece si, y solo si, está en `platos.csv`. Cada ingrediente se marca como *ya lo tengo*: eso es la despensa, es común a todas las semanas y sigue marcado al generar la siguiente.

**Histórico** — Todas las semanas planificadas, las del repositorio y las hechas en este navegador, con un botón para abrir cualquiera de ellas.

## Cómo se guardan los cambios

Una página estática servida por GitHub Pages puede **leer** los CSV del repositorio, pero no puede escribir en él: para eso haría falta un token de GitHub incrustado en el HTML, lo que en un repositorio público equivale a regalar el acceso a la cuenta.

Por eso los cambios se guardan primero en el `localStorage` del navegador, y la pestaña **Histórico** ofrece, para cada fichero, un botón *Descargar* y otro *Copiar*. El fichero descargado sustituye al de `datos/` y se sube al repositorio con un commit normal. A partir de ese momento el dato es común a todos los dispositivos.

## Trabajar con el proyecto

Los CSV se leen con `fetch`, que el navegador bloquea al abrir el fichero desde disco. Para que `index.html` también funcione con doble clic, lleva una copia de cada CSV incrustada en bloques `<script type="text/csv">`. Después de editar cualquier fichero de `datos/`:

```
python scripts/actualizar-respaldo.py
```

Para verlo en local igual que en Pages:

```
python -m http.server 8765
```

## Origen de los datos

El repertorio procede del documento *Listado de Platos Clasificados — Menú Equilibrado*, del que salen la clasificación nutricional y el momento recomendado de cada plato. Los ingredientes de cada plato se derivaron de su descripción.
