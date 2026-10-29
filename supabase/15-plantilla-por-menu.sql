-- Una plantilla para el niño y otra para el adulto.
--
-- Era una sola para los dos, y por eso solo dejaba clavar platos que comieran
-- ambos: así no había que decidir qué come el niño el día que los adultos
-- tienen paella. Pero eso dejaba fuera justo los casos que más se querían
-- fijar: el bibe del desayuno del niño, que no lo toma nadie más, y la paella
-- de los domingos, que es de adultos.
--
-- Con una plantilla por menú el problema se evapora en vez de esquivarse: cada
-- una fija platos de los suyos y nadie tiene que decidir nada por el otro. La
-- restricción de «solo platos que coman los dos» se va con ella.
--
-- Las dos nacen con lo que ya había, que es lo que se propuso de partida, y a
-- partir de ahí se tocan por separado.
--
-- Se puede ejecutar entero y se puede repetir sin hacer daño.

begin;

alter table public.plantilla
  add column if not exists menu text not null default 'casa'
      check (menu in ('casa','nino'));

-- La clave primaria de antes no lleva el menú, así que rechazaría la copia:
-- primero se suelta, luego se duplica y al final se rehace con el menú dentro.
alter table public.plantilla drop constraint if exists plantilla_pkey;

-- Lo que hubiera era de los dos: se queda como la del adulto y se copia tal
-- cual para el niño.
insert into public.plantilla (menu, dia, momento, orden, tipo, plato)
select 'nino', p.dia, p.momento, p.orden, p.tipo, p.plato
  from public.plantilla p
 where p.menu = 'casa'
   and not exists (select 1 from public.plantilla o
                    where o.menu = 'nino' and o.dia = p.dia
                      and o.momento = p.momento and o.orden = p.orden);

alter table public.plantilla add primary key (menu, dia, momento, orden);
alter table public.plantilla alter column menu drop default;

commit;

notify pgrst, 'reload schema';


/* Comprobación: las dos plantillas, con las mismas celdas cada una. */

select 'columnas'                                as revision,
       (select string_agg(column_name, ', ' order by ordinal_position)
          from information_schema.columns
         where table_schema = 'public' and table_name = 'plantilla') as valor
union all
select 'clave primaria',
       (select string_agg(a.attname, ', ' order by array_position(i.indkey, a.attnum))
          from pg_index i
          join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
         where i.indrelid = 'public.plantilla'::regclass and i.indisprimary)
union all
select 'celdas del adulto',
       (select count(*)::text from public.plantilla where menu = 'casa')
union all
select 'celdas del niño',
       (select count(*)::text from public.plantilla where menu = 'nino')
union all
select 'diferencias entre las dos (debería ser 0 recién copiadas)',
       (select count(*)::text from (
          select dia, momento, orden, tipo, plato from public.plantilla where menu = 'casa'
          except
          select dia, momento, orden, tipo, plato from public.plantilla where menu = 'nino') d);
