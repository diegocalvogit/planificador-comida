# Planificador de comidas de casa — *Menú Semanal*

Página web de una sola pieza, sin dependencias ni build, para organizar las comidas de casa. Los datos viven en ficheros CSV dentro de `datos/`, legibles y editables directamente desde GitHub.

**En internet:** https://diegocalvogit.github.io/planificador-comida/

## Estructura

```
index.html                     la aplicación entera
datos/platos.csv               el repertorio entero, con una marca por menú
datos/tipos.csv                catálogo cerrado de tipos de alimento, con su clave de color
datos/ingredientes.csv         catálogo cerrado de ingredientes, con su sección del súper
datos/equilibrio.csv           objetivos semanales de los adultos, sobre esos tipos
datos/equilibrio-nino.csv      objetivos semanales del niño
datos/semanas.csv              histórico de semanas de los adultos, una fila por plato
datos/semanas-nino.csv         histórico de semanas del niño, una fila por plato
datos/compras.csv              qué había en casa cada semana, el histórico de la compra
datos/despensa.csv             los básicos que siempre hay en casa
scripts/actualizar-respaldo.py sincroniza la copia de los CSV incrustada en index.html
```

Hay **un solo repertorio de platos** y dos menús, adultos y niño. Cada plato lleva las columnas `adultos` y `nino` diciendo en cuáles entra: la paella solo en el de adultos, la crema de verduras solo en el del niño, el restaurante en los dos. Cada menú sí tiene sus semanas y sus objetivos de equilibrio propios. La despensa, los ingredientes y la lista de la compra son comunes.

Los CSV usan **`;` como separador** (el que espera Excel en español) y **`|` para las listas** dentro de una celda. Ningún valor puede contener `;`.

## Las siete pestañas

**Platos** — El repertorio: descripción, **tipo de alimento** (selección múltiple sobre el catálogo de `tipos.csv`: verdura, tubérculo, legumbre, arroz, pasta, pescado blanco o azul, marisco, carne blanca o roja, embutido, huevo, lácteo, queso…). Esa es la **única clasificación** que hay: describe el plato, le da su color en el calendario y es la que mide el equilibrio de la semana. El primer tipo marcado es la **base** y decide el color. Además: **momentos** en que se come (desayuno, almuerzo, comida, merienda y cena; un bizcocho puede ser desayuno y merienda a la vez), tiempo de preparación (bajo, medio, alto), repetición (siempre, alta, media, baja, ocasional, nunca), **plato único** (sí o no) e ingredientes. Se busca y se filtra por cualquiera de esas columnas, y **se ordena pulsando en la cabecera**, como en una hoja de cálculo: una vez ascendente, otra descendente.

**Exportar a Excel** baja un `.xlsx` con lo que se ve en ese momento: respeta los filtros y el orden, y el botón dice cuántos platos saldrán cuando hay algo filtrado. La hoja lleva la cabecera fija y en negrita, autofiltro y anchos de columna. El fichero se construye a mano en `index.html` —un xlsx no es más que un ZIP de XML— para no meter ninguna librería externa en una página que no tiene ninguna.

Todo plato es **editable por completo** desde su botón *Editar*, venga del CSV o lo hayas añadido tú: todos los campos, los grupos a los que pertenece y cuál de ellos es la base que le da color. Un plato editado se marca como *modificado* y tiene un *Deshacer cambios* que lo devuelve a lo que dice el CSV; también se puede eliminar. Al renombrar o borrar un plato, sus huecos en las semanas ya planificadas se actualizan solos.

Los ingredientes **solo se eligen del catálogo**: el editor los ofrece con autocompletado y rechaza lo que no esté en él. Así no acaban conviviendo «pimiento», «pimientos» y «piniento».

La columna **Menús** lleva una casilla por menú, marcable desde la propia tabla: así se pasa un plato de un menú a otro sin duplicarlo. Desmarcar la última casilla no borra el plato, solo lo deja fuera de los dos menús; para eliminarlo del repertorio está el botón del editor. Al sacarlo de un menú, se quita también de las semanas de ese menú.

**Desayunos y meriendas** — La misma tabla que *Platos*, con los mismos filtros, el mismo editor y el mismo
exportador a Excel, pero enseñando lo que se come fuera de la mesa grande: **desayuno**, **almuerzo** de media
mañana y **merienda**. Sale del mismo `datos/platos.csv`; lo único que separa las dos pestañas es la columna
`momento`, que es una lista. Un plato que vale para varios momentos aparece en las dos.

