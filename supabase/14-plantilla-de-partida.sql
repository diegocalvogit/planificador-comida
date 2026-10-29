-- Una plantilla de partida, para no mirar 105 celdas en blanco.
--
-- No es una propuesta nutricional: es la semana que se deduce de lo que ya
-- comíais, leyendo los objetivos de equilibrio que tenías puestos y lo que
-- hay en el repertorio. Todo editable, celda a celda, desde Configuración.
--
-- Los criterios, por si quieres discutirlos:
--
--   Desayuno     1º Lácteo, 2º Pan y cereales. El café con leche y la tostada,
--                que es lo que desayunáis. El 3º en blanco.
--   Almuerzo     1º Fruta, y el 2º y 3º en blanco. Es media mañana: una pieza.
--   Comida       1º el eje del día, 2º verdura o tubérculo, 3º en blanco.
--                El fin de semana entero se deja libre.
--   Merienda     1º Fruta o Lácteo alternos, el resto en blanco.
--   Cena         1º proteína ligera, 2º verdura, 3º en blanco.
--
-- Las comidas y las cenas van sin postre, y no por criterio sino porque no se
-- puede: ninguno de los cinco platos de fruta del repertorio está marcado como
-- plato de comida o de cena, solo de desayuno, almuerzo y merienda. Pedir
-- fruta de postre dejaría cinco celdas que el reparto no puede cumplir nunca.
-- Si quieres el postre, el arreglo no es tocar esto: es marcar "Fruta de
-- temporada" como plato de comida y de cena en la pestaña Platos, y entonces
-- poner Fruta en el 3º. La fruta llega igual a su objetivo con el almuerzo y
-- la merienda: once raciones frente a un mínimo de siete.
--
-- Hay tres maneras de estar una celda y las tres se usan aquí:
--
--   con tipo    lo que va en ese hueco
--   en blanco   ahí no va nada (los terceros platos de las cenas, por ejemplo)
--   sin fila    libre: que lo reparta el generador
--
-- Lo último importa más de lo que parece. Esta plantilla deja cinco mínimos
-- sin cubrir a propósito —la segunda ración de legumbre, pasta, arroz,
-- tubérculo y pescado blanco— y el reparto los coloca en los seis huecos
-- libres del fin de semana. Si se fijaran las 105 celdas, el generador no
-- tendría dónde cuadrar la semana aunque quisiera.
--
-- Se puede ejecutar entero y se puede repetir: borra lo que hubiera y lo deja
-- como está aquí. Si ya has tocado la plantilla y no quieres perderlo, no lo
-- ejecutes.

begin;

delete from public.plantilla;

