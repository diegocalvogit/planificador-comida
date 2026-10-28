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

## Las cinco pestañas

La pantalla va sin títulos ni textos de ayuda: la pestaña activa ya dice dónde estás, y lo que hace cada botón se ve al usarlo. Lo que había explicando cada sección estaba de más una vez te la sabes.## Las seis pestañas

**Platos** — El repertorio: descripción, **tipo de alimento** (selección múltiple sobre el catálogo de `tipos.csv`: verdura, tubérculo, legumbre, arroz, pasta, pescado blanco o azul, marisco, carne blanca o roja, embutido, huevo, lácteo, queso…). Esa es la **única clasificación** que hay: describe el plato, le da su color en el calendario y es la que mide el equilibrio de la semana. El primer tipo marcado es la **base** y decide el color. Además: **momentos** en que se come (desayuno, almuerzo, comida, merienda y cena; un bizcocho puede ser desayuno y merienda a la vez), tiempo de preparación (bajo, medio, alto), repetición (siempre, alta, media, baja, ocasional, nunca), **plato único** (sí o no) e ingredientes. Se busca y se filtra por cualquiera de esas columnas, y **se ordena pulsando en la cabecera**, como en una hoja de cálculo: una vez ascendente, otra descendente. El filtro de **momento del día** es una fila de fichas: partiendo de todas encendidas, pulsar una quiere decir «enséñame solo esta», y a partir de ahí se van sumando o quitando. Apagarlas todas equivale a encenderlas todas.

**Exportar a Excel** baja un `.xlsx` con lo que se ve en ese momento: respeta los filtros y el orden, y el botón dice cuántos platos saldrán cuando hay algo filtrado. La hoja lleva la cabecera fija y en negrita, autofiltro y anchos de columna. El fichero se construye a mano en `index.html` —un xlsx no es más que un ZIP de XML— para no meter ninguna librería externa en una página que no tiene ninguna.

Todo plato es **editable por completo** desde su botón *Editar*, venga del volcado inicial o lo hayas añadido tú: todos los campos, los grupos a los que pertenece y cuál de ellos es la base que le da color. También se puede eliminar. Al renombrar o borrar un plato, sus huecos en las semanas ya planificadas se actualizan solos.

Tocar un plato **arrastra lo que lo nombra**: renombrarlo mueve su receta y sus reglas del día a día,
borrarlo se las lleva, y quitarle un ingrediente borra la cantidad que la receta le daba. En la base eso lo
hace la clave ajena en cascada; en memoria hay que hacerlo a mano, y mientras no se hace la página enseña
cosas que ya no existen y manda a guardar filas que la base rechaza.

Los ingredientes **solo se eligen del catálogo**: el editor los ofrece con autocompletado y rechaza lo que no esté en él. Así no acaban conviviendo «pimiento», «pimientos» y «piniento». Lo que no esté **se da de alta ahí mismo**: el autocompletado ofrece *Crear «…»*, y lo único que pregunta es la sección del súper, que es lo único que la lista de la compra necesita saber. La sección viene propuesta mirando a los ingredientes que ya tienes —«puerro ecológico» comparte palabra con «puerro», que está en la frutería—, así que casi siempre basta con confirmar. Mandar a la pestaña Ingredientes con el plato a medio escribir era perder el plato.

La columna **Menús** lleva una casilla por menú, marcable desde la propia tabla: así se pasa un plato de un menú a otro sin duplicarlo. Desmarcar la última casilla no borra el plato, solo lo deja fuera de los dos menús; para eliminarlo del repertorio está el botón del editor. Al sacarlo de un menú, se quita también de las semanas de ese menú.

**Semana** — Reparto de lunes a domingo con los **cinco momentos del día**: desayuno, almuerzo,
comida, merienda y cena. Son **35 huecos** por semana, y en cada uno caben **hasta tres platos**: el 1º, el 2º y el 3º.
La línea para añadir el siguiente aparece sola en cuanto pones uno, y lo hace hasta llegar a los tres.

