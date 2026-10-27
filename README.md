# Planificador de comidas de casa — *Menú Semanal*

Página web de una sola pieza, sin build, para organizar las comidas de casa. Los datos viven en una base
Postgres en Supabase, y la página los lee y los escribe directamente desde el navegador.

**En internet:** https://planificador-comida-nine.vercel.app

## Estructura

```
index.html                 la aplicación entera
supabase/01-esquema.sql    las tablas, sus restricciones y los permisos
supabase/02-datos.sql      el volcado con el que se estrenó la base
```

Eso es todo. No hay dependencias ni paso de compilación: la única librería externa es
`supabase-js`, que se carga desde un CDN.

### La base de datos

```
hogar         los correos con acceso. Ninguna política la deja leer: solo se toca desde el panel
secciones     las secciones del súper, con el orden en que se recorre la tienda
ingredientes  catálogo cerrado, cada uno en su sección
tipos         catálogo cerrado de tipos de alimento, con su clave de color y su orden
equilibrio    los objetivos semanales de la casa, sobre esos tipos
platos        el repertorio entero, con una marca por menú
semanas       el histórico, una fila por plato; la columna `menu` dice si es de la casa o del niño
compras       qué había en casa cada semana
despensa      los básicos que siempre hay
```

Hay **un solo repertorio de platos** y dos menús, casa y niño. Cada plato lleva las columnas `adultos` y
`nino` diciendo en cuáles entra: la paella solo en el de casa, los purés solo en el del niño, el restaurante
en los dos. El equilibrio es **uno solo, el de la casa**. La semana del niño no se planifica aparte: se
deriva de la de la casa. La despensa, los ingredientes y la lista de la compra son comunes.

Postgres hace dos cosas que un CSV no hacía. Las listas —tipos, momentos, ingredientes de un plato— son
**arrays de verdad**, no texto separado por barras. Y las claves ajenas de `semanas` hacia `platos` van **en
cascada**: renombrar un plato arrastra solo todas sus apariciones en las semanas, y borrarlo las limpia.

### Quién puede entrar

Se entra con un **enlace mágico** al correo, sin contraseña. La clave que lleva la página es la
*publishable* de Supabase, que es pública por diseño y está a la vista en el código: lo que protege los datos
no es ella, sino las políticas del propio Postgres. Sin una sesión cuyo correo esté en la tabla `hogar`, la
base responde `42501` y no devuelve ni una fila — ni siquiera una lectura. El rol anónimo no tiene permiso
sobre el esquema `public`.

Si alguien se registra por su cuenta en el proyecto, entra en Supabase pero no ve nada. Para dar acceso a
alguien hay que añadir su correo a mano:

```sql
insert into public.hogar (email) values ('quien.sea@ejemplo.com');
```

La clave **secret** de Supabase y la contraseña de la base se saltan todo esto. No están en el repositorio ni
deben estarlo: viven solo en el panel.

## Las cinco pestañas## Las seis pestañas

**Platos** — El repertorio: descripción, **tipo de alimento** (selección múltiple sobre el catálogo de `tipos.csv`: verdura, tubérculo, legumbre, arroz, pasta, pescado blanco o azul, marisco, carne blanca o roja, embutido, huevo, lácteo, queso…). Esa es la **única clasificación** que hay: describe el plato, le da su color en el calendario y es la que mide el equilibrio de la semana. El primer tipo marcado es la **base** y decide el color. Además: **momentos** en que se come (desayuno, almuerzo, comida, merienda y cena; un bizcocho puede ser desayuno y merienda a la vez), tiempo de preparación (bajo, medio, alto), repetición (siempre, alta, media, baja, ocasional, nunca), **plato único** (sí o no) e ingredientes. Se busca y se filtra por cualquiera de esas columnas, y **se ordena pulsando en la cabecera**, como en una hoja de cálculo: una vez ascendente, otra descendente. El filtro de **momento del día** es una fila de fichas: partiendo de todas encendidas, pulsar una quiere decir «enséñame solo esta», y a partir de ahí se van sumando o quitando. Apagarlas todas equivale a encenderlas todas.