**Semana adultos** — Reparto de lunes a domingo con los **cinco momentos del día**: desayuno, almuerzo,
comida, merienda y cena. Son **35 huecos** por semana. Todos admiten dos platos, el 1º y el 2º, salvo el
almuerzo de media mañana, que tiene uno solo. El segundo no siempre hace falta: eso es lo que dice la columna `plato_unico`. Un plato marcado como único (paella, lentejas con pollo, fajitas) resuelve la comida él solo; uno marcado como no único (tomate con mozzarella, tortilla, gambas al ajillo) es medio menú y pide acompañante. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

Dentro de cada día, cada momento abre con su banda de color — melocotón el desayuno, verde el almuerzo,
ámbar la comida, lila la merienda y azul la cena — y cada plato lleva delante su 1º o 2º. Los platos se pintan del color de su **base** — el primer tipo de su columna `tipo` — así que la semana se lee de un vistazo: pescado azul en azul, carne roja en rojo, verdura en verde, legumbre en ocre. La leyenda está bajo el calendario.

*Generar semana* propone un reparto que:

- respeta los momentos de cada plato y no repite plato dentro de la semana, **salvo en desayuno, almuerzo y
  merienda**, donde repetir es lo normal: ahí manda la columna `repeticion` y un café con leche sale los siete días;
- si el primer plato no es único, le busca un segundo que tampoco lo sea, y prefiere uno que no haya salido esa semana;
- evita que la misma base caiga en la comida y la cena del mismo día;
- y al terminar **repasa lo colocado**: cambia platos sueltos mientras eso acerque la semana a los objetivos, porque colocar de una pasada deja objetivos fuera de rango;
- pondera según la columna `repeticion`, de modo que un plato *siempre* sale mucho más que uno *ocasional*, y uno marcado como *nunca* no entra jamás en un reparto automático: se pone solo a mano;
- reserva lo de preparación *alta* para el fin de semana y prefiere preparación *baja* en las cenas entre semana;
- persigue estos objetivos, que salen de `datos/equilibrio.csv`. Se cuentan **veces por semana**, es decir
  comidas y no platos: una comida con lentejas y pollo suma una vez en legumbres y una en carne blanca, no dos
  veces en nada. Miden **los 35 huecos**, desayunos y meriendas incluidos:

| Objetivo | Tipos que cuenta | Veces por semana |
| --- | --- | --- |
| Verduras | Verdura | 8–16 |
| Fruta | Fruta | 7–14 |
| Lácteos | Lácteo, Queso | 7–14 |
| Pan y cereales | Pan y cereales | 7–14 |
| Patatas y tubérculos | Tubérculo | 2–5 |
| Legumbres | Legumbre | 2–4 |
| Arroz | Arroz | 2–4 |
| Pasta | Pasta | 2–4 |
| Pescado y marisco | Pescado blanco, Pescado azul, Marisco | 3–4 |
| Pescado azul | Pescado azul | 1–2 |
| Carne blanca | Carne blanca | 2–4 |
| Carne roja | Carne roja | 0–1 |
| Embutido y fiambre | Embutido y fiambre | 0–3 |
| Huevo | Huevo | 2–4 |
| Fruto seco | Fruto seco | 0–4 |
| Preparado o congelado | Preparado o congelado | 0–2 |
| Fuera de casa | Fuera de casa | 0–2 |

Un objetivo que no se cumple se pinta **en rojo**, con una flecha que dice si falta o si se pasa. Los objetivos se cumplen si el repertorio da para ello. Con un solo plato de pasta en el menú de adultos, pedir *2 a 4 comidas con pasta* deja ese objetivo en rojo de
vez en cuando: no es un fallo del reparto sino que faltan platos de esa clase. Los objetivos son **ajustables antes de generar**: *Ajustar objetivos antes de generar* abre un mínimo y un máximo por grupo, y *Volver a los valores del documento* deshace los cambios. Por defecto valen los del documento, es decir, la semana que sale de fábrica ya está equilibrada.

Cualquier hueco se cambia a mano pulsando sobre él. El botón **Guardar** de la propia pestaña sube los cambios a GitHub sin pasar por el Histórico, y dice cuántos ficheros hay pendientes.

**Semana niño** — **La misma estructura que la de adultos**: treinta y cinco huecos, los cinco momentos del día. Que coma entre semana en la guardería no es un caso especial del programa, sino un plato más: **Menú guarde**, que el generador coloca en la comida de lunes a viernes. Es plato único, no tiene ingredientes y por tanto no suma nada a la compra, y su repetición es *nunca*, así que no aparece en ningún otro hueco por su cuenta.

Si un día no va a la guardería, se sustituye ese Menú guarde por uno o dos platos normales, igual que en el menú de los adultos. No hay nada que habilitar.

Su equilibrio sale de `equilibrio-nino.csv` y persigue los mismos objetivos que el de adultos con valores algo más bajos: verduras 5-12, pan y cereales 5-12, legumbres 1-3, pescado y marisco 2-3, frutos secos 0-2 y embutido 0-2; fruta y lácteos van igual, 7-14. La guardería lleva su propio contador, 0-5, separado del de comer fuera.

