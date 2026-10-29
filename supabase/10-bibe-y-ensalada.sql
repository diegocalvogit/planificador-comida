-- Los dos platos que quedaban sin ingredientes.
--
-- La lista de la compra se hace con los ingredientes del plato, así que un
-- plato sin ninguno nunca aparece en ella. Para «Restaurante» eso es correcto
-- —comer fuera no se compra—, pero para estos dos no:
--
--   Bibe                la leche del niño no entraba nunca
--   Ensalada preparada  se compra hecha cada vez que se pone
--
-- Los dos son de preparación baja, así que no piden receta y no hay
-- cantidades que cuadrar.
--
-- Se puede repetir sin hacer daño.

begin;

-- «leche» ya existe en el catálogo; «ensalada preparada» no, y va donde su
-- pariente «salmón preparado»: en el súper se coge con lo fresco.
insert into public.ingredientes (ingrediente, seccion)
values ('ensalada preparada', 'Frutería y verdulería')
on conflict (ingrediente) do nothing;

update public.platos
   set ingredientes = array['leche']
 where nombre = 'Bibe' and cardinality(ingredientes) = 0;

update public.platos
   set ingredientes = array['ensalada preparada']
 where nombre = 'Ensalada preparada' and cardinality(ingredientes) = 0;

commit;


/* Comprobación: la primera fila ya solo debería contar «Restaurante». */

select 'platos sin ningún ingrediente'            as comprobacion,
       (select count(*)::text from public.platos
         where cardinality(ingredientes) = 0)     as valor
union all
select 'cuáles',
       (select string_agg(nombre, ', ' order by nombre) from public.platos
         where cardinality(ingredientes) = 0)
union all
select '— Bibe',
       (select array_to_string(ingredientes, ', ') from public.platos where nombre = 'Bibe')
union all
select '— Ensalada preparada',
       (select array_to_string(ingredientes, ', ') from public.platos
         where nombre = 'Ensalada preparada')
union all
select 'ingredientes usados que no están en el catálogo',
       (select count(*)::text
          from (select distinct i from public.platos p, unnest(p.ingredientes) i) u
          left join public.ingredientes g on g.ingrediente = u.i
         where g.ingrediente is null);