El segundo no siempre hace falta: eso es lo que dice la columna `plato_unico`. Un plato marcado como único (paella, lentejas con pollo, fajitas) resuelve la comida él solo; uno marcado como no único (tomate con mozzarella, tortilla, gambas al ajillo) es medio menú y pide acompañante. Eso **gobierna al generador, no a ti**: junto a un plato único el reparto automático pone un segundo — el postre — y ahí se para, pero a mano se llega siempre a los tres. La guardería manda garbanzos y un yogur, los garbanzos vienen marcados como plato único, y que eso impidiera añadir la fruta no tenía ninguna defensa. La semana se identifica como *3ª semana de septiembre (14-20)*: el ordinal cuenta desde la semana que contiene el día 1, y el mes es el del jueves de esa semana, así que una semana a caballo entre dos meses se atribuye a uno solo. Las flechas mueven a la semana anterior o siguiente.

Dentro de cada día, cada momento abre con su banda de color — melocotón el desayuno, verde el almuerzo,
ámbar la comida, lila la merienda y azul la cena — y cada plato lleva delante su 1º o 2º. Los platos se pintan del color de su **base** — el primer tipo de su columna `tipo` — así que la semana se lee de un vistazo: pescado azul en azul, carne roja en rojo, verdura en verde, legumbre en ocre. La leyenda está bajo el calendario.

*Generar semana* propone un reparto que:

- respeta los momentos de cada plato y no repite plato dentro de la semana, **salvo en desayuno, almuerzo y
  merienda**, donde repetir es lo normal: ahí manda la columna `repeticion` y un café con leche sale los siete días;
- si el primer plato no es único, le busca un segundo que tampoco lo sea, y prefiere uno que no haya salido esa semana;
- evita que la misma base caiga en la comida y la cena del mismo día;
- y al terminar **repasa lo colocado**: cambia platos sueltos mientras eso acerque la semana a los objetivos, porque colocar de una pasada deja objetivos fuera de rango. El repaso prueba antes con los platos del grupo que va corto que al azar, y si un plato único resuelve el hueco retira el segundo que sobraba. Nunca coloca lo marcado como *nunca*, que es como está el restaurante;
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

El equilibrio se mide **por menú**, y hay **dos bloques**, *Equilibrio adulto* y *Equilibrio niño*, cada uno
con su resumen en una línea y sus contadores al desplegar. Los objetivos son los mismos para los dos — lo que come un niño en una semana no es
otra cosa que lo que coman sus padres, en menor cantidad — pero las dos semanas no son la misma, sobre todo
desde que lo de la guardería se carga en vez de derivarse. **Lo que come allí cuenta**: si le dan legumbre
dos veces, en casa toca menos. Si algún día hicieran falta objetivos distintos para él, es una columna más
en `equilibrio` y nada más; de momento duplicar diecisiete pares de números iguales no compensa.

Un objetivo que no se cumple se pinta **en rojo**, con una flecha que dice si falta o si se pasa. Los objetivos se cumplen si el repertorio da para ello. Con un solo plato de pasta en el menú de adultos, pedir *2 a 4 comidas con pasta* deja ese objetivo en rojo de
vez en cuando: no es un fallo del reparto sino que faltan platos de esa clase. ### Las reglas de equilibrio

Una regla es **una frase con seis huecos**:

> entre **[1]** y **[2]** **[platos]** de **[Fruta]**, en **[la merienda]**, **[cada día]**, para **[el niño]**

Los diecisiete objetivos de siempre son esa misma frase con los valores por defecto — todos los momentos, a
la semana, contando comidas, para los dos — así que no hay dos mecanismos, hay uno. En la tabla `equilibrio`
son cuatro columnas con su valor por defecto (`momentos`, `ambito`, `cuenta`, `perfil`), y por eso una regla
que se te ocurra mañana cabe sin tocar código.

