-- Los dos flecos que le quedan a «Dorada al horno».
--
-- El ingrediente «dorada» ya está dado de alta y el plato ya lo lleva. Falta
-- lo que no se puede tocar desde la pantalla de platos:
--
--   1. la receta no tiene cantidades, así que en la pestaña Recetas sale el
--      plato sin la columna de cuánto lleva cada cosa
--   2. su último paso es un aviso que puse a falta de la lista de
--      ingredientes, y ya no viene a cuento
--   3. la receta manda echar un chorro de aceite, pero el plato no lo lleva
--      entre sus ingredientes, así que no entra en la compra. O lo lleva y se
--      compra, o no lo menciona: las dos cosas a la vez no pueden ser.
--
-- Sal no se añade: ninguna receta de la casa la lista, porque no es algo que
-- entre en la compra de cada semana.
--
-- Se puede repetir sin hacer daño.

begin;

-- El aceite solo si no estaba ya, y al final, para no tocar el orden.
update public.platos
   set ingredientes = ingredientes || 'aceite de oliva'::text
 where nombre = 'Dorada al horno'
   and 'aceite de oliva' <> all(ingredientes);

update public.recetas
   set cantidades = array['dorada: 1 pieza de 400 g', 'aceite de oliva: 1 cucharada'],
       pasos = array[
         'Horno a 200°.',
         'Pedir el pescado limpio y descamado en la pescadería.',
         'Hacerle dos cortes en el lomo, sal gorda por dentro y por fuera y un chorro de aceite.',
         '20 min al horno para una pieza de 400 g, cinco más por cada 100 g de más.',
         'Está cuando la aleta dorsal sale tirando con los dedos.'
       ]
 where plato = 'Dorada al horno';

commit;


/* Comprobación: las tres primeras a cero, las tres últimas enseñando cómo queda. */

select 'sigue sin ingredientes'                             as comprobacion,
       (select count(*)::text from public.platos
         where nombre = 'Dorada al horno' and cardinality(ingredientes) = 0) as valor
union all
select 'ingredientes del plato que la receta no nombra',
       (select count(*)::text from public.platos p
          join public.recetas r on r.plato = p.nombre, unnest(p.ingredientes) i
         where p.nombre = 'Dorada al horno'
           and not exists (select 1 from unnest(r.cantidades) c
                            where split_part(c, ':', 1) = i))
union all
select 'pasos que siguen avisando de que falta la lista',
       (select count(*)::text from public.recetas
         where plato = 'Dorada al horno'
           and exists (select 1 from unnest(pasos) s where s ilike '%falta la lista%'))
union all
select '— ingredientes',
       (select array_to_string(ingredientes, ', ') from public.platos
         where nombre = 'Dorada al horno')
union all
select '— cantidades',
       (select array_to_string(cantidades, ' · ') from public.recetas
         where plato = 'Dorada al horno')
union all
select '— pasos',
       (select cardinality(pasos)::text from public.recetas
         where plato = 'Dorada al horno');
