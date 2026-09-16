#!/usr/bin/env python3
"""Copia los CSV de datos/ dentro de index.html.

La web lee los CSV con fetch, que no funciona al abrir el fichero desde disco
(file://). Para que index.html siga funcionando con doble clic, lleva una copia
de cada CSV incrustada en un bloque <script type="text/csv">. Este script la
regenera, de forma que datos/ sigue siendo la única fuente de verdad.

    python scripts/actualizar-respaldo.py
"""

import io
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INDEX = RAIZ / "index.html"
FICHEROS = {
    "csv-platos": "platos.csv",
    "csv-platos-nino": "platos-nino.csv",
    "csv-ingredientes": "ingredientes.csv",
    "csv-equilibrio": "equilibrio.csv",
    "csv-equilibrio-nino": "equilibrio-nino.csv",
    "csv-semanas": "semanas.csv",
    "csv-semanas-nino": "semanas-nino.csv",
    "csv-despensa": "despensa.csv",
    "csv-compras": "compras.csv",
}


def main() -> int:
    html = io.open(INDEX, encoding="utf-8").read()
    original = html

    for bloque, nombre in FICHEROS.items():
        ruta = RAIZ / "datos" / nombre
        if not ruta.exists():
            print(f"  falta datos/{nombre}", file=sys.stderr)
            return 1
        csv = io.open(ruta, encoding="utf-8").read().strip()
        if "</script" in csv.lower():
            print(f"  datos/{nombre} contiene </script y no se puede incrustar", file=sys.stderr)
            return 1
        patron = re.compile(
            r'(<script type="text/csv" id="' + re.escape(bloque) + r'">)(.*?)(</script>)',
            re.DOTALL,
        )
        if not patron.search(html):
            print(f"  no encuentro el bloque {bloque} en index.html", file=sys.stderr)
            return 1
        html = patron.sub(lambda m: m.group(1) + "\n" + csv + "\n" + m.group(3), html, count=1)
        print(f"  datos/{nombre}: {len(csv.splitlines())} líneas")

    if html == original:
        print("Sin cambios.")
        return 0

    io.open(INDEX, "w", encoding="utf-8", newline="\n").write(html)
    print(f"index.html actualizado ({len(html)} caracteres).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