Los huecos:

- **cuánto** — un mínimo y un máximo;
- **de qué** — los tipos de alimento que cuentan, heredados del grupo que elijas, **o un plato con nombre
  y apellidos**: paella los domingos;
- **qué días** — ninguno marcado quiere decir todos. Una regla que habla de los martes no sale en rojo los
  otros seis días;
- **contando qué** — *comidas* o *platos*. No es lo mismo: «dos piezas de fruta en la merienda» solo se
  puede decir contando platos, porque una comida cuenta una vez aunque la cubran sus tres platos;
- **dónde** — en qué momentos del día. Ninguno marcado quiere decir todos;
- **cada cuánto** — *a la semana* o *cada día*. Una regla diaria se mide siete veces, y en los contadores
  sale como los días que cumple: *5 / 7 días*;
- **para quién** — los dos menús, solo la mesa o solo el niño.

El generador persigue todas: el desvío que minimiza es la suma de lo que falta y lo que sobra en cada cubo
de cada regla, y una regla semanal tiene un cubo mientras que una diaria tiene uno por día del que hable.

Pero **no todas pesan lo mismo**. «Verduras entre 8 y 16 a la semana» es un objetivo nutricional difuso;
«paella los domingos» es una decisión que has tomado tú. Con el mismo peso, poner la paella —que es plato
único y se lleva por delante el segundo y el postre— empeoraba dos objetivos para arreglar uno, así que el
reparto la descartaba siempre y la regla salía en rojo pidiendo algo imposible. Una regla que nombra un
plato pesa cinco; una que nombra un día o un momento, dos; un objetivo semanal, uno.

Por lo mismo, **no repetir plato en la semana es una preferencia y una regla es una orden**: si un plato tapa
algo que va corto justo en ese hueco, entra aunque ya esté puesto en otro día.

Las reglas se ajustan en **Configuración → Reglas de equilibrio**, cada una desplegable, con la frase escrita
debajo mientras la editas, y un *Añadir una regla* al final. Van **en dos grupos separados**: *Reglas
concretas* — las que nombran un plato, un día, un momento, cuentan platos o apuntan a un solo menú — y
*Objetivos de la semana*, los diecisiete de siempre. Se leen distinto: las primeras una a una, los segundos
como una tabla de números que se mira entera, y juntos no se lee ninguno de los dos. Cada una lleva debajo del nombre una línea gris
con lo que tiene de particular, del tipo `Merienda · cada día · platos`: un mínimo y un máximo por grupo, y *Volver a los valores del documento* deshace los cambios. Están ahí y no en la pestaña Semana porque **no son de una semana**: son los mismos para todas, y debajo de la semana abierta parecían suyos. La Semana enseña cómo va la semana abierta frente a ellos, y lleva un botón a Configuración. Por defecto valen los del documento, es decir, la semana que sale de fábrica ya está equilibrada.

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

El orden de trabajo es **guardería → niño → mesa**, y los botones de la semana van en ese orden:

1. **Cargar menú guarde** — lo que mandan de allí.
2. **Completar menú equilibrado niño** — rellena sus huecos vacíos con platos suyos, **sin tocar lo que ya
   haya**, y persiguiendo los objetivos. Donde la mesa ya tenga algo que él pueda comer, le pone lo mismo:
   cocinar dos cosas distintas cuando no hace falta no le conviene a nadie.
3. **Generar menú adulto a partir de niño** — la mesa sale de su semana: su mismo plato si los adultos
   también lo comen, y si no el más parecido que sí. En los huecos de la guardería no hay nada que copiar
   — ese día no come en casa — y los rellena el reparto normal.
4. **Generar menú adulto** — la mesa a secas, sin mirar lo del niño. Es el camino corto cuando no hay
   menú de guardería que cargar.

*Generar* reemplaza; *Completar* rellena huecos y es idempotente.

Las reglas son dos y no hay más:

