# El prompt del menú de la guardería

Cada mes mandan el menú en PDF. Esto lo convierte en el JSON que carga el botón
**Cargar guarde…** de la pestaña Semana.

Cómo se usa, en cualquier asistente que acepte adjuntos:

1. descarga la copia de seguridad desde **Configuración → Descargar copia**;
2. adjunta esa copia y el PDF del mes;
3. pega el texto de abajo tal cual;
4. carga el JSON que devuelva y revísalo en la pantalla que sale antes de guardar.

El prompt va contra la copia de seguridad a propósito: así sabe qué platos e
ingredientes tienes ya y reutiliza los tuyos en vez de inventar duplicados. La
pantalla de revisión es la segunda red — el asistente se equivoca, y conviene
mirar los parecidos que señala antes de dar a cargar.

---

Tienes dos adjuntos:
1. Una copia de seguridad en JSON de una base de datos de planificación de comidas.
2. El menú mensual en PDF de una guardería.

En la copia, dentro de "tablas", usarás: "platos" (los que ya existen),
"ingredientes" (catálogo cerrado, cada uno con su "seccion") y "secciones".

Devuelve el resultado como un FICHERO DESCARGABLE llamado
menu-guarde-AAAA-MM.json. Si no puedes generar ficheros, devuélvelo en un
único bloque de código JSON y nada más: ni explicación, ni resumen, ni notas.

Forma exacta. Las tres listas van siempre, aunque alguna quede vacía:

{
  "formato": "menu-guarderia",
  "version": 1,
  "mes": "2026-10",
  "ingredientes_nuevos": [{"ingrediente": "chorizo", "seccion": "Carnicería y pescadería"}],
  "platos_nuevos": [
    {
      "nombre": "Garbanzos con chorizo y carne",
      "descripcion": "guiso de garbanzos con chorizo y ternera",
      "tipo": ["Legumbre", "Embutido y fiambre", "Carne roja"],
      "momento": ["comida"],
      "tiempo": "alto",
      "repeticion": "media",
      "plato_unico": true,
      "ingredientes": ["garbanzos cocidos", "chorizo", "filetes de ternera", "cebolla", "aceite de oliva"]
    }
  ],
  "dias": [
    {"fecha": "2026-10-01", "comida": ["Sopa de pescado", "Filetes de pollo", "Yogur natural con fruta"]}
  ]
}

═══ REGLA 1 · EL NOMBRE MANDA SOBRE LOS INGREDIENTES ═══
Todo alimento que aparezca en el nombre del plato TIENE que estar en sus
ingredientes. "Crema de calabaza" lleva calabaza. "Garbanzos con chorizo"
lleva garbanzos Y chorizo. Si no lo encuentras en el catálogo, decláralo en
"ingredientes_nuevos" y úsalo: nunca lo omitas.

═══ REGLA 2 · REUTILIZA EL INGREDIENTE ANTES DE CREARLO ═══
Antes de declarar un ingrediente nuevo, búscalo en el catálogo ignorando
mayúsculas, tildes y plurales, y teniendo en cuenta que:
  - Hay sinónimos regionales: alubias = judías = habichuelas;
    gambas = langostinos; patata = papa; calabacín = zucchini.
    "alubias blancas" YA EXISTE en el catálogo como "judías blancas cocidas".
  - El catálogo puede tener una variante MÁS CONCRETA del mismo alimento.
    Úsala en vez de crear la genérica: para carne picada, el catálogo tiene
    "carne picada de pollo" — usa esa y no crees "carne picada".
Crea uno nuevo solo cuando de verdad no haya nada que sirva.

═══ REGLA 3 · UN INGREDIENTE SE LLAMA COMO SE COMPRA ═══
La prueba es simple: ¿lo pides así en el supermercado?
  SÍ, y por eso valen: carne picada · queso rallado · tomate frito ·
     garbanzos cocidos · jamón cocido · pechuga de pavo en lonchas ·
     croquetas congeladas · tomate triturado
  NO, porque eso es cocinar: pollo a la plancha · patata hervida ·
     verduras rehogadas · merluza empanada · ternera guisada
Si la palabra describe cómo viene envasado, se queda. Si describe lo que
haces tú con ello en casa, fuera: eso va en el nombre del plato y en su
descripción.

═══ REGLA 4 · LOS TIPOS SON UNA LISTA CERRADA ═══
"tipo" solo admite estos valores, escritos exactamente así:
   Verdura · Tubérculo · Fruta · Legumbre · Arroz · Pasta · Pan y cereales
   Pescado blanco · Pescado azul · Marisco · Carne blanca · Carne roja
   Embutido y fiambre · Huevo · Lácteo · Queso · Fruto seco
   Grasa saludable · Salsa y aliño · Preparado o congelado
