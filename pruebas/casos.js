// Los casos. Cada uno recibe `app` (las tripas que expone index.html con
// ?prueba=1) y `banco` (la base falsa), y lanza si algo no cuadra.
//
// Lo que se prueba aquí es lo que ha roto de verdad alguna vez, no lo que es
// fácil de probar. Cada caso lleva anotado qué fallo habría cazado.

window.CASOS = [

/* ───────── Carga y persistencia ───────── */
{
  nombre: "La semilla llega entera a la aplicación",
  correr: function(app, banco, t){
    t.igual(app.repertorio().length, 66, "platos");
    t.igual(app.ingredientes().length, 98, "ingredientes");
    t.igual(app.objetivos().length, 19, "objetivos");
    // Un objetivo por tipo y ni uno más: hubo una lista aparte que agrupaba
    // varios —"Pescado y marisco"— y se solapaba con los tipos sueltos.
    const tipos = app.objetivos().map(function(o){ return o.n; });
    t.igual(tipos.slice().sort(), app.TIPOS().slice().sort(), "uno por tipo");
    t.igual(app.objetivos().filter(function(o){ return o.tipos.length !== 1; }), [],
            "y cada uno mide solo el suyo");
  }
},
{
  // Cazaría: una tabla nueva que se olvida en TABLAS y nunca se guarda.
  nombre: "Todas las tablas de TABLAS tienen base y saben producir filas",
  correr: function(app, banco, t){
    const base = app.BASE();
    app.TABLAS.forEach(function(tab){
      t.cierto(Array.isArray(base[tab.n]), "BASE de " + tab.n);
      t.cierto(Array.isArray(tab.filas()), "filas() de " + tab.n);
    });
  }
},
{
  // Cazaría: un cambio que no se persiste, o que persiste de más.
  nombre: "Un cambio sube a la base, y solo ese",
  correr: async function(app, banco, t){
    // Por el contenido y no por el número de filas: cuántas recetas hay
    // escritas cambia cada vez que se añade una, y entonces la prueba falla
    // por algo que no tiene nada que ver con guardar.
    const antes = banco._tablas.recetas.length;
    app.fijarReceta("Brocoli", ["Cortar", "Hervir", "Escurrir"], ["brócoli: 150 g"]);
    await app.persistir();
    const r = banco._tablas.recetas.filter(function(x){ return x.plato === "Brocoli"; })[0];
    t.cierto(!!r, "la receta está en la base");
    t.igual(r.pasos, ["Cortar", "Hervir", "Escurrir"], "con sus pasos");
    t.igual(r.cantidades, ["brócoli: 150 g"], "y su cantidad");
    t.igual(banco._tablas.recetas.length, antes, "y no ha aparecido ninguna otra");
  }
},

/* ───────── Generador ───────── */
{
  // Cazaría: el generador dejando huecos o pasándose de tres platos.
  nombre: "Generar la semana del adulto la llena sin pasarse",
  correr: function(app, banco, t){
    const id = "2030-01-07";
    app.fijarHuecos("adultos", id, {});
    app.generar(id, "adultos");
    const h = app.huecos("adultos", id);
    const llenos = app.clavesDe().filter(function(k){ return h[k]; }).length;
    t.cierto(llenos > 30, "al menos un plato en casi todos los huecos, hay " + llenos);
    app.slotsDe().forEach(function(slot){
      const n = app.ordenesDe().filter(function(o){ return h[slot + "|" + o]; }).length;
      t.cierto(n <= 3, slot + " tiene " + n + " platos");
      // Sin saltos: un 3º sin 2º no se pinta.
      if(h[slot + "|3"]) t.cierto(!!h[slot + "|2"], slot + " tiene 3º sin 2º");
      if(h[slot + "|2"]) t.cierto(!!h[slot + "|1"], slot + " tiene 2º sin 1º");
    });
  }
},
{
  // Cazaría: el fallo real de comparar un array de cubos con un número, que
  // dejó la heurística del repaso sin funcionar sin que nada se quejara.
  nombre: "El equilibrio queda cerca del objetivo",
  correr: function(app, banco, t){
    const id = "2030-01-14";
    app.fijarHuecos("adultos", id, {});
    app.generar(id, "adultos");
    const fuera = app.fueraDeRango("adultos", id);
    t.cierto(fuera.length <= 3, "como mucho tres grupos fuera, hay " + fuera.length +
                                " (" + fuera.join(", ") + ")");
  }
},
{
  // Cazaría: la semilla ignorada, que es como el cargador de la guardería
  // perdería lo que trae el menú.
  nombre: "Lo que llega en la semilla no lo toca el generador",
  correr: function(app, banco, t){
    const id = "2030-01-21";
    app.fijarHuecos("adultos", id, {});
    const semilla = {"martes|comida|1":"Paella de marisco y carne"};
    app.generar(id, "adultos", {semilla:semilla});
    t.igual(app.huecos("adultos", id)["martes|comida|1"], "Paella de marisco y carne");
  }
},
{
  nombre: "Completar la semana del niño respeta lo que ya hay",
  correr: function(app, banco, t){
    const id = "2030-01-28";
    app.fijarHuecos("adultos", id, {});
    app.fijarHuecos("nino", id, {"jueves|comida|1":"Tortilla"});
    app.completarNino(id);
    const h = app.huecos("nino", id);
    t.igual(h["jueves|comida|1"], "Tortilla", "lo que estaba sigue");
    t.cierto(app.clavesDe().filter(function(k){ return h[k]; }).length > 20, "y se ha llenado");
  }
},

/* ───────── Compra ───────── */
{
  // Cazaría: la casilla de compra dejando de filtrar, o filtrando de más.
  nombre: "Un plato fuera de la compra no aporta ingredientes",
  correr: function(app, banco, t){
    const id = "2030-02-04";
    app.fijarHuecos("adultos", id, {"lunes|comida|1":"Paella de marisco y carne"});
    app.fijarHuecos("nino", id, {});
    const con = Object.keys(app.ingredientesDeSemana(id)).length;
    t.cierto(con > 0, "con el plato hay ingredientes");
    app.marcarCompra(id, "adultos", "lunes|comida|1", false);
    t.igual(Object.keys(app.ingredientesDeSemana(id)).length, 0, "sin él, ninguno");
    app.marcarCompra(id, "adultos", "lunes|comida|1", true);
    t.igual(Object.keys(app.ingredientesDeSemana(id)).length, con, "y vuelve");
  }
},

/* ───────── Platos clavados en la plantilla ───────── */
{
  nombre: "Un plato clavado ocupa su hueco al abrir la semana",
  correr: function(app, banco, t){
    const id = "2030-02-11";
    app.fijarCelda("adultos", "domingo", "comida", "1", {plato:"Lentejas con verduras y pollo"});
    app.fijarHuecos("adultos", id, {});
    app.fijarHuecos("nino", id, {});
    app.aplicarPlantilla(id);
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Lentejas con verduras y pollo");
    // Cada plantilla es de su menú: la del adulto no toca la del niño.
    t.igual(app.huecos("nino", id)["domingo|comida|1"] || "", "", "el niño, a lo suyo");
    app.fijarCelda("nino", "domingo", "comida", "1", {plato:"Lentejas con verduras y pollo"});
    app.aplicarPlantilla(id);
    t.igual(app.huecos("nino", id)["domingo|comida|1"], "Lentejas con verduras y pollo");
  }
},
{
  nombre: "Un plato clavado no pisa lo que ya hubiera puesto",
  correr: function(app, banco, t){
    const id = "2030-02-18";
    app.fijarCelda("adultos", "domingo", "comida", "1", {plato:"Lentejas con verduras y pollo"});
    app.fijarHuecos("adultos", id, {"domingo|comida|1":"Tortilla"});
    app.aplicarPlantilla(id);
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Tortilla");
  }
},
{
  // Cazaría: que "Generar menú adulto" se lleve por delante lo clavado.
  nombre: "El generador no se lleva por delante un plato clavado",
  correr: function(app, banco, t){
    const id = "2030-02-25";
    app.fijarCelda("adultos", "domingo", "comida", "1", {plato:"Lentejas con verduras y pollo"});
    app.fijarHuecos("adultos", id, {});
    app.generar(id, "adultos", {semilla:app.conPlantilla("adultos", {})});
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Lentejas con verduras y pollo");
  }
},
{
  // Lo que permite decir "mis cenas son de un plato".
  nombre: "Un hueco en blanco se queda vacío al generar",
  correr: function(app, banco, t){
    const id = app.semanaActual();
    app.ordenesDe().forEach(function(o){
      if(o !== "1") app.fijarCelda("adultos", "lunes", "cena", o, {blanco:true});
    });
    const h = app.huecos("adultos", id);
    app.clavesDe().forEach(function(k){ delete h[k]; });
    app.fijarHuecos("adultos", id, h);
    app.generar(id, "adultos");
    const hh = app.huecos("adultos", id);
    t.cierto(!!hh["lunes|cena|1"], "el primero sí se llena");
    t.igual(hh["lunes|cena|2"] || "", "", "el segundo se queda en blanco");
    t.igual(hh["lunes|cena|3"] || "", "", "y el tercero también");
  }
},

/* ───────── Recetas ───────── */
{
  nombre: "Solo llevan receta los platos de preparación media o alta",
  correr: function(app, banco, t){
    const con = app.platosConReceta();
    t.cierto(con.length > 0, "hay platos con receta");
    con.forEach(function(p){
      t.cierto(p.tiempo === "medio" || p.tiempo === "alto", p.n + " es de preparación " + p.tiempo);
    });
    const bajos = app.repertorio().filter(function(p){ return p.tiempo === "bajo"; });
    t.cierto(bajos.length > 0 && !bajos.some(app.necesitaReceta), "ninguno de preparación baja");
  }
},
{
  nombre: "Las líneas vacías no se guardan",
  correr: function(app, banco, t){
    app.fijarReceta("Brocoli", ["Cortar", "", "   ", "Hervir"], []);
    t.igual(app.pasosDe("Brocoli").length, 2, "las líneas en blanco se caen");
    app.fijarReceta("Brocoli", [], []);
    t.cierto(!app.hayReceta("Brocoli"), "y sin nada no queda receta");
  }
},
{
  // Cazaá: que los apartados dejen de agrupar, que es lo único que distingue
  // una receta larga legible de una lista de veinte viñetas seguidas.
  nombre: "Una línea acabada en dos puntos agrupa lo que viene debajo",
  correr: function(app, banco, t){
    const g = app.pasosEnApartados(["Sofrito:", "Pochar", "Dorar", "Arroz:", "Echar"]);
    t.igual(g.length, 2, "dos apartados");
    t.igual(g[0].titulo, "Sofrito");
    t.igual(g[0].puntos.length, 2);
    t.igual(g[1].titulo, "Arroz");
    t.igual(g[1].puntos.length, 1);
    // Sin apartados, un solo grupo sin título.
    const llano = app.pasosEnApartados(["Cortar", "Hervir"]);
    t.igual(llano.length, 1);
    t.igual(llano[0].titulo, "");
    t.igual(llano[0].puntos.length, 2);
  }
},
{
  nombre: "Las cantidades se casan con los ingredientes del plato",
  correr: function(app, banco, t){
    const p = app.plato("adultos", "Paella de marisco y carne");
    t.igual(app.estado.comensales, 1, "de partida, una persona");
    const c = app.cantidadesDe(p);
    t.igual(c.length, (p.i || []).length, "una fila por ingrediente del plato");
    t.cierto(c.every(function(x){ return x.cuanto; }), "y todas con su cantidad");
    const arroz = c.filter(function(x){ return x.que === "arroz"; })[0];
    t.igual((arroz || {}).cuanto, "100 g");
    // Una cantidad de algo que el plato ya no lleva no se cuela en la ficha.
    app.fijarReceta(p.n, app.pasosDe(p.n),
                    app.recetaDe(p.n).cantidades.concat(["unicornio: 2 kg"]));
    t.igual(app.cantidadesDe(p).length, (p.i || []).length, "la huérfana no aparece");
  }
},

{
  // Cazaría: que al quitar un ingrediente de un plato su cantidad se quede
  // colgada en la receta, o que renombrarlo deje la receta huérfana.
  nombre: "Tocar un plato arrastra su receta y la plantilla",
  correr: function(app, banco, t){
    const n = "Paella de marisco y carne";
    t.cierto(app.hayReceta(n), "de partida tiene receta");

    // Quitarle un ingrediente: su cantidad se va.
    const p = app.plato("adultos", n);
    const sinAzafran = (p.i || []).filter(function(i){ return i !== "azafrán"; });
    app.podarCantidades(n, sinAzafran);
    const quedan = app.recetaDe(n).cantidades.map(function(l){
      return l.split(":")[0].trim();
    });
    t.cierto(quedan.indexOf("azafrán") === -1, "la cantidad del azafrán se va");
    t.cierto(quedan.indexOf("arroz") !== -1, "las demás se quedan");

    // Renombrarlo: la receta y la celda de la plantilla le siguen.
    app.fijarCelda("adultos", "domingo", "comida", "1", {plato:n});
    app.renombrarPlato(n, "Paella de los domingos");
    t.cierto(!app.hayReceta(n), "la receta ya no está con el nombre viejo");
    t.cierto(app.hayReceta("Paella de los domingos"), "y sí con el nuevo");
    t.igual(app.celdaDe("adultos", "domingo", "comida", "1").plato, "Paella de los domingos",
            "la plantilla también");

    // Borrarlo: la receta se va y la celda baja a "en blanco", que es lo único
    // honesto: dijiste que ahí iba algo concreto y ese algo ya no existe.
    app.renombrarPlato("Paella de los domingos", null);
    t.cierto(!app.hayReceta("Paella de los domingos"), "borrado, sin receta");
    t.cierto(app.celdaDe("adultos", "domingo", "comida", "1").blanco, "y la celda, en blanco");
  }
},
{
  nombre: "Las cantidades se multiplican por los comensales",
  correr: function(app, banco, t){
    const p = app.plato("adultos", "Paella de marisco y carne");
    const de = function(c, q){
      return (c.filter(function(x){ return x.que === q; })[0] || {}).cuanto;
    };
    app.estado.comensales = 1;
    t.igual(de(app.cantidadesDe(p), "arroz"), "100 g", "para uno");
    app.estado.comensales = 3;
    const tres = app.cantidadesDe(p);
    t.igual(de(tres, "arroz"), "300 g", "para tres");
    t.igual(de(tres, "gambas"), "18 unidades (240 g)", "todos los números, no solo el primero");
    t.igual(de(tres, "azafrán"), "unas hebras", "lo que no lleva números se queda igual");
    app.estado.comensales = 1;
  }
},

{
  // Cazaía: una receta que nombre una cantidad de algo que el plato no lleva,
  // o un plato de preparación media o alta que se quede sin escribir.
  nombre: "Todos los platos que lo piden tienen receta, y cuadra con sus ingredientes",
  correr: function(app, banco, t){
    const sinEscribir = app.platosConReceta().filter(function(p){ return !app.hayReceta(p.n); });
    t.igual(sinEscribir.map(function(p){ return p.n; }), [], "ninguno sin escribir");

    app.platosConReceta().forEach(function(p){
      // Sin ingredientes no puede haber cantidades: es el caso de un plato al
      // que le falta la lista, no un fallo de la receta.
      if(!(p.i || []).length) return;
      const c = app.cantidadesDe(p);
      const sin = c.filter(function(x){ return !x.cuanto; }).map(function(x){ return x.que; });
      t.igual(sin, [], p.n + ": ingredientes sin cantidad");
      const dichos = app.recetaDe(p.n).cantidades.length;
      t.igual(dichos, (p.i || []).length, p.n + ": cantidades de más o de menos");
    });
  }
},
{
  nombre: "La pestaña cuenta escritas sobre posibles",
  correr: function(app, banco, t, w){
    const todos = app.platosConReceta();
    const escritas = todos.filter(function(p){ return app.hayReceta(p.n); }).length;
    t.igual(w.document.getElementById("n-recetas").textContent,
            escritas + "/" + todos.length);
  }
},
{
  nombre: "Ninguna receta se queda en un solo paso",
  correr: function(app, banco, t){
    app.platosConReceta().forEach(function(p){
      t.cierto(app.pasosDe(p.n).length >= 3, p.n + " tiene " + app.pasosDe(p.n).length + " pasos");
    });
  }
},

{
  // Cazó: poner el primer bibe del niño le plantaba un café con leche al
  // adulto. El arrastre miraba si el adulto tenía «justo el equivalente de lo
  // que el niño tenía», y con los dos huecos vacíos eso se cumplía, porque
  // los dos tenían nada.
  nombre: "Poner un plato al niño no toca el menú del adulto",
  correr: function(app, banco, t, w){
    const id = app.semanaActual(), d = w.document;
    // Los dos huecos vacíos, que es donde se notó.
    const ha = app.huecos("adultos", id), hn = app.huecos("nino", id);
    app.clavesDe().forEach(function(k){ delete ha[k]; delete hn[k]; });
    app.fijarHuecos("adultos", id, ha);
    app.fijarHuecos("nino", id, hn);
    app.verTab("semana"); app.pintarTodo();

    app.abrirSelector("nino", "lunes", "desayuno", "1");
    const opt = d.querySelectorAll(".picker-list .opt")[0];
    const elegido = opt.textContent;
    opt.click();

    const despues = app.huecos("adultos", id);
    t.igual(Object.keys(despues).filter(function(k){ return !!despues[k]; }), [],
            "el adulto sigue sin nada");
    t.cierto(!!app.huecos("nino", id)["lunes|desayuno|1"], "y el niño sí tiene lo suyo");
    t.cierto(elegido.indexOf(app.huecos("nino", id)["lunes|desayuno|1"]) === 0, "lo que se eligió");
  }
},

/* ───────── La plantilla de la semana ───────── */
{
  // La restricción es de la comida entera y no de cada hueco: puestas las
  // lentejas el martes, el segundo y el tercero quedan libres. Y se mira por
  // menú, porque el niño y el adulto cumplen cada uno por su lado.
  nombre: "Cada celda de la plantilla manda en su hueco",
  correr: function(app, banco, t, w){
    const d = w.document, id = app.semanaActual();
    const hn = app.huecos("nino", id), ha = app.huecos("adultos", id);
    app.clavesDe().forEach(function(k){ delete hn[k]; delete ha[k]; });
    app.fijarHuecos("nino", id, hn);
    app.fijarHuecos("adultos", id, ha);
    app.fijarCelda("nino", "lunes", "comida", "1", {tipo:"Legumbre"});
    app.fijarCelda("nino", "lunes", "comida", "2", {tipo:"Verdura"});
    app.verTab("semana"); app.pintarTodo();

    const grupo = function(){ return d.querySelectorAll(".picker-filtro")[0]; };
    const opciones = function(){ return d.querySelectorAll(".picker-list .opt"); };
    const cierra = function(){ d.querySelectorAll(".overlay").forEach(function(o){ o.remove(); }); };

    app.abrirSelector("nino", "lunes", "comida", "1");
    t.cierto(!grupo().hidden, "al primero le pide el tipo");
    const soloDelTipo = Array.prototype.every.call(opciones(), function(b){
      return app.cumpleTipo(app.platoEnSemana("nino", b.querySelector(".on").textContent), "Legumbre");
    });
    t.cierto(soloDelTipo, "y solo ofrece platos de ese tipo");
    t.cierto(opciones().length > 0, "que haberlos haylos");
    opciones()[0].click();

    // Cada celda manda en su hueco: el segundo pide lo suyo, no lo del primero.
    app.abrirSelector("nino", "lunes", "comida", "2");
    t.cierto(!grupo().hidden, "al segundo le pide el suyo");
    t.cierto(d.querySelector(".picker-toca").textContent.indexOf("Verdura") !== -1,
             "y el suyo es Verdura");
    cierra();

    // Un hueco sin celda no pide nada.
    app.abrirSelector("nino", "lunes", "comida", "3");
    t.cierto(grupo().hidden, "al tercero, que no tiene celda, no le pide nada");
    cierra();

    // El adulto tiene su propia plantilla: la del niño no le dice nada.
    app.abrirSelector("adultos", "lunes", "comida", "1");
    t.cierto(grupo().hidden, "al adulto no le pide lo del niño");
    cierra();
    app.fijarCelda("adultos", "lunes", "comida", "1", {tipo:"Pasta"});
    app.abrirSelector("adultos", "lunes", "comida", "1");
    t.cierto(d.querySelector(".picker-toca").textContent.indexOf("Pasta") !== -1,
             "le pide lo suyo");
    cierra();
  }
},

{
  // El motivo de que exista la plantilla: el reparto por cuotas semanales daba
  // resultados raros porque medía la semana entera sin saber qué tocaba cada
  // día. Ahora el tipo pedido entra en el mismo coste que el equilibrio, con
  // más peso, así que el repaso no solo lo respeta: lo repara.
  nombre: "El generador pone en cada comida lo que pide la plantilla",
  correr: function(app, banco, t){
    const id = app.semanaActual();
    const pide = {"lunes|comida|1":"Legumbre", "martes|comida|1":"Pasta",
                  "miércoles|comida|1":"Arroz", "jueves|cena|1":"Huevo",
                  "viernes|comida|1":"Pescado blanco", "lunes|comida|2":"Verdura"};
    Object.keys(pide).forEach(function(k){
      const x = k.split("|");
      app.fijarCelda("adultos", x[0], x[1], x[2], {tipo:pide[k]});
    });
    // Desde cero, para que lo que salga sea cosa del generador y no de la semilla.
    const h = app.huecos("adultos", id);
    app.clavesDe().forEach(function(k){ delete h[k]; });
    app.fijarHuecos("adultos", id, h);
    app.generar(id, "adultos");

    const hh = app.huecos("adultos", id);
    // Cada celda manda en SU hueco, no en la comida entera.
    const sinCumplir = Object.keys(pide).filter(function(k){
      return !app.cumpleTipo(app.platoEnSemana("adultos", hh[k]), pide[k]);
    });
    t.igual(sinCumplir, [], "todos los huecos de la plantilla, cumplidos");
  }
},

/* ───────── Cargador de la guardería ───────── */
{
  // Cazaría: la validación dejando pasar un fichero que luego rompe la carga.
  nombre: "El cargador rechaza lo que no cuadra y acepta lo que sí",
  correr: function(app, banco, t){
    t.igual(app.revisaGuarde({formato:"otra-cosa"}).length, 1, "formato que no es");
    const bueno = {formato:"menu-guarderia", version:1, mes:"2030-03",
      ingredientes_nuevos:[], platos_nuevos:[],
      dias:[{fecha:"2030-03-04", comida:["Tortilla"]}]};
    t.igual(app.revisaGuarde(bueno).length, 0, "uno correcto");

    const finde = JSON.parse(JSON.stringify(bueno));
    finde.dias[0].fecha = "2030-03-02";   // sábado
    t.cierto(app.revisaGuarde(finde).length > 0, "fin de semana");

    const fantasma = JSON.parse(JSON.stringify(bueno));
    fantasma.dias[0].comida = ["Plato que no existe"];
    t.cierto(app.revisaGuarde(fantasma).length > 0, "plato inexistente");

    const tipoMalo = JSON.parse(JSON.stringify(bueno));
    tipoMalo.platos_nuevos = [{nombre:"X", tipo:["Inventado"], momento:["comida"],
                               ingredientes:["arroz"]}];
    tipoMalo.dias[0].comida = ["X"];
    t.cierto(app.revisaGuarde(tipoMalo).length > 0, "tipo inventado");
  }
},
{
  // Cazó: lo que carga el menú de la guardería salía tachado en la semana del
  // niño pero volvía a la lista de la compra por el lado del adulto, que come
  // ese mismo plato y no tiene línea propia cuando coincide.
  nombre: "Lo que carga la guardería no se compra, ni por el niño ni por el adulto",
  correr: function(app, banco, t, w){
    const id = "2030-03-04", k = "lunes|comida|1";
    app.aplicarGuarde(
      {formato:"menu-guarderia", version:1, mes:"2030-03",
       ingredientes_nuevos:[], platos_nuevos:[],
       dias:[{fecha:"2030-03-04", comida:["Tortilla"]}]},
      {sust:{}, secciones:{}, adultos:false, soloEsto:true});

    t.igual(app.huecos("nino", id)[k], "Tortilla", "el plato entra donde toca");
    t.cierto(!app.paraComprar(id, "nino", k), "y entra fuera de la compra");

    // El adulto comiendo lo mismo: su línea no se pinta, así que tampoco manda.
    const ha = app.huecos("adultos", id);
    ha[k] = "Tortilla";
    app.fijarHuecos("adultos", id, ha);
    t.cierto(!app.marcaEfectiva(id, "adultos", k), "el adulto sigue la marca del niño");

    const tortilla = app.plato("nino", "Tortilla");
    const mapa = app.ingredientesDeSemana(id);
    tortilla.i.forEach(function(ing){
      t.cierto((mapa[ing] || []).indexOf("Tortilla") === -1,
               "la compra no trae la tortilla por «" + ing + "»");
    });

    // Y en pantalla, tachado.
    app.irASemana(id); app.verTab("semana"); app.pintarTodo();
    const filas = w.document.querySelectorAll(".plato.sin-compra .plato-nombre");
    t.cierto(Array.prototype.some.call(filas, function(b){ return b.textContent === "Tortilla"; }),
             "sale tachada en la semana");
    t.igual(w.document.querySelectorAll(".compra-check").length, 0,
            "y ya no hay casillas de compra en la semana");
  }
},
{
  nombre: "Los parecidos encuentran el plato que ya tienes",
  correr: function(app, banco, t){
    const rep = app.repertorio();
    const peso = app.pesoPalabras(rep.map(function(p){ return p.n; }));
    const p = app.parecidos("Macarrones con tomate y salchichas", rep, peso);
    t.cierto(p.length > 0, "encuentra algo");
    t.cierto(p.some(function(x){ return /Macarrones/.test(x.p.n); }), "y es un macarrones");
  }
},

{
  // Cazó: vaciar una semana desde el botón se dejaba su lista de la compra.
  // La misma operación vivía escrita dos veces —el botón de la semana y la
  // tabla de Configuración— y solo una de las dos la borraba, así que quedaban
  // marcas de «ya lo tengo en casa» sin menú al que pertenecer.
  nombre: "Vaciar una semana se la lleva entera de la base",
  correr: async function(app, banco, t){
    // Una de las que trae la semilla, no la de hoy, que nace vacía.
    const id = app.idsSemanas("adultos")[0];
    t.cierto(!!id, "la semilla trae alguna semana");
    const ing = Object.keys(app.ingredientesDeSemana(id))[0];
    t.cierto(!!ing, "con su lista de la compra");
    app.marcar(id, ing, true);
    await app.persistir();
    t.cierto(banco._tablas.semanas.some(function(f){ return f.semana_id === id; }),
             "sus platos están en la base");
    t.cierto(banco._tablas.compras.some(function(f){ return f.semana_id === id; }),
             "y su compra también");

    app.vaciarSemana(id);
    await app.persistir();
    t.igual(banco._tablas.semanas.filter(function(f){ return f.semana_id === id; }), [],
            "no le quedan platos");
    t.igual(banco._tablas.compras.filter(function(f){ return f.semana_id === id; }), [],
            "ni marcas de compra");
    t.igual(app.idsSemanas("adultos").indexOf(id), -1, "y deja de contar como semana");
  }
},

/* ───────── Copia de seguridad ───────── */
{
  // Cazaría: una copia que no vale para restaurar, que es cuando más duele.
  nombre: "La copia se puede volver a cargar",
  correr: async function(app, banco, t){
    const copia = await app.copiaEntera();
    t.igual(app.revisaCopia(copia), "", "la copia se da por buena");
    app.TABLAS.forEach(function(tab){
      t.cierto(Array.isArray(copia.tablas[tab.n]), "la copia trae " + tab.n);
    });
    t.cierto(copia.tablas.platos.length === 66, "con los 66 platos");
  }
},
{
  nombre: "Una copia estropeada se rechaza",
  correr: function(app, banco, t){
    t.cierto(app.revisaCopia(null) !== "", "nada");
    t.cierto(app.revisaCopia({formato:"otra"}) !== "", "otro formato");
    t.cierto(app.revisaCopia({formato:"menu-semanal", tablas:{}}) !== "", "sin tablas");
  }
},

/* ───────── Ventanas ───────── */
{
  // Cazaría: la de ingredientes, que durante meses no cerró con Escape porque
  // era la única de las cinco copias a la que se le olvidó el manejador.
  nombre: "Las cinco ventanas abren, apilan y cierran con Escape",
  correr: function(app, banco, t, w){
    const d = w.document;
    const capas = function(){ return d.querySelectorAll(".overlay").length; };
    const esc = function(){ d.dispatchEvent(new w.KeyboardEvent("keydown", {key:"Escape"})); };

    const abrir = {
      "ingrediente": function(){ app.abrirIngrediente(app.ingredientes()[0]); },
      "selector":    function(){ app.abrirSelector("adultos", "lunes", "comida", "1"); },
      "editor":      function(){ app.abrirEditor(null, app.ambito("platos"), {}); },
      "pasos":       function(){ app.abrirPasos(app.platosConReceta()[0]); }
    };
    Object.keys(abrir).forEach(function(nombre){
      t.igual(capas(), 0, "antes de abrir «" + nombre + "» no hay ninguna");
      abrir[nombre]();
      t.igual(capas(), 1, "«" + nombre + "» abre una");
      esc();
      t.igual(capas(), 0, "«" + nombre + "» cierra con Escape");
    });

    // Apiladas: Escape cierra la de arriba y deja la de abajo.
    abrir.selector();
    abrir.editor();
    t.igual(capas(), 2, "dos a la vez");
    esc();
    t.igual(capas(), 1, "Escape cierra solo la de arriba");
    esc();
    t.igual(capas(), 0, "y luego la otra");
  }
},
{
  nombre: "Soltar el ratón fuera tras seleccionar dentro no cierra la ventana",
  correr: function(app, banco, t, w){
    const d = w.document;
    app.abrirEditor(null, app.ambito("platos"), {});
    const capa = d.querySelector(".overlay");
    const caja = capa.querySelector(".editor");
    // Empieza dentro y acaba fuera: el click cae en el fondo, el mousedown no.
    caja.dispatchEvent(new w.MouseEvent("mousedown", {bubbles:true}));
    capa.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
    t.igual(d.querySelectorAll(".overlay").length, 1, "sigue abierta");
    capa.dispatchEvent(new w.MouseEvent("mousedown", {bubbles:true}));
    t.igual(d.querySelectorAll(".overlay").length, 0, "y un mousedown en el fondo sí la cierra");
  }
},

/* ───────── Espejo entre menús ───────── */
{
  nombre: "El espejo es determinista y respeta el menú de destino",
  correr: function(app, banco, t){
    const a = app.espejo("Paella de marisco y carne", "comida", "nino");
    const b = app.espejo("Paella de marisco y carne", "comida", "nino");
    t.igual(a, b, "dos veces lo mismo");
    if(a) t.cierto(!!app.plato("nino", a), "«" + a + "» está en el menú del niño");
  }
}

];