- **cambiar un plato del niño arrastra a la mesa** si ahí tenía justo su equivalente. Si habías puesto otra
  cosa a mano, se respeta. El arrastre iba antes al revés, de la mesa al niño; cambió con el orden de
  trabajo, porque ahora el origen es él;
- **el equivalente de un plato en el otro menú** es él mismo si también está ahí y, si no, el más parecido
  que sí esté — misma base, mismos tipos, misma condición de plato único. Esa sustitución no tiene azar, y
  por eso el programa sabe después si un hueco es una excepción tuya o simplemente lo que tocaba. Vale para
  los dos sentidos. Lo que come en la guardería no se toca nunca: lo puso el menú que mandan de allí.

### La guardería

Lo que come allí no se inventa: cada mes mandan un PDF, un asistente lo convierte en JSON con el formato que
describe `prompt-guarderia.md`, y **Cargar guarde…** lo mete. Antes de escribir nada abre una pantalla de
revisión, que es donde está el trabajo de verdad:

- **los platos nuevos que se parecen a algo que ya tienes van primero**, con el parecido señalado. El parecido
  se mide por palabras del nombre, pesadas por lo que distinguen: *carne* está en veinte platos y no dice nada,
  *carbonara* está en uno y lo dice todo. Pulsar el plato que ya tienes lo usa en su lugar — no se crea el
  nuevo, y todos los días que lo mencionaban pasan a apuntar al tuyo;
- cada uno se abre con **Editar**, que es el mismo editor de la pestaña Platos — tipos, momentos, preparación,
  repetición, plato único, menús e ingredientes — con los platos parecidos arriba del todo por si al verlo
  de cerca prefieres reutilizar uno. Lo que cambies ahí no se guarda: vuelve a la revisión. Si le cambias el
  nombre, los días que lo citaban lo siguen; si le añades un ingrediente que no tienes, no se crea en el
  catálogo todavía sino con el menú, y aparece abajo con la sección que le hayas dado. Los menús que marques
  plato a plato mandan sobre la casilla del pie;
- los que no se parecen a nada quedan plegados debajo, contados;
- **los ingredientes nuevos** salen con la sección del súper que propone el asistente, editable, y avisa si
  alguno roza a uno que ya tienes. Solo se crean los de los platos que de verdad se crean;
- y los **días**, ya con las sustituciones aplicadas, para leer de un vistazo lo que va a quedar.

Si el fichero trae algo que la pantalla no puede arreglar — un tipo que no existe, un ingrediente sin declarar,
una fecha en fin de semana, un plato que no se crea ni existe — se listan todos y **no se carga nada**.

Al pie hay una casilla **dejar solo este menú**: sin marcar se carga encima de lo que hubiera, sustituyendo
solo las comidas que trae el fichero; marcada, la semana del niño se queda únicamente con el menú de la
guardería. La de los adultos no se toca en ninguno de los dos casos. Si las semanas de destino ya tienen
platos del niño, la revisión lo dice antes, semana por semana.

Lo cargado así entra **desmarcado de la compra**, porque esos ingredientes los pone la guardería.

### Qué hay que comprar

Cada plato de la semana lleva una casilla, en los dos menús. Es la columna `es_para_comprar` de la tabla
`semanas`, y nace **marcada**: lo normal es que lo que se come haya que comprarlo, y lo normal no debería tener
que decirse en ningún sitio. Lo que se guarda son las excepciones, que son dos: lo que el niño come en la
guardería y lo que ya está en la nevera.

Va **por plato y no por comida**, porque dentro de un mismo mediodía puede haber un primero de la guardería y
un postre que sí hay que traer. Desmarcado, el plato sale tachado y en gris, y sus ingredientes dejan de
contar en la lista de la compra — pero solo los suyos: si otro plato de la semana usa el mismo tomate, el
tomate sigue en la lista, con los platos que de verdad lo piden.

Dos reglas para que la casilla no mienta:

