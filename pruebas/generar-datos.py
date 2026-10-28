# -*- coding: utf-8 -*-
"""Convierte supabase/02-datos.sql en pruebas/datos.js.

Las pruebas necesitan datos de verdad: con cuatro platos de juguete el
generador siempre cuadra y no prueba nada. La semilla del repositorio es el
mejor sitio de donde sacarlos, porque es la misma que crea la base.

El JSON se versiona para que las pruebas se puedan correr sin Python. Esto
solo hay que volver a ejecutarlo si cambia la semilla:

    python pruebas/generar-datos.py
"""
import io, json, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)

COLUMNAS = {
    "secciones":    ["seccion", "orden"],
    "tipos":        ["clave", "tipo", "orden"],
    "ingredientes": ["ingrediente", "seccion"],
    "equilibrio":   ["objetivo", "tipos", "minimo", "maximo", "orden"],
    "platos":       ["nombre", "adultos", "nino", "descripcion", "tipo", "momento",
                     "tiempo", "repeticion", "plato_unico", "ingredientes"],
    "semanas":      ["semana_id", "menu", "dia", "momento", "orden", "plato"],
    "despensa":     ["ingrediente", "en_casa"],
}
# Columnas con valor por defecto que la semilla no escribe pero la aplicación lee.
DEFECTOS = {"semanas": {"es_para_comprar": True}}


def trozos(linea):
    """Parte los valores de una tupla por las comas de primer nivel.

    Se copia el texto tal cual, comillas incluidas: quitarlas aquí dejaba los
    `array['a','b']` sin sus comillas y luego no había forma de separar los
    elementos. De desnudar las comillas se encarga valor().
    """
    fuera, hondo, actual, comilla = [], 0, "", False
    i = 0
    while i < len(linea):
        c = linea[i]
        if comilla:
            actual += c
            if c == "'":
                if i + 1 < len(linea) and linea[i + 1] == "'":
                    actual += "'"
                    i += 2
                    continue
                comilla = False
        elif c == "'":
            comilla = True
            actual += c
        elif c in "([":
            hondo += 1
            actual += c
        elif c in ")]":
            hondo -= 1
            actual += c
        elif c == "," and hondo == 0:
            fuera.append(actual.strip())
            actual = ""
        else:
            actual += c
        i += 1
    fuera.append(actual.strip())
    return fuera


def entrecomillados(txt):
    return [x.replace("''", "'") for x in re.findall(r"'((?:[^']|'')*)'", txt)]


def valor(t):
    t = t.strip()
    if t.lower().startswith("array["):
        return entrecomillados(t[t.index("[") + 1:t.rindex("]")])
    if t.startswith("'"):
        trozo = entrecomillados(t)
        return trozo[0] if trozo else ""
    if t in ("true", "false"):
        return t == "true"
    if re.fullmatch(r"-?\d+", t):
        return int(t)
    return t


def tuplas(sql, tabla):
    m = re.search(r"insert into public\." + tabla + r"\b[^;]*?values\s*(.*?);", sql, re.S)
    if not m:
        return []
    cuerpo, filas, hondo, actual = m.group(1), [], 0, ""
    for c in cuerpo:
        if c == "(":
            hondo += 1
            if hondo == 1:
                actual = ""
                continue
        elif c == ")":
            hondo -= 1
            if hondo == 0:
                filas.append(actual)
                continue
        if hondo >= 1:
            actual += c
    return filas


sql = io.open(os.path.join(RAIZ, "supabase", "02-datos.sql"), encoding="utf-8").read()

datos = {"reglas": [], "recetas": [], "compras": []}

# Las recetas van en su propio fichero porque son opcionales: la base funciona
# sin ellas. Pero las pruebas las quieren, que si no no hay nada que mirar.
receta_sql = io.open(os.path.join(RAIZ, "supabase", "03-recetas.sql"),
                     encoding="utf-8").read()
for cruda in tuplas(receta_sql, "recetas"):
    partes = trozos(cruda)
    if len(partes) != 3:
        continue
    datos["recetas"].append({"plato": valor(partes[0]),
                             "cantidades": valor(partes[1]),
                             "pasos": valor(partes[2])})
for tabla, cols in COLUMNAS.items():
    filas = []
    for cruda in tuplas(sql, tabla):
        partes = trozos(cruda)
        if len(partes) != len(cols):
            continue
        fila = dict(DEFECTOS.get(tabla, {}))
        for col, p in zip(cols, partes):
            fila[col] = valor(p)
        filas.append(fila)
    datos[tabla] = filas

# Un .js y no un .json: así la página de pruebas lo carga con <script> y
# funciona hasta abriéndola desde el disco, sin servidor y sin fetch.
salida = os.path.join(AQUI, "datos.js")
io.open(salida, "w", encoding="utf-8", newline="\n").write(
    "// Generado por pruebas/generar-datos.py desde supabase/02-datos.sql.\n"
    "// No se edita a mano.\n"
    "window.DATOS_PRUEBA = " + json.dumps(datos, ensure_ascii=False, indent=1) + ";\n")
print("\n".join("%-14s %4d" % (k, len(v)) for k, v in sorted(datos.items())))
print("\nescrito en", salida)
