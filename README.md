# Planificador de comidas de casa — *Mesa Semanal*

Página web de una sola pieza, sin dependencias ni build, para organizar las comidas de casa. Los datos viven en ficheros CSV dentro de `datos/`, legibles y editables directamente desde GitHub.

**En internet:** https://diegocalvogit.github.io/planificador-comida/

## Estructura

```
index.html                     la aplicación entera
datos/platos.csv               repertorio de platos con sus ingredientes
datos/ingredientes.csv         a qué sección del súper pertenece cada ingrediente, y en qué orden van
datos/equilibrio.csv           objetivos semanales por grupo nutricional (editables desde la web)
datos/semanas.csv              histórico de semanas planificadas
datos/despensa.csv             ingredientes que hay en casa
scripts/actualizar-respaldo.py sincroniza la copia de los CSV incrustada en index.html
```

Los CSV usan **`;` como separador** (el que espera Excel en español) y **`|` para las listas** dentro de una celda. Ningún valor puede contener `;`.

## Las cuatro pestañas

**Platos** — Los 23 platos del repertorio: descripción, tipo de alimento, momento (comida, cena o ambos), tiempo de preparación (bajo, medio, alto), repetición (siempre, alta, media, baja, ocasional) e ingredientes. Se busca y se filtra por cualquiera de esas columnas.

Todo plato es **editable por completo** desde su botón *Editar*, venga del CSV o lo hayas añadido tú: los ocho campos, los grupos a los que pertenece y cuál de ellos es la base que le da color. Un plato editado se marca como *modificado* y tiene un *Deshacer cambios* que lo devuelve a lo que dice el CSV; también se puede eliminar. Al renombrar o borrar un plato, sus huecos en las semanas ya planificadas se actualizan solos.

Si escribes un ingrediente que no está en `ingredientes.csv`, el editor te pide su sección del súper ahí mismo, para que no acabe en el cajón de *Otros*.

**Semana** — Reparto de lunes a domingo con comida y cena, 14 huecos. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

Cada hueco se pinta del color de la **base del plato** — el primer grupo de su columna `grupos` — así que la semana se lee de un vistazo: pescado azul en azul, carne roja en rojo, verdura en verde, legumbre en ocre. La leyenda está bajo el calendario.

*Generar semana* propone un reparto que:

- respeta el momento de cada plato y no repite plato dentro de la semana;
- evita que la misma base caiga en la comida y la cena del mismo día;
- pondera según la columna `repeticion`, de modo que un plato *siempre* sale mucho más que uno *ocasional*;
- reserva lo de preparación *alta* para el fin de semana y prefiere preparación *baja* en las cenas entre semana;
- persigue estos objetivos, que salen de `datos/equilibrio.csv`:

| Grupo | Objetivo semanal |
| --- | --- |
| Legumbres | 2–3 |
| Arroces | 1–2 |
| Pescado blanco y marisco | 3–4 |
| Pescado azul | 1–2 |
| Carne blanca | 3–4 |
| Carne roja o magra | 1–2 |
| Huevo | 2–3 |

Los objetivos son **ajustables antes de generar**: *Ajustar objetivos antes de generar* abre un mínimo y un máximo por grupo, y *Volver a los valores del documento* deshace los cambios. Por defecto valen los del documento, es decir, la semana que sale de fábrica ya está equilibrada.

Cualquier hueco se cambia a mano pulsando sobre él.

**Compra** — Lista derivada de forma determinista de los ingredientes de los platos de la semana abierta, agrupada por sección del súper en el orden en que esas secciones aparecen en `ingredientes.csv`, que es el orden en que se recorre la tienda; la panadería va la última. Un ingrediente aparece si, y solo si, está en `platos.csv`. Cada ingrediente se marca como *ya lo tengo*: eso es la despensa, es común a todas las semanas y sigue marcado al generar la siguiente.

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
