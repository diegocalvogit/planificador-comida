# Planificador de comidas de casa — *Mesa Semanal*

Página web de una sola pieza, sin dependencias ni build, para organizar las comidas de casa. Los datos viven en ficheros CSV dentro de `datos/`, legibles y editables directamente desde GitHub.

**En internet:** https://diegocalvogit.github.io/planificador-comida/

## Estructura

```
index.html                     la aplicación entera
datos/platos.csv               repertorio de los adultos, con sus ingredientes
datos/platos-nino.csv          repertorio del niño
datos/ingredientes.csv         a qué sección del súper pertenece cada ingrediente, y en qué orden van
datos/equilibrio.csv           objetivos semanales de los adultos (editables desde la web)
datos/equilibrio-nino.csv      objetivos semanales del niño
datos/semanas.csv              histórico de semanas de los adultos, una fila por plato
datos/semanas-nino.csv         histórico de semanas del niño
datos/despensa.csv             ingredientes que hay en casa
scripts/actualizar-respaldo.py sincroniza la copia de los CSV incrustada en index.html
```

Hay **dos repertorios independientes**, adultos y niño, cada uno con sus platos, sus semanas y sus objetivos de equilibrio. Lo que comparten es la despensa, el catálogo de ingredientes y la lista de la compra.

Los CSV usan **`;` como separador** (el que espera Excel en español) y **`|` para las listas** dentro de una celda. Ningún valor puede contener `;`.

## Las seis pestañas

**Platos** — Los 23 platos del repertorio: descripción, tipo de alimento, momento (comida, cena o ambos), tiempo de preparación (bajo, medio, alto), repetición (siempre, alta, media, baja, ocasional), **plato único** (sí o no) e ingredientes. Se busca y se filtra por cualquiera de esas columnas.

Todo plato es **editable por completo** desde su botón *Editar*, venga del CSV o lo hayas añadido tú: los ocho campos, los grupos a los que pertenece y cuál de ellos es la base que le da color. Un plato editado se marca como *modificado* y tiene un *Deshacer cambios* que lo devuelve a lo que dice el CSV; también se puede eliminar. Al renombrar o borrar un plato, sus huecos en las semanas ya planificadas se actualizan solos.

Si escribes un ingrediente que no está en `ingredientes.csv`, el editor te pide su sección del súper ahí mismo, para que no acabe en el cajón de *Otros*.

**Semana adultos** — Reparto de lunes a domingo con comida y cena, 14 huecos. Cada comida y cada cena admiten **dos platos**, el 1º y el 2º, y el segundo no siempre hace falta: eso es lo que dice la columna `plato_unico`. Un plato marcado como único (paella, lentejas con pollo, fajitas) resuelve la comida él solo; uno marcado como no único (tomate con mozzarella, tortilla, gambas al ajillo) es medio menú y pide acompañante. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

Dentro de cada día, una banda ámbar abre la **comida** y una azul la **cena**, y cada plato lleva delante su 1º o 2º. Los platos se pintan del color de su **base** — el primer grupo de su columna `grupos` — así que la semana se lee de un vistazo: pescado azul en azul, carne roja en rojo, verdura en verde, legumbre en ocre. La leyenda está bajo el calendario.

*Generar semana* propone un reparto que:

- respeta el momento de cada plato y no repite plato dentro de la semana;
- si el primer plato no es único, le busca un segundo que tampoco lo sea, y prefiere uno que no haya salido esa semana;
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

**Semana niño** — Igual, pero contando con que come al mediodía en la guardería: de partida solo tiene cena de lunes a viernes, y comida y cena el sábado y el domingo, nueve huecos. El botón **+ comida** de cada día habilita esa comida cuando hay vacaciones o un día suelto en casa, y **− comida** la quita junto con el plato que tuviera. El estado de cada día se guarda por semana, así que unas vacaciones no afectan al resto.

Su equilibrio sale de `equilibrio-nino.csv` y persigue otros objetivos: verdura 3-5, pescado 2-3, carne blanca 2-3, huevo 1-2, legumbre 1-2 y congelados 1-2.

**Compra** — Una sola lista con los ingredientes de **las dos semanas**, primeros y segundos platos incluidos, derivada de forma determinista de los ingredientes de los platos de la semana abierta, agrupada por sección del súper en el orden en que esas secciones aparecen en `ingredientes.csv`, que es el orden en que se recorre la tienda; la panadería va la última. Un ingrediente aparece si, y solo si, está en `platos.csv`. Cada ingrediente se marca como *ya lo tengo*: eso es la despensa, es común a todas las semanas y sigue marcado al generar la siguiente.

**Histórico** — Todas las semanas planificadas, con los huecos cubiertos de adultos y de niño en cada una, y un botón para abrir cualquiera de ellas. Las dos semanas se mueven juntas: cambiar de semana en una pestaña cambia también la otra, porque es la misma semana real de la casa.

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
