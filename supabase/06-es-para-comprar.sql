-- La columna «es_para_comprar» de public.semanas, deje la base como la deje.
--
-- Esta columna nació llamándose «en_guarde» y en negativo —true quería decir
-- «esto NO se compra»—. Se le dio la vuelta porque casi todos los platos se
-- compran, y lo normal no debería tener que marcarse en ningún sitio: ahora
-- es «es_para_comprar», en positivo y con true por defecto.
--
-- Lo que no está claro es por dónde va tu base, porque el renombrado a secas
-- falló con «column "en_guarde" does not exist». Caben tres situaciones, y
-- esto las cubre las tres sin que haya que saber de antemano cuál es:
--
--   1. Todavía se llama «en_guarde»  → se renombra y se invierten los valores
--   2. Ya se llama «es_para_comprar» → no se tocan los valores, solo el
--                                      default y el not null
--   3. No existe ninguna de las dos  → se crea con true en todas las filas
--
-- En el caso 2 no se invierte nada a propósito. Si la columna ya tiene el
-- nombre bueno es porque el cambio se hizo, y volver a darle la vuelta
-- dejaría la mitad de la semana fuera de la lista de la compra sin avisar.
-- Si al terminar vieras justo lo contrario de lo que esperas —todo tachado
-- menos la guardería—, dímelo y lo invertimos con una línea.
--
-- Se puede ejecutar entero de una vez y se puede repetir sin hacer daño.

begin;

do $$
declare
  hay_viejo boolean;
  hay_nuevo boolean;
begin
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'semanas'
                    and column_name = 'en_guarde')       into hay_viejo;
  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'semanas'
                    and column_name = 'es_para_comprar') into hay_nuevo;

  if hay_viejo and not hay_nuevo then
    raise notice 'Estaba «en_guarde»: se renombra y se invierte.';
    alter table public.semanas rename column en_guarde to es_para_comprar;
    -- Los nulos de antes valían «no se dijo nada», o sea «se compra».
    update public.semanas
       set es_para_comprar = not coalesce(es_para_comprar, false);

  elsif hay_viejo and hay_nuevo then
    -- Las dos a la vez: un renombrado a medias. Manda la nueva y la vieja
    -- solo rellena lo que la nueva no sepa.
    raise notice 'Estaban las dos: se funden y se tira la vieja.';
    update public.semanas
       set es_para_comprar = not en_guarde
     where es_para_comprar is null and en_guarde is not null;
    alter table public.semanas drop column en_guarde;

  elsif hay_nuevo then
    raise notice 'Ya se llamaba «es_para_comprar»: solo default y not null.';

  else
    raise notice 'No existía ninguna de las dos: se crea.';
    alter table public.semanas add column es_para_comprar boolean;
  end if;
end $$;

-- Y pase lo que pase, la columna acaba igual: sin nulos, con true por defecto
-- y obligatoria. Esto es lo que la aplicación da por hecho al guardar.
update public.semanas set es_para_comprar = true where es_para_comprar is null;
alter table public.semanas alter column es_para_comprar set default true;
alter table public.semanas alter column es_para_comprar set not null;

commit;

-- PostgREST se guarda el esquema en memoria. Sin esto, aunque la columna ya
-- exista, la API sigue contestando que no la conoce hasta que le toca
-- recargar sola, y la aplicación seguiría diciendo «no se ha podido guardar».
notify pgrst, 'reload schema';


/* ─────────────────────────────────────────────────────────────────────
   Comprobación. Las tres primeras filas dicen cómo ha quedado la columna;
   las dos últimas, cuántos platos de la semana entran en la compra y
   cuántos no. Si el segundo número fuera enorme y el primero pequeño, es
   que los valores están al revés: avísame.
   ───────────────────────────────────────────────────────────────────── */

select 'la columna se llama'               as que,
       string_agg(column_name, ', ')       as valor
  from information_schema.columns
 where table_schema = 'public' and table_name = 'semanas'
   and column_name in ('en_guarde', 'es_para_comprar')
union all
select 'admite nulos',
       (select is_nullable from information_schema.columns
         where table_schema = 'public' and table_name = 'semanas'
           and column_name = 'es_para_comprar')
union all
select 'valor por defecto',
       (select coalesce(column_default, '(ninguno)') from information_schema.columns
         where table_schema = 'public' and table_name = 'semanas'
           and column_name = 'es_para_comprar')
union all
select 'platos que SÍ entran en la compra',
       (select count(*)::text from public.semanas where es_para_comprar)
union all
select 'platos que NO entran (guardería y nevera)',
       (select count(*)::text from public.semanas where not es_para_comprar);
