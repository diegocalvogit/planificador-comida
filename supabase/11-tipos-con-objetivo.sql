-- Los tipos de alimento pasan a ser la única clasificación.
--
-- Había dos listas que decían casi lo mismo: 21 tipos describiendo el plato y
-- 17 objetivos midiendo la semana. Y se solapaban: «Pescado azul» era un
-- objetivo suelto de 1 a 2 y además estaba dentro de «Pescado y marisco», de
-- 3 a 4, así que nunca quedaba claro cuál mandaba. Ahora el mínimo y el
-- máximo semanal viven en el propio tipo y la tabla equilibrio desaparece.
--
-- Dos tipos se van del todo: «Grasa saludable» y «Salsa y aliño». No los medía
-- nadie y estaban en tres platos cada uno; medir el aceite de oliva, que sale
-- en diecisiete platos, no dice nada útil. Ningún plato se queda sin tipo al
-- quitarlos, comprobado antes de escribir esto.
--
-- Los catorce objetivos que ya eran un solo tipo se copian tal cual. Los tres
-- que agrupaban varios se reparten:
--
--   Lácteos 7-14        → Lácteo 6-12 · Queso 1-2
--   Pescado y marisco   → Pescado blanco 2-3 · Marisco 0-1
--     3-4, y además
--   Pescado azul 1-2    → Pescado azul 1-2, ya sin duplicar
--
-- Con esto se pierde el tope conjunto: el máximo real de pescado pasa de 4 a 6
-- a la semana. Es el precio de no tener dos listas, y los topes sueltos se
-- pueden apretar desde Configuración cuando quieras.
--
-- Se puede ejecutar entero de una vez y se puede repetir sin hacer daño.

begin;

/* ── 1. Fuera los dos tipos que no medía nadie ───────────────────────── */

update public.platos
   set tipo = array_remove(array_remove(tipo, 'Grasa saludable'), 'Salsa y aliño')
 where 'Grasa saludable' = any(tipo) or 'Salsa y aliño' = any(tipo);

delete from public.tipos where tipo in ('Grasa saludable', 'Salsa y aliño');


/* ── 2. El objetivo semanal se muda al tipo ──────────────────────────── */

alter table public.tipos add column if not exists minimo int not null default 0;
alter table public.tipos add column if not exists maximo int not null default 0;

update public.tipos t set minimo = v.mn, maximo = v.mx
  from (values
    ('Verdura',               8, 16),
    ('Tubérculo',             2,  5),
    ('Fruta',                 7, 21),
    ('Legumbre',              2,  4),
    ('Arroz',                 2,  4),
    ('Pasta',                 2,  4),
    ('Pan y cereales',        7, 14),
    ('Pescado blanco',        2,  3),
    ('Pescado azul',          1,  2),
    ('Marisco',               0,  1),
    ('Carne blanca',          2,  4),
    ('Carne roja',            0,  1),
    ('Embutido y fiambre',    0,  3),
    ('Huevo',                 2,  4),
    ('Lácteo',                6, 12),
    ('Queso',                 1,  2),
    ('Fruto seco',            0,  4),
    ('Preparado o congelado', 0,  3),
    ('Fuera de casa',         0,  2)
  ) as v(tipo, mn, mx)
 where t.tipo = v.tipo;

-- El máximo nunca por debajo del mínimo, que es lo que la pantalla da por hecho.
alter table public.tipos drop constraint if exists tipos_rango;
alter table public.tipos add constraint tipos_rango check (maximo >= minimo);

-- Los órdenes quedaron con un hueco al borrar dos tipos. Se renumeran para que
-- la lista de Configuración no tenga saltos.
with nuevo as (
  select tipo, (row_number() over (order by orden) - 1) as n from public.tipos
)
update public.tipos t set orden = nuevo.n from nuevo where nuevo.tipo = t.tipo;


/* ── 3. Y la tabla que sobraba, fuera ────────────────────────────────── */

drop table if exists public.equilibrio;

commit;

notify pgrst, 'reload schema';


/* ─────────────────────────────────────────────────────────────────────
   Comprobación: las cuatro primeras a cero y luego los 19 tipos con su
   objetivo, que es lo que debería salir en Configuración.
   ───────────────────────────────────────────────────────────────────── */

select 'sigue existiendo la tabla equilibrio'                as revision,
       (select count(*)::text from information_schema.tables
         where table_schema = 'public' and table_name = 'equilibrio') as valor
union all
select 'platos que siguen con grasa o salsa',
       (select count(*)::text from public.platos
         where 'Grasa saludable' = any(tipo) or 'Salsa y aliño' = any(tipo))
union all
select 'platos que se han quedado sin ningún tipo',
       (select count(*)::text from public.platos where cardinality(tipo) = 0)
union all
select 'tipos sin objetivo (máximo a cero)',
       (select count(*)::text from public.tipos where maximo = 0)
union all
select 'TOTAL de tipos', (select count(*)::text from public.tipos);

select orden, tipo, minimo, maximo from public.tipos order by orden;
