-- «Arroz con huevo y carne» pasa a ser «Arroz con huevo».
--
-- La carne se le quitó de los ingredientes en algún momento y el resto del
-- plato no se enteró: seguía llamándose «con carne», seguía contando como
-- Carne roja en el equilibrio —midiendo una comida de carne que nadie compra—
-- y su receta mandaba hacer un filete que no estaba en la lista.
--
-- Lo que hay que tocar y lo que se arregla solo:
--
--   platos.nombre          a mano, y arrastra en cascada a semanas, reglas y
--                          recetas, porque las tres lo referencian con
--                          `on update cascade`
--   platos.tipo            a mano: fuera «Carne roja», que es lo que falsea
--                          el equilibrio
--   platos.descripcion     a mano
--   platos.ingredientes    a mano, por si quedara la ternera
--   recetas.pasos          a mano: hablaban del filete
--   recetas.cantidades     a mano: ya estaba limpia, pero se deja explícito
--
-- Todo en una transacción, y se puede repetir sin hacer daño.

begin;

-- 1. El plato. El renombrado arrastra solo las tres tablas que lo nombran.
update public.platos
   set nombre       = 'Arroz con huevo',
       descripcion  = 'Arroz con tomate y huevo frito encima.',
       tipo         = array_remove(tipo, 'Carne roja'),
       ingredientes = array_remove(ingredientes, 'filetes de ternera')
 where nombre = 'Arroz con huevo y carne';

-- Por si ya lo habías renombrado a mano y solo falta la limpieza de dentro.
update public.platos
   set tipo         = array_remove(tipo, 'Carne roja'),
       ingredientes = array_remove(ingredientes, 'filetes de ternera')
 where nombre = 'Arroz con huevo'
   and ('Carne roja' = any(tipo) or 'filetes de ternera' = any(ingredientes));

-- 2. La receta, que ya cuelga del nombre nuevo por la cascada.
update public.recetas
   set cantidades = array[
         'arroz: 80 g',
         'huevos: 2 unidades',
         'tomate frito: 3 cucharadas (50 g)',
         'aceite de oliva: 1 cucharada'
       ],
       pasos = array[
         'Cocer el arroz en agua con sal, 15 min. Escurrir y reservar.',
         'Calentar el tomate frito y mezclarlo con el arroz.',
         'Freír los huevos en aceite bien caliente, echándoles aceite por encima con la cuchara.',
         'Sacarlos cuando la clara esté cuajada y la yema siga líquida.',
         'Montar: el arroz de base y los huevos encima.'
       ]
 where plato = 'Arroz con huevo';

commit;


/* Comprobación: las cinco primeras filas a cero o a «no», y las dos últimas
   enseñando cómo ha quedado el plato. */

select 'sigue existiendo el nombre viejo' as comprobacion,
       (select count(*)::text from public.platos where nombre = 'Arroz con huevo y carne') as valor
union all
select 'semanas que citan el nombre viejo',
       (select count(*)::text from public.semanas where plato = 'Arroz con huevo y carne')
union all
select 'le queda el tipo Carne roja',
       (select count(*)::text from public.platos
         where nombre = 'Arroz con huevo' and 'Carne roja' = any(tipo))
union all
select 'le queda la ternera de ingrediente',
       (select count(*)::text from public.platos
         where nombre = 'Arroz con huevo' and 'filetes de ternera' = any(ingredientes))
union all
select 'cantidades huérfanas en toda la base',
       (select count(*)::text from public.recetas r
          join public.platos p on p.nombre = r.plato, unnest(r.cantidades) c
         where split_part(c, ':', 1) <> all(p.ingredientes))
union all
select 'pasos que siguen hablando del filete',
       (select count(*)::text from public.recetas
         where plato = 'Arroz con huevo'
           and exists (select 1 from unnest(pasos) s where s ilike '%filete%'))
union all
select '— cómo queda: tipos',
       (select array_to_string(tipo, ', ') from public.platos where nombre = 'Arroz con huevo')
union all
select '— cómo queda: ingredientes',
       (select array_to_string(ingredientes, ', ') from public.platos where nombre = 'Arroz con huevo');
