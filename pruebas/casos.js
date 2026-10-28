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
    t.igual(app.objetivos().length, 17, "objetivos");
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
    const antes = banco._tablas.recetas.length;   // las dos de ejemplo
    // Un plato que no la tenga: las de ejemplo ya vienen escritas.
    app.fijarReceta("Brocoli", ["Cortar", "Hervir", "Escurrir"], ["brócoli: 150 g"]);
    await app.persistir();
    t.igual(banco._tablas.recetas.length, antes + 1, "una receta más");
    const r = banco._tablas.recetas.filter(function(x){ return x.plato === "Brocoli"; })[0];
    t.igual((r || {}).pasos.length, 3, "con sus tres pasos");
    t.igual((r || {}).cantidades.length, 1, "y su cantidad");
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

/* ───────── Reglas del día a día ───────── */
{
  nombre: "Una regla ocupa su hueco al abrir la semana",
  correr: function(app, banco, t){
    const id = "2030-02-11";
    app.ponerReglas([{menu:"casa", dia:"domingo", momento:"comida", orden:"1",
                      plato:"Paella de marisco y carne"}]);
    app.fijarHuecos("adultos", id, {});
    app.fijarHuecos("nino", id, {});
    app.aplicarReglas(id);
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Paella de marisco y carne");
  }
},
{
  nombre: "Una regla no pisa lo que ya hubiera puesto",
  correr: function(app, banco, t){
    const id = "2030-02-18";
    app.ponerReglas([{menu:"casa", dia:"domingo", momento:"comida", orden:"1",
                      plato:"Paella de marisco y carne"}]);
    app.fijarHuecos("adultos", id, {"domingo|comida|1":"Tortilla"});
    app.aplicarReglas(id);
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Tortilla");
  }
},
{
  // Cazaría: que "Generar menú adulto" se lleve por delante las reglas.
  nombre: "El generador no se lleva por delante una regla",
  correr: function(app, banco, t){
    const id = "2030-02-25";
    app.ponerReglas([{menu:"casa", dia:"domingo", momento:"comida", orden:"1",
                      plato:"Paella de marisco y carne"}]);
    app.fijarHuecos("adultos", id, {});
    app.generar(id, "adultos", {semilla:app.huecosDeReglas("adultos")});
    t.igual(app.huecos("adultos", id)["domingo|comida|1"], "Paella de marisco y carne");
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
  nombre: "Los parecidos encuentran el plato que ya tienes",
  correr: function(app, banco, t){
    const rep = app.repertorio();
    const peso = app.pesoPalabras(rep.map(function(p){ return p.n; }));
    const p = app.parecidos("Macarrones con tomate y salchichas", rep, peso);
    t.cierto(p.length > 0, "encuentra algo");
    t.cierto(p.some(function(x){ return /Macarrones/.test(x.p.n); }), "y es un macarrones");
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
