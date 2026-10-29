-- La plantilla pasa a tener un hueco por plato, y se come a las reglas.
--
-- Antes era una celda por comida: el tipo de referencia, y el acompañamiento
-- salía del equilibrio. Se quedaba corta. Ahora hay tres celdas por comida,
-- una por plato, y cada una manda en su hueco: la del 1º en el primer plato,
-- la del 2º en el segundo.
--
-- Y cada celda admite dos cosas distintas:
--
--   un tipo    «el martes, legumbres» — cualquier plato que lo lleve
--   un plato   «los domingos, paella» — ese y no otro
--
-- Con eso las reglas del día a día dejan de tener sentido: hacían exactamente
-- lo segundo, en una pantalla aparte y con su propia tabla. Se van. No había
-- ninguna creada, que dice bastante de lo cómodas que eran.
--
-- Una celda puede estar de tres maneras:
--
--   sin fila                 libre: que lo reparta el generador
--   fila con tipo o plato    eso es lo que va ahí
--   fila con los dos a null  en blanco: ahí no va nada
--
-- Lo último es lo que permite decir «mis cenas son de un plato»: 2º y 3º en
-- blanco y el generador no los rellena. A mano sí se puede añadir: la
-- plantilla gobierna el reparto automático, no ata las manos.
--
-- Solo se pueden fijar platos que coman los dos. Así no hay que decidir qué
-- come el niño el día que los adultos tienen paella: el problema se quita de
-- en medio en vez de resolverse. Eso lo vigila la aplicación al ofrecer la
-- lista; aquí abajo queda la clave ajena, que es lo que la base puede
-- garantizar por su cuenta.
--
-- Se puede ejecutar entero de una vez y se puede repetir sin hacer daño.

begin;

-- La tabla es de ayer y nace vacía, así que se rehace en vez de migrarla.
drop table if exists public.plantilla;

create table public.plantilla (
  dia     text     not null check (dia in ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
  momento text     not null check (momento in ('desayuno','almuerzo','comida','merienda','cena')),
  orden   smallint not null check (orden in (1,2,3)),
  -- Uno de los dos, o ninguno. Nunca los dos.
  tipo    text     references public.tipos(tipo)  on update cascade on delete cascade,
  plato   text     references public.platos(nombre) on update cascade on delete cascade,
  primary key (dia, momento, orden),
  constraint plantilla_una_cosa check (tipo is null or plato is null)
);

alter table public.plantilla enable row level security;
revoke all on public.plantilla from anon;
grant select, insert, update, delete on public.plantilla to authenticated;

drop policy if exists plantilla_de_la_casa on public.plantilla;
create policy plantilla_de_la_casa on public.plantilla
  for all to authenticated
  using (public.es_de_la_casa())
  with check (public.es_de_la_casa());

-- Y fuera las reglas, que es lo que la plantilla acaba de absorber.
drop table if exists public.reglas;

commit;

notify pgrst, 'reload schema';


/* Comprobación. */

select 'la tabla reglas sigue existiendo'                   as revision,
       (select count(*)::text from information_schema.tables
         where table_schema = 'public' and table_name = 'reglas') as valor
union all
select 'plantilla: columnas',
       (select string_agg(column_name, ', ' order by ordinal_position)
          from information_schema.columns
         where table_schema = 'public' and table_name = 'plantilla')
union all
select 'plantilla: tiene RLS',
       (select case when relrowsecurity then 'sí' else 'NO' end
          from pg_class where oid = 'public.plantilla'::regclass)
union all
select 'plantilla: celdas puestas',
       (select count(*)::text from public.plantilla);