**Exportar a Excel** baja un `.xlsx` con lo que se ve en ese momento: respeta los filtros y el orden, y el botón dice cuántos platos saldrán cuando hay algo filtrado. La hoja lleva la cabecera fija y en negrita, autofiltro y anchos de columna. El fichero se construye a mano en `index.html` —un xlsx no es más que un ZIP de XML— para no meter ninguna librería externa en una página que no tiene ninguna.

Todo plato es **editable por completo** desde su botón *Editar*, venga del volcado inicial o lo hayas añadido tú: todos los campos, los grupos a los que pertenece y cuál de ellos es la base que le da color. También se puede eliminar. Al renombrar o borrar un plato, sus huecos en las semanas ya planificadas se actualizan solos.

Los ingredientes **solo se eligen del catálogo**: el editor los ofrece con autocompletado y rechaza lo que no esté en él. Así no acaban conviviendo «pimiento», «pimientos» y «piniento».

La columna **Menús** lleva una casilla por menú, marcable desde la propia tabla: así se pasa un plato de un menú a otro sin duplicarlo. Desmarcar la última casilla no borra el plato, solo lo deja fuera de los dos menús; para eliminarlo del repertorio está el botón del editor. Al sacarlo de un menú, se quita también de las semanas de ese menú.

**Semana** — Reparto de lunes a domingo con los **cinco momentos del día**: desayuno, almuerzo,
comida, merienda y cena. Son **35 huecos** por semana. Todos admiten dos platos, el 1º y el 2º, salvo el
almuerzo de media mañana, que tiene uno solo. El segundo no siempre hace falta: eso es lo que dice la columna `plato_unico`. Un plato marcado como único (paella, lentejas con pollo, fajitas) resuelve la comida él solo; uno marcado como no único (tomate con mozzarella, tortilla, gambas al ajillo) es medio menú y pide acompañante. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

Dentro de cada día, cada momento abre con su banda de color — melocotón el desayuno, verde el almuerzo,
ámbar la comida, lila la merienda y azul la cena — y cada plato lleva delante su 1º o 2º. Los platos se pintan del color de su **base** — el primer tipo de su columna `tipo` — así que la semana se lee de un vistazo: pescado azul en azul, carne roja en rojo, verdura en verde, legumbre en ocre. La leyenda está bajo el calendario.

*Generar semana* propone un reparto que:

- respeta los momentos de cada plato y no repite plato dentro de la semana, **salvo en desayuno, almuerzo y
  merienda**, donde repetir es lo normal: ahí manda la columna `repeticion` y un café con leche sale los siete días;
- si el primer plato no es único, le busca un segundo que tampoco lo sea, y prefiere uno que no haya salido esa semana;
- evita que la misma base caiga en la comida y la cena del mismo día;
- y al terminar **repasa lo colocado**: cambia platos sueltos mientras eso acerque la semana a los objetivos, porque colocar de una pasada deja objetivos fuera de rango. El repaso prueba antes con los platos del grupo que va corto que al azar, y si un plato único resuelve el hueco retira el segundo que sobraba. Nunca coloca lo marcado como *nunca* — el restaurante y los platos de guardería se ponen a mano o con su botón;
- pondera según la columna `repeticion`, de modo que un plato *siempre* sale mucho más que uno *ocasional*, y uno marcado como *nunca* no entra jamás en un reparto automático: se pone solo a mano;
- reserva lo de preparación *alta* para el fin de semana y prefiere preparación *baja* en las cenas entre semana;
- persigue estos objetivos, que salen de la tabla `equilibrio`. Se cuentan **veces por semana**, es decir
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

El bloque va **plegado en una línea** con lo que incumple —*Fruta −4 · Lácteos −3*—, en rojo si hay algo fuera y en verde si no; se despliega entero con la flecha, y recuerda cómo lo dejaste. En el móvil lo que no cabe se corta con puntos suspensivos.

El botón **Imprimir** saca la semana entera en **una hoja A4 apaisada**: siete columnas, una por día, sin barras ni botones. Medido sobre seis semanas generadas, la más llena ocupa 674 px de los 733 que caben.