- **el mismo plato en la misma comida y en el otro menú va junto.** Son el mismo plato encima de la mesa, y
  comprarlo por uno y no por el otro no significa nada;
- mientras el niño come lo mismo que en la mesa no tiene línea propia, así que tampoco casilla propia: manda
  la de la mesa.

En papel no sale ninguna casilla: el menú impreso dice lo que se come, no lo que se trae del súper.

El aviso al generar dice cómo ha quedado el reparto: cuántos huecos cubre la guardería y en cuántos come el niño
algo distinto. **El equilibrio mide la mesa de casa**, no las excepciones del niño.

**Compra** — Una sola lista con los ingredientes de **las dos semanas**, primeros y segundos platos incluidos, con sus propias flechas para moverte de una semana a otra. Es determinista: sale de los ingredientes de los platos de la semana abierta, agrupada por sección del súper en el orden que marca la tabla `secciones`, que es el orden en que se recorre la tienda; la panadería va la última. Un ingrediente aparece si, y solo si, lo usa algún plato. Cada ingrediente se marca como *ya lo tengo*, y esa marca **pertenece a esa semana**: queda registrada en la tabla `compras` como histórico de lo que había en casa. Lo que una semana no diga de un ingrediente se hereda de la última semana que sí lo diga, y en último término de la tabla `despensa`, los básicos fijos. Así una semana nueva arranca con la foto de la anterior sin borrar lo que pasó en las pasadas.

**Ingredientes** — El catálogo, la única fuente de la que salen los ingredientes de los platos. Cada uno con su sección del súper y los platos que lo usan; se busca, se filtra por sección y por si está en uso o suelto. Desde aquí se añaden, se renombran —lo que arrastra a todos los platos, la despensa y el histórico de compras— y se borran, siempre que no los use ningún plato.

Borrar una semana del histórico la borra de verdad: se va de `estado`, de la foto con la que arrancó la
página y de la base en el siguiente guardado. Durante un tiempo solo se marcaba como borrada, lo que bastaba
para que no se guardara pero no para que no se leyera — y volver a poner un plato en ella resucitaba los dos
menús enteros con todo lo viejo dentro.

### Las reglas del día a día

Aparte de los objetivos, y en otra tabla: platos clavados en un hueco de la semana. *Paella los domingos*,
*pasta los martes*. Se definen en **Configuración → Reglas del día a día** eligiendo quién, qué día, qué
momento, qué puesto y qué plato — y el desplegable de platos solo ofrece los de ese menú que se coman en
ese momento, que una regla poniendo un desayuno en la cena no la quiere nadie.

No son objetivos que el reparto persiga, son **sitios que ya están ocupados**. Al abrir una semana cada
regla ocupa su hueco si lo encuentra libre — libre es que no haya nada en toda esa comida — y a partir de
ahí el generador las respeta igual que respeta lo que pongas tú. Por eso mandan sobre el equilibrio sin
tener que pelearse con él: cuando el generador entra, ese hueco ya no está en juego.

Se aplican **al abrir la semana y no en cada repintado**, así que *Vaciar* vacía de verdad y no se vuelven a
colar solas. Quitar una regla no quita lo que ya estuviera puesto.

La tabla `reglas` es la misma forma que `semanas` sin la columna de la semana, porque la semana que te toque
vivir no cambia que los domingos haya paella.

**Recetas** — Los platos de **preparación media o alta**, que son los que no se resuelven solos. Los de
preparación baja no salen: no hay nada que explicar de poner fruta en un plato, y meterlos solo haría la
lista más larga. Cada ficha lleva el nombre, la dificultad — que es la misma columna *preparación* del
plato, no un dato nuevo que pueda contradecirla —, sus ingredientes y los pasos numerados.

Las **cantidades van por persona**. Multiplicar por cuatro es fácil; dividir una receta «para seis» por tres
y medio, no. Cada una es una línea `ingrediente: cantidad`, y el nombre se casa con la lista de ingredientes
del plato — que sigue siendo la única que manda para la compra: la receta dice **cuánto**, nunca **qué**. Si
sobra una cantidad de algo que el plato ya no lleva, no se cuela en la ficha; si falta alguna, la ficha lo
dice.