**Compra** — Una sola lista con los ingredientes de **las dos semanas**, primeros y segundos platos incluidos, con sus propias flechas para moverte de una semana a otra. Es determinista: sale de los ingredientes de los platos de la semana abierta, agrupada por sección del súper en el orden en que esas secciones aparecen en `ingredientes.csv`, que es el orden en que se recorre la tienda; la panadería va la última. Un ingrediente aparece si, y solo si, está en `platos.csv`. Cada ingrediente se marca como *ya lo tengo*, y esa marca **pertenece a esa semana**: queda registrada en `compras.csv` como histórico de lo que había en casa. Lo que una semana no diga de un ingrediente se hereda de la última semana que sí lo diga, y en último término de `despensa.csv`, los básicos fijos. Así una semana nueva arranca con la foto de la anterior sin borrar lo que pasó en las pasadas.

**Ingredientes** — El catálogo, la única fuente de la que salen los ingredientes de los platos. Cada uno con su sección del súper y los platos que lo usan; se busca, se filtra por sección y por si está en uso o suelto. Desde aquí se añaden, se renombran —lo que arrastra a todos los platos, la despensa y el histórico de compras— y se borran, siempre que no los use ningún plato.

**Histórico** — Todas las semanas planificadas, con las comidas resueltas de cada menú y una etiqueta por semana: **guardada** si es idéntica a la del repositorio, **sin guardar** si la has tocado desde la última vez. La pestaña se marca con un punto naranja mientras quede algo sin guardar. De cada semana se ve cuántas comidas tiene resueltas en cada menú y cuántos ingredientes lleva su compra. Botones para abrir o borrar cualquiera de ellas. Borrar una semana se lleva sus dos menús y su compra. Las dos semanas se mueven juntas: cambiar de semana en una pestaña cambia también la otra, porque es la misma semana real de la casa.

## Cómo se guardan los cambios

Todo lo que tocas en la web se guarda primero en el `localStorage` del navegador. La pestaña **Histórico** dice en todo momento cuántos ficheros tienes sin guardar y cuáles, y ofrece tres salidas:

**Guardar en GitHub** reescribe los CSV de `datos/` directamente en el repositorio, con un commit por fichero, usando la API de GitHub. La primera vez pide un token:

1. En `github.com/settings/personal-access-tokens/new`
2. Repository access: *Only select repositories* → `planificador-comida`
3. Repository permissions: `Contents` en *Read and write*. Ningún permiso más.
4. Con caducidad.

El token se guarda en el `localStorage` de ese navegador y solo viaja a `api.github.com`. No sale de ahí, pero quien use ese navegador o tenga instalada una extensión podría leerlo: de ahí que convenga acotarlo a este repositorio y ponerle fecha de caducidad. *Olvidar token* lo borra. Un token robado solo permite tocar este repositorio, y se revoca desde la propia página de GitHub.

**Descargar** / **Copiar**, en cada fichero, para hacerlo a mano si prefieres no usar token.

**Descartar y recargar** tira lo que haya en el navegador y vuelve a lo que diga el repositorio, que es la forma de resolver cualquier descuadre entre dispositivos.

Después de guardar, GitHub Pages tarda un par de minutos en republicar la web.

La web solo genera una semana por su cuenta la primera vez, cuando el repositorio aún no tiene ninguna. Con histórico guardado no inventa nada: los repartos los pides tú con *Generar semana*.

## Trabajar con el proyecto

Los CSV se leen con `fetch`, que el navegador bloquea al abrir el fichero desde disco. Para que `index.html` también funcione con doble clic, lleva una copia de cada CSV incrustada en bloques `<script type="text/csv">`. Después de editar cualquier fichero de `datos/`:

```
python scripts/actualizar-respaldo.py
```

Para verlo en local igual que en Pages:

```
python -m http.server 8765
```

## Dos platos especiales

**Restaurante** está en los dos repertorios, para los días que se sale de la planificación. No tiene ingredientes, así que no suma nada a la compra; es plato único, así que no pide segundo; su grupo es *fuera de casa*, que no compite con los grupos nutricionales y lleva su propio contador en el panel de equilibrio; y su repetición es *nunca*, de modo que el generador no lo propone solo.

**Parrillada de verduras** —calabacín, berenjena, pimiento, cebolla y espárragos— es el plato de solo verduras de los adultos, pensado como primero o guarnición: no es plato único.

## Origen de los datos

El repertorio procede del documento *Listado de Platos Clasificados — Menú Equilibrado*, del que salen la clasificación nutricional y el momento recomendado de cada plato. Los ingredientes de cada plato se derivaron de su descripción.
