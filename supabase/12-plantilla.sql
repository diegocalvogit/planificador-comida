-- La plantilla: qué tipo de alimento toca en cada comida de la semana.
--
-- Una fila por día y momento, con el tipo de referencia de esa comida. No hay
-- fila cuando ese momento da igual. Es una sola plantilla para los dos menús:
-- el martes tocan legumbres para todos, y lo que cambia es el plato concreto
-- que come cada uno.
--
-- Se queda con un solo tipo por comida y no con los tres platos a propósito:
-- lo que se fija es el eje de la comida, y el acompañamiento sale de lo que
-- haga falta para el equilibrio de la semana.
--
-- Manda sobre el equilibrio y por debajo de las reglas del día a día: una
-- regla clava un plato concreto, y donde hay regla la plantilla no pinta nada.
--
-- Se puede repetir sin hacer daño; nace vacía y se rellena desde Configuración.

create table if not exists public.plantilla (
  dia     text not null check (dia in ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
  momento text not null check (momento in ('desayuno','almuerzo','comida','merienda','cena')),
  -- Si se renombra un tipo, la plantilla le sigue; si se borra, la celda se
  -- queda vacía, que es lo mismo que no haber pedido nada.
  tipo    text not null references public.tipos(tipo) on update cascade on delete cascade,
  primary key (dia, momento)
);

-- Las mismas reglas que el resto: solo entra quien está en la tabla hogar.
alter table public.plantilla enable row level security;
revoke all on public.plantilla from anon;
grant select, insert, update, delete on public.plantilla to authenticated;

drop policy if exists plantilla_de_la_casa on public.plantilla;
create policy plantilla_de_la_casa on public.plantilla
  for all to authenticated
  using (public.es_de_la_casa())
  with check (public.es_de_la_casa());

notify pgrst, 'reload schema';


/* Comprobación. */

select 'la tabla existe'                                     as revision,
       (select count(*)::text from information_schema.tables
         where table_schema = 'public' and table_name = 'plantilla') as valor
union all
select 'tiene RLS activada',
       (select case when relrowsecurity then 'sí' else 'NO' end
          from pg_class where oid = 'public.plantilla'::regclass)
union all
select 'políticas',
       (select count(*)::text from pg_policies
         where schemaname = 'public' and tablename = 'plantilla')
union all
select 'celdas puestas', (select count(*)::text from public.plantilla);
