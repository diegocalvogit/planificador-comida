-- Al «Arroz con huevo» le sobraba la pechuga de pollo.
--
-- Cuando el plato dejó de llamarse «y carne» se le quitó la ternera, pero en
-- la base tenía además una pechuga de pollo que no viene de la semilla: entró
-- a mano en algún momento. Y entraba sola en la lista de la compra cada vez
-- que el plato salía en una semana, porque la compra lee los ingredientes del
-- plato y no la receta. La receta nunca la mencionó y los tipos tampoco la
-- contaban, así que el equilibrio medía una comida sin carne y la lista traía
-- carne: las dos cosas no podían ser verdad a la vez.
--
-- Es arroz con tomate y huevo frito. Fuera el pollo.
--
-- Se puede repetir sin hacer daño: si ya está aplicado, no encuentra nada.

begin;

update public.platos
   set ingredientes = array_remove(ingredientes, 'pechuga de pollo')
 where nombre = 'Arroz con huevo'
   and 'pechuga de pollo' = any(ingredientes);

commit;


/* Comprobación. Las dos primeras filas a cero, y las tres últimas enseñando
   cómo queda el plato: los ingredientes, los tipos y las cantidades de la
   receta, que ahora tienen que decir exactamente lo mismo. */

select 'le queda la pechuga de pollo'        as comprobacion,
       (select count(*)::text from public.platos
         where nombre = 'Arroz con huevo' and 'pechuga de pollo' = any(ingredientes)) as valor
union all
select 'ingredientes del plato que la receta no nombra',
       (select count(*)::text
          from public.platos p, unnest(p.ingredientes) i
         where p.nombre = 'Arroz con huevo'
           and not exists (select 1 from public.recetas r, unnest(r.cantidades) c
                            where r.plato = p.nombre and split_part(c, ':', 1) = i))
union all
select '— ingredientes',
       (select array_to_string(ingredientes, ', ') from public.platos
         where nombre = 'Arroz con huevo')
union all
select '— tipos',
       (select array_to_string(tipo, ', ') from public.platos
         where nombre = 'Arroz con huevo')
union all
select '— cantidades de la receta',
       (select array_to_string(cantidades, ' · ') from public.recetas
         where plato = 'Arroz con huevo');


/* ─────────────────────────────────────────────────────────────────────
   Y de paso, el mismo descuadre en todo el repertorio: platos que llevan
   un ingrediente que su receta no menciona. Lo de arriba era un caso; esto
   dice si hay más. Si sale vacío, no hay ninguno.
   ───────────────────────────────────────────────────────────────────── */

select p.nombre                       as plato,
       string_agg(i, ', ' order by i) as ingredientes_que_la_receta_ignora
  from public.platos p
  join public.recetas r on r.plato = p.nombre,
       unnest(p.ingredientes) i
 where not exists (select 1 from unnest(r.cantidades) c
                    where split_part(c, ':', 1) = i)
 group by p.nombre
 order by p.nombre;
