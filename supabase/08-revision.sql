-- Revisión de la base. No escribe nada: solo mira y cuenta.
--
-- Las pruebas de pruebas/ corren contra la semilla del repositorio, así que
-- cazan lo que rompa el código pero no lo que se tuerza escribiendo desde la
-- aplicación. Y es ahí donde han ido apareciendo las cosas de una en una:
-- «patatas» conviviendo con «patata», «desguesados» por «deshuesados», un
-- plato en minúscula, la ternera de un plato que ya no la llevaba, la pechuga
-- de pollo de un arroz con huevo. Esto es la red que faltaba.
--
-- Todas las filas deberían salir a cero menos las tres últimas, que son
-- recuentos informativos. Se puede ejecutar cuando se quiera.

select 'ingredientes usados que no están en el catálogo'       as revision,
       count(*)::text                                          as cuantos
  from (select distinct i from public.platos p, unnest(p.ingredientes) i) u
  left join public.ingredientes g on g.ingrediente = u.i
 where g.ingrediente is null

union all
select 'ingredientes del catálogo sin sección',
       (select count(*)::text from public.ingredientes
         where seccion is null or btrim(seccion) = '')

union all
select 'ingredientes de una sección que no existe',
       (select count(*)::text from public.ingredientes i
         left join public.secciones s on s.seccion = i.seccion
         where i.seccion is not null and s.seccion is null)

union all
select 'platos con un ingrediente repetido',
       (select count(*)::text from public.platos
         where cardinality(ingredientes) <> (select count(distinct e) from unnest(ingredientes) e))

union all
-- Un plato sin ingredientes no aparece jamás en la lista de la compra. Para
-- «Restaurante» eso es lo correcto, así que la cuenta buena aquí es 1.
select 'platos sin ningún ingrediente («Restaurante» lo es a propósito)',
       (select count(*)::text from public.platos where cardinality(ingredientes) = 0)

union all
select 'platos que empiezan en minúscula',
       (select count(*)::text from public.platos where nombre ~ '^[a-záéíóúñ]')

union all
select 'platos con un tipo que no está en el catálogo',
       (select count(*)::text
          from (select distinct t from public.platos p, unnest(p.tipo) t) u
          left join public.tipos g on g.tipo = u.t
         where g.tipo is null)

union all
select 'platos que no come nadie (ni adultos ni niño)',
       (select count(*)::text from public.platos where not adultos and not nino)

union all
-- El criterio de la pestaña Recetas: preparación media o alta.
select 'platos de preparación media/alta sin receta escrita',
       (select count(*)::text from public.platos p
         where p.tiempo in ('medio', 'alto')
           and not exists (select 1 from public.recetas r
                            where r.plato = p.nombre and cardinality(r.pasos) > 0))

union all
select 'recetas de un plato que ya no existe',
       (select count(*)::text from public.recetas r
         left join public.platos p on p.nombre = r.plato
         where p.nombre is null)

union all
select 'recetas de un plato que no las pide',
       (select count(*)::text from public.recetas r
          join public.platos p on p.nombre = r.plato
         where p.tiempo not in ('medio', 'alto'))

union all
select 'recetas que se quedan en un solo paso',
       (select count(*)::text from public.recetas where cardinality(pasos) < 2)

union all
-- Las dos direcciones del mismo descuadre, que es el que se nos escapó con el
-- arroz: la receta nombrando algo que el plato no lleva, y el plato llevando
-- algo que la receta no nombra. La compra lee el plato y la cocina lee la
-- receta, así que si no dicen lo mismo, una de las dos miente.
select 'cantidades que nombran algo que el plato no lleva',
       (select count(*)::text from public.recetas r
          join public.platos p on p.nombre = r.plato, unnest(r.cantidades) c
         where split_part(c, ':', 1) <> all(p.ingredientes))

union all
select 'ingredientes del plato que su receta no nombra',
       (select count(*)::text from public.platos p
          join public.recetas r on r.plato = p.nombre, unnest(p.ingredientes) i
         where not exists (select 1 from unnest(r.cantidades) c
                            where split_part(c, ':', 1) = i))

union all
select 'reglas que fuerzan un plato que ya no existe',
       (select count(*)::text from public.reglas g
         left join public.platos p on p.nombre = g.plato
         where p.nombre is null)

union all
select 'marcas de compra de un ingrediente que ya no existe',
       (select count(*)::text from public.compras c
         left join public.ingredientes g on g.ingrediente = c.ingrediente
         where g.ingrediente is null)

union all
select '— platos en el repertorio',
       (select count(*)::text from public.platos)

union all
select '— recetas escritas',
       (select count(*)::text from public.recetas where cardinality(pasos) > 0)

union all
select '— platos de la semana fuera de la compra',
       (select count(*)::text from public.semanas where not es_para_comprar);
