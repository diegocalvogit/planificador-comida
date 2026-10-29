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

-- Los tipos de alimento son la única clasificación que hay: describen el plato
-- y miden la semana. Hubo una tabla aparte, equilibrio, con objetivos que
-- agrupaban varios tipos, y se solapaban —«Pescado azul» era un objetivo suelto
-- y además estaba dentro de «Pescado y marisco»—, así que nunca estaba claro
-- cuál mandaba. El objetivo semanal vive ahora en el propio tipo.
create table if not exists public.tipos (
  clave  text primary key,
  tipo   text not null unique,
  orden  int  not null,
  minimo int  not null default 0,
  maximo int  not null default 0,
  constraint tipos_rango check (maximo >= minimo)
);

-- Qué va en cada hueco de la semana, antes de saber de qué semana hablamos.
-- Tres filas por comida, una por plato, y cada una manda en su hueco. Admite
-- un tipo de alimento ("el martes, legumbres") o un plato concreto ("los
-- domingos, paella"); lo segundo fue una tabla aparte, `reglas`, que hacía
-- exactamente esto en otra pantalla.
--
-- Tres maneras de estar una celda:
--
--   sin fila                 libre: que lo reparta el generador
--   con tipo o con plato     eso es lo que va ahí
--   fila con los dos a null  en blanco: ahí no va nada
--
-- Lo último es lo que permite decir "mis cenas son de un plato". A mano sí se
-- puede añadir: la plantilla gobierna el reparto automático, no ata las manos.
--
-- Hay una por menú. Hubo una sola para los dos, y por eso solo dejaba clavar
-- platos que comieran ambos, para no tener que decidir qué come el niño el día
-- que los adultos tienen paella. Pero eso dejaba fuera justo los casos que más
-- se querían fijar: el bibe del desayuno y la paella misma.
create table if not exists public.plantilla (
  menu    text     not null check (menu in ('casa','nino')),
  dia     text     not null check (dia in ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
  momento text     not null check (momento in ('desayuno','almuerzo','comida','merienda','cena')),
  orden   smallint not null check (orden in (1,2,3)),
  tipo    text     references public.tipos(tipo)    on update cascade on delete cascade,
  plato   text     references public.platos(nombre) on update cascade on delete cascade,
  primary key (menu, dia, momento, orden),
  constraint plantilla_una_cosa check (tipo is null or plato is null)
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
-- Los pasos de un plato, para los de preparación media o alta. Un plato de
-- preparación baja no necesita que nadie le explique nada.
create table if not exists public.recetas (
  plato text primary key references public.platos(nombre)
              on update cascade on delete cascade,
  pasos text[] not null default '{}',
  -- Cuánto lleva de cada cosa, para una persona: "ingrediente: cantidad".
  -- El nombre se casa con la lista del plato, que sigue siendo la única que
  -- manda para la compra: aquí solo se dice cuánto, nunca qué.
  cantidades text[] not null default '{}'
);

create table if not exists public.semanas (
  semana_id date     not null,
  menu      text     not null check (menu in ('casa','nino')),
  dia       text     not null check (dia in ('lunes','martes','miércoles','jueves','viernes','sábado','domingo')),
  momento   text     not null check (momento in ('desayuno','almuerzo','comida','merienda','cena')),
  orden     smallint not null check (orden in (1,2,3)),
  plato     text     not null references public.platos(nombre)
                          on update cascade on delete cascade,
  -- Si sus ingredientes entran en la lista de la compra. Lo normal es que sí,
  -- de ahí el default: las excepciones son lo que el niño come en la guardería
  -- y lo que ya está en la nevera.
  es_para_comprar boolean not null default true,
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
  foreach t in array array['secciones','ingredientes','tipos','plantilla',
                           'recetas','platos','semanas','compras','despensa']
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
