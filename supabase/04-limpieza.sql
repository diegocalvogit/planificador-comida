-- Limpieza de nombres que entraron torcidos con el cargador de la guardería.
--
-- Se puede ejecutar entero de una vez y se puede repetir sin hacer daño: si ya
-- está aplicado, no encuentra nada que cambiar y no toca nada.
--
-- Va todo dentro de una transacción. O se aplica entero o no se aplica nada:
-- a medio camino te quedarían platos apuntando a un ingrediente que ya no
-- existe, que es peor que el problema de partida.

begin;

/* ─────────────────────────────────────────────────────────────────────
   1. «patatas» se funde con «patata»
   ─────────────────────────────────────────────────────────────────────
   No es un renombrado sino una fusión, porque «patata» ya existe. Hay que
   deshacer primero lo que chocaría contra la clave primaria.           */

-- La marca de «ya lo tengo» de esa semana: si la hay para los dos nombres,
-- sobra una. Se queda la de «patata», que es el nombre que vive.
delete from public.compras c
 where c.ingrediente = 'patatas'
   and exists (select 1 from public.compras o
                where o.semana_id = c.semana_id and o.ingrediente = 'patata');
update public.compras set ingrediente = 'patata' where ingrediente = 'patatas';

delete from public.despensa d
 where d.ingrediente = 'patatas'
   and exists (select 1 from public.despensa o where o.ingrediente = 'patata');
update public.despensa set ingrediente = 'patata' where ingrediente = 'patatas';

-- Los platos. array_replace cambia el nombre respetando el orden.
update public.platos
   set ingredientes = array_replace(ingredientes, 'patatas', 'patata')
 where 'patatas' = any(ingredientes);

-- Las cantidades de las recetas, que son líneas «ingrediente: cuánto».
update public.recetas r
   set cantidades = (select array_agg(regexp_replace(l, '^patatas:', 'patata:') order by n)
                       from unnest(r.cantidades) with ordinality as u(l, n))
 where exists (select 1 from unnest(r.cantidades) l where l like 'patatas:%');

-- Y ahora sí, fuera el ingrediente duplicado.
delete from public.ingredientes where ingrediente = 'patatas';


/* ─────────────────────────────────────────────────────────────────────
   2. «muslos desguesados de pollo» → «muslos deshuesados de pollo»
   ─────────────────────────────────────────────────────────────────────
   Esto sí es un renombrado: el nombre bueno no existía. La clave ajena en
   cascada se encarga de compras y despensa; los platos y las recetas no la
   tienen, porque son arrays, y hay que hacerlos a mano.                */

update public.ingredientes
   set ingrediente = 'muslos deshuesados de pollo'
 where ingrediente = 'muslos desguesados de pollo';

update public.platos
   set ingredientes = array_replace(ingredientes,
                                    'muslos desguesados de pollo',
                                    'muslos deshuesados de pollo')
 where 'muslos desguesados de pollo' = any(ingredientes);

update public.recetas r
   set cantidades = (select array_agg(
                              regexp_replace(l, '^muslos desguesados de pollo:',
                                                'muslos deshuesados de pollo:') order by n)
                       from unnest(r.cantidades) with ordinality as u(l, n))
 where exists (select 1 from unnest(r.cantidades) l
                where l like 'muslos desguesados de pollo:%');


/* ─────────────────────────────────────────────────────────────────────
   3. El plato que empieza en minúscula
   ─────────────────────────────────────────────────────────────────────
   platos.nombre es clave primaria y la citan semanas, reglas y recetas, las
   tres con cascada al actualizar: con tocar aquí, las tres le siguen solas. */

update public.platos
   set nombre = 'Albóndigas con patatas'
 where nombre = 'albóndigas con patatas';


/* ─────────────────────────────────────────────────────────────────────
   4. Por si acaso: ningún plato con el mismo ingrediente dos veces
   ─────────────────────────────────────────────────────────────────────
   Fundir «patatas» en «patata» deja el nombre repetido en cualquier plato
   que llevara los dos. Esto lo deshace respetando el orden de aparición. */

update public.platos p
   set ingredientes = sub.limpio
  from (select p2.nombre,
               (select array_agg(e order by primera)
                  from (select e, min(n) as primera
                          from unnest(p2.ingredientes) with ordinality as u(e, n)
                         group by e) d) as limpio
          from public.platos p2
         where cardinality(p2.ingredientes)
               <> (select count(distinct e) from unnest(p2.ingredientes) e)) sub
 where p.nombre = sub.nombre;

commit;


/* ─────────────────────────────────────────────────────────────────────
   Comprobación: después de ejecutar lo de arriba, esto debería salir todo
   a cero salvo la última fila.
   ───────────────────────────────────────────────────────────────────── */

select 'ingrediente «patatas»'                as que,
       count(*)                               as quedan
  from public.ingredientes where ingrediente = 'patatas'
union all
select 'platos que usan «patatas»', count(*)
  from public.platos where 'patatas' = any(ingredientes)
union all
select 'ingrediente «desguesados»', count(*)
  from public.ingredientes where ingrediente like '%desguesados%'
union all
select 'platos que usan «desguesados»', count(*)
  from public.platos where exists (select 1 from unnest(ingredientes) i
                                    where i like '%desguesados%')
union all
select 'recetas que nombran «desguesados»', count(*)
  from public.recetas where exists (select 1 from unnest(cantidades) c
                                     where c like '%desguesados%')
union all
select 'platos con un ingrediente repetido', count(*)
  from public.platos
 where cardinality(ingredientes) <> (select count(distinct e) from unnest(ingredientes) e)
union all
select 'ingredientes usados que no están en el catálogo', count(*)
  from (select distinct i from public.platos p, unnest(p.ingredientes) i) u
  left join public.ingredientes g on g.ingrediente = u.i
 where g.ingrediente is null
union all
select 'platos que empiezan en minúscula', count(*)
  from public.platos where nombre ~ '^[a-záéíóúñ]'
union all
select 'TOTAL de platos (informativo)', count(*) from public.platos;