Los pasos van en **apartados**: *asar las berenjenas*, *el relleno*, *montar y gratinar*. Una línea acabada
en dos puntos es un apartado y lo que viene debajo son sus viñetas — la convención más barata que da
jerarquía sin inventar un editor de árboles: se escribe igual que se dicta.

Las viñetas son **cortas y en imperativo, con el tiempo dentro del paso al que pertenece**: esto se consulta
de pie y con las manos ocupadas, así que lo que importa es qué toca ahora y cuándo pasar a lo siguiente. Lo
que no está en la lista del plato — sal, un chorro de aceite — se nombra en el paso pero no se pesa: no se
compra para una receta.

La pestaña lleva el contador **escritas sobre posibles** — *Recetas 24/24* —, igual que la semana dice
35/35. Es la única forma de enterarse de que ha entrado un plato nuevo sin receta sin abrir la pestaña por
casualidad, y pasa sobre todo después de cargar un menú de la guardería.

Arriba de la pestaña hay un **número de comensales**: las cantidades se guardan siempre por persona y se
multiplican al pintarlas, así que lo guardado no depende de cuántos seáis hoy. Se escalan *todos* los
números de la línea y no solo el primero — «6 unidades (80 g)» por cuatro es «24 unidades (320 g)» — y las
medidas que se cuentan se ponen en plural, que «4 cucharada» canta. Por eso las cantidades **se escriben con
números**: «media cebolla» no se puede multiplicar y «40 g» sí.

Cada receta ocupa **una fila entera**, con los ingredientes a un lado y los pasos al otro. En tres columnas
no cabía ninguna entera en pantalla y había que subir y bajar para leer seis viñetas.

Se escribe todo desde la propia ficha, en dos campos de texto, con los ingredientes del plato ya puestos
esperando su cantidad. Se busca por plato o por ingrediente, y se filtra por dificultad o por *sin escribir*,
que es la lista de lo que queda por hacer.

## Los ficheros

```
index.html      el esqueleto: la cabecera, las pestañas y los paneles vacíos
app.js          todo lo demás
estilos.css     los estilos
pruebas/        la base falsa, los datos y los casos
supabase/       el esquema, la semilla y las recetas de ejemplo
prompt-guarderia.md
```

Estuvo todo en `index.html` hasta que pasó de 260 KB y dejó de poder navegarse.
Partirlo **no añade compilación ni empaquetador**: son tres ficheros que el
navegador lee tal cual, y Vercel los sirve igual que antes. Para cambiar algo:
editas, `git push`, y ya está.

## Los ficheros de `supabase/`

```
01-esquema.sql    las tablas, sus restricciones y la seguridad por filas
02-datos.sql      la semilla: platos, ingredientes, objetivos y un histórico
03-recetas.sql    las recetas de los platos de preparación media o alta
04-limpieza.sql   arreglos de nombres que entraron torcidos con un cargador
05-arroz-con-huevo.sql   un plato que se quedó sin la carne que decía su nombre
```

Los dos primeros se ejecutan una vez, al montar la base. `04-limpieza.sql` se
puede repetir sin hacer daño y va **antes** que `03-recetas.sql`, porque las
recetas usan ya los nombres corregidos.

## Pruebas

```
python -m http.server          # desde la raíz del repositorio
```

y abrir **`/pruebas/`**. Cargan la aplicación de verdad, dentro de un marco y
con `?prueba=1`, contra una base de datos de mentira en memoria. No tocan
Supabase, no necesitan cuenta y no hay nada que instalar: ni Node, ni paquetes,
ni navegador sin cabeza. Sale una lista en verde o en rojo.