Un objetivo que no se cumple se pinta **en rojo**, con una flecha que dice si falta o si se pasa. Los objetivos se cumplen si el repertorio da para ello. Con un solo plato de pasta en el menú de adultos, pedir *2 a 4 comidas con pasta* deja ese objetivo en rojo de
vez en cuando: no es un fallo del reparto sino que faltan platos de esa clase. Los objetivos son **ajustables antes de generar**: *Ajustar objetivos antes de generar* abre un mínimo y un máximo por grupo, y *Volver a los valores del documento* deshace los cambios. Por defecto valen los del documento, es decir, la semana que sale de fábrica ya está equilibrada.

**El plato que falta se da de alta ahí mismo.** En el buscador del selector se escribe `Nombre del plato; ingrediente, ingrediente` y aparece un botón *Crear plato*. Si algún ingrediente no está en el catálogo, primero pregunta en qué parte del súper va. Después abre el editor con el nombre, los ingredientes y el momento del hueco ya puestos, y con **los tipos de alimento propuestos**: los deduce de los platos que ya usan esos ingredientes, quedándose con los ingredientes específicos —el aceite de oliva, que está en diecisiete platos, no opina— y con los tipos que destacan sobre su frecuencia normal. Solo hay que repasar la propuesta y guardar; el plato queda creado y puesto en el hueco.

Cualquier hueco se cambia a mano pulsando sobre él. El selector ofrece **solo los platos de ese momento**: en una cena no aparecen los desayunos. Una casilla, *Ver también los platos de otros momentos*, abre la puerta al resto para el día que quieras merendar un plato de cena, y dice cuántos hay detrás. El plato que ya ocupa el hueco se enseña siempre, aunque sus momentos hayan cambiado después, con una nota que lo avisa. Los cambios suben a la base en cuanto los haces; el semáforo de la cabecera dice cómo va.

### El niño, dentro de la misma semana

Hay **una sola pestaña de semana** y lo que se ve en ella es la mesa de casa: el 1º y el 2º de cada momento,
editables pulsando encima. Debajo de los platos de cada momento va lo del niño.

Mientras coma lo mismo que vosotros ahí solo hay un botón, **+ añadir platos del niño**. En cuanto le pones un
plato suyo, ese momento pasa a ser suyo: lo que elijas es lo único que come —no se suma a lo que había— y el
botón reaparece como **+ añadir otro plato del niño** para el segundo, si ese momento admite dos. El almuerzo
solo admite uno, así que ahí el botón desaparece en cuanto pones el primero. Cada plato suyo se cambia pulsando
encima y se quita con la **×**; al quitar el último, el momento vuelve a lo de la mesa.

```
COMIDA
1º  Parrillada de verduras
    Verdura
2º  Croquetas congeladas
    Preparado o congelado
    NIÑO 1º  Berenjenas rellenas        ×
    NIÑO 2º  Croquetas congeladas       ×
```

Las reglas son dos y no hay más:

- **cambiar un plato de la mesa arrastra al niño** si en ese hueco comía lo mismo. Si tenía platos suyos
  puestos, se respetan;
- **al generar, su semana se deriva de la de la casa**: copia lo que puede comer, pone la guardería donde toca
  y, para lo que no está en su menú, busca el plato suyo más parecido — misma base, mismos tipos, misma
  condición de plato único. Esa sustitución no tiene azar, y por eso el programa sabe después si un hueco suyo
  es una excepción tuya o simplemente lo que le tocaba.

Que coma en la guardería no es un caso especial del programa, sino tres platos más: **Desayuno guarde**,
**Almuerzo guarde** y **Menú guarde**. Son platos únicos, no tienen ingredientes y por tanto no suman nada a la
compra, y su repetición es *nunca*, así que no aparecen en ningún hueco por su cuenta. En la semana aparecen
en su bloque como *en la guardería*, en gris: se pueden cambiar pulsando encima, para el día que no vaya.

Por eso hay **dos botones de generar**:

- *Generar semana* — la guardería cubre **solo la comida** de lunes a viernes. Cinco huecos.
- *Generar con guarde* — cubre **el desayuno, el almuerzo y la comida**. Quince huecos, y en casa quedan las
  meriendas, las cenas y el fin de semana entero.

Si un día no va a la guardería, se cambia ese plato por uno normal desde su propia línea. No hay nada que habilitar.

El aviso al generar dice cómo ha quedado el reparto: cuántos huecos cubre la guardería y en cuántos come el niño
algo distinto. **El equilibrio mide la mesa de casa**, no las excepciones del niño.

