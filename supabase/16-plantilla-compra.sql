-- La plantilla también dice si ese hueco se compra.
--
-- La marca de «esto no hay que comprarlo» vivía solo en la semana, hueco a
-- hueco, y había que ponerla cada vez: el bibe del desayuno no se compra
-- nunca, y la merienda que pone la guardería tampoco, pero había que decirlo
-- de nuevo cada lunes.
--
-- Ahora se puede decir una vez en la plantilla. Lo que se coloque en ese hueco
-- —el plato clavado al abrir la semana, o lo que meta el generador— nace fuera
-- de la compra, y desmarcarlo en una semana suelta sigue siendo posible: la
-- plantilla pone el valor de partida, no lo impone.
--
-- En positivo y con true por defecto, igual que en `semanas`: lo normal no
-- debería tener que decirse en ningún sitio.
--
-- Se puede ejecutar entero y se puede repetir sin hacer daño.

begin;

alter table public.plantilla
  add column if not exists es_para_comprar boolean not null default true;

commit;

notify pgrst, 'reload schema';


/* Comprobación. */

select 'columnas'                                   as revision,
       (select string_agg(column_name, ', ' order by ordinal_position)
          from information_schema.columns
         where table_schema = 'public' and table_name = 'plantilla') as valor
union all
select 'celdas fuera de la compra',
       (select count(*)::text from public.plantilla where not es_para_comprar);