No inventes ninguno. "Carne picada" NO es un tipo: unas albóndigas de
ternera son "Carne roja"; de pollo o pavo, "Carne blanca".
El primero de la lista es la base, el que define el plato. Si lleva chorizo,
salchichas, jamón o bacon, incluye "Embutido y fiambre".

═══ REGLA 5 · REUTILIZA EL PLATO ANTES DE CREARLO ═══
Compara con "platos" ignorando mayúsculas, tildes, plurales y palabras de
enlace (de, con, a la, en). Sinónimos: crema = puré; sopa = caldo;
filete = filetes; pechuga = pollo. Cuenta también si el nombre que ya existe
es MÁS LARGO y contiene al tuyo:
   "POLLO A LA PLANCHA" ya existe como "Pechugas de pollo a la plancha"
   "SOPA POLLO"         ya existe como "Sopa de pollo"
   "CREMA DE VERDURAS"  ya existe como "Puré o crema de verduras"
   "YOGURT"             ya existe como "Yogur natural con fruta"
Si lo encuentras, usa su nombre EXACTO y no lo metas en "platos_nuevos".

═══ REGLA 6 · NI UN PLATO NUEVO REPETIDO ═══
Dos platos nuevos no pueden llevar los mismos ingredientes ni ser el mismo
plato con otro nombre. Si "Filetes de pollo" y "Pollo a la plancha" son lo
mismo, crea uno solo y úsalo los dos días.

═══ REGLA 7 · LOS NOMBRES DE "dias" SON LITERALES ═══
Cada nombre de "dias" debe estar CARÁCTER POR CARÁCTER igual que en "platos"
de la copia o en tu "platos_nuevos". Si el plato se llama "Salchichas de
carne", el día dice "Salchichas de carne", no "Salchichas".

═══ REGLA 8 · NOMBRES EN CASTELLANO NORMAL ═══
El PDF viene en mayúsculas y telegráfico. Escríbelo como lo diría una
persona: "SOPA COCIDO" → "Sopa de cocido"; "FILETE LOMO" → "Filete de lomo".

═══ REGLA 9 · LAS VERDURAS, EN SERIO ═══
Si el nombre dice "con verduras", "verduritas" o "crema de verduras", pon al
menos TRES verduras distintas, no una ni dos.

═══ REGLA 10 · LA DESCRIPCIÓN DESCRIBE ESE PLATO ═══
Una frase corta en minúsculas, coherente con el nombre y con los
ingredientes que has puesto. Si el nombre dice tortilla francesa, la
descripción no habla de patata. No menciones nada que no esté en los
ingredientes.

═══ REGLA 11 · SOLO LOS DÍAS QUE TRAEN COMIDA ═══
Un día entra en "dias" SOLO si en su casilla hay platos de verdad.
Si la casilla está vacía, o pone FIESTA, festivo, cerrado, excursión, una
nota, un símbolo o cualquier otra cosa que no sean platos, ese día NO EXISTE:
omítelo y no lo menciones. No intentes interpretar qué significa.
En la duda, fuera: es mejor que falte un día a que se cuele uno inventado.

═══ REGLA 12 · LAS FECHAS ═══
El año y el mes salen del título del documento ("OCTUBRE 2026" → 2026-10).
El día sale del NÚMERO que acompaña a cada casilla, no del encabezado de la
columna: esos encabezados vienen con erratas ("JUEBES 8") y no son de fiar.
Calcula tú el día de la semana a partir de la fecha. Si una fecha te sale en
sábado o domingo, es que has leído mal: revísala y, si no cuadra, omítela.
Formato AAAA-MM-DD, sin fechas repetidas y sin días que no estén en el
documento.

═══ REGLA 13 · CUÁNTOS PLATOS POR DÍA ═══
De 1 a 3, en el orden en que se sirven: primero, segundo y postre. Si una
casilla trae más de tres líneas, junta las que sobren en tres.

═══ COMPROBACIÓN FINAL, UNA POR UNA ═══
Antes de responder, recorre tu propio JSON y verifica:
a) Lista todos los ingredientes usados. ¿Cada uno aparece literalmente en el
   catálogo O en tu "ingredientes_nuevos"?
b) De los que has declarado nuevos, ¿alguno ya estaba en el catálogo con otro
   nombre o en una variante más concreta? Cámbialo por el que ya existe.
c) ¿Alguno lleva una palabra de cocinado en vez de una de envasado?
d) Lista todos los valores de "tipo". ¿Todos están en la lista de la Regla 4?
e) Lista todos los nombres de "dias". ¿Cada uno existe literalmente en
   "platos" o en "platos_nuevos"?
f) ¿Algún plato nuevo repite los ingredientes de otro plato nuevo?
g) ¿Cada plato contiene lo que dice su nombre?
h) ¿Cada fecha cae de lunes a viernes y aparece una sola vez?
i) ¿Has colado algún día cuya casilla no tenía platos?
Corrige lo que falle y entonces responde, solo con el JSON.
