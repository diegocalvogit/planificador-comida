-- Menú Semanal · esquema de Supabase
-- Pégalo entero en el editor SQL del proyecto y ejecútalo una sola vez.

-- ====================== Quién es de la casa ======================
-- La lista de correos con acceso. Nadie puede leerla ni tocarla desde la web:
-- se edita solo desde el panel de Supabase. Que alguien se registre por su
-- cuenta no le sirve de nada si su correo no está aquí.
create table if not exists public.hogar (
  email text primary key
);
alter table public.hogar enable row level security;
-- Sin políticas, nadie llega a esta tabla salvo el panel. Es lo que queremos.

-- La comprueban todas las políticas. SECURITY DEFINER para que pueda leer
-- `hogar` aunque quien pregunte no tenga permiso sobre ella.
create or replace function public.es_de_la_casa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hogar where email = (auth.jwt() ->> 'email')
  );
$$;

-- ====================== Catálogo ======================
-- El orden de las secciones es el orden en que se recorre el súper, y manda
-- en la lista de la compra. Antes era el orden de las filas del CSV; ahora se
-- dice en una columna, que es menos frágil.
create table if not exists public.secciones (
  seccion text primary key,
  orden   int  not null
);

create table if not exists public.ingredientes (
  ingrediente text primary key,
  seccion     text not null references public.secciones(seccion)
                    on update cascade
);

create table if not exists public.tipos (
  clave text primary key,
  tipo  text not null unique,
  orden int  not null
);

create table if not exists public.equilibrio (
  objetivo text primary key,
  tipos    text[] not null,
  minimo   int    not null default 0,
  maximo   int    not null default 0,
  orden    int    not null,
  check (maximo >= minimo)
);

create table if not exists public.platos (
  nombre       text primary key,
  adultos      boolean not null default true,
  nino         boolean not null default false,
  descripcion  text    not null default '',
  tipo         text[]  not null default '{}',
  momento      text[]  not null default '{}',
  tiempo       text    not null default 'medio',
  repeticion   text    not null default 'media',
  plato_unico  boolean not null default false,
  ingredientes text[]  not null default '{}',
  check (tiempo in ('bajo','medio','alto')),
  check (repeticion in ('siempre','alta','media','baja','ocasional','nunca')),
  check (momento <@ array['desayuno','almuerzo','comida','merienda','cena']),
  check (adultos or nino)
);

-- ====================== Lo que cambia cada semana ======================
-- Una sola tabla para los dos menús: `menu` dice cuál. El identificador de la
-- semana es el lunes, y la etiqueta ("3ª semana de septiembre") se calcula en
-- la página: guardarla sería repetirse.
create table if not exists public.semanas (
  semana_id date     not null,
  menu      text     not null check (menu in ('casa','nino')),
  dia       text     not null check (dia in ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
  momento   text     not null check (momento in ('desayuno','almuerzo','comida','merienda','cena')),
  orden     smallint not null check (orden in (1,2)),
  plato     text     not null references public.platos(nombre)
                          on update cascade on delete cascade,
  primary key (semana_id, menu, dia, momento, orden)
);
-- Renombrar un plato arrastra solo sus semanas, y borrarlo las limpia. Eso
-- eran dos funciones de JavaScript que desaparecen.

create table if not exists public.compras (
  semana_id   date    not null,
  ingrediente text    not null references public.ingredientes(ingrediente)
                           on update cascade on delete cascade,
  en_casa     boolean not null,
  primary key (semana_id, ingrediente)
);

create table if not exists public.despensa (
  ingrediente text    primary key references public.ingredientes(ingrediente)
                           on update cascade on delete cascade,
  en_casa     boolean not null
);

create index if not exists semanas_por_semana on public.semanas (semana_id);
create index if not exists compras_por_semana on public.compras (semana_id);

-- ====================== Permisos ======================
-- Todo cerrado salvo para los correos de `hogar`. Sin sesión, la base no
-- contesta ni a una lectura.
do $$
declare t text;
begin
  foreach t in array array['secciones','ingredientes','tipos','equilibrio',
                           'platos','semanas','compras','despensa']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo la casa" on public.%I', t);
    execute format(
      'create policy "solo la casa" on public.%I for all to authenticated '
      'using (public.es_de_la_casa()) with check (public.es_de_la_casa())', t);
    -- El permiso de tabla, aparte de la política: así el esquema funciona
    -- tanto si el proyecto expone las tablas nuevas por su cuenta como si no.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant execute on function public.es_de_la_casa() to authenticated;

-- `hogar` queda fuera de la API por partida doble: sin permiso de tabla y sin
-- ninguna política. Solo la lee la función de arriba, que corre como su dueño.
revoke all on public.hogar from anon, authenticated;

-- Sin sesión no se llega a nada: `anon` no tiene permiso sobre ninguna tabla.
revoke usage on schema public from anon;