-- tipo: lo que va en ese hueco. plato: un plato concreto. Los dos a null es
-- "en blanco": ahí no va nada y el generador no lo rellena.
insert into public.plantilla (dia, momento, orden, tipo, plato) values

  -- ── Desayuno: lácteo y algo de pan, los siete días ──
  ('lunes','desayuno',1,'Lácteo',null),        ('lunes','desayuno',2,'Pan y cereales',null),        ('lunes','desayuno',3,null,null),
  ('martes','desayuno',1,'Lácteo',null),       ('martes','desayuno',2,'Pan y cereales',null),       ('martes','desayuno',3,null,null),
  ('miércoles','desayuno',1,'Lácteo',null),    ('miércoles','desayuno',2,'Pan y cereales',null),    ('miércoles','desayuno',3,null,null),
  ('jueves','desayuno',1,'Lácteo',null),       ('jueves','desayuno',2,'Pan y cereales',null),       ('jueves','desayuno',3,null,null),
  ('viernes','desayuno',1,'Lácteo',null),      ('viernes','desayuno',2,'Pan y cereales',null),      ('viernes','desayuno',3,null,null),
  ('sábado','desayuno',1,'Lácteo',null),       ('sábado','desayuno',2,'Pan y cereales',null),       ('sábado','desayuno',3,null,null),
  ('domingo','desayuno',1,'Lácteo',null),      ('domingo','desayuno',2,'Pan y cereales',null),      ('domingo','desayuno',3,null,null),

  -- ── Almuerzo: una pieza de fruta y nada más ──
  ('lunes','almuerzo',1,'Fruta',null),         ('lunes','almuerzo',2,null,null),      ('lunes','almuerzo',3,null,null),
  ('martes','almuerzo',1,'Fruta',null),        ('martes','almuerzo',2,null,null),     ('martes','almuerzo',3,null,null),
  ('miércoles','almuerzo',1,'Fruta',null),     ('miércoles','almuerzo',2,null,null),  ('miércoles','almuerzo',3,null,null),
  ('jueves','almuerzo',1,'Fruta',null),        ('jueves','almuerzo',2,null,null),     ('jueves','almuerzo',3,null,null),
  ('viernes','almuerzo',1,'Fruta',null),       ('viernes','almuerzo',2,null,null),    ('viernes','almuerzo',3,null,null),
  ('sábado','almuerzo',1,'Fruta',null),        ('sábado','almuerzo',2,null,null),     ('sábado','almuerzo',3,null,null),
  ('domingo','almuerzo',1,'Fruta',null),       ('domingo','almuerzo',2,null,null),    ('domingo','almuerzo',3,null,null),

  -- ── Comida: el eje, verdura de acompañante y fruta de postre ──
  ('lunes','comida',1,'Legumbre',null),        ('lunes','comida',2,'Verdura',null),       ('lunes','comida',3,null,null),
  ('martes','comida',1,'Pasta',null),          ('martes','comida',2,'Verdura',null),      ('martes','comida',3,null,null),
  ('miércoles','comida',1,'Carne blanca',null),('miércoles','comida',2,'Tubérculo',null),  ('miércoles','comida',3,null,null),
  ('jueves','comida',1,'Pescado blanco',null), ('jueves','comida',2,'Verdura',null),      ('jueves','comida',3,null,null),
  ('viernes','comida',1,'Arroz',null),         ('viernes','comida',2,'Verdura',null),     ('viernes','comida',3,null,null),
  -- El fin de semana, libre, y no por pereza: la plantilla deja cinco mínimos
  -- sin cubrir —la segunda de pasta, de arroz, de legumbre, de tubérculo y de
  -- pescado— y el reparto necesita huecos donde ponerlos. Sin ninguno libre no
  -- podría cuadrar la semana aunque quisiera. Y de paso, el sábado y el domingo
  -- son el día de salir, de las sobras o del capricho.

  -- ── Merienda: fruta y lácteo alternos ──
  ('lunes','merienda',1,'Fruta',null),         ('lunes','merienda',2,null,null),      ('lunes','merienda',3,null,null),
  ('martes','merienda',1,'Lácteo',null),       ('martes','merienda',2,null,null),     ('martes','merienda',3,null,null),
  ('miércoles','merienda',1,'Fruta',null),     ('miércoles','merienda',2,null,null),  ('miércoles','merienda',3,null,null),
  ('jueves','merienda',1,'Lácteo',null),       ('jueves','merienda',2,null,null),     ('jueves','merienda',3,null,null),
  ('viernes','merienda',1,'Fruta',null),       ('viernes','merienda',2,null,null),    ('viernes','merienda',3,null,null),
  ('sábado','merienda',1,'Lácteo',null),       ('sábado','merienda',2,null,null),     ('sábado','merienda',3,null,null),
  ('domingo','merienda',1,'Fruta',null),       ('domingo','merienda',2,null,null),    ('domingo','merienda',3,null,null),

  -- ── Cena: proteína ligera y verdura, sin postre ──
  ('lunes','cena',1,'Verdura',null),           ('lunes','cena',2,'Huevo',null),           ('lunes','cena',3,null,null),
  ('martes','cena',1,'Pescado azul',null),     ('martes','cena',2,'Verdura',null),        ('martes','cena',3,null,null),
  ('miércoles','cena',1,'Legumbre',null),      ('miércoles','cena',2,'Verdura',null),     ('miércoles','cena',3,null,null),
  ('jueves','cena',1,'Huevo',null),            ('jueves','cena',2,'Verdura',null),        ('jueves','cena',3,null,null),
  ('viernes','cena',1,'Preparado o congelado',null), ('viernes','cena',2,'Verdura',null), ('viernes','cena',3,null,null),
  ('sábado','cena',1,'Fuera de casa',null),    ('sábado','cena',2,null,null),             ('sábado','cena',3,null,null),
  ('domingo','cena',1,'Verdura',null),         ('domingo','cena',2,'Queso',null),         ('domingo','cena',3,null,null);

commit;

notify pgrst, 'reload schema';


/* ─────────────────────────────────────────────────────────────────────
   Comprobación. Lo interesante es la última consulta: cuántas veces pide
   la plantilla cada tipo frente a su objetivo semanal. Donde la plantilla
   se queda por debajo del mínimo, lo completa el reparto con los huecos
   libres; donde se pasa del máximo, hay que retocar una celda.
   ───────────────────────────────────────────────────────────────────── */

select 'celdas en total'                     as revision,
       (select count(*)::text from public.plantilla)                       as valor
union all
select 'con tipo',  (select count(*)::text from public.plantilla where tipo is not null)
union all
select 'con plato', (select count(*)::text from public.plantilla where plato is not null)
union all
select 'en blanco', (select count(*)::text from public.plantilla
                      where tipo is null and plato is null)
union all
select 'libres (sin fila)', (35 * 3 - (select count(*) from public.plantilla))::text;

select t.tipo,
       count(p.tipo)                                   as pide_la_plantilla,
       t.minimo, t.maximo,
       case when count(p.tipo) > t.maximo then 'SE PASA'
            when count(p.tipo) < t.minimo then 'lo completa el reparto'
            else 'ok' end                              as que_tal
  from public.tipos t
  left join public.plantilla p on p.tipo = t.tipo
 group by t.tipo, t.minimo, t.maximo, t.orden
 order by t.orden;