- **`pruebas/banco.js`** — la base falsa, con la cara de supabase-js. Implementa
  solo lo que la aplicación usa; si algún día usa algo más, peta ruidosamente,
  que es justo lo que debe hacer.
- **`pruebas/datos.js`** — el repertorio real, sacado de `supabase/02-datos.sql`
  por `pruebas/generar-datos.py`. Con cuatro platos de juguete el generador
  siempre cuadra y no prueba nada. Se versiona para que las pruebas corran sin
  Python; solo hay que regenerarlo si cambia la semilla.
- **`pruebas/casos.js`** — los casos. Cada uno arranca la aplicación de cero, así
  que ninguno hereda lo que el anterior dejó a medias.

Lo que se prueba es lo que ha roto de verdad alguna vez, no lo que es fácil de
probar, y cada caso lleva anotado qué fallo habría cazado. El enganche en la
aplicación son diez líneas guardadas por `?prueba=1`: sin base falsa puesta
desde fuera entra por la de siempre, de modo que a la página publicada no le
pasa nada aunque alguien le añada el parámetro.

**Configuración → Dónde vive esto** — Los tres sitios a los que ir cuando algo falla, por orden: el panel
de Vercel, el código en GitHub y sus últimos cambios.

Y un botón, **Traer la versión nueva**, que existe por un motivo concreto: el navegador se queda con la
página vieja y un F5 normal no siempre la suelta — revalida el documento pero puede servir los ficheros de
dentro desde su caché. Entonces ves una versión antigua sin saberlo, y lo que falta parece un fallo de la
base de datos cuando no lo es. El botón pide cada fichero con `cache:"reload"`, que obliga a ir al servidor
y a quedarse con lo que venga, y después recarga.

**Configuración** — Incluye **copia de seguridad**: un botón descarga todo lo que hay en la base en un fichero JSON, y otro lo restaura. Importa porque el plan gratuito de Supabase **no hace copias automáticas** ("Automatic backups: Not included"), así que esa es la única que hay. Antes de restaurar se descarga sola una copia de lo actual, y el fichero se valida entero antes de borrar nada: a media restauración no habría vuelta atrás.

**Configuración** — La cuenta con la que has entrado y el botón de salir, un resumen de lo que hay en la base, y el histórico de semanas: Todas las semanas planificadas, con las comidas resueltas de cada menú y una etiqueta por semana: **guardada** si es idéntica a la del repositorio, **sin guardar** si la has tocado desde la última vez. La pestaña se marca con un punto naranja mientras quede algo sin guardar. De cada semana se ve cuántas comidas tiene resueltas en cada menú y cuántos ingredientes lleva su compra. Botones para abrir o borrar cualquiera de ellas. Borrar una semana se lleva sus dos menús y su compra. Las dos semanas se mueven juntas: cambiar de semana en una pestaña cambia también la otra, porque es la misma semana real de la casa.

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

Hubo tres platos comodín — *Desayuno guarde*, *Almuerzo guarde* y *Menú guarde* — y un tipo *Guardería* para
decir que ese día comía fuera. Los sustituyó el cargador de menús con la casilla `es_para_comprar`, que dice
lo mismo mejor: qué come exactamente y que no hay que comprarlo. Se borraron.

**Restaurante** está en los dos repertorios, para los días que se sale de la planificación. No tiene ingredientes, así que no suma nada a la compra; es plato único, así que no pide segundo; su grupo es *fuera de casa*, que no compite con los grupos nutricionales y lleva su propio contador en el panel de equilibrio; y su repetición es *nunca*, de modo que el generador no lo propone solo.

**Parrillada de verduras** —calabacín, berenjena, pimiento, cebolla y espárragos— es el plato de solo verduras de los adultos, pensado como primero o guarnición: no es plato único.

## Origen de los datos

El repertorio procede del documento *Listado de Platos Clasificados — Menú Equilibrado*, del que salen la clasificación nutricional y el momento recomendado de cada plato. Los ingredientes de cada plato se derivaron de su descripción.