**Compra** — Una sola lista con los ingredientes de **las dos semanas**, primeros y segundos platos incluidos, con sus propias flechas para moverte de una semana a otra. Es determinista: sale de los ingredientes de los platos de la semana abierta, agrupada por sección del súper en el orden que marca la tabla `secciones`, que es el orden en que se recorre la tienda; la panadería va la última. Un ingrediente aparece si, y solo si, lo usa algún plato. Cada ingrediente se marca como *ya lo tengo*, y esa marca **pertenece a esa semana**: queda registrada en la tabla `compras` como histórico de lo que había en casa. Lo que una semana no diga de un ingrediente se hereda de la última semana que sí lo diga, y en último término de la tabla `despensa`, los básicos fijos. Así una semana nueva arranca con la foto de la anterior sin borrar lo que pasó en las pasadas.

**Ingredientes** — El catálogo, la única fuente de la que salen los ingredientes de los platos. Cada uno con su sección del súper y los platos que lo usan; se busca, se filtra por sección y por si está en uso o suelto. Desde aquí se añaden, se renombran —lo que arrastra a todos los platos, la despensa y el histórico de compras— y se borran, siempre que no los use ningún plato.

**Histórico** — Todas las semanas planificadas, con las comidas resueltas de cada menú y una etiqueta por semana: **guardada** si es idéntica a la del repositorio, **sin guardar** si la has tocado desde la última vez. La pestaña se marca con un punto naranja mientras quede algo sin guardar. De cada semana se ve cuántas comidas tiene resueltas en cada menú y cuántos ingredientes lleva su compra. Botones para abrir o borrar cualquiera de ellas. Borrar una semana se lleva sus dos menús y su compra. Las dos semanas se mueven juntas: cambiar de semana en una pestaña cambia también la otra, porque es la misma semana real de la casa.

## Cómo se guardan los cambios

**Solos, en cuanto los haces.** No hay botón de guardar: en la pestaña Semana hay un semáforo que se pone
ámbar mientras sube, verde cuando está, y rojo con el motivo si algo falla.

Por dentro no se rastrea qué cambió. Cada vez que tocas algo, la página calcula las filas que **debería**
tener cada tabla y las compara con la última foto conocida de la base, mandando nada más que las diferencias.
Resulta mucho más robusto que ir apuntando cambios uno a uno: da igual qué parte de la aplicación haya tocado
el estado, porque lo que cuenta es en qué se diferencia del resultado.

El orden de esa subida está pensado: **primero todo lo que entra, de padres a hijos; después lo que sale, de
hijos a padres**. Así un plato renombrado no se lleva por delante sus semanas, porque para cuando se borra el
nombre viejo ya no lo referencia ninguna.

En el `localStorage` del navegador ya solo quedan dos cosas sin ninguna importancia: qué pestaña y qué semana
estabas mirando.

## Trabajar con el proyecto

```bash
python -m http.server 8080
```

Y abrir `http://localhost:8080`. Hace falta servirlo: abrir `index.html` con doble clic no vale, porque el
enlace mágico necesita una dirección de verdad a la que volver. Esa dirección tiene que estar además en
**Authentication → URL Configuration** de Supabase, o el enlace del correo rebotará al sitio equivocado.

Para rehacer la base desde cero, los dos ficheros de `supabase/` en orden, en el editor SQL del panel.

## Dos platos especiales

**Restaurante** está en los dos repertorios, para los días que se sale de la planificación. No tiene ingredientes, así que no suma nada a la compra; es plato único, así que no pide segundo; su grupo es *fuera de casa*, que no compite con los grupos nutricionales y lleva su propio contador en el panel de equilibrio; y su repetición es *nunca*, de modo que el generador no lo propone solo.

**Parrillada de verduras** —calabacín, berenjena, pimiento, cebolla y espárragos— es el plato de solo verduras de los adultos, pensado como primero o guarnición: no es plato único.

## Origen de los datos

El repertorio procede del documento *Listado de Platos Clasificados — Menú Equilibrado*, del que salen la clasificación nutricional y el momento recomendado de cada plato. Los ingredientes de cada plato se derivaron de su descripción.
