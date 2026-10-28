// Menú Semanal. Estaba dentro de index.html hasta que el fichero pasó de
// 260 KB y dejó de poder navegarse. No hay compilación ni empaquetador:
// esto es el JavaScript que lee el navegador, en una función anónima para
// no dejar nada en el ámbito global salvo lo que se expone a propósito.

(function(){
  "use strict";











  /* ============ Base de datos ============ */
  // La clave es pública a propósito y va a la vista en esta misma página. Lo que
  // protege los datos no es ella, sino las políticas del propio Postgres: sin una
  // sesión cuyo correo esté en la tabla `hogar`, la base no devuelve ni una fila.
  // Comprobado contra el proyecto: con esta clave y sin sesión responde 42501,
  // "permission denied". La clave secreta no está aquí ni debe estarlo nunca.
  const SUPABASE_URL = "https://hoaifyokcgyuacsbbcdo.supabase.co";
  const SUPABASE_KEY = "sb_publishable__3MJZhGtxfwFXocPrK4ezw_AW3-_yST";
  // Con ?prueba=1 y una base falsa puesta por quien abre la página, se trabaja
  // contra ella. Es lo que usa pruebas/index.html, y es la única forma de
  // probar esto sin una cuenta de verdad y sin tocar los datos de nadie.
  //
  // El repliegue importa: si alguien le pone ?prueba=1 a la página publicada,
  // donde no hay base falsa, entra por la de siempre y no se rompe nada. Y lo
  // que se expone al final tampoco regala nada: las políticas de la base siguen
  // siendo las que mandan, aquí y en cualquier otro sitio.
  const PRUEBA = location.search.indexOf("prueba=1") !== -1;
  // Dentro de un marco, el que manda es el padre: no hay forma de poner nada
  // en este `window` antes de que corra este mismo script.
  function deFuera(que){
    try{
      if(typeof window[que] === "function") return window[que];
      if(window.parent !== window && typeof window.parent[que] === "function") return window.parent[que];
    }catch(e){ /* otro origen: no es una prueba nuestra */ }
    return null;
  }
  const bancoDePruebas = PRUEBA ? deFuera("__bancoFalso") : null;
  const db = bancoDePruebas ? bancoDePruebas()
                            : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // El identificador del proyecto sale de la propia URL de la API, que es donde
  // ya está: tenerlo escrito dos veces es tenerlo mal una de las dos algún día.
  const REF_PROYECTO = (SUPABASE_URL.match(/\/\/([a-z0-9]+)\./) || [])[1] || "";
  const PANEL = REF_PROYECTO ? "https://supabase.com/dashboard/project/" + REF_PROYECTO : "";

  /* ============ Constantes ============ */
  const DIAS = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"];
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  // Los cinco momentos del día, en el orden en que se comen. "platos" dice
  // cuántos huecos tiene cada uno: el almuerzo de media mañana es uno solo.
  // Todos los momentos admiten lo mismo. No estorba porque los huecos se revelan
  // de uno en uno: una comida vacía ocupa una sola línea.
  const PLATOS_POR_COMIDA = 3;
  const MOMENTOS = [
    {id:"desayuno", lbl:"Desayuno"},
    {id:"almuerzo", lbl:"Almuerzo"},
    {id:"comida",   lbl:"Comida"},
    {id:"merienda", lbl:"Merienda"},
    {id:"cena",     lbl:"Cena"}
  ];
  const MOMENTO_LBL = {};
  MOMENTOS.forEach(function(m){ MOMENTO_LBL[m.id] = m.lbl; });
  const IDS_MOMENTO = MOMENTOS.map(function(m){ return m.id; });
  // Desayuno, almuerzo y merienda se repiten de una semana a otra sin problema;
  // comida y cena son las que conviene variar.
  const LIGEROS = {desayuno:1, almuerzo:1, merienda:1};
  function momento(id){ return MOMENTOS.filter(function(m){ return m.id === id; })[0]; }
  function ordenesDe(){
    const salida = [];
    for(let i = 1; i <= PLATOS_POR_COMIDA; i++) salida.push(String(i));
    return salida;
  }
  // Cuántos platos pone el generador en una comida. Un plato único la resuelve
  // él solo, pero sigue admitiendo postre: por eso la paella deja sitio para la
  // manzana y no para un tercero.
  //
  // Es una regla de reparto automático, no un techo: a mano se llega siempre a
  // los tres. La guardería manda garbanzos y un yogur, y los garbanzos vienen
  // marcados como plato único; que eso impidiera añadir la fruta no tenía
  // ninguna defensa.
  function cabenEn(primero){
    return primero && primero.unico ? 2 : PLATOS_POR_COMIDA;
  }
  const ORDEN_LBL = {"1":"1º", "2":"2º", "3":"3º"};
  const DIA_MS = 86400000;
  const FINDE = {"sábado":1, "domingo":1};
  const PESO_REPETICION = {siempre:2.5, alta:1.5, media:0.5, baja:-1, ocasional:-2.5, nunca:-999};

  // Los dos repertorios tienen la misma estructura. Lo que el niño come en la
  // guardería no se inventa aquí: se carga del menú que mandan cada mes.
  const PERFILES = [
    {id:"adultos", lbl:"Adultos", quien:"de los adultos", casa:true,
     semanas:"semanas"},
    {id:"nino", lbl:"Niño", quien:"del niño",
     semanas:"semanas_nino"}
  ];
  function perfil(id){ return PERFILES.filter(function(p){ return p.id === id; })[0]; }
  // "de la comida", "del desayuno": el artículo cambia con el momento.
  function deMomento(id){
    const l = (MOMENTO_LBL[id] || id).toLowerCase();
    return (id === "comida" || id === "cena" || id === "merienda" ? "de la " : "del ") + l;
  }

  /* ============ Recetas ============ */
  // Solo para lo que no se resuelve solo: un plato de preparación baja es poner
  // fruta en un plato y no necesita que nadie le explique nada. Los de media y
  // alta sí, y lo que hace falta de ellos es el orden y los tiempos, no una
  // receta de revista: se consultan de pie y con las manos ocupadas.
  // Por plato: cuánto lleva de cada cosa y cómo se hace.
  //
  // Las cantidades van **por persona**: multiplicar es fácil y dividir por tres
  // y medio no, así que la unidad es la ración y no "la fuente".
  //
  // Cada cantidad es "ingrediente: cuanto". El nombre se casa con la lista de
  // ingredientes del plato, que sigue siendo la única que manda para la compra:
  // aquí solo se dice cuánto, nunca qué.
  //
  // En los pasos, una línea acabada en dos puntos es un apartado y el resto
  // son sus viñetas. Es la convención más barata que da jerarquía sin inventar
  // un editor de árboles: se escribe igual que se dicta.
  let RECETAS = {};

  function necesitaReceta(p){ return !!p && (p.tiempo === "medio" || p.tiempo === "alto"); }
  function esApartado(linea){ return /:\s*$/.test(String(linea || "")); }

  // Los pasos agrupados: [{titulo, puntos:[]}]. Lo que venga antes del primer
  // apartado va en un grupo sin título, que es el caso de las recetas simples.
  function pasosEnApartados(pasos){
    const grupos = [];
    let actual = null;
    (pasos || []).forEach(function(linea){
      if(esApartado(linea)){
        actual = {titulo:String(linea).replace(/:\s*$/, ""), puntos:[]};
        grupos.push(actual);
        return;
      }
      if(!actual){ actual = {titulo:"", puntos:[]}; grupos.push(actual); }
      actual.puntos.push(linea);
    });
    return grupos.filter(function(g){ return g.puntos.length || g.titulo; });
  }

  function partirCantidad(linea){
    const i = String(linea).indexOf(":");
    if(i === -1) return {que:String(linea).trim(), cuanto:""};
    return {que:String(linea).slice(0, i).trim(), cuanto:String(linea).slice(i + 1).trim()};
  }

  // Lo que se pinta: los ingredientes del plato, cada uno con su cantidad si la
  // receta la dice. Así se ve de un vistazo lo que falta por medir, y una
  // cantidad huérfana —de un ingrediente que ya no lleva— no se cuela.
  function cantidadesDe(p){
    const dichas = {};
    (RECETAS[p.n] || {}).cantidades = (RECETAS[p.n] || {}).cantidades || [];
    ((RECETAS[p.n] || {}).cantidades || []).forEach(function(l){
      const x = partirCantidad(l);
      if(x.que) dichas[x.que.toLowerCase()] = x.cuanto;
    });
    return (p.i || []).map(function(ing){
      return {que:ing, cuanto:dichas[ing.toLowerCase()] || ""};
    });
  }
  function platosConReceta(){
    return repertorio().filter(necesitaReceta)
                       .sort(function(a, b){ return a.n.localeCompare(b.n, "es"); });
  }
  function recetaDe(nombre){
    const r = RECETAS[nombre] || {};
    return {pasos:(r.pasos || []).slice(), cantidades:(r.cantidades || []).slice()};
  }
  function pasosDe(nombre){ return recetaDe(nombre).pasos; }
  function hayReceta(nombre){
    const r = recetaDe(nombre);
    return !!(r.pasos.length || r.cantidades.length);
  }
  function limpiar(l){
    return (l || []).map(function(x){ return String(x).trim(); }).filter(Boolean);
  }
  function fijarReceta(nombre, pasos, cantidades){
    const r = {pasos:limpiar(pasos), cantidades:limpiar(cantidades)};
    if(r.pasos.length || r.cantidades.length) RECETAS[nombre] = r;
    else delete RECETAS[nombre];
    guardar();
  }

  /* ============ Reglas del día a día ============ */
  // "Paella los domingos", "pasta los martes". No son objetivos de equilibrio y
  // no se persiguen: se ponen. Al abrir una semana, cada regla ocupa su hueco si
  // está libre, y a partir de ahí el reparto las respeta como respeta lo que
  // pongas tú a mano — por eso mandan sobre el equilibrio sin tener que pelearse
  // con él: cuando el generador entra, el hueco ya no está en juego.
  //
  // La tabla es la misma forma que `semanas` sin la columna de la semana: la
  // semana que te toque vivir no cambia que los domingos haya paella.
  let REGLAS = [];

  function reglasDe(pid){
    const menu = pid === "adultos" ? "casa" : "nino";
    return REGLAS.filter(function(r){ return r.menu === menu; });
  }
  function claveRegla(r){ return r.menu + "|" + r.dia + "|" + r.momento + "|" + r.orden; }

  // Lo que las reglas dicen que debe haber en esa semana, en forma de huecos.
  function huecosDeReglas(pid){
    const h = {};
    reglasDe(pid).forEach(function(r){
      if(!platoPorNombre(r.plato)) return;      // el plato ya no existe
      h[r.dia + "|" + r.momento + "|" + r.orden] = r.plato;
    });
    return h;
  }

  // Al abrir una semana, las reglas ocupan los huecos que encuentren libres. No
  // pisan nada: si ese día ya había algo puesto — por ti, por el generador o por
  // el menú de la guardería — se respeta, que para eso lo pusiste.
  function aplicarReglas(id){
    if(!REGLAS.length) return 0;
    let puestos = 0;
    PERFILES.forEach(function(pf){
      const quiere = huecosDeReglas(pf.id), origen = huecos(pf.id, id), h = {};
      Object.keys(origen).forEach(function(k){ h[k] = origen[k]; });
      Object.keys(quiere).forEach(function(k){
        const slot = k.split("|").slice(0, 2).join("|");
        // Libre es que no haya nada en toda la comida: meter una paella de
        // segundo debajo de unas lentejas no es lo que nadie quiso decir.
        if(ordenesDe().some(function(o){ return !!h[slot + "|" + o]; })) return;
        h[k] = quiere[k];
        puestos++;
      });
      if(puestos) fijarHuecos(pf.id, id, h);
    });
    return puestos;
  }

  // Una semilla de generación con las reglas puestas encima. Mandan sobre lo
  // demás — sobre el espejo del niño, sobre lo que hubiera — porque son lo único
  // de aquí que has decidido tú y no un reparto. Y se quedan con la comida
  // entera: media comida de regla y media de reparto no significa nada.
  function conReglas(pid, semilla){
    const h = {};
    Object.keys(semilla || {}).forEach(function(k){ if(semilla[k]) h[k] = semilla[k]; });
    const quiere = huecosDeReglas(pid), slots = {};
    Object.keys(quiere).forEach(function(k){ slots[k.split("|").slice(0, 2).join("|")] = 1; });
    Object.keys(slots).forEach(function(slot){
      ordenesDe().forEach(function(o){ delete h[slot + "|" + o]; });
    });
    Object.keys(quiere).forEach(function(k){ h[k] = quiere[k]; });
    return h;
  }

  /* ============ Fechas ============ */
  function aDia(f){ return new Date(f.getFullYear(), f.getMonth(), f.getDate()); }
  function sumaDias(f, n){ const d = aDia(f); d.setDate(d.getDate() + n); return d; }
  function lunesDe(f){ const d = aDia(f); return sumaDias(d, -(((d.getDay() + 6) % 7))); }
  function iso(f){
    return f.getFullYear() + "-" + String(f.getMonth()+1).padStart(2,"0") + "-" + String(f.getDate()).padStart(2,"0");
  }
  function desdeIso(s){ const p = String(s).split("-").map(Number); return new Date(p[0], p[1]-1, p[2]); }
  function semanasEntre(a, b){ return Math.round((aDia(b) - aDia(a)) / (7 * DIA_MS)); }

  // "3ª semana de septiembre (14-20)". El mes es el del jueves de esa semana
  // y el ordinal cuenta desde la semana que contiene el día 1 de ese mes.
  function etiquetaSemana(lunes){
    const domingo = sumaDias(lunes, 6), jueves = sumaDias(lunes, 3);
    const mes = jueves.getMonth(), anio = jueves.getFullYear();
    const ordinal = semanasEntre(lunesDe(new Date(anio, mes, 1)), lunes) + 1;
    let rango;
    if(lunes.getMonth() === domingo.getMonth()){
      rango = lunes.getDate() + "-" + domingo.getDate();
    }else{
      rango = lunes.getDate() + " " + MESES_CORTOS[lunes.getMonth()] + " - " +
              domingo.getDate() + " " + MESES_CORTOS[domingo.getMonth()];
    }
    return ordinal + "ª de " + MESES[mes] + " (" + rango + ")";
  }
  function subtituloSemana(lunes){
    const domingo = sumaDias(lunes, 6);
    const mismoMes = lunes.getMonth() === domingo.getMonth();
    const a = lunes.getDate() + (mismoMes ? "" : " de " + MESES[lunes.getMonth()]);
    return "Del " + a + " al " + domingo.getDate() + " de " + MESES[domingo.getMonth()] + " de " + domingo.getFullYear();
  }

  /* ============ DOM ============ */
  const $ = function(id){ return document.getElementById(id); };
  function el(tag, attrs, hijos){
    const e = document.createElement(tag);
    if(attrs) Object.keys(attrs).forEach(function(k){
      if(k === "class") e.className = attrs[k];
      else if(k === "text") e.textContent = attrs[k];
      else if(k === "style") e.style.cssText = attrs[k];
      else if(k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if(attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    });
    if(hijos) hijos.forEach(function(c){ if(c) e.appendChild(c); });
    return e;
  }
  function mayus(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
  function sinTildes(s){
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function colorDe(g){ return "var(--g-" + g + ", var(--surface-2))"; }

  function lista(s){ return String(s || "").split("|").map(function(x){ return x.trim(); }).filter(Boolean); }

  /* ============ Carga ============ */
  const datos = {};    // filas ya traídas de la base

  // Un tope generoso, porque PostgREST pagina. Con 35 huecos por semana y dos
  // menús esto da para unos cinco años de histórico; cuando se acerque habrá que
  // traer solo las semanas que se miran.
  const TOPE = 20000;
  async function tabla(nombre, orden){
    let q = db.from(nombre).select("*").limit(TOPE);
    (orden || []).forEach(function(c){ q = q.order(c, {ascending:true}); });
    const { data, error } = await q;
    if(error) throw error;
    return data || [];
  }

  // Las filas se traducen a la forma que tenían los CSV: listas unidas por "|" y
  // booleanos como "si"/"no". Así nada de lo que viene después se entera del
  // cambio de origen, que es justo lo que se quiere en un primer paso.
  function tubo(v){ return Array.isArray(v) ? v.join("|") : (v || ""); }
  function sn(v){ return v ? "si" : "no"; }

  async function cargar(){
    const r = await Promise.all([
      tabla("secciones",    ["orden"]),
      tabla("ingredientes", ["ingrediente"]),
      tabla("tipos",        ["orden"]),
      tabla("equilibrio",   ["orden"]),
      tabla("reglas",       ["menu", "dia", "momento", "orden"]),
      tabla("recetas",      ["plato"]),
      tabla("platos",       ["nombre"]),
      tabla("semanas",      ["semana_id", "dia", "momento", "orden"]),
      tabla("compras",      ["semana_id", "ingrediente"]),
      tabla("despensa",     ["ingrediente"])
    ]);
    const [secciones, ingredientes, tipos, equilibrio, reglas, recetas,
           platos, semanas, compras, despensa] = r;

    // El orden de las secciones es el del súper y manda en la lista de la compra:
    // los ingredientes se devuelven ordenados por él, como venían en el CSV.
    const pos = {};
    secciones.forEach(function(x){ pos[x.seccion] = x.orden; });
    ingredientes.sort(function(a, b){
      return (pos[a.seccion] - pos[b.seccion]) || a.ingrediente.localeCompare(b.ingrediente, "es");
    });

    datos.tipos = tipos.map(function(x){ return {clave:x.clave, tipo:x.tipo}; });
    datos.ingredientes = ingredientes.map(function(x){
      return {ingrediente:x.ingrediente, seccion:x.seccion};
    });
    datos.equilibrio = equilibrio.map(function(x){
      return {objetivo:x.objetivo, tipos:tubo(x.tipos),
              minimo:String(x.minimo), maximo:String(x.maximo)};
    });
    datos.reglas = reglas.map(function(x){
      return {menu:x.menu, dia:x.dia, momento:x.momento,
              orden:String(x.orden), plato:x.plato};
    });
    datos.recetas = recetas.map(function(x){
      return {plato:x.plato, pasos:tubo(x.pasos), cantidades:tubo(x.cantidades)};
    });
    datos.platos = platos.map(function(x){
      return {nombre:x.nombre, adultos:sn(x.adultos), nino:sn(x.nino),
              descripcion:x.descripcion || "", tipo:tubo(x.tipo), momento:tubo(x.momento),
              tiempo:x.tiempo, repeticion:x.repeticion, plato_unico:sn(x.plato_unico),
              ingredientes:tubo(x.ingredientes)};
    });
    const deMenu = function(m){
      return semanas.filter(function(x){ return x.menu === m; }).map(function(x){
        return {semana_id:x.semana_id, dia:x.dia, momento:x.momento,
                orden:String(x.orden), plato:x.plato};
      });
    };
    datos.semanas = deMenu("casa");
    datos.semanas_nino = deMenu("nino");
    // Una fila por plato, y la marca va con ella.
    NO_COMPRA = {};
    semanas.forEach(function(x){
      if(x.es_para_comprar === false){
        NO_COMPRA[x.semana_id + "|" + (x.menu === "casa" ? "adultos" : "nino") + "|" +
                  x.dia + "|" + x.momento + "|" + String(x.orden)] = true;
      }
    });
    datos.compras = compras.map(function(x){
      return {semana_id:x.semana_id, ingrediente:x.ingrediente, en_casa:sn(x.en_casa)};
    });
    datos.despensa = despensa.map(function(x){
      return {ingrediente:x.ingrediente, en_casa:sn(x.en_casa)};
    });
  }

  /* ============ Estado ============ */
  // v6: en el navegador ya solo viven la pestaña y la semana que mirabas. Los
  // datos están en la base, así que lo guardado por versiones anteriores se
  // ignora a propósito: aplicarlo encima de lo que viene de la base lo pisaría.
  const CLAVE = "menu-semanal:v6";
  function perfilVacio(){ return {semanas:{}}; }
  let estado = { tab:"semana", semana:null, despensa:{}, secciones:{},
                 compras:{}, semanasBorradas:[], objetivos:{},
                 platos:{ediciones:{}, borrados:[], extra:[]},
                 ing:{ediciones:{}, borrados:[], extra:[]},
                 adultos:perfilVacio(), nino:perfilVacio() };

  // Lo que el navegador recuerda, que son tres preferencias y nada más.
  //
  // Esto leía antes el estado entero — platos, semanas, compras, objetivos —
  // porque en la época de los CSV localStorage *era* la base de datos, y arrastró
  // mucho código de migración de formatos viejos. Desde Supabase, guardar() solo
  // escribe estas tres claves, así que todo aquello era código que no podía
  // ejecutarse y que hacía creer que aquí había datos.
  function cargarEstado(){
    let p = null;
    try{ p = JSON.parse(localStorage.getItem(CLAVE) || "null"); }catch(e){}
    if(!p || typeof p !== "object") return;
    estado.tab = p.tab || "semana";
    estado.semana = p.semana || null;
    estado.equilibrioAbierto = (p.equilibrioAbierto && typeof p.equilibrioAbierto === "object")
                             ? p.equilibrioAbierto : {};
  }

  // En el navegador ya solo viven las preferencias: qué pestaña y qué semana
  // estabas mirando, y si dejaste el equilibrio abierto.
  function guardarPreferencias(){
    try{
      localStorage.setItem(CLAVE, JSON.stringify({tab:estado.tab, semana:estado.semana,
                                                  equilibrioAbierto:estado.equilibrioAbierto}));
    }catch(e){}
  }
  function guardar(){
    try{
      localStorage.setItem(CLAVE, JSON.stringify({tab:estado.tab, semana:estado.semana,
                                                  equilibrioAbierto:estado.equilibrioAbierto}));
    }catch(e){}
    persistir();
  }

  let SECCION = {}, SECCIONES = [], REPO_COMPRAS = {}, TIPOS = [], CLAVE_TIPO = {};
  let PLATOS = [];      // el repertorio entero, con su marca de menú
  let OBJETIVOS = [];   // el equilibrio, que es de la casa y no de cada menú
  const REP = { adultos:{REPO:{}}, nino:{REPO:{}} };

  function construir(){
    const si = function(v){ return /^(si|sí|1|true|x)$/i.test(v || ""); };
    PLATOS = (datos.platos || []).map(function(x){
      return { orig:x.nombre, n:x.nombre, d:x.descripcion, t:lista(x.tipo), m:lista(x.momento),
               tiempo:x.tiempo || "medio", rep:x.repeticion || "media",
               unico: si(x.plato_unico), menus:{adultos: si(x.adultos), nino: si(x.nino)},
               i:lista(x.ingredientes) };
    }).filter(function(x){ return x.n; });

    // Cada objetivo mide uno o varios tipos: "Pescado y marisco" los suma.
    OBJETIVOS = (datos.equilibrio || []).filter(function(x){ return x.objetivo; }).map(function(x){
      return { n:x.objetivo, tipos:lista(x.tipos), min:Number(x.minimo) || 0, max:Number(x.maximo) || 0 };
    });

    RECETAS = {};
    (datos.recetas || []).forEach(function(x){
      if(x.plato) RECETAS[x.plato] = {pasos:lista(x.pasos), cantidades:lista(x.cantidades)};
    });

    REGLAS = (datos.reglas || []).filter(function(x){ return x.plato; }).map(function(x){
      return {menu:x.menu, dia:x.dia, momento:x.momento, orden:String(x.orden), plato:x.plato};
    });

    PERFILES.forEach(function(pf){
      const r = REP[pf.id];
      r.REPO = {};
      (datos[pf.semanas] || []).forEach(function(x){
        if(!x.semana_id) return;
        if(!r.REPO[x.semana_id]) r.REPO[x.semana_id] = {};
        if(x.plato) r.REPO[x.semana_id][x.dia + "|" + x.momento + "|" + (x.orden || "1")] = x.plato;
      });
    });

    // Catálogo cerrado de tipos de alimento. Es la única clasificación que hay:
    // describe el plato y es la que mide el equilibrio de la semana.
    TIPOS = (datos.tipos || []).map(function(x){ return x.tipo; }).filter(Boolean);
    CLAVE_TIPO = {};
    (datos.tipos || []).forEach(function(x){ if(x.tipo) CLAVE_TIPO[x.tipo] = x.clave || ""; });

    // Compras ya registradas: qué había en casa cada semana.
    REPO_COMPRAS = {};
    (datos.compras || []).forEach(function(x){
      if(!x.semana_id || !x.ingrediente) return;
      if(!REPO_COMPRAS[x.semana_id]) REPO_COMPRAS[x.semana_id] = {};
      REPO_COMPRAS[x.semana_id][x.ingrediente] = /^(si|sí|1|true|x)$/i.test(x.en_casa || "");
    });

    // El orden de los bloques de la compra es el orden de aparición en el CSV.
    SECCION = {}; const orden = [];
    (datos.ingredientes || []).forEach(function(x){
      if(!x.ingrediente) return;
      SECCION[x.ingrediente] = x.seccion || "Otros";
      if(orden.indexOf(SECCION[x.ingrediente]) === -1) orden.push(SECCION[x.ingrediente]);
    });
    SECCIONES = orden;
  }

  /* ============ Consultas ============ */
  // Los objetivos son de la casa entera: una sola tabla, datos/equilibrio.csv.
  function objetivos(){
    return OBJETIVOS.map(function(o){
      const a = estado.objetivos[o.n];
      return { n:o.n, tipos:o.tipos, min:a ? a.min : o.min, max:a ? a.max : o.max };
    });
  }
  function objetivosTocados(){ return Object.keys(estado.objetivos).length > 0; }

  // Repertorio vigente: el del CSV con las ediciones aplicadas, sin los borrados,
  // más los añadidos a mano. `orig` identifica al plato del CSV aunque se renombre.
  function repertorio(){
    const st = estado.platos, salida = [];
    PLATOS.forEach(function(p){
      if(st.borrados.indexOf(p.orig) !== -1) return;
      const e = st.ediciones[p.orig];
      if(!e){ salida.push(p); return; }
      salida.push({ orig:p.orig, n:e.n, d:e.d, t:tiposDe(e), m:e.m, tiempo:e.tiempo, rep:e.rep,
                    unico:!!e.unico, menus:{adultos:!!(e.menus && e.menus.adultos), nino:!!(e.menus && e.menus.nino)},
                    i:e.i.slice(), editado:true });
    });
    const yaEsta = {};
    salida.forEach(function(x){ yaEsta[x.n] = 1; });
    st.extra.forEach(function(x){
      if(yaEsta[x.n]) return;      // ya lo trae el CSV
      yaEsta[x.n] = 1;
      salida.push(x);
    });
    return salida;
  }
  // Lo que entra en un menú concreto.
  function platos(pid){
    return repertorio().filter(function(p){ return p.menus && p.menus[pid]; });
  }
  function plato(pid, n){
    const todos = platos(pid);
    for(let i = 0; i < todos.length; i++) if(todos[i].n === n) return todos[i];
    return null;
  }
  // En una semana puede haber quedado un plato que ya no está en ese menú
  // (lo desmarcaste después, o venía del otro). Sigue estando servido, así que
  // se pinta y se compra igual; lo que hay que hacer es avisar.
  function platoEnSemana(pid, n){
    return plato(pid, n) || platoPorNombre(n);
  }
  function platoPorNombre(n){
    const todos = repertorio();
    for(let i = 0; i < todos.length; i++) if(todos[i].n === n) return todos[i];
    return null;
  }
  // El color del plato lo pone su primer tipo.
  function claveDe(tipo){ return CLAVE_TIPO[tipo] || ""; }

  // El momento de un plato es una lista. Se admite lo que haya guardado el
  // navegador de antes, cuando era una sola palabra y existía "ambos".
  function momentosDe(p){
    const v = p ? p.m : null;
    if(!v) return [];
    const crudo = Array.isArray(v) ? v : String(v).split("|");
    const salida = [];
    crudo.forEach(function(x){
      const k = String(x).trim();
      if(k === "ambos"){ salida.push("comida"); salida.push("cena"); }
      else if(k) salida.push(k);
    });
    return salida.filter(function(x, i){
      return MOMENTO_LBL[x] && salida.indexOf(x) === i;
    });
  }
  function momentoTexto(p){ return momentosDe(p).map(function(m){ return MOMENTO_LBL[m]; }).join(" · "); }
  function base(p){ const t = tiposDe(p); return t.length ? claveDe(t[0]) : ""; }
  // Cuántas veces cubre un plato un objetivo: o una o ninguna.
  function cumple(p, obj){
    const t = tiposDe(p);
    return obj.tipos.some(function(x){ return t.indexOf(x) !== -1; }) ? 1 : 0;
  }
  function otroPerfil(pid){ return pid === "adultos" ? "nino" : "adultos"; }

  // Qué platos de la semana hay que comprar. Casi todos, así que lo que se
  // guarda aquí son las excepciones: lo que el niño come en la guardería y lo
  // que ya está en la nevera. Va por plato y no por hueco, porque dentro de una
  // misma comida puede haber un primero de allí y un postre que sí hay que traer.
  // En la base es la columna es_para_comprar, en positivo y con true por defecto:
  // lo normal no debería tener que decirse en ningún sitio.
  let NO_COMPRA = {};
  function marcaDeCompra(id, pid, k){ return id + "|" + pid + "|" + k; }
  function paraComprar(id, pid, k){ return !NO_COMPRA[marcaDeCompra(id, pid, k)]; }
  function marcarCompra(id, pid, k, si){
    const c = marcaDeCompra(id, pid, k);
    if(si) delete NO_COMPRA[c]; else NO_COMPRA[c] = true;
    guardar();
  }
  // Mientras el niño come lo mismo que en la mesa no tiene línea propia en la
  // semana, y por tanto tampoco casilla propia: manda la de la mesa. Si no, al
  // desmarcar un plato seguiría en la compra por una casilla que no se ve.
  function marcaEfectiva(id, pid, k){
    if(pid !== "nino") return paraComprar(id, pid, k);
    const hn = huecos("nino", id), ha = huecos("adultos", id);
    const slot = k.split("|").slice(0, 2).join("|");
    const propio = ordenesDe().some(function(o){
      return (hn[slot + "|" + o] || "") !== (ha[slot + "|" + o] || "");
    });
    return paraComprar(id, propio ? "nino" : "adultos", k);
  }

  // Un hueco del niño con algo fuera de la compra: casi siempre, la guardería.
  function fueraDeCompra(id, pid, slot){
    return ordenesDe().some(function(o){ return !paraComprar(id, pid, slot + "|" + o); });
  }

  // El equivalente de `n` en otro menú: el mismo plato si también está ahí y,
  // si no, el más parecido que sí esté. Sin azar: el mismo plato da siempre la
  // misma sustitución, y por eso se puede saber después si un hueco es una
  // excepción tuya o simplemente lo que le tocaba. Vale para los dos sentidos.
  function espejo(n, momento, pid){
    if(!n) return "";
    const suyo = plato(pid, n);
    if(suyo) return suyo.n;
    const dela = platoPorNombre(n);
    if(!dela) return "";
    const base0 = base(dela), tipos = tiposDe(dela);
    const cands = platos(pid).filter(function(c){
      return elegible(c, momento) && c.rep !== "nunca";
    });
    if(!cands.length) return "";
    cands.sort(function(a, b){
      const ba = (base(a) === base0 ? 1 : 0), bb = (base(b) === base0 ? 1 : 0);
      if(ba !== bb) return bb - ba;
      const ca = tiposDe(a).filter(function(t){ return tipos.indexOf(t) !== -1; }).length;
      const cb = tiposDe(b).filter(function(t){ return tipos.indexOf(t) !== -1; }).length;
      if(ca !== cb) return cb - ca;
      const ua = (!!a.unico === !!dela.unico ? 1 : 0), ub = (!!b.unico === !!dela.unico ? 1 : 0);
      if(ua !== ub) return ub - ua;
      return a.n.localeCompare(b.n, "es");
    });
    return cands[0].n;
  }

  // Al cambiar un plato del niño, la mesa le sigue si tenía justo su equivalente.
  // Si ahí habías puesto otra cosa a mano, no se toca.
  //
  // Antes el arrastre iba al revés, de la mesa al niño. Cambió con el orden de
  // trabajo: ahora se carga la guardería, se completa la semana del niño y de
  // ella sale la de la mesa. El origen es él.
  function sigueAdulto(id, clave, viejo, nuevo){
    const ha = huecos("adultos", id), mom = clave.split("|")[1];
    if((ha[clave] || "") !== espejo(viejo, mom, "adultos")) return;
    const copia = {};
    Object.keys(ha).forEach(function(k){ copia[k] = ha[k]; });
    const ahora = espejo(nuevo, mom, "adultos");
    if(ahora) copia[clave] = ahora; else delete copia[clave];
    fijarHuecos("adultos", id, copia);
  }

  // En cuántos huecos el niño no come lo que hay en la mesa. La guardería va
  // aparte: ahí no es que coma otra cosa, es que no come en casa. Un hueco en
  // la guardería cuenta entero, sin mirar si en la mesa había uno o dos platos.
  function diferencias(id){
    const casa = huecos("adultos", id), hn = huecos("nino", id);
    let propias = 0, guarde = 0;
    slotsDe().forEach(function(slot){
      if(fueraDeCompra(id, "nino", slot)){ guarde++; return; }
      ordenesDe().forEach(function(o){
        const k = slot + "|" + o;
        if((casa[k] || "") !== (hn[k] || "")) propias++;
      });
    });
    return {propias:propias, guarde:guarde};
  }
  // El tipo es una lista; los platos guardados antes del catálogo traían texto suelto.
  function tiposDe(p){ return p ? (Array.isArray(p.t) ? p.t.slice() : lista(p.t)) : []; }
  function tipoTexto(p){ return tiposDe(p).join(" · "); }
  // Catálogo vigente: el del CSV con los cambios encima, más los añadidos.
  function ingredientes(){
    const st = estado.ing, salida = [];
    (datos.ingredientes || []).forEach(function(r){
      if(!r.ingrediente) return;
      if(st.borrados.indexOf(r.ingrediente) !== -1) return;
      const e = st.ediciones[r.ingrediente];
      salida.push(e ? {orig:r.ingrediente, n:e.n, seccion:e.seccion, editado:true}
                    : {orig:r.ingrediente, n:r.ingrediente, seccion:r.seccion || "Otros"});
    });
    // Un añadido que ya llegó al CSV lo manda el CSV: si no, saldría duplicado
    // y el fichero generado nunca coincidiría con el guardado.
    const yaEsta = {};
    salida.forEach(function(x){ yaEsta[x.n] = 1; });
    st.extra.forEach(function(x){
      if(yaEsta[x.n]) return;
      yaEsta[x.n] = 1;
      salida.push({n:x.n, seccion:x.seccion, custom:true});
    });
    return salida;
  }
  function seccionDe(ing){
    const f = ingredientes().filter(function(x){ return x.n === ing; })[0];
    return f ? f.seccion : (SECCION[ing] || "Otros");
  }
  // Cuántos platos usan cada ingrediente.
  function usosDe(ing){
    return repertorio().filter(function(p){ return p.i.indexOf(ing) !== -1; }).map(function(p){ return p.n; });
  }
  // Los bloques desconocidos se cuelan antes del último del CSV, para que el
  // último bloque (la panadería) siga cerrando la lista.
  function todasSecciones(){
    const vistas = SECCIONES.slice();
    ingredientes().forEach(function(x){
      if(vistas.indexOf(x.seccion) === -1) vistas.push(x.seccion);
    });
    return vistas;
  }
  function ordenSecciones(presentes){
    const extras = presentes.filter(function(s){ return SECCIONES.indexOf(s) === -1; }).sort();
    if(!SECCIONES.length) return extras;
    return SECCIONES.slice(0, -1).concat(extras, SECCIONES.slice(-1));
  }

  function huecos(pid, id){
    const st = estado[pid];
    if(st.semanas[id]) return st.semanas[id];
    if(REP[pid].REPO[id]) return REP[pid].REPO[id];
    return {};
  }
  function fijarHuecos(pid, id, h){
    estado[pid].semanas[id] = h;
    // Una marca sin plato debajo no significa nada, y además no se podría
    // guardar: la columna vive en la fila del plato.
    const prefijo = id + "|" + pid + "|";
    Object.keys(NO_COMPRA).forEach(function(c){
      if(c.indexOf(prefijo) !== 0) return;
      if(!h[c.slice(prefijo.length)]) delete NO_COMPRA[c];
    });
    // Volver a poner platos en una semana borrada la resucita: si no, quedaba
    // invisible en el histórico y no llegaba nunca al repositorio.
    if(Object.keys(h).some(function(k){ return !!h[k]; })){
      estado.semanasBorradas = estado.semanasBorradas.filter(function(x){ return x !== id; });
    }
    guardar();
  }

  // Un "slot" es una comida o una cena; dentro caben dos platos, el 1º y el 2º.
  function slotsDe(){
    const salida = [];
    DIAS.forEach(function(d){ MOMENTOS.forEach(function(m){ salida.push(d + "|" + m.id); }); });
    return salida;
  }
  function clavesDe(){
    const salida = [];
    slotsDe().forEach(function(x){
      ordenesDe().forEach(function(o){ salida.push(x + "|" + o); });
    });
    return salida;
  }
  // Los platos de un hueco, ya resueltos contra el repertorio del menú.
  function platosDe(pid, h, slot){
    return ordenesDe()
      .map(function(o){ return h[slot + "|" + o]; })
      .map(function(n){ return n ? platoEnSemana(pid, n) : null; })
      .filter(Boolean);
  }
  // Se cuentan las comidas resueltas, no los platos: un plato único ya cubre la suya.
  function llenos(pid, id){
    const h = huecos(pid, id);
    return slotsDe().filter(function(s){ return !!h[s + "|1"]; }).length;
  }

  function idsSemanas(pid){
    const s = {};
    Object.keys(REP[pid].REPO).forEach(function(k){ s[k] = 1; });
    Object.keys(estado[pid].semanas).forEach(function(k){ s[k] = 1; });
    return Object.keys(s).filter(function(id){
      if(estado.semanasBorradas.indexOf(id) !== -1) return false;
      const h = huecos(pid, id);
      return Object.keys(h).some(function(k){ return !!h[k]; });
    }).sort().reverse();
  }
  function idsTodas(){
    const s = {};
    PERFILES.forEach(function(pf){ idsSemanas(pf.id).forEach(function(id){ s[id] = 1; }); });
    return Object.keys(s).sort().reverse();
  }

  // Cada semana guarda su propia foto de lo que había en casa.
  function semanasConCompra(){
    const s = {};
    Object.keys(REPO_COMPRAS).forEach(function(k){ s[k] = 1; });
    Object.keys(estado.compras).forEach(function(k){ s[k] = 1; });
    return Object.keys(s).filter(function(k){ return estado.semanasBorradas.indexOf(k) === -1; }).sort();
  }
  function marcaDe(id, ing){
    const l = estado.compras[id];
    if(l && Object.prototype.hasOwnProperty.call(l, ing)) return !!l[ing];
    const r = REPO_COMPRAS[id];
    if(r && Object.prototype.hasOwnProperty.call(r, ing)) return !!r[ing];
    return null;
  }
  function enDespensaFija(ing){
    const f = (datos.despensa || []).filter(function(r){ return r.ingrediente === ing; })[0];
    return !!(f && /^(si|sí|1|true|x)$/i.test(f.en_casa || ""));
  }
  // Si la semana no dice nada de ese ingrediente, se hereda de la última que sí lo diga.
  function enCasa(ing, id){
    id = id || semanaActual();
    const propia = marcaDe(id, ing);
    if(propia !== null) return propia;
    const previas = semanasConCompra().filter(function(x){ return x < id; }).reverse();
    for(let i = 0; i < previas.length; i++){
      const m = marcaDe(previas[i], ing);
      if(m !== null) return m;
    }
    return enDespensaFija(ing);
  }
  function marcar(id, ing, v){
    if(!estado.compras[id]) estado.compras[id] = {};
    estado.compras[id][ing] = !!v;
    guardar();
  }

  // Al renombrar o borrar un plato, sus huecos dejan de apuntar a un nombre muerto.
  function reemplazarEnSemanas(pid, viejo, nuevo){
    if(!viejo || viejo === nuevo) return;
    idsSemanas(pid).forEach(function(id){
      const h = huecos(pid, id), copia = {};
      let tocado = false;
      Object.keys(h).forEach(function(k){
        if(h[k] === viejo){ tocado = true; if(nuevo) copia[k] = nuevo; }
        else copia[k] = h[k];
      });
      if(tocado) estado[pid].semanas[id] = copia;
    });
    guardar();
  }

  /* ============ Generador ============ */
  function elegible(p, mom){ return momentosDe(p).indexOf(mom) !== -1; }

  // Reparte el repertorio de un menú por los huecos de una semana, persiguiendo
  // los objetivos de equilibrio.
  //
  // `semilla` son huecos que llegan puestos de antes — lo que trajo el menú de
  // la guardería, o lo que se copia del otro menú. No se tocan, pero sí cuentan:
  // si en la guardería le dan legumbre dos veces, en casa toca menos. Un hueco
  // con algo dentro queda fijo entero; se rellenan solo los que están vacíos.
  function generar(id, pid, op){
    pid = pid || "adultos";
    op = op || {};
    const todos = platos(pid), metas = objetivos(), pf = perfil(pid);
    const h = {}, usados = {}, cuenta = {};
    metas.forEach(function(o){ cuenta[o.n] = 0; });

    // El repaso recorre el reparto miles de veces: todo lo que no cambia se
    // calcula aquí una vez y luego sólo se consulta.
    const SLOTS = slotsDe(), CLAVES = clavesDe();
    const ORD = {}, APTOS = {}, PORNOMBRE = {}, CUBRE = {};
    const ORDS = ordenesDe();
    SLOTS.forEach(function(x){ ORD[x] = ORDS; });
    IDS_MOMENTO.forEach(function(m){
      APTOS[m] = todos.filter(function(p){ return elegible(p, m); });
    });
    // De todo el repertorio y no solo de este menú: un hueco fijo puede traer un
    // plato del otro, y si no estuviera aquí no contaría para ningún objetivo.
    repertorio().forEach(function(p){
      PORNOMBRE[p.n] = p;
      CUBRE[p.n] = metas.map(function(o){ return cumple(p, o) ? 1 : 0; });
    });

    const fijados = {}, semilla = op.semilla || {};
    Object.keys(semilla).forEach(function(k){ if(semilla[k]) h[k] = semilla[k]; });
    SLOTS.forEach(function(slot){
      if(ORDS.some(function(o){ return !!h[slot + "|" + o]; })) fijados[slot] = 1;
    });
    Object.keys(h).forEach(function(k){ usados[h[k]] = 1; });
    // Lo fijo ya cubre objetivos, y el reparto tiene que saberlo antes de
    // empezar: si no, volvería a buscar legumbre donde ya la hay.
    conteo(h).forEach(function(n, i){ cuenta[metas[i].n] = n; });

    const orden = SLOTS.filter(function(x){ return !fijados[x]; })
                       .sort(function(){ return Math.random() - 0.5; });

    function puntua(p, dia, momento){
      let punt = Math.random() * 0.9;
      metas.forEach(function(o){
        if(!cumple(p, o)) return;
        if(cuenta[o.n] < o.min) punt += 4;
        else if(cuenta[o.n] < o.max) punt += 1.2;
        else punt -= 10;   // pasarse de un máximo pesa más que quedarse corto
      });
      punt += (PESO_REPETICION[p.rep] !== undefined ? PESO_REPETICION[p.rep] : 0);
      if(p.tiempo === "alto") punt += FINDE[dia] ? 1 : (momento === "cena" ? -2 : -0.8);
      else if(p.tiempo === "medio" && !FINDE[dia] && momento === "cena") punt -= 0.4;
      // No repetir la misma base en la comida y la cena del mismo día.
      if(momento === "comida" || momento === "cena"){
        const hermano = h[dia + "|" + (momento === "comida" ? "cena" : "comida") + "|1"];
        if(hermano){
          const otro = plato(pid, hermano);
          if(otro && base(otro) && base(otro) === base(p)) punt -= 3;
        }
      }
      return punt;
    }
    function elige(cands, dia, momento){
      let mejor = null, mejorPunt = -Infinity;
      cands.forEach(function(p){
        const punt = puntua(p, dia, momento);
        if(punt > mejorPunt){ mejorPunt = punt; mejor = p; }
      });
      return mejor;
    }
    // Al colocar el 2º plato, no se vuelve a contar lo que ya cubría el 1º.
    function apunta(slot, orden, p){
      h[slot + "|" + orden] = p.n;
      usados[p.n] = 1;
      const hermano = orden === "2" && h[slot + "|1"] ? plato(pid, h[slot + "|1"]) : null;
      metas.forEach(function(o){
        if(!cumple(p, o)) return;
        if(hermano && cumple(hermano, o)) return;
        cuenta[o.n]++;
      });
    }

    orden.forEach(function(slot){
      const partes = slot.split("|"), dia = partes[0], momento = partes[1];
      const aptos = APTOS[momento] || [];
      if(!aptos.length) return;

      // Primer plato: se prefiere no repetir dentro de la semana, pero antes que
      // dejar el hueco vacío se repite. En desayunos, almuerzos y meriendas
      // repetir es lo normal.
      const vario = !LIGEROS[momento];
      let cands = vario ? aptos.filter(function(p){ return !usados[p.n]; }) : aptos;
      const primero = elige(cands.length ? cands : aptos, dia, momento);
      if(!primero) return;
      apunta(slot, "1", primero);

      // Un plato único basta. Si no lo es, se le busca otro plato que tampoco lo sea.
      // Un plato único resuelve la comida: el postre y el tercero, si hacen
      // falta, los pone el repaso cuando con ellos cuadra algún objetivo.
      if(primero.unico) return;
      const parejas = aptos.filter(function(p){ return !p.unico && p.n !== primero.n; });
      if(!parejas.length) return;
      const libres = vario ? parejas.filter(function(p){ return !usados[p.n]; }) : parejas;
      const segundo = elige(libres.length ? libres : parejas, dia, momento);
      if(segundo) apunta(slot, "2", segundo);
    });

    // Colocar de una pasada deja objetivos fuera de rango: el reparto se repasa
    // cambiando platos sueltos mientras eso acerque la semana a los objetivos.
    // Un objetivo cuenta una vez por comida, aunque lo cubran sus dos platos.
    function conteo(hh){
      const c = new Array(metas.length).fill(0);
      for(let si = 0; si < SLOTS.length; si++){
        const slot = SLOTS[si], ords = ORD[slot], aquí = new Array(metas.length).fill(0);
        for(let oi = 0; oi < ords.length; oi++){
          const v = CUBRE[hh[slot + "|" + ords[oi]]];
          if(!v) continue;
          for(let i = 0; i < v.length; i++) if(v[i]) aquí[i] = 1;
        }
        for(let i = 0; i < c.length; i++) c[i] += aquí[i];
      }
      return c;
    }
    function desvioDe(c){
      let t = 0;
      for(let i = 0; i < metas.length; i++){
        t += Math.max(0, metas[i].min - c[i]) + Math.max(0, c[i] - metas[i].max);
      }
      return t;
    }
    function repasa(){
      let cuentas = conteo(h), mejor = desvioDe(cuentas);
      // Se recorren todos los huecos, ocupados o no: cambiar un plato y añadir
      // uno donde cabe son el mismo movimiento desde el punto de vista del
      // equilibrio, y el repaso solo acepta lo que acerca la semana a su sitio.
      // Por eso puede llegar a poner un tercer plato, pero nunca de más: añadir
      // algo que rebase un máximo empeora el desvío y se descarta.
      const vueltas = Math.max(600, CLAVES.length * 40);
      for(let vuelta = 0; vuelta < vueltas && mejor > 0; vuelta++){
        const k = CLAVES[Math.floor(Math.random() * CLAVES.length)];
        if(!k) break;
        const partes = k.split("|"), dia = partes[0], momento = partes[1], orden = partes[2];
        const slot = dia + "|" + momento;
        if(fijados[slot]) continue;                    // lo que ya estaba puesto no se toca

        const actual = h[k] ? PORNOMBRE[h[k]] : null;
        if(h[k] && !actual) continue;                  // un plato que ya no existe
        const anade = !h[k];

        // Quitar un acompañante es el movimiento simétrico de añadirlo, y es el
        // único que arregla un exceso: si la semana se pasa de pescado, ningún
        // cambio de plato lo baja, hay que retirar uno. El primero no se toca,
        // y el segundo solo si el primero se basta solo: si no, dejaría una
        // ensalada haciendo de cena ella sola.
        const base1 = h[slot + "|1"] ? PORNOMBRE[h[slot + "|1"]] : null;
        const puedeQuitar = actual && (orden === "3" || (orden === "2" && base1 && base1.unico));
        if(puedeQuitar){
          const guardado = h[k];
          delete h[k];
          // Si se quita el de en medio, el siguiente sube para no dejar un salto.
          const movido = (orden === "2" && h[slot + "|3"]) ? h[slot + "|3"] : null;
          if(movido){ h[slot + "|2"] = movido; delete h[slot + "|3"]; }
          const tras = conteo(h), dq = desvioDe(tras);
          if(dq < mejor){ mejor = dq; cuentas = tras; continue; }
          if(movido){ h[slot + "|3"] = movido; }
          h[k] = guardado;
        }

        // Los demás platos de esa comida y cuántos caben, que un plato único deja
        // sitio para el postre pero no para un tercero.
        const otros = [];
        ORD[slot].forEach(function(o){
          if(o !== orden && h[slot + "|" + o]) otros.push(h[slot + "|" + o]);
        });
        const primero = h[slot + "|1"] ? PORNOMBRE[h[slot + "|1"]] : null;
        if(anade){
          // Solo se rellena el hueco siguiente al último ocupado, y si cabe.
          const puestos = ORD[slot].filter(function(o){ return !!h[slot + "|" + o]; }).length;
          if(Number(orden) !== puestos + 1) continue;
          if(Number(orden) > cabenEn(primero)) continue;
        }

        const enUso = {};
        CLAVES.forEach(function(x){ if(h[x] && x !== k) enUso[h[x]] = 1; });

        const cands = (APTOS[momento] || []).filter(function(c){
          if(actual && c.n === actual.n) return false;
          if(otros.indexOf(c.n) !== -1) return false;
          // Lo marcado como "nunca" (guarde, restaurante) solo se pone a mano.
          if(c.rep === "nunca") return false;
          if(enUso[c.n] && !LIGEROS[momento]) return false;
          // De primero vale cualquiera: si es único, lo que sobre se retira abajo.
          // Del segundo en adelante, nunca uno que se baste solo.
          return orden === "1" ? true : !c.unico;
        });
        if(!cands.length) continue;

        // Probar al azar entre cuarenta platos tarda mucho en dar con el único que
        // tapa un hueco: si algún objetivo va corto, se prueba antes con los suyos.
        let urna = cands;
        const cortos = [];
        for(let i = 0; i < metas.length; i++) if(cuentas[i] < metas[i].min) cortos.push(i);
        if(cortos.length){
          const tapan = cands.filter(function(c){
            const v = CUBRE[c.n];
            return v && cortos.some(function(i){ return v[i]; });
          });
          if(tapan.length) urna = tapan;
        }

        const cand = urna[Math.floor(Math.random() * urna.length)];
        const previo = h[k];
        // Un plato único de primero recorta la comida a dos: lo que pase de ahí sobra.
        const retirados = {};
        if(orden === "1" && cand.unico){
          ORD[slot].forEach(function(o){
            if(Number(o) > 2 && h[slot + "|" + o]){
              retirados[o] = h[slot + "|" + o];
              delete h[slot + "|" + o];
            }
          });
        }
        h[k] = cand.n;
        const ahora = conteo(h), d = desvioDe(ahora);
        if(d < mejor){ mejor = d; cuentas = ahora; }
        else {
          if(previo) h[k] = previo; else delete h[k];
          Object.keys(retirados).forEach(function(o){ h[slot + "|" + o] = retirados[o]; });
        }
      }
    }
    repasa();

    fijarHuecos(pid, id, h);
    return diferencias(id);
  }

  // Quita repetidos dentro de un hueco y cierra los saltos, que un 3º sin 2º no
  // se pinta. Hace falta al copiar de un menú a otro: dos platos distintos del
  // niño pueden tener el mismo equivalente en la mesa.
  function compacta(h, slot){
    const vistos = {}, queda = [];
    ordenesDe().forEach(function(o){
      const n = h[slot + "|" + o];
      delete h[slot + "|" + o];
      if(!n || vistos[n]) return;
      vistos[n] = 1; queda.push(n);
    });
    queda.forEach(function(n, i){ h[slot + "|" + String(i + 1)] = n; });
  }

  // Completa la semana del niño sin tocar lo que ya tenga — lo de la guardería,
  // lo que hayas puesto tú — y buscando el equilibrio con el resto. Donde la
  // mesa ya tenga algo que él pueda comer, lo mismo que la mesa: cocinar dos
  // cosas distintas cuando no hace falta no le conviene a nadie.
  function completarNino(id){
    const hn = huecos("nino", id), ha = huecos("adultos", id), semilla = {};
    clavesDe().forEach(function(k){ if(hn[k]) semilla[k] = hn[k]; });
    slotsDe().forEach(function(slot){
      if(ordenesDe().some(function(o){ return !!semilla[slot + "|" + o]; })) return;
      ordenesDe().forEach(function(o){
        const k = slot + "|" + o;
        if(ha[k] && plato("nino", ha[k])) semilla[k] = ha[k];
      });
      compacta(semilla, slot);
    });
    return generar(id, "nino", {semilla:conReglas("nino", semilla)});
  }

  // La mesa, a partir de lo que come el niño: su mismo plato si los adultos
  // también lo comen, y si no el más parecido que sí. En los huecos de la
  // guardería no hay nada que copiar — ese día no come en casa — y los rellena
  // el reparto normal, contando ya lo demás.
  function adultoDesdeNino(id){
    const hn = huecos("nino", id), semilla = {};
    slotsDe().forEach(function(slot){
      if(fueraDeCompra(id, "nino", slot)) return;
      const mom = slot.split("|")[1];
      ordenesDe().forEach(function(o){
        const x = espejo(hn[slot + "|" + o], mom, "adultos");
        if(x) semilla[slot + "|" + o] = x;
      });
      compacta(semilla, slot);
      // Un plato único no necesita acompañante.
      const p1 = semilla[slot + "|1"] ? plato("adultos", semilla[slot + "|1"]) : null;
      if(p1 && p1.unico && semilla[slot + "|3"]) delete semilla[slot + "|3"];
    });
    return generar(id, "adultos", {semilla:conReglas("adultos", semilla)});
  }

  // En cuántas comidas la mesa y el niño tienen exactamente lo mismo. Se cuenta
  // por hueco y no por plato: lo que se quiere saber es cuántas veces se cocina
  // una sola cosa, y para eso tienen que coincidir los tres órdenes.
  function huecosIguales(id){
    const ha = huecos("adultos", id), hn = huecos("nino", id);
    return slotsDe().filter(function(slot){
      if(!ha[slot + "|1"] || !hn[slot + "|1"]) return false;
      return ordenesDe().every(function(o){
        return (ha[slot + "|" + o] || "") === (hn[slot + "|" + o] || "");
      });
    }).length;
  }

  function cuantosHuecos(pid, id){
    const h = huecos(pid, id);
    return clavesDe().filter(function(k){ return !!h[k]; }).length;
  }

  /* ============ Ventanas ============ */
  // Había cinco copias de esto, una por ventana, y no se portaban igual: la de
  // ingredientes no cerraba con Escape y la del cargador llevaba un caso
  // especial para no cerrarse cuando tenía el editor encima. Con una pila, lo
  // de "Escape cierra la de arriba" sale solo, y la sexta ventana que haga
  // falta no tiene que volver a inventarlo.
  const CAPAS = [];

  function abrirCapa(caja, foco){
    const capa = el("div", {class:"overlay" + (CAPAS.length ? " sobre" : "")}, [caja]);
    // En el mousedown y no en el click: si empiezas a seleccionar texto dentro
    // y sueltas el botón fuera, el click cae en el fondo y te cerraba la
    // ventana con todo lo que llevaras escrito.
    capa.addEventListener("mousedown", function(e){
      if(e.target === capa) cerrarCapa(capa);
    });
    CAPAS.push(capa);
    if(CAPAS.length === 1) document.addEventListener("keydown", escCapa);
    document.body.appendChild(capa);
    if(foco && foco.focus) foco.focus();
    return capa;
  }

  // Sin argumento cierra la de arriba; con uno, esa misma esté donde esté.
  function cerrarCapa(cual){
    const i = cual ? CAPAS.indexOf(cual) : CAPAS.length - 1;
    if(i < 0) return;
    CAPAS.splice(i, 1)[0].remove();
    if(!CAPAS.length) document.removeEventListener("keydown", escCapa);
  }
  function escCapa(e){ if(e.key === "Escape") cerrarCapa(); }

  /* ============ Pestañas ============ */
  const PESTANAS = [
    {id:"platos",         lbl:"Platos"},
    {id:"semana",         lbl:"Semana"},
    {id:"compra",         lbl:"Compra"},
    {id:"ingredientes",   lbl:"Ingredientes"},
    {id:"recetas",        lbl:"Recetas"},
    {id:"historico",      lbl:"Configuración"}
  ];
  function montarPestanas(){
    const nav = $("tabs");
    nav.textContent = "";   // montar dos veces no debe dejar la barra duplicada
    PESTANAS.forEach(function(t){
      const hijos = [document.createTextNode(t.lbl + " ")];
      if(t.quien) hijos.push(el("span", {class:"quien", text:t.quien}));
      hijos.push(el("span", {class:"n", id:"n-" + t.id, text:"–"}));
      nav.appendChild(el("button", {
        class:"tab", id:"tab-" + t.id, role:"tab", "aria-controls":"panel-" + t.id,
        "aria-selected":"false", "data-panel":t.id,
        onclick:function(){ verTab(t.id); }
      }, hijos));
    });
  }
  function verTab(nombre){
    estado.tab = nombre; guardar();
    PESTANAS.forEach(function(t){
      $("panel-" + t.id).hidden = (t.id !== nombre);
      $("tab-" + t.id).setAttribute("aria-selected", String(t.id === nombre));
    });
  }

  /* ============ Panel: platos ============ */
  // Quedó un solo ámbito, de cuando Platos y Desayunos eran dos pestañas. Se
  // mantiene la estructura porque es la que parametriza la tabla y su exportador.
  const AMBITOS = [
    {id:"platos", lbl:"Platos", titulo:"Repertorio de platos", hoja:"Platos", nuevo:"Nuevo plato",
     moms:IDS_MOMENTO,
     lead:"Todo lo que se come en casa, de la tostada del desayuno a la cena, en una sola lista. " +
          "Las casillas de cada fila dicen en qué menús entra el plato; el resto se edita desde su botón Editar.",
     vacio:"Ningún plato coincide con el filtro."}
  ];
  function ambito(id){ return AMBITOS.filter(function(a){ return a.id === id; })[0]; }
  // Un plato cae en la pestaña si se come en alguno de sus momentos.
  function delAmbito(a, p){
    const l = momentosDe(p);
    return a.moms.some(function(m){ return l.indexOf(m) !== -1; });
  }

  // El orden de cada tabla, al estilo de una hoja de cálculo.
  const ORDEN = {};
  AMBITOS.forEach(function(a){ ORDEN[a.id] = {col:0, asc:true, cols:[]}; });
  // Qué momentos se están mirando en la tabla. Todos, mientras no toques nada.
  let MOMS_VISTOS = [];
  function ordenarPor(a, i){
    const o = ORDEN[a.id];
    if(o.col === i) o.asc = !o.asc;
    else { o.col = i; o.asc = true; }
    pintarAmbito(a);
  }

  function montarPanelAmbito(a){
    const p = $("panel-" + a.id);
    const ide = function(b){ return b + "-" + a.id; };
    const repinta = function(){ pintarAmbito(a); };
    p.textContent = "";
    p.appendChild(el("div", {class:"section-head"}, [
      el("div", {style:"display:flex;gap:8px;flex-wrap:wrap"}, [
        el("button", {class:"btn", id:ide("excel"), onclick:function(){ exportarPlatos(a); },
                      title:"Descarga un .xlsx con lo que se ve ahora, con sus filtros y su orden",
                      text:"Exportar a Excel"}),
        el("button", {class:"btn btn-primary", id:ide("nuevo"),
                      onclick:function(){ abrirEditor(null, a); }, text:a.nuevo})
      ])
    ]));

    function filtro(base, etiqueta, opciones){
      const sel = el("select", {id:ide(base), oninput:repinta});
      opciones.forEach(function(o){ sel.appendChild(el("option", {value:o[0], text:o[1]})); });
      return el("div", {class:"field"}, [el("label", {for:ide(base), text:etiqueta}), sel]);
    }
    const buscar = el("input", {type:"search", id:ide("f-buscar"), placeholder:"Plato o ingrediente…",
                                oninput:repinta});
    const fTipo = el("select", {id:ide("f-tipo"), oninput:repinta}, [
      el("option", {value:"", text:"Todos"})
    ]);
    TIPOS.forEach(function(t){ fTipo.appendChild(el("option", {value:t, text:t})); });

    // El momento no es un desplegable sino una fila de fichas que se encienden y
    // se apagan: casi siempre quieres ver dos o tres a la vez —el desayuno y la
    // merienda, o la comida y la cena— y con un desplegable eso no se puede.
    MOMS_VISTOS = IDS_MOMENTO.slice();
    const fichas = el("div", {class:"chips-mom", role:"group", "aria-label":"Momentos del día"});
    IDS_MOMENTO.forEach(function(m){
      const b = el("button", {type:"button", class:"chip-mom chip-" + m + " on",
                              "aria-pressed":"true", "data-mom":m, text:MOMENTO_LBL[m]});
      b.addEventListener("click", function(){
        const todos = MOMS_VISTOS.length === IDS_MOMENTO.length;
        const i = MOMS_VISTOS.indexOf(m);
        if(todos){
          // Partiendo de "todos", pulsar una ficha quiere decir "enséñame solo esta".
          MOMS_VISTOS = [m];
        }else if(i === -1){
          MOMS_VISTOS.push(m);                       // sumar un momento más
        }else{
          MOMS_VISTOS.splice(i, 1);                  // quitar este
        }
        // Quedarse sin ninguno no enseña nada útil: vuelve a enseñarlos todos.
        if(!MOMS_VISTOS.length) MOMS_VISTOS = IDS_MOMENTO.slice();
        fichas.querySelectorAll(".chip-mom").forEach(function(x){
          const on = MOMS_VISTOS.indexOf(x.dataset.mom) !== -1;
          x.classList.toggle("on", on);
          x.setAttribute("aria-pressed", String(on));
        });
        repinta();
      });
      fichas.appendChild(b);
    });
    p.appendChild(el("div", {class:"field full"}, [
      el("label", {class:"bloque-lbl", text:"Momento del día"}), fichas
    ]));

    p.appendChild(el("div", {class:"filters"}, [
      el("div", {class:"field grow"}, [el("label", {for:ide("f-buscar"), text:"Buscar"}), buscar]),
      filtro("f-menu", "Menú", [["","Todos"],["adultos","Adultos"],["nino","Niño"],
                                ["ambos","En los dos"],["ninguno","En ninguno"]]),
      filtro("f-tiempo", "Preparación", [["","Toda"],["bajo","Bajo"],["medio","Medio"],["alto","Alto"]]),
      filtro("f-repeticion", "Repetición", [["","Toda"],["siempre","Siempre"],["alta","Alta"],["media","Media"],["baja","Baja"],["ocasional","Ocasional"],["nunca","Nunca"]]),
      filtro("f-unico", "Plato único", [["","Todos"],["si","Sí"],["no","No"]]),
      el("div", {class:"field"}, [el("label", {for:ide("f-tipo"), text:"Tipo de alimento"}), fTipo])
    ]));

    const COLS = [
      {t:"Plato",            k:function(p){ return p.n.toLowerCase(); }},
      {t:"Menús",            k:function(p){ return (p.menus && p.menus.adultos ? "1" : "0") + (p.menus && p.menus.nino ? "1" : "0"); }},
      {t:"Tipo de alimento", k:function(p){ return tipoTexto(p).toLowerCase(); }},
      {t:"Momento",          k:function(p){
         const l = momentosDe(p).map(function(m){ return IDS_MOMENTO.indexOf(m); });
         return l.length ? Math.min.apply(null, l) : 99; }},
      {t:"Preparación",      k:function(p){ return ["bajo","medio","alto"].indexOf(p.tiempo); }},
      {t:"Repetición",       k:function(p){ return ["siempre","alta","media","baja","ocasional","nunca"].indexOf(p.rep); }},
      {t:"Plato único",      k:function(p){ return p.unico ? 1 : 0; }},
      {t:"Ingredientes",     k:function(p){ return p.i.length; }}
    ];
    const cabecera = COLS.map(function(c, i){
      return el("th", {scope:"col", class:"orden-col", "data-col":String(i),
                       "aria-sort":"none", tabindex:"0",
                       onclick:function(){ ordenarPor(a, i); },
                       onkeydown:function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); ordenarPor(a, i); } }}, [
        el("span", {text:c.t}), el("span", {class:"flecha"})
      ]);
    });
    ORDEN[a.id].cols = COLS;
    cabecera.push(el("th", {scope:"col", class:"col-acc"}));
    p.appendChild(el("div", {class:"table-wrap"}, [
      el("table", null, [
        el("thead", null, [el("tr", null, cabecera)]),
        el("tbody", {id:ide("tbody")})
      ])
    ]));
    p.appendChild(el("p", {class:"hint", style:"margin-top:12px", text:
      "Los cambios se guardan en este navegador. Para dejarlos fijos, guarda desde el Histórico."}));
  }

  // Las casillas que dicen en qué menús entra el plato.
  function celdaMenus(p, a){
    const caja = el("div", {class:"menus"});
    PERFILES.forEach(function(pf){
      const cb = el("input", {type:"checkbox", id:"m-" + a.id + "-" + pf.id + "-" + (p.uid || p.orig),
                              "aria-label":p.n + " en el menú " + pf.quien});
      cb.checked = !!(p.menus && p.menus[pf.id]);
      cb.addEventListener("change", function(){ marcarMenu(p, pf.id, cb.checked); });
      caja.appendChild(el("label", {class:"menu-chk" + (cb.checked ? " on" : "")}, [
        cb, el("span", {text:pf.lbl})
      ]));
    });
    return caja;
  }

  function marcarMenu(p, pid, valor){
    const menus = {adultos:!!(p.menus && p.menus.adultos), nino:!!(p.menus && p.menus.nino)};
    menus[pid] = valor;
    if(p.custom){
      const obj = estado.platos.extra.filter(function(x){ return x.uid === p.uid; })[0];
      if(obj) obj.menus = menus;
    }else{
      const e = estado.platos.ediciones[p.orig] || camposDe(p);
      e.menus = menus;
      estado.platos.ediciones[p.orig] = e;
    }
    if(!valor) reemplazarEnSemanas(pid, p.n, null);
    guardar(); pintarTodo();
    aviso("«" + p.n + "» " + (valor ? "entra en" : "sale de") + " el menú " + perfil(pid).quien);
  }
  function camposDe(p){
    return { n:p.n, d:p.d, t:tiposDe(p), m:momentosDe(p), tiempo:p.tiempo, rep:p.rep, unico:!!p.unico,
             menus:{adultos:!!(p.menus && p.menus.adultos), nino:!!(p.menus && p.menus.nino)},
             i:p.i.slice() };
  }

  function celdaTipos(p){
    const caja = el("div", {class:"tipos"});
    tiposDe(p).forEach(function(t){ caja.appendChild(el("span", {class:"chip chip-tipo", text:t})); });
    return caja;
  }

  // Lo mismo que se ve en la tabla, filtrado y ordenado. Lo usa también el
  // exportador, para que el Excel salga con lo que tienes delante.
  function platosFiltrados(a){
    const ide = function(b){ return $(b + "-" + a.id); };
    const q = ide("f-buscar").value.trim().toLowerCase();
    const mm = ide("f-menu").value;
    const ti = ide("f-tiempo").value, re2 = ide("f-repeticion").value;
    const un = ide("f-unico").value, tp = ide("f-tipo").value;
    const filas = repertorio().filter(function(p){ return delAmbito(a, p); }).filter(function(p){
      const en = p.menus || {};
      if(mm === "adultos" && !en.adultos) return false;
      if(mm === "nino" && !en.nino) return false;
      if(mm === "ambos" && !(en.adultos && en.nino)) return false;
      if(mm === "ninguno" && (en.adultos || en.nino)) return false;
      if(!momentosDe(p).some(function(x){ return MOMS_VISTOS.indexOf(x) !== -1; })) return false;
      if(ti && p.tiempo !== ti) return false;
      if(re2 && p.rep !== re2) return false;
      if(un && (un === "si") !== !!p.unico) return false;
      if(tp && tiposDe(p).indexOf(tp) === -1) return false;
      if(q && (p.n + " " + p.d + " " + tipoTexto(p) + " " + p.i.join(" ")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    const o = ORDEN[a.id], col = o.cols[o.col];
    if(col){
      filas.sort(function(x, y){
        const vx = col.k(x), vy = col.k(y);
        const c = vx < vy ? -1 : (vx > vy ? 1 : x.n.localeCompare(y.n, "es"));
        return o.asc ? c : -c;
      });
    }
    return filas;
  }

  function pintarPlatos(){ AMBITOS.forEach(pintarAmbito); }

  function pintarAmbito(a){
    const cuerpo = $("tbody-" + a.id), filas = platosFiltrados(a);
    const o = ORDEN[a.id];
    const ths = document.querySelectorAll("#panel-" + a.id + " th.orden-col");
    for(let i = 0; i < ths.length; i++){
      const activa = i === o.col;
      ths[i].setAttribute("aria-sort", activa ? (o.asc ? "ascending" : "descending") : "none");
      ths[i].querySelector(".flecha").textContent = activa ? (o.asc ? "▲" : "▼") : "";
    }

    cuerpo.textContent = "";
    if(!filas.length){
      cuerpo.appendChild(el("tr", null, [
        el("td", {colspan:"9", style:"padding:26px 14px;color:var(--ink-3)", text:a.vacio})
      ]));
    }
    filas.forEach(function(p){
      const nombre = el("div", {class:"dish-name", text:p.n});
      if(p.custom || p.editado){
        nombre.appendChild(el("span", {class:"custom-flag", text:p.custom ? "añadido" : "modificado"}));
      }
      const ings = el("div", {class:"ings"});
      p.i.forEach(function(x){ ings.appendChild(el("span", {class:"chip chip-ing", text:x})); });
      const moms = el("div", {class:"tipos"});
      momentosDe(p).forEach(function(m){
        moms.appendChild(el("span", {class:"chip chip-" + m, text:MOMENTO_LBL[m]}));
      });

      cuerpo.appendChild(el("tr", null, [
        el("td", null, [nombre, el("div", {class:"dish-desc", text:p.d})]),
        el("td", null, [celdaMenus(p, a)]),
        el("td", null, [celdaTipos(p)]),
        el("td", null, [moms]),
        el("td", null, [el("span", {class:"chip chip-" + p.tiempo, text:mayus(p.tiempo)})]),
        el("td", null, [el("span", {class:"chip chip-" + p.rep, text:mayus(p.rep)})]),
        el("td", null, [el("span", {class:"chip " + (p.unico ? "chip-unico" : "chip-doble"),
                                    text: p.unico ? "Sí" : "No"})]),
        el("td", null, [ings]),
        el("td", {class:"col-acc"}, [
          el("button", {class:"btn btn-sm", text:"Editar", "aria-label":"Editar " + p.n,
            onclick:function(){ abrirEditor(p.custom ? {tipo:"extra", uid:p.uid} : {tipo:"base", orig:p.orig}, a); }})
        ])
      ]));
    });

    const total = repertorio().filter(function(p){ return delAmbito(a, p); }).length;
    $("n-" + a.id).textContent = String(total);
    const bx = $("excel-" + a.id);
    if(bx) bx.textContent = filas.length === total
      ? "Exportar a Excel"
      : "Exportar a Excel (" + filas.length + ")";
  }

  /* ============ Exportar a Excel ============ */
  // Un .xlsx es un ZIP con unos cuantos XML dentro. Se escribe a mano para no
  // meter una librería externa en una página que no tiene ninguna.
  let TABLA_CRC = null;
  function crc32(bytes){
    if(!TABLA_CRC){
      TABLA_CRC = new Uint32Array(256);
      for(let i = 0; i < 256; i++){
        let c = i;
        for(let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        TABLA_CRC[i] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for(let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  // ZIP sin comprimir: Excel lo admite y evita tener que implementar deflate.
  function zip(ficheros){
    const cod = new TextEncoder(), trozos = [], central = [];
    let desplazamiento = 0;
    function u16(v){ return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v){ return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

    ficheros.forEach(function(f){
      const nombre = cod.encode(f.nombre), datos = cod.encode(f.texto), suma = crc32(datos);
      const cab = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
                            u32(suma), u32(datos.length), u32(datos.length),
                            u16(nombre.length), u16(0));
      trozos.push(new Uint8Array(cab), nombre, datos);
      central.push([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
                             u32(suma), u32(datos.length), u32(datos.length),
                             u16(nombre.length), u16(0), u16(0), u16(0), u16(0), u32(0),
                             u32(desplazamiento)));
      central.push(nombre);
      desplazamiento += cab.length + nombre.length + datos.length;
    });

    const dir = [];
    central.forEach(function(x){ Array.prototype.push.apply(dir, Array.from(x instanceof Uint8Array ? x : x)); });
    const fin = [].concat(u32(0x06054b50), u16(0), u16(0), u16(ficheros.length), u16(ficheros.length),
                          u32(dir.length), u32(desplazamiento), u16(0));

    trozos.push(new Uint8Array(dir), new Uint8Array(fin));
    let total = 0;
    trozos.forEach(function(t){ total += t.length; });
    const salida = new Uint8Array(total);
    let i = 0;
    trozos.forEach(function(t){ salida.set(t, i); i += t.length; });
    return salida;
  }

  function xmlEscapa(v){
    return String(v === undefined || v === null ? "" : v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function columna(i){          // 0 -> A, 25 -> Z, 26 -> AA
    let n = i + 1, s = "";
    while(n > 0){ const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  function aExcel(cabecera, filas, anchos, hoja){
    const celdas = [];
    function fila(valores, n, cabeceraFila){
      const cs = valores.map(function(v, i){
        const ref = columna(i) + n, estilo = cabeceraFila ? ' s="1"' : "";
        if(typeof v === "number" && isFinite(v)){
          return '<c r="' + ref + '"' + estilo + '><v>' + v + '</v></c>';
        }
        const t = xmlEscapa(v);
        return t === "" ? '<c r="' + ref + '"' + estilo + '/>'
                        : '<c r="' + ref + '"' + estilo + ' t="inlineStr"><is><t xml:space="preserve">' + t + '</t></is></c>';
      }).join("");
      return '<row r="' + n + '">' + cs + '</row>';
    }
    celdas.push(fila(cabecera, 1, true));
    filas.forEach(function(f, i){ celdas.push(fila(f, i + 2, false)); });

    const ultima = columna(cabecera.length - 1), alto = filas.length + 1;
    const cols = anchos.map(function(w, i){
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join("");

    const sheet =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0">' +
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols>' + cols + '</cols>' +
      '<sheetData>' + celdas.join("") + '</sheetData>' +
      '<autoFilter ref="A1:' + ultima + alto + '"/>' +
      '</worksheet>';

    const estilos =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border/></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';

    return zip([
      {nombre:"[Content_Types].xml", texto:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>'},
      {nombre:"_rels/.rels", texto:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'},
      {nombre:"xl/workbook.xml", texto:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="' + xmlEscapa(hoja) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'},
      {nombre:"xl/_rels/workbook.xml.rels", texto:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>'},
      {nombre:"xl/styles.xml", texto:estilos},
      {nombre:"xl/worksheets/sheet1.xml", texto:sheet}
    ]);
  }

  // Exporta lo que se está viendo: respeta los filtros y el orden de la tabla.
  function exportarPlatos(a){
    const filas = platosFiltrados(a);
    if(!filas.length){ aviso("No hay nada que exportar con esos filtros"); return; }
    const cabecera = ["Plato","Adultos","Niño","Descripción","Tipo de alimento","Base",
                      "Momento","Preparación","Repetición","Plato único","Ingredientes","Nº ingredientes"];
    const anchos =   [38, 9, 8, 52, 34, 18, 11, 13, 12, 12, 60, 15];
    const datos = filas.map(function(p){
      return [p.n,
              p.menus && p.menus.adultos ? "Sí" : "No",
              p.menus && p.menus.nino ? "Sí" : "No",
              p.d, tiposDe(p).join(" · "), tiposDe(p)[0] || "",
              momentoTexto(p), mayus(p.tiempo), mayus(p.rep),
              p.unico ? "Sí" : "No",
              p.i.join(", "), p.i.length];
    });
    const bytes = aExcel(cabecera, datos, anchos, a.hoja);
    const hoy = iso(new Date());
    descargarBinario(a.id + "-" + hoy + ".xlsx", bytes,
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    aviso("Exportados " + filas.length + " platos a Excel");
  }

  function descargarBinario(nombre, bytes, tipo){
    try{
      const url = URL.createObjectURL(new Blob([bytes], {type:tipo}));
      const a = el("a", {href:url, download:nombre});
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    }catch(e){
      aviso("Este navegador no deja descargar aquí");
    }
  }

  /* ============ Panel: ingredientes ============ */
  function montarPanelIngredientes(){
    const p = $("panel-ingredientes");
    p.textContent = "";
    p.appendChild(el("div", {class:"section-head"}, [
      el("button", {class:"btn btn-primary", text:"Nuevo ingrediente",
                    onclick:function(){ abrirIngrediente(null); }})
    ]));

    const buscar = el("input", {type:"search", id:"fi-buscar", placeholder:"Ingrediente…",
                                oninput:pintarIngredientes});
    const fSec = el("select", {id:"fi-seccion", oninput:pintarIngredientes}, [
      el("option", {value:"", text:"Todas"})
    ]);
    const fUso = el("select", {id:"fi-uso", oninput:pintarIngredientes}, [
      el("option", {value:"", text:"Todos"}),
      el("option", {value:"usados", text:"En uso"}),
      el("option", {value:"sueltos", text:"Sin usar"})
    ]);
    todasSecciones().forEach(function(x){ fSec.appendChild(el("option", {value:x, text:x})); });

    p.appendChild(el("div", {class:"filters"}, [
      el("div", {class:"field grow"}, [el("label", {for:"fi-buscar", text:"Buscar"}), buscar]),
      el("div", {class:"field"}, [el("label", {for:"fi-seccion", text:"Sección"}), fSec]),
      el("div", {class:"field"}, [el("label", {for:"fi-uso", text:"Uso"}), fUso])
    ]));

    p.appendChild(el("div", {class:"table-wrap"}, [
      el("table", {class:"estrecha"}, [
        el("thead", null, [el("tr", null, [
          el("th", {scope:"col", text:"Ingrediente"}),
          el("th", {scope:"col", text:"Sección del súper"}),
          el("th", {scope:"col", text:"Platos que lo usan"}),
          el("th", {scope:"col", class:"col-acc"})
        ])]),
        el("tbody", {id:"tbody-ing"})
      ])
    ]));
  }

  function pintarIngredientes(){
    const cuerpo = $("tbody-ing");
    if(!cuerpo) return;
    const q = $("fi-buscar").value.trim().toLowerCase();
    const sc = $("fi-seccion").value, uso = $("fi-uso").value;
    const filas = ingredientes().filter(function(x){
      if(sc && x.seccion !== sc) return false;
      if(q && x.n.toLowerCase().indexOf(q) === -1) return false;
      const n = usosDe(x.n).length;
      if(uso === "usados" && !n) return false;
      if(uso === "sueltos" && n) return false;
      return true;
    }).sort(function(a, b){
      const s = todasSecciones();
      return (s.indexOf(a.seccion) - s.indexOf(b.seccion)) || a.n.localeCompare(b.n, "es");
    });

    cuerpo.textContent = "";
    if(!filas.length){
      cuerpo.appendChild(el("tr", null, [
        el("td", {colspan:"4", style:"padding:26px 14px;color:var(--ink-3)", text:"Ningún ingrediente coincide."})
      ]));
    }
    filas.forEach(function(x){
      const platos = usosDe(x.n);
      const nombre = el("div", {style:"font-weight:600", text:x.n});
      if(x.custom || x.editado){
        nombre.appendChild(el("span", {class:"custom-flag", text:x.custom ? "añadido" : "modificado"}));
      }
      cuerpo.appendChild(el("tr", null, [
        el("td", null, [nombre]),
        el("td", null, [el("span", {class:"chip", text:x.seccion})]),
        el("td", null, [ platos.length
          ? el("div", {class:"hint", style:"max-width:46ch", text: platos.length + " · " + platos.join(", ")})
          : el("span", {class:"chip chip-doble", text:"sin usar"}) ]),
        el("td", {class:"col-acc"}, [
          el("button", {class:"btn btn-sm", text:"Editar", "aria-label":"Editar " + x.n,
                        onclick:function(){ abrirIngrediente(x); }})
        ])
      ]));
    });
    $("n-ingredientes").textContent = String(ingredientes().length);
  }

  let capaIng = null;
  function cerrarIngrediente(){ if(capaIng){ cerrarCapa(capaIng); capaIng = null; } }

  function abrirIngrediente(x){
    cerrarIngrediente();
    const nuevo = !x, nombreAntes = x ? x.n : "";
    const eNom = el("input", {type:"text", id:"i-nombre", value: x ? x.n : "", placeholder:"berenjena"});
    const eSec = el("select", {id:"i-seccion"});
    todasSecciones().forEach(function(sc){
      eSec.appendChild(el("option", {value:sc, text:sc, selected: x && x.seccion === sc ? "selected" : null}));
    });

    const platos = x ? usosDe(x.n) : [];
    const pie = [];
    if(!nuevo){
      pie.push(el("button", {class:"btn btn-ghost", style:"color:var(--pimenton)", text:"Eliminar",
        onclick:function(){
          if(platos.length){
            aviso("Lo usan " + platos.length + " platos: quítalo de ellos primero");
            return;
          }
          if(!window.confirm("¿Eliminar «" + x.n + "» del catálogo?")) return;
          if(x.custom) estado.ing.extra = estado.ing.extra.filter(function(y){ return y.n !== x.n; });
          else{
            if(estado.ing.borrados.indexOf(x.orig) === -1) estado.ing.borrados.push(x.orig);
            delete estado.ing.ediciones[x.orig];
          }
          guardar(); cerrarIngrediente(); pintarTodo(); aviso("Ingrediente eliminado");
        }}));
      if(x.editado){
        pie.push(el("button", {class:"btn btn-ghost", text:"Deshacer cambios", onclick:function(){
          const orig = (datos.ingredientes || []).filter(function(r){ return r.ingrediente === x.orig; })[0];
          delete estado.ing.ediciones[x.orig];
          if(orig) renombrarIngrediente(x.n, orig.ingrediente);
          guardar(); cerrarIngrediente(); pintarTodo(); aviso("Ingrediente devuelto al CSV");
        }}));
      }
    }
    pie.push(el("div", {class:"der"}, [
      el("button", {class:"btn", text:"Cancelar", onclick:cerrarIngrediente}),
      el("button", {class:"btn btn-primary", text: nuevo ? "Añadir" : "Guardar cambios", onclick:function(){
        const n = eNom.value.trim().toLowerCase();
        if(!n){ aviso("Ponle nombre"); eNom.focus(); return; }
        const choque = ingredientes().filter(function(y){ return y.n === n; })[0];
        if(choque && n !== nombreAntes){ aviso("«" + n + "» ya está en el catálogo"); eNom.focus(); return; }
        if(nuevo){
          estado.ing.extra.push({n:n, seccion:eSec.value});
        }else if(x.custom){
          const obj = estado.ing.extra.filter(function(y){ return y.n === x.n; })[0];
          if(obj){ obj.n = n; obj.seccion = eSec.value; }
          renombrarIngrediente(nombreAntes, n);
        }else{
          estado.ing.ediciones[x.orig] = {n:n, seccion:eSec.value};
          renombrarIngrediente(nombreAntes, n);
        }
        guardar(); cerrarIngrediente(); pintarTodo();
        aviso(nuevo ? "«" + n + "» añadido al catálogo" : "Ingrediente actualizado");
      }})
    ]));

    const caja = el("div", {class:"editor", role:"dialog", "aria-modal":"true",
                            "aria-label": nuevo ? "Nuevo ingrediente" : "Editar ingrediente"}, [
      el("header", null, [el("h3", {text: nuevo ? "Nuevo ingrediente" : "Editar ingrediente"})]),
      el("div", {class:"editor-body"}, [
        campo("Nombre", eNom, true),
        campo("Sección del súper", eSec, true),
        platos.length ? el("p", {class:"hint full",
          text:"Lo usan " + platos.length + " platos: " + platos.join(", ") + ". Al renombrarlo se actualizan solos."}) : null
      ]),
      el("footer", null, pie)
    ]);
    capaIng = abrirCapa(caja);
    eNom.focus();
  }

  // Renombrar un ingrediente arrastra a todos los platos que lo usan.
  function renombrarIngrediente(viejo, nuevo){
    if(!viejo || viejo === nuevo) return;
    function arregla(lista){
      const i = lista.indexOf(viejo);
      if(i === -1) return false;
      if(lista.indexOf(nuevo) === -1) lista[i] = nuevo; else lista.splice(i, 1);
      return true;
    }
    estado.platos.extra.forEach(function(p){ arregla(p.i); });
    Object.keys(estado.platos.ediciones).forEach(function(k){ arregla(estado.platos.ediciones[k].i); });
    PLATOS.forEach(function(p){
      if(p.i.indexOf(viejo) === -1) return;
      if(estado.platos.ediciones[p.orig]) return;   // ya cubierto arriba
      const copia = camposDe(p);
      arregla(copia.i);
      estado.platos.ediciones[p.orig] = copia;
    });
    // y la despensa
    if(Object.prototype.hasOwnProperty.call(estado.despensa, viejo)){
      estado.despensa[nuevo] = estado.despensa[viejo];
      delete estado.despensa[viejo];
    }
    Object.keys(estado.compras).forEach(function(id){
      const c = estado.compras[id];
      if(Object.prototype.hasOwnProperty.call(c, viejo)){ c[nuevo] = c[viejo]; delete c[viejo]; }
    });
  }

  /* ============ Panel: semana ============ */
  function montarPanelSemana(){
    const p = $("panel-semana");
    p.textContent = "";
    p.appendChild(el("div", {class:"section-head"}, [
      el("div", {style:"display:flex;gap:8px;flex-wrap:wrap"}, [
        // En el orden en que se usan: primero lo que mandan de la guardería,
        // luego se completa la semana del niño y de ella sale la de la mesa.
        el("button", {class:"btn", text:"Cargar menú guarde",
                      title:"El menú que mandan de la guardería, en el JSON que devuelve el asistente",
                      onclick:pedirFicheroGuarde}),
        el("button", {class:"btn", text:"Completar menú equilibrado niño",
          title:"Rellena los huecos vacíos del niño con sus platos, sin tocar lo que ya haya",
          onclick:function(){
            const id = semanaActual(), antes = cuantosHuecos("nino", id);
            completarNino(id); pintarTodo();
            aviso("Semana del niño completada: " + (cuantosHuecos("nino", id) - antes) +
                  " platos nuevos · " + resumenEquilibrio("nino", id));
          }}),
        el("button", {class:"btn", text:"Generar menú adulto a partir de niño",
          title:"La mesa, con los platos del niño o los más parecidos que comáis vosotros",
          onclick:function(){
            const id = semanaActual();
            adultoDesdeNino(id); pintarTodo();
            aviso("Mesa generada a partir del niño: coméis lo mismo en " +
                  huecosIguales(id) + " de " + slotsDe().length + " comidas · " +
                  resumenEquilibrio("adultos", id));
          }}),
        el("button", {class:"btn btn-primary", text:"Generar menú adulto",
          title:"Reparte el repertorio de adultos por la semana, sin mirar lo del niño",
          onclick:function(){
            const id = semanaActual();
            fijarHuecos("adultos", id, {});
            generar(id, "adultos", {semilla:conReglas("adultos", {})}); pintarTodo();
            aviso("Menú de adulto generado: " + etiquetaSemana(desdeIso(id)) +
                  " · " + resumenEquilibrio("adultos", id));
          }}),
        el("button", {class:"btn", text:"Vaciar",
                      title:"Deja la semana en blanco, los dos menús",
                      onclick:function(){
          const id = semanaActual();
          // Por lo mismo que al borrar: sin tocar REPO, "vaciar" solo tapaba.
          Object.keys(NO_COMPRA).forEach(function(c){ if(c.indexOf(id + "|") === 0) delete NO_COMPRA[c]; });
          PERFILES.forEach(function(pf){ delete REP[pf.id].REPO[id]; });
          fijarHuecos("adultos", id, {}); fijarHuecos("nino", id, {}); pintarTodo();
        }}),
        el("button", {class:"btn", text:"Imprimir",
                      title:"La semana entera en una hoja apaisada",
                      onclick:function(){ window.print(); }}),
        el("span", {class:"guardado hecho", id:"estado-guardado", hidden:"hidden"})
      ])
    ]));
    p.appendChild(el("div", {class:"weeknav"}, [
      el("button", {class:"arrow", "aria-label":"Semana anterior", text:"◀",
        onclick:function(){ irASemana(iso(sumaDias(desdeIso(semanaActual()), -7))); }}),
      el("div", {class:"wk"}, [
        el("div", {class:"lbl", id:"wk-label", text:"—"})
      ]),
      el("button", {class:"arrow", "aria-label":"Semana siguiente", text:"▶",
        onclick:function(){ irASemana(iso(sumaDias(desdeIso(semanaActual()), 7))); }}),
      el("button", {class:"btn btn-sm", text:"Semana actual",
        onclick:function(){ irASemana(iso(lunesDe(new Date()))); }})
    ]));

    // El equilibrio ocupaba cinco líneas de contadores aunque estuviera todo bien.
    // Plegado resume en una lo que falla, que es lo único que hay que mirar casi
    // siempre, y se despliega entero cuando quieres el detalle.
    PERFILES.forEach(function(pf){ p.appendChild(bloqueEquilibrio(pf)); });

    p.appendChild(el("div", {class:"week", id:"week"}));
    p.appendChild(el("div", {class:"legend", id:"legend"}));
  }

  // Uno por menú, y los dos a la vista. Plegado, cada uno resume en una línea lo
  // que le falla; abierto, enseña sus contadores. El del niño importa tanto como
  // el otro: su semana ya no sale de la de la mesa, se hace aparte.
  function bloqueEquilibrio(pf){
    const plegable = el("details", {class:"balance", id:"balance-" + pf.id}, [
      el("summary", {class:"balance-cab"}, [
        el("span", {class:"bal-tit", text:"Equilibrio " + (pf.casa ? "adulto" : "niño")}),
        el("span", {class:"bal-eco", id:"bal-eco-" + pf.id, text:"—"}),
        el("span", {class:"bal-chevron", "aria-hidden":"true", text:"⌄"})
      ]),
      el("p", {text:"Veces que aparece cada grupo en " +
                    (pf.casa ? "la mesa de casa" : "la semana del niño, la guardería incluida") +
                    ", frente al objetivo semanal."}),
      el("div", {class:"meters", id:"meters-" + pf.id}),
      // Los objetivos se editaban aquí dentro, y estando bajo la semana abierta
      // parecían suyos. Son los mismos para todas, así que viven en Configuración
      // y aquí queda el camino hasta ellos.
      el("p", {class:"bal-pie"}, [
        document.createTextNode("Los objetivos son los mismos para todas las semanas. "),
        el("button", {class:"btn btn-sm", text:"Ajustarlos en Configuración",
                      onclick:function(){ verTab("historico"); }})
      ])
    ]);
    plegable.open = !!(estado.equilibrioAbierto || {})[pf.id];
    plegable.addEventListener("toggle", function(){
      if(!estado.equilibrioAbierto || typeof estado.equilibrioAbierto !== "object"){
        estado.equilibrioAbierto = {};
      }
      estado.equilibrioAbierto[pf.id] = plegable.open;
      guardarPreferencias();
    });
    return plegable;
  }

  // Los objetivos son "veces por semana", así que cuentan comidas y no platos:
  // una comida con lentejas y pollo cuenta una vez en legumbres y una en carne.
  //
  // Se mide por menú. Los objetivos son los mismos para los dos — lo que come un
  // niño de tres años en una semana no es otra cosa que lo que coman sus padres,
  // en menor cantidad — pero las dos semanas no son la misma, sobre todo desde
  // que lo de la guardería se carga y no se deriva. Lo que come allí cuenta: si
  // le dan legumbre dos veces, en casa toca menos.
  function cuentaEquilibrio(pid, id){
    const h = huecos(pid, id), metas = objetivos(), c = {};
    metas.forEach(function(o){ c[o.n] = 0; });
    slotsDe().forEach(function(slot){
      const dentro = platosDe(pid, h, slot);
      if(!dentro.length) return;
      metas.forEach(function(o){
        if(dentro.some(function(p){ return cumple(p, o); })) c[o.n]++;
      });
    });
    return c;
  }

  // Lo que falla, en corto: "Fruta −4 · Lácteos −3". Un número negativo es lo que
  // falta para el mínimo; uno positivo, lo que sobra del máximo.
  function fueraDeRango(pid, id){
    const c = cuentaEquilibrio(pid, id), falla = [];
    objetivos().forEach(function(o){
      if(c[o.n] < o.min) falla.push(o.n + " −" + (o.min - c[o.n]));
      else if(c[o.n] > o.max) falla.push(o.n + " +" + (c[o.n] - o.max));
    });
    return falla;
  }

  // Cómo ha quedado el equilibrio de ese menú, en corto. Es lo único que de
  // verdad se quiere saber después de generar.
  function resumenEquilibrio(pid, id){
    const falla = fueraDeRango(pid, id);
    return falla.length ? "fuera de rango: " + falla.join(" · ") : "equilibrio en su sitio";
  }

  // El resumen habla de los dos menús, porque los dos se comen. Los medidores
  // enseñan uno cada vez: treinta y cuatro contadores a la vez no los lee nadie.
  function pintarEquilibrio(id){
    PERFILES.forEach(function(pf){ pintarUnEquilibrio(pf, id); });
  }

  function pintarUnEquilibrio(pf, id){
    const metas = objetivos();
    const falla = fueraDeRango(pf.id, id);

    const eco = $("bal-eco-" + pf.id);
    if(eco){
      eco.textContent = falla.length ? falla.join(" \u00b7 ") : "todo en su sitio";
      eco.className = "bal-eco" + (falla.length ? " mal" : " bien");
      eco.title = falla.length
        ? falla.length + (falla.length === 1 ? " grupo fuera de rango" : " grupos fuera de rango")
        : "Los diecisiete objetivos, dentro de rango";
    }

    const cuenta = cuentaEquilibrio(pf.id, id);
    const metros = $("meters-" + pf.id);
    if(!metros) return;
    metros.textContent = "";
    metas.forEach(function(o){
      const c = cuenta[o.n], corto = c < o.min, pasado = c > o.max;
      metros.appendChild(el("div", {
        class:"meter " + (corto || pasado ? "fuera" : "ok"),
        title: corto ? "Faltan " + (o.min - c) : (pasado ? "Se pasa en " + (c - o.max) : "Dentro del objetivo")
      }, [
        el("span", {class:"swatch", style:"background:" + colorDe(claveDe(o.tipos[0]))}),
        el("span", {class:"lbl", text:o.n}),
        el("span", {class:"val", text:String(c)}),
        corto ? el("span", {class:"flecha", text:"\u2193"}) : (pasado ? el("span", {class:"flecha", text:"\u2191"}) : null),
        el("span", {class:"rng", text:"/ " + o.min + "\u2013" + o.max})
      ]));
    });
  }

  function pintarObjetivos(){
    const cont = $("obj-grid");
    if(!cont) return;
    cont.textContent = "";

    const pie = $("obj-foot");
    if(pie){
      pie.textContent = "";
      pie.appendChild(el("button", {class:"btn btn-sm", text:"Volver a los valores del documento",
        onclick:function(){
          estado.objetivos = {}; guardar(); pintarObjetivos(); pintarSemana();
          aviso("Objetivos restablecidos");
        }}));
      pie.appendChild(el("span", {class:"hint",
        text: objetivosTocados() ? "Hay objetivos cambiados a mano."
                                 : "Ahora mismo son los del documento, sin tocar."}));
    }
    objetivos().forEach(function(o){
      const id = o.n.replace(/[^a-z0-9]+/gi, "-");
      const min = el("input", {type:"number", min:"0", max:"35", value:String(o.min),
                               id:"obj-min-" + id, "aria-label":"Mínimo de " + o.n});
      const max = el("input", {type:"number", min:"0", max:"35", value:String(o.max),
                               id:"obj-max-" + id, "aria-label":"Máximo de " + o.n});
      function cambiaObj(){
        let a = Math.max(0, Math.min(35, Number(min.value) || 0));
        let b = Math.max(0, Math.min(35, Number(max.value) || 0));
        if(b < a) b = a;
        min.value = String(a); max.value = String(b);
        estado.objetivos[o.n] = {min:a, max:b};
        guardar(); pintarObjetivos(); pintarSemana();
      }
      min.addEventListener("change", cambiaObj);
      max.addEventListener("change", cambiaObj);
      cont.appendChild(el("div", {class:"obj-row", title:"Cuenta: " + o.tipos.join(", ")}, [
        el("span", {class:"swatch", style:"background:" + colorDe(claveDe(o.tipos[0]))}),
        el("span", {class:"name", text:o.n}),
        min, el("span", {class:"sep", text:"–"}), max
      ]));
    });
  }

  function semanaActual(){
    if(!estado.semana) estado.semana = iso(lunesDe(new Date()));
    return estado.semana;
  }
  function irASemana(id){
    estado.semana = id;
    // Las reglas se aplican al abrir la semana, no en cada repintado: así
    // "Vaciar" vacía de verdad y no se te vuelven a colar solas.
    const n = aplicarReglas(id);
    guardar(); pintarTodo();
    if(n) aviso(n + (n === 1 ? " plato puesto" : " platos puestos") + " por tus reglas del día a día");
  }

  function pintarSemana(){
    const id = semanaActual(), lunes = desdeIso(id);
    const hoy = iso(new Date()), hoyId = iso(lunesDe(new Date()));
    const h = huecos("adultos", id), hn = huecos("nino", id);

    const etiqueta = $("wk-label");
    etiqueta.textContent = etiquetaSemana(lunes);
    // Para la hoja impresa, que no lleva la barra de navegación de semanas.
    $("panel-semana").setAttribute("data-semana", "Menú semanal · " + etiquetaSemana(lunes));
    if(id === hoyId) etiqueta.appendChild(el("span", {class:"now", text:"esta semana"}));

    pintarEquilibrio(id);

    const cont = $("week"); cont.textContent = "";
    DIAS.forEach(function(dia, idx){
      const fecha = sumaDias(lunes, idx);
      const card = el("article", {class:"day" + (iso(fecha) === hoy ? " hoy" : "")}, [
        el("header", null, [
          el("h3", {text:dia}),
          el("span", {class:"dnum", text:fecha.getDate() + " " + MESES_CORTOS[fecha.getMonth()]})
        ])
      ]);

      MOMENTOS.forEach(function(mo){
        const momento = mo.id, slot = dia + "|" + momento;
        card.appendChild(el("div", {class:"momento-head " + momento, text:mo.lbl}));

        // Se enseña lo que hay y una línea más para lo siguiente: ni un hueco
        // vacío de más, pero sin cerrar el paso al tercero.
        const tope = PLATOS_POR_COMIDA;
        let vistos = 0, ofrecido = false;
        ordenesDe().forEach(function(o){
          const clave = slot + "|" + o;
          const p = h[clave] ? platoEnSemana("adultos", h[clave]) : null;
          const ajeno = !!(p && !(p.menus && p.menus.adultos));
          const roto = !!(h[clave] && !p);

          if(!p && !h[clave]){
            // Una sola línea de "añadir", la del hueco siguiente al último puesto:
            // ofrecer a la vez el 2º y el 3º sería justo el ruido que se quiere evitar.
            if(ofrecido || vistos !== Number(o) - 1 || Number(o) > tope) return;
            ofrecido = true;
            card.appendChild(el("button", {
              type:"button", class:"slot-add",
              "aria-label":"Añadir " + (o === "1" ? "plato" : ORDEN_LBL[o] + " plato") +
                           " de adulto " + deMomento(momento) + " del " + dia,
              onclick:function(){ abrirSelector("adultos", dia, momento, o); }
            }, [
              el("span", {class:"orden", text:ORDEN_LBL[o]}),
              el("span", {text: o === "1" ? "Añadir plato adulto"
                                          : "Añadir " + ORDEN_LBL[o] + " plato adulto"})
            ]));
            return;
          }
          vistos++;

          const cuerpo = [el("div", {class:"slot-dish", text: p ? p.n : (h[clave] || "Sin asignar")})];
          // Solo el nombre: los tipos ya los dice el color del hueco y la leyenda
          // de abajo, y repetirlos en texto comía la mitad del alto de cada día.
          if(p && ajeno){
            cuerpo.push(el("div", {class:"slot-meta"}, [
              el("span", {class:"marca-ajeno", text:"fuera de este menú"})
            ]));
          }else if(roto){
            cuerpo.push(el("div", {class:"slot-meta"}, [
              el("span", {class:"marca-ajeno", text:"este plato ya no existe"})
            ]));
          }

          card.appendChild(el("div", {class:"slot" + (p ? " g-" + base(p) : (roto ? " roto" : " empty")) +
                                             (ajeno ? " ajeno" : "") +
                                             (paraComprar(id, "adultos", clave) ? "" : " sin-compra")}, [
            checkCompra(id, "adultos", clave, p ? p.n : null),
            el("button", {
              type:"button", class:"slot-main",
              "aria-label": ORDEN_LBL[o] + " plato " + deMomento(momento) + " del " + dia +
                            ": " + (p ? p.n : "sin asignar") + ". Pulsa para cambiarlo.",
              title: p ? tipoTexto(p) : null,
              onclick:function(){ abrirSelector("adultos", dia, momento, o); }
            }, [
              el("span", {class:"orden", text:ORDEN_LBL[o]}),
              el("div", {class:"cuerpo"}, cuerpo)
            ])
          ]));
        });
        card.appendChild(bloqueNino(id, dia, momento, h, hn));
      });
      cont.appendChild(card);
    });

    const ley = $("legend"); ley.textContent = "";
    const bases = [];
    clavesDe().forEach(function(k){
      const p = h[k] && platoEnSemana("adultos", h[k]);
      const t = p ? tiposDe(p)[0] : null;
      if(t && bases.indexOf(t) === -1) bases.push(t);
    });
    bases.sort(function(a, b){ return TIPOS.indexOf(a) - TIPOS.indexOf(b); }).forEach(function(t){
      ley.appendChild(el("span", {class:"lg"}, [
        el("span", {class:"sw", style:"background:" + colorDe(claveDe(t))}),
        el("span", {text:t})
      ]));
    });

    $("n-semana").textContent = llenos("adultos", id) + "/" + slotsDe().length;

  }

  // La casilla de "esto hay que comprarlo". Nace marcada y casi nunca se toca:
  // solo para lo que come en la guardería y para lo que ya está en la nevera.
  // Va en cada plato porque dentro de una comida puede haber de los dos.
  function checkCompra(id, pid, clave, nombre){
    const cb = el("input", {type:"checkbox", class:"compra-check",
      id:"c-" + pid + "-" + sinTildes(clave).replace(/[^a-z0-9]+/g, "-")});
    cb.checked = paraComprar(id, pid, clave);
    cb.title = nombre ? "Comprar lo de «" + nombre + "». Quítalo si no hay que traerlo: " +
                        "la guardería, o lo que ya tengas en la nevera."
                      : "Comprar los ingredientes de este plato";
    cb.setAttribute("aria-label", "Comprar los ingredientes de " + (nombre || "este plato"));
    cb.addEventListener("click", function(e){ e.stopPropagation(); });
    cb.addEventListener("change", function(){
      marcarCompra(id, pid, clave, cb.checked);
      // El mismo plato en la misma comida y en el otro menú es el mismo plato
      // encima de la mesa: comprarlo por uno y no por el otro no significa nada.
      const otro = otroPerfil(pid);
      if(huecos(otro, id)[clave] && huecos(otro, id)[clave] === huecos(pid, id)[clave]){
        marcarCompra(id, otro, clave, cb.checked);
      }
      pintarTodo();
    });
    return cb;
  }

  // Lo del niño va junto, debajo de los platos de ese momento. Mientras coma lo
  // mismo que en la mesa solo hay un botón; en cuanto le pones un plato suyo, el
  // momento pasa a ser suyo y el botón reaparece para el siguiente, hasta llenar
  // los huecos que ese momento admite — uno en el almuerzo, dos en los demás.
  function bloqueNino(id, dia, momento, h, hn){
    const slot = dia + "|" + momento, ords = ordenesDe();
    // Mientras no haya nada suyo, el niño come lo de la mesa y no se desglosa.
    const propio = ords.some(function(o){
      return (hn[slot + "|" + o] || "") !== (h[slot + "|" + o] || "");
    });
    const suyos = propio ? ords.filter(function(o){ return !!hn[slot + "|" + o]; }) : [];
    const caja = el("div", {class:"nino-bloque" + (propio ? " propio" : "")});

    // Su primera línea solo aparece cuando en la mesa hay algo: sin plato de
    // adulto no hay nada de lo que diferenciarse.
    if(!h[slot + "|1"] && !suyos.length) return caja;

    suyos.forEach(function(o){
      const crudo = hn[slot + "|" + o], p = platoEnSemana("nino", crudo);
      caja.appendChild(el("div", {class:"nino-row" +
                                         (paraComprar(id, "nino", slot + "|" + o) ? "" : " sin-compra")}, [
        checkCompra(id, "nino", slot + "|" + o, p ? p.n : crudo),
        el("span", {class:"etq", text:"niño"}),
        el("span", {class:"ord", text:ORDEN_LBL[o]}),
        el("button", {type:"button", class:"nino-plato" + (!p ? " roto" : ""),
          text: p ? p.n : crudo,
          title: p ? tipoTexto(p) : "Este plato ya no está en el repertorio",
          onclick:function(){ abrirSelector("nino", dia, momento, o); }}),
        el("button", {type:"button", class:"nino-quita", text:"×",
          title: suyos.length > 1 ? "Quitar este plato del niño"
                                  : "Quitar: vuelve a comer lo mismo que en la mesa",
          "aria-label":"Quitar el " + ORDEN_LBL[o] + " plato del niño " + deMomento(momento) + " del " + dia,
          onclick:function(){ quitaNino(id, slot, o); }})
      ]));
    });

    // Y una línea más para el siguiente, hasta llegar a los tres.
    if(suyos.length < PLATOS_POR_COMIDA){
      const siguiente = String(suyos.length + 1);
      caja.appendChild(el("button", {type:"button", class:"nino-add",
        text: propio ? "Añadir " + ORDEN_LBL[siguiente] + " plato niño" : "Añadir plato niño",
        title: propio ? "El niño come " + (suyos.length + 1) + " platos " + deMomento(momento)
                      : "Que el niño coma algo distinto " + deMomento(momento),
        onclick:function(){ nuevoPlatoNino(id, dia, momento, propio ? null : "1"); }}));
    }
    return caja;
  }

  // Abre el selector para el siguiente hueco libre del niño. Si hasta ahora comía
  // lo mismo que en la mesa, el plato que elijas no se suma a lo que había: pasa
  // a ser lo único que come, y el segundo lo añades tú si quieres.
  function nuevoPlatoNino(id, dia, momento, primero){
    const slot = dia + "|" + momento, hn = huecos("nino", id);
    const orden = primero || (ordenesDe().filter(function(o){ return !hn[slot + "|" + o]; })[0]);
    if(!orden) return;
    abrirSelector("nino", dia, momento, orden, {soloEste: !!primero});
  }

  // Quita un plato del niño. Si era el último, el momento vuelve a lo de la mesa.
  function quitaNino(id, slot, orden){
    const hn = huecos("nino", id), copia = {}, mom = slot.split("|")[1], ords = ordenesDe();
    Object.keys(hn).forEach(function(k){ copia[k] = hn[k]; });
    delete copia[slot + "|" + orden];

    // Si queda el segundo suelto, sube a primero: no hay platos huérfanos.
    const quedan = ords.map(function(o){ return copia[slot + "|" + o]; }).filter(Boolean);
    ords.forEach(function(o, i){
      if(quedan[i]) copia[slot + "|" + o] = quedan[i]; else delete copia[slot + "|" + o];
    });

    let aviso2 = "";
    if(!quedan.length){
      const casa = huecos("adultos", id);
      ords.forEach(function(o){
        const x = espejo(casa[slot + "|" + o], mom, "nino");
        if(x) copia[slot + "|" + o] = x;
      });
      const p1 = copia[slot + "|1"] ? plato("nino", copia[slot + "|1"]) : null;
      if((p1 && p1.unico) || copia[slot + "|2"] === copia[slot + "|1"]) delete copia[slot + "|2"];
      const enMesa = casa[slot + "|1"] || "";
      if(enMesa && copia[slot + "|1"] !== enMesa){
        aviso2 = "«" + enMesa + "» no está en el menú del niño: le queda " +
                 (copia[slot + "|1"] ? "«" + copia[slot + "|1"] + "»" : "el hueco vacío") +
                 ". Marca su casilla en Platos si también puede comerlo.";
      }
    }
    fijarHuecos("nino", id, copia);
    pintarTodo();
    if(aviso2) aviso(aviso2);
  }

  // De qué tipo suele ser un ingrediente, mirando los platos que ya lo usan. Si
  // "merluza" solo sale en platos de pescado blanco, el tipo está claro; si es
  // "aceite de oliva", que sale en diecisiete platos de todo, no dice nada y se
  // calla. No hace falta ninguna tabla nueva: lo aprende del propio repertorio.
  // La despensa es el cajón de sastre: lo que no es fresco ni se congela suele
  // acabar ahí, así que es la apuesta menos mala cuando no hay nada mejor.
  function seccionPorDefecto(){
    return SECCIONES.indexOf("Despensa") !== -1 ? "Despensa" : (SECCIONES[0] || "");
  }

  // De qué sección es algo que aún no está en el catálogo, mirando a los que sí.
  // "puerro ecológico" comparte palabra con "puerro", que está en la frutería, y
  // acertar la mayoría de las veces ahorra el desplegable casi siempre.
  function seccionProbable(nombre){
    const mias = palabrasDe(nombre);
    if(!mias.length) return "";
    let mejor = "", cuantas = 0;
    ingredientes().forEach(function(x){
      const suyas = palabrasDe(x.n);
      const comun = mias.filter(function(w){ return suyas.indexOf(w) !== -1; }).length;
      // Empatar con uno más corto es mejor señal: "puerro" dice más que
      // "crema de puerro y calabaza" sobre dónde está el puerro en la tienda.
      if(comun > cuantas || (comun && comun === cuantas && suyas.length < mias.length)){
        cuantas = comun; mejor = x.seccion;
      }
    });
    return cuantas ? mejor : "";
  }

  function tiposProbables(ings){
    const todos = repertorio(), voto = {};
    // Cada cuánto sale cada tipo en el recetario entero. Sirve de vara de medir:
    // que un ingrediente vaya con "Verdura", que está en un tercio de los platos,
    // no dice nada; que vaya con "Pescado azul", que está en el cinco por ciento,
    // lo dice todo. Sin esto, un ingrediente con un solo plato proponía los
    // cuatro tipos de ese plato como si los cuatro fueran seguros.
    const base = {};
    TIPOS.forEach(function(t){
      base[t] = todos.filter(function(p){ return tiposDe(p).indexOf(t) !== -1; }).length /
                Math.max(1, todos.length);
    });
    ings.forEach(function(ing){
      const usan = todos.filter(function(p){ return p.i.indexOf(ing) !== -1; });
      // Un ingrediente que sale en medio recetario no dice de qué es el plato.
      // El aceite de oliva está en diecisiete, y arrastraba verdura y tubérculo
      // a todo lo que se diera de alta. Solo opinan los específicos.
      if(!usan.length || usan.length > 5) return;
      const cuenta = {};
      usan.forEach(function(p){
        tiposDe(p).forEach(function(t){ cuenta[t] = (cuenta[t] || 0) + 1; });
      });
      Object.keys(cuenta).forEach(function(t){
        // Y solo si ese tipo acompaña al ingrediente en la mayoría de sus platos:
        // con menos de dos tercios es casualidad, no una pista.
        const prop = cuenta[t] / usan.length;
        if(prop >= 0.66 && prop >= (base[t] || 0) * 3) voto[t] = (voto[t] || 0) + 1;
      });
    });
    // Como mucho tres: una propuesta larga se tarda más en corregir que en hacer.
    return TIPOS.filter(function(t){ return voto[t]; })
                .sort(function(a, b){ return voto[b] - voto[a]; })
                .slice(0, 3);
  }

  // "Sopa de sobre con pollo; sopa, caldo de pollo" -> nombre e ingredientes.
  function leerAlta(texto){
    const partes = String(texto || "").split(";");
    const n = (partes[0] || "").trim();
    const i = (partes.slice(1).join(";") || "").split(",")
      .map(function(x){ return x.trim(); }).filter(Boolean);
    return {n:n, i:i};
  }

  /* ============ Selector de plato ============ */
  let capa = null;
  function cerrarSelector(){
    if(capa){ cerrarCapa(capa); capa = null; }
  }

  function abrirSelector(pid, dia, momento, orden, opciones){
    cerrarSelector();
    const id = semanaActual(), h = {}, origen = huecos(pid, id);
    Object.keys(origen).forEach(function(k){ h[k] = origen[k]; });
    const clave = dia + "|" + momento + "|" + orden;
    // Los demás platos de esa misma comida, para no ofrecer dos veces el mismo.
    const yaEnLaComida = ordenesDe().filter(function(o){ return o !== orden; })
      .map(function(o){ return h[dia + "|" + momento + "|" + o]; }).filter(Boolean);
    const previo = origen[clave] || "";
    // Cambiar un plato de la mesa arrastra al niño, salvo que ahí tuviera lo suyo.
    const arrastra = function(nuevo){ if(pid === "nino") sigueAdulto(id, clave, previo, nuevo); };
    // Estrenar los platos propios del niño: lo elegido sustituye a todo el momento.
    const soloEste = !!(opciones && opciones.soloEste);
    const limpia = function(){
      if(!soloEste) return;
      ordenesDe().forEach(function(o){
        if(o !== orden) delete h[dia + "|" + momento + "|" + o];
      });
    };

    const buscar = el("input", {type:"search", id:"picker-buscar",
                                placeholder:"Buscar, o «Nombre del plato; ingrediente, ingrediente»"});
    const lst = el("div", {class:"picker-list"});
    const pieAlta = el("div", {class:"picker-alta"});

    // Por defecto solo se ofrece lo que se come en ese momento: en una cena no
    // pintan nada los desayunos. La casilla abre la puerta a los demás para el
    // día que quieras merendar un plato de cena, sin tener que editarlo antes.
    const verTodos = el("input", {type:"checkbox", id:"picker-todos"});
    const cuantosFuera = el("span", {class:"om"});
    verTodos.addEventListener("change", function(){ pinta(); });
    const filtroMom = el("label", {class:"picker-filtro", for:"picker-todos"}, [
      verTodos,
      el("span", {text:"Ver también los platos de otros momentos"}),
      cuantosFuera
    ]);

    function pinta(){
      const q = sinTildes(buscar.value.trim()), usados = {};
      Object.keys(h).forEach(function(k){ if(h[k]) usados[h[k]] = 1; });

      // El plato que ya ocupa el hueco se enseña siempre, aunque sea de otro
      // momento: si no, desaparecería del selector en cuanto le cambiaras los suyos.
      const puesto = h[clave] || "";
      function propio(p){ return elegible(p, momento) || p.n === puesto; }

      const buscados = repertorio()
        .filter(function(p){ return yaEnLaComida.indexOf(p.n) === -1; })
        .filter(function(p){ return !q || sinTildes(p.n + " " + p.i.join(" ")).indexOf(q) !== -1; });
      const fuera = buscados.filter(function(p){ return !propio(p); });
      const coinciden = verTodos.checked ? buscados : buscados.filter(propio);
      const aqui = coinciden.filter(function(p){ return p.menus && p.menus[pid]; });
      const otros = coinciden.filter(function(p){ return !(p.menus && p.menus[pid]); });

      cuantosFuera.textContent = fuera.length ? "(" + fuera.length + ")" : "";
      filtroMom.hidden = !fuera.length && !verTodos.checked;

      function opcion(p, ajeno){
        const repetido = usados[p.n] && h[clave] !== p.n;
        const deAqui = elegible(p, momento);
        const rec = !ajeno && deAqui && (orden === "1" || !p.unico);
        const notas = [tipoTexto(p), p.unico ? "plato único" : "necesita acompañante"];
        if(!deAqui) notas.push("es de " + momentoTexto(p).toLowerCase());
        if(repetido) notas.push("ya está esta semana");
        if(ajeno) notas.push("se añadirá al menú " + perfil(pid).quien);
        return el("button", {
          type:"button", class:"opt" + (rec ? " rec" : "") + (repetido ? " used" : "") + (ajeno ? " ajeno" : ""),
          onclick:function(){
            // Si viene del otro menú, entra en este antes de ocupar el hueco.
            if(ajeno) marcarMenu(p, pid, true);
            limpia();
            h[clave] = p.n; fijarHuecos(pid, id, h); arrastra(p.n);
            cerrarSelector(); pintarTodo();
          }
        }, [
          el("span", {class:"sw", style:"background:" + colorDe(base(p))}),
          el("div", null, [
            el("div", {class:"on", text:p.n}),
            el("div", {class:"om", text:notas.join(" · ")})
          ])
        ]);
      }

      lst.textContent = "";
      aqui.sort(function(a, b){
        const ra = (elegible(a, momento) ? 2 : 0) + (orden === "1" || !a.unico ? 1 : 0);
        const rb = (elegible(b, momento) ? 2 : 0) + (orden === "1" || !b.unico ? 1 : 0);
        return (rb - ra) || a.n.localeCompare(b.n, "es");
      }).forEach(function(p){ lst.appendChild(opcion(p, false)); });

      if(otros.length){
        lst.appendChild(el("div", {class:"opt-sep",
          text:"En el menú " + perfil(otroPerfil(pid)).quien + " · pulsa para traerlo también a este"}));
        otros.sort(function(a, b){
          const ra = elegible(a, momento) ? 1 : 0, rb = elegible(b, momento) ? 1 : 0;
          return (rb - ra) || a.n.localeCompare(b.n, "es");
        }).forEach(function(p){ lst.appendChild(opcion(p, true)); });
      }
      if(!coinciden.length){
        const nada = fuera.length
          ? "Ningún plato de " + MOMENTO_LBL[momento].toLowerCase() + " coincide, pero sí " +
            fuera.length + " de otros momentos. Márcalos arriba para verlos."
          : "Ningún plato del repertorio coincide.";
        lst.appendChild(el("div", {style:"padding:22px 16px 6px;color:var(--ink-3)", text:nada}));
      }

      // Lo escrito sirve para dar de alta el plato que falta, sin salir de aquí.
      const alta = leerAlta(buscar.value);
      const existe = alta.n && !!platoPorNombre(alta.n);
      pieAlta.textContent = "";
      if(alta.n && !existe){
        const resumen = alta.i.length
          ? alta.n + " · " + alta.i.length + (alta.i.length === 1 ? " ingrediente" : " ingredientes")
          : alta.n + " · sin ingredientes";
        pieAlta.appendChild(el("div", {class:"alta-eco", text:resumen}));
        pieAlta.appendChild(el("button", {class:"btn btn-primary", text:"Crear plato",
          onclick:function(){ crearDesdeSelector(pid, dia, momento, orden, buscar.value, lst, pieAlta); }}));
      }else{
        pieAlta.appendChild(el("div", {class:"alta-pista", text:
          "¿No está? Escríbelo aquí arriba como «Nombre del plato; ingrediente, ingrediente» y podrás crearlo."}));
      }
    }
    buscar.addEventListener("input", pinta);
    pinta();

    const caja = el("div", {class:"picker", role:"dialog", "aria-modal":"true",
                            "aria-label":"Elegir plato para " + dia + ", " + MOMENTO_LBL[momento] +
                                         (pid === "nino" ? ", menú del niño" : "")}, [
      el("header", null, [
        el("h3", {text:mayus(dia) + " · " + MOMENTO_LBL[momento] + " · " + ORDEN_LBL[orden] + " plato" +
                       (pid === "nino" ? " · niño" : "")}),
        buscar,
        filtroMom
      ]),
      lst,
      pieAlta,
      el("footer", null, [
        el("button", {class:"btn btn-ghost", text:"Dejar el hueco vacío", onclick:function(){
          delete h[clave]; fijarHuecos(pid, id, h); arrastra("");
          cerrarSelector(); pintarTodo();
        }}),
        el("button", {class:"btn", text:"Cancelar", onclick:cerrarSelector})
      ])
    ]);

    capa = abrirCapa(caja, buscar);
  }

  // Da de alta el plato que acabas de escribir. Si trae ingredientes que no están
  // en el catálogo, primero pregunta en qué sección del súper va cada uno: el
  // catálogo cerrado es lo que evita que convivan "pimiento" y "pimientos".
  function crearDesdeSelector(pid, dia, momento, orden, texto, lst, pieAlta){
    const alta = leerAlta(texto);
    if(!alta.n) return;
    const conocidos = {};
    ingredientes().forEach(function(x){ conocidos[x.n] = 1; });
    const nuevos = alta.i.filter(function(x){ return !conocidos[x]; });

    const seguir = function(){
      const id = semanaActual();
      cerrarSelector();
      abrirEditor(null, ambito("platos"), {
        n: alta.n,
        i: alta.i,
        m: [momento],
        t: tiposProbables(alta.i),
        alGuardar: function(nombre){
          const h = {}, origen = huecos(pid, id);
          Object.keys(origen).forEach(function(k){ h[k] = origen[k]; });
          h[dia + "|" + momento + "|" + orden] = nombre;
          fijarHuecos(pid, id, h);
          guardar(); pintarTodo();
          aviso("«" + nombre + "» creado y puesto " + deMomento(momento) + " del " + dia);
        }
      });
    };

    if(!nuevos.length){ seguir(); return; }

    // Un paso más: la sección de cada ingrediente que no existía.
    const selectores = {};
    const filas = nuevos.map(function(ing){
      const sel = el("select", {"aria-label":"Sección de " + ing});
      SECCIONES.forEach(function(sec){ sel.appendChild(el("option", {value:sec, text:sec})); });
      selectores[ing] = sel;
      return el("div", {class:"nuevo-row"}, [el("span", {class:"nm", text:ing}), sel]);
    });

    lst.textContent = "";
    lst.appendChild(el("div", {style:"padding:16px"}, [
      el("div", {class:"bloque-lbl", style:"margin-bottom:8px",
                 text: nuevos.length === 1 ? "Este ingrediente no está en el catálogo"
                                           : "Estos ingredientes no están en el catálogo"}),
      el("p", {class:"hint", style:"margin-bottom:10px",
               text:"Dime en qué parte del súper van y los añado al catálogo."})
    ].concat(filas)));
    pieAlta.textContent = "";
    pieAlta.appendChild(el("button", {class:"btn btn-primary", text:"Añadirlos y seguir",
      onclick:function(){
        nuevos.forEach(function(ing){
          estado.ing.extra.push({n:ing, seccion:selectores[ing].value});
        });
        guardar();
        seguir();
      }}));
  }

  /* ============ Editor de platos  /* ============ Editor de platos ============ */
  let capaEditor = null;
  function cerrarEditor(){
    if(capaEditor){ cerrarCapa(capaEditor); capaEditor = null; }
  }

  function campo(etiqueta, control, ancho){
    return el("div", {class:"field" + (ancho ? " full" : "")}, [
      el("label", {for:control.id, text:etiqueta}), control
    ]);
  }
  function selectDe(id, opciones, valor){
    const s = el("select", {id:id});
    opciones.forEach(function(o){
      s.appendChild(el("option", {value:o, text:mayus(o), selected: o === valor ? "selected" : null}));
    });
    return s;
  }

  // ref: null para crear, {tipo:"base", orig} o {tipo:"extra", uid} para editar.
  // "a" es la pestaña desde la que se abre: decide el momento por defecto.
  // "a" es la pestaña desde la que se abre (decide los momentos por defecto).
  // "ini" trae valores de partida y un aviso para cuando se guarde, que es lo que
  // usa el alta rápida desde el selector de la semana.
  // ini.enVezDeGuardar convierte el editor en un formulario a secas: valida y
  // devuelve los campos en vez de tocar el repertorio. Lo usa el cargador de la
  // guardería, donde los platos se revisan antes de existir. Reutilizarlo entero
  // importa: un segundo editor parecido pero distinto acaba divergiendo, y los
  // tipos, los momentos y el buscador de ingredientes ya están resueltos aquí.
  function abrirEditor(ref, a, ini){
    cerrarEditor();
    ini = ini || {};
    const nuevo = !ref;
    const suelto = !!ini.enVezDeGuardar;
    let p = null;
    if(ref && ref.tipo === "base") p = repertorio().filter(function(x){ return x.orig === ref.orig; })[0];
    else if(ref && ref.tipo === "extra") p = estado.platos.extra.filter(function(x){ return x.uid === ref.uid; })[0];
    if(!nuevo && !p){ aviso("Ese plato ya no existe"); return; }
    const nombreAntes = p ? p.n : "";

    const eNombre = el("input", {type:"text", id:"e-nombre", value: p ? p.n : (ini.n || ""), placeholder:"Merluza al horno con patata"});
    const eDesc   = el("input", {type:"text", id:"e-desc", value: p ? p.d : (ini.d || ""), placeholder:"Lomos de merluza con patata y cebolla."});
    const tActuales = p ? tiposDe(p) : (ini.t || []);
    const tGrid = el("div", {class:"tipos-grid"});
    TIPOS.forEach(function(t){
      const slug = t.replace(/[^a-z0-9]+/gi, "-");
      const cb = el("input", {type:"checkbox", id:"e-t-" + slug, "aria-label":"Es " + t});
      cb.checked = tActuales.indexOf(t) !== -1;
      cb.dataset.tipo = t;
      const rd = el("input", {type:"radio", name:"e-base", id:"e-b-" + slug, value:t,
                              "aria-label":t + " es la base"});
      rd.checked = tActuales.length > 0 && tActuales[0] === t;
      rd.dataset.tipo = t;
      cb.addEventListener("change", function(){ if(!cb.checked && rd.checked) rd.checked = false; });
      rd.addEventListener("change", function(){ if(rd.checked) cb.checked = true; });
      tGrid.appendChild(el("label", {class:"tipo-row"}, [
        cb, rd,
        el("span", {class:"sw", style:"background:" + colorDe(claveDe(t))}),
        el("span", {class:"nm", text:t})
      ]));
    });
    // El momento es una lista: un bizcocho vale para desayunar y para merendar.
    // Un plato nuevo nace con los momentos que tengas filtrados: si estabas
    // mirando desayunos, lo normal es que vayas a dar de alta un desayuno.
    const porDefecto = (MOMS_VISTOS.length && MOMS_VISTOS.length < IDS_MOMENTO.length)
                       ? MOMS_VISTOS.slice() : ["comida"];
    const mActuales = p ? momentosDe(p) : (ini.m || porDefecto);
    const momGrid = el("div", {class:"tipos-grid"});
    MOMENTOS.forEach(function(mo){
      const cb = el("input", {type:"checkbox", id:"e-m-" + mo.id, "aria-label":"Se come " + deMomento(mo.id)});
      cb.checked = mActuales.indexOf(mo.id) !== -1;
      cb.dataset.momento = mo.id;
      momGrid.appendChild(el("label", {class:"tipo-row"}, [
        cb,
        el("span", {class:"sw", style:"background:var(--m-" + mo.id + ")"}),
        el("span", {class:"nm", text:mo.lbl})
      ]));
    });
    const eMenus = {};
    const menusGrid = el("div", {class:"menus-grid"});
    PERFILES.forEach(function(pf){
      const cb = el("input", {type:"checkbox", id:"e-menu-" + pf.id, "aria-label":"Entra en el menú " + pf.quien});
      cb.checked = p ? !!(p.menus && p.menus[pf.id])
                     : (ini.menus ? !!ini.menus[pf.id] : true);
      eMenus[pf.id] = cb;
      menusGrid.appendChild(el("label", {class:"tipo-row"}, [cb, el("span", {class:"nm", text:pf.lbl})]));
    });
    const eTiempo = selectDe("e-tiempo", ["bajo","medio","alto"], p ? p.tiempo : (ini.tiempo || "medio"));
    const eRep    = selectDe("e-repeticion", ["siempre","alta","media","baja","ocasional","nunca"],
                             p ? p.rep : (ini.rep || "media"));
    const unicoIni = p ? !!p.unico : !!ini.unico;
    const eUnico  = el("select", {id:"e-unico"}, [
      el("option", {value:"si", text:"Sí, basta él solo", selected: unicoIni ? "selected" : null}),
      el("option", {value:"no", text:"No, lleva acompañante", selected: !unicoIni ? "selected" : null})
    ]);


    // Los ingredientes salen del catálogo: aquí se buscan, no se escriben.
    let elegidos = p ? p.i.slice() : (ini.i ? ini.i.slice() : []);
    const chips = el("div", {class:"ing-chips"});
    const eIngs = el("input", {type:"text", id:"e-ings", autocomplete:"off", role:"combobox",
                               "aria-autocomplete":"list", "aria-expanded":"false",
                               placeholder:"Escribe para buscar en el catálogo…"});
    const panel = el("div", {class:"combo-lista", hidden:"hidden", role:"listbox"});
    const avisoIng = el("div", {class:"hint"});
    // Mandar a otra pestaña a por un ingrediente, con el plato a medio escribir,
    // es perder el plato: se da de alta aquí, que lo único que falta es la sección.
    const altaIng = el("div", {class:"ing-nueva", hidden:"hidden"});
    let activo = -1, visibles = [];

    function pintaChips(){
      chips.textContent = "";
      if(!elegidos.length) chips.appendChild(el("span", {class:"hint", text:"Todavía sin ingredientes."}));
      elegidos.forEach(function(ing){
        chips.appendChild(el("span", {class:"chip chip-ing ing-chip"}, [
          el("span", {text:ing}),
          el("button", {type:"button", class:"quita", "aria-label":"Quitar " + ing, text:"×",
                        onclick:function(){
                          elegidos = elegidos.filter(function(x){ return x !== ing; });
                          pintaChips();
                        }})
        ]));
      });
    }

    function candidatos(){
      const q = sinTildes(eIngs.value.trim());
      // Los que trae el fichero de la guardería aún no están en el catálogo, pero
      // se van a crear con él: en este editor cuentan como si ya estuvieran.
      const hay = {};
      const todos = ingredientes().map(function(x){ hay[x.n] = 1; return x; });
      (ini.ingsExtra || []).forEach(function(x){ if(!hay[x.n]) todos.push(x); });
      return todos
        .filter(function(x){ return elegidos.indexOf(x.n) === -1; })
        .filter(function(x){ return !q || sinTildes(x.n).indexOf(q) !== -1; })
        .sort(function(a, b){
          // Primero los que empiezan por lo escrito, luego el resto.
          const ia = q ? sinTildes(a.n).indexOf(q) : 0, ib = q ? sinTildes(b.n).indexOf(q) : 0;
          return (ia - ib) || a.n.localeCompare(b.n, "es");
        });
    }

    function pintaPanel(){
      visibles = candidatos();
      panel.textContent = "";
      if(!visibles.length){
        const v = eIngs.value.trim();
        panel.appendChild(v
          ? el("button", {type:"button", class:"combo-opt combo-crear",
                          onmousedown:function(e){ e.preventDefault(); ofreceCrear(v); }}, [
              el("span", {class:"cn", text:"Crear «" + v + "»"}),
              el("span", {class:"cs", text:"no está en el catálogo"})
            ])
          : el("div", {class:"combo-vacio", text:"Escribe para buscar en el catálogo."}));
      }
      visibles.slice(0, 60).forEach(function(x, i){
        panel.appendChild(el("button", {
          type:"button", class:"combo-opt" + (i === activo ? " activo" : ""), role:"option",
          "aria-selected": i === activo ? "true" : "false",
          onmousedown:function(e){ e.preventDefault(); elige(x.n); }
        }, [
          el("span", {class:"cn", text:x.n}),
          el("span", {class:"cs", text:x.seccion})
        ]));
      });
      abre();
    }
    function abre(){ panel.hidden = false; eIngs.setAttribute("aria-expanded", "true"); }
    function cierra(){ panel.hidden = true; eIngs.setAttribute("aria-expanded", "false"); activo = -1; }

    function elige(n){
      if(elegidos.indexOf(n) === -1) elegidos.push(n);
      eIngs.value = ""; avisoIng.textContent = ""; altaIng.hidden = true;
      pintaChips(); activo = -1; pintaPanel(); eIngs.focus();
    }

    // No se crea de un clic: falta decir por dónde se pasa a cogerlo, que es lo
    // único que la lista de la compra necesita saber de un ingrediente.
    function ofreceCrear(v){
      cierra();
      altaIng.textContent = "";
      const sel = el("select", {"aria-label":"Sección de " + v});
      SECCIONES.forEach(function(sec){ sel.appendChild(el("option", {value:sec, text:sec})); });
      sel.value = seccionProbable(v) || seccionPorDefecto();
      altaIng.appendChild(el("span", {class:"nm", text:"«" + v + "» es nuevo. ¿En qué parte del súper va?"}));
      altaIng.appendChild(sel);
      altaIng.appendChild(el("button", {type:"button", class:"btn btn-sm btn-primary", text:"Crear y añadir",
        onclick:function(){ creaIng(v, sel.value); }}));
      altaIng.hidden = false;
      avisoIng.textContent = "";
      // El formulario es largo y la fila nace al final: sin esto puede aparecer
      // fuera de la vista y parecer que el botón no ha hecho nada.
      if(altaIng.scrollIntoView) altaIng.scrollIntoView({block:"nearest"});
      sel.focus();
    }

    function creaIng(v, seccion){
      // En el cargador el ingrediente todavía no existe para nadie: va al menú que
      // se está revisando y se creará con él. Fuera de ahí, al catálogo y ya.
      if(ini.alCrearIngrediente) ini.alCrearIngrediente(v, seccion);
      else{ estado.ing.extra.push({n:v, seccion:seccion}); guardar(); }
      elige(v);
      avisoIng.textContent = ini.alCrearIngrediente
        ? "«" + v + "» se creará al cargar el menú, en " + seccion + "."
        : "«" + v + "» añadido al catálogo, en " + seccion + ".";
      avisoIng.style.color = "var(--ink-3)";
    }

    function añadeIng(){
      if(visibles.length){ elige(visibles[activo >= 0 ? activo : 0].n); return; }
      const v = eIngs.value.trim();
      if(!v){
        avisoIng.textContent = "Escribe para buscar un ingrediente.";
        avisoIng.style.color = "var(--pimenton)";
        return;
      }
      ofreceCrear(v);
    }

    eIngs.addEventListener("input", function(){
      activo = -1; avisoIng.textContent = ""; altaIng.hidden = true; pintaPanel();
    });
    eIngs.addEventListener("focus", pintaPanel);
    eIngs.addEventListener("blur", function(){ setTimeout(cierra, 120); });
    eIngs.addEventListener("keydown", function(e){
      if(e.key === "ArrowDown" || e.key === "ArrowUp"){
        e.preventDefault();
        if(panel.hidden) pintaPanel();
        const n = Math.min(visibles.length, 60);
        if(!n) return;
        activo = e.key === "ArrowDown" ? (activo + 1) % n : (activo <= 0 ? n - 1 : activo - 1);
        pintaPanel();
        const op = panel.children[activo];
        if(op && op.scrollIntoView) op.scrollIntoView({block:"nearest"});
      }else if(e.key === "Enter"){
        e.preventDefault(); añadeIng();
      }else if(e.key === "Escape"){
        cierra();
      }
    });
    pintaChips();

    const pie = [];
    if(!nuevo){
      pie.push(el("button", {class:"btn btn-ghost", style:"color:var(--pimenton)", text:"Eliminar", onclick:function(){
        if(!window.confirm("¿Eliminar «" + p.n + "» del repertorio, para los dos menús?\n" +
                           "Se quitará de las semanas en las que esté. Para sacarlo de un solo menú, " +
                           "desmarca su casilla.")) return;
        PERFILES.forEach(function(pf){ reemplazarEnSemanas(pf.id, p.n, null); });
        if(p.custom) estado.platos.extra = estado.platos.extra.filter(function(x){ return x.uid !== p.uid; });
        else{
          if(estado.platos.borrados.indexOf(p.orig) === -1) estado.platos.borrados.push(p.orig);
          delete estado.platos.ediciones[p.orig];
        }
        guardar(); cerrarEditor(); pintarTodo(); aviso("Plato eliminado del repertorio");
      }}));
      if(p.editado){
        pie.push(el("button", {class:"btn btn-ghost", text:"Deshacer cambios", onclick:function(){
          const original = PLATOS.filter(function(x){ return x.orig === p.orig; })[0];
          delete estado.platos.ediciones[p.orig];
          if(original) PERFILES.forEach(function(pf){ reemplazarEnSemanas(pf.id, p.n, original.n); });
          guardar(); cerrarEditor(); pintarTodo();
          aviso("Plato devuelto a lo que dice el CSV");
        }}));
      }
    }
    pie.push(el("div", {class:"der"}, [
      el("button", {class:"btn", text:"Cancelar", onclick:cerrarEditor}),
      el("button", {class:"btn btn-primary",
                    text: suelto ? "Guardar" : (nuevo ? "Añadir al repertorio" : "Guardar cambios"),
                    onclick:function(){
        const n = eNombre.value.trim(), ings = elegidos.slice();
        if(!n){ aviso("Ponle nombre al plato"); eNombre.focus(); return; }
        const choque = platoPorNombre(n);
        if(choque && choque.n !== nombreAntes){
          aviso(suelto ? "Ya tienes un plato llamado así: usándolo te ahorras crear este"
                       : "Ya hay otro plato llamado así");
          eNombre.focus(); return;
        }
        const menus = {adultos:eMenus.adultos.checked, nino:eMenus.nino.checked};
        if(!menus.adultos && !menus.nino){ aviso("Marca al menos un menú"); return; }

        const tiposMarcados = [];
        tGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
          if(cb.checked) tiposMarcados.push(cb.dataset.tipo);
        });
        if(!tiposMarcados.length){ aviso("Marca al menos un tipo de alimento"); return; }

        const momsMarcados = [];
        momGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
          if(cb.checked) momsMarcados.push(cb.dataset.momento);
        });
        if(!momsMarcados.length){ aviso("Marca al menos un momento del día"); return; }
        // El primero de la lista es la base y decide el color.
        const radio = document.querySelector('input[name="e-base"]:checked');
        const baseSel = radio && tiposMarcados.indexOf(radio.value) !== -1 ? radio.value : tiposMarcados[0];
        const tiposOrdenados = [baseSel].concat(tiposMarcados.filter(function(t){ return t !== baseSel; }));

        const campos = {
          n:n, d: eDesc.value.trim() || "Sin descripción.", t: tiposOrdenados,
          m: momsMarcados, tiempo: eTiempo.value, rep: eRep.value, unico: eUnico.value === "si",
          menus: menus, i: ings
        };
        // En modo suelto no hay repertorio que tocar: los campos vuelven a quien
        // abrió el editor y allí se decide qué hacer con ellos.
        if(suelto){ cerrarEditor(); ini.enVezDeGuardar(campos); return; }
        if(nuevo){
          campos.uid = "x" + Date.now().toString(36);
          campos.custom = true;
          estado.platos.extra.push(campos);
        }else if(p.custom){
          const obj = estado.platos.extra.filter(function(x){ return x.uid === p.uid; })[0];
          Object.keys(campos).forEach(function(k){ obj[k] = campos[k]; });
          PERFILES.forEach(function(pf){ reemplazarEnSemanas(pf.id, nombreAntes, n); });
        }else{
          estado.platos.ediciones[p.orig] = campos;
          PERFILES.forEach(function(pf){ reemplazarEnSemanas(pf.id, nombreAntes, n); });
        }
        guardar(); cerrarEditor(); pintarTodo();
        if(nuevo && ini.alGuardar) ini.alGuardar(n);
        else aviso(nuevo ? "Plato añadido al repertorio" : "Plato actualizado");
      }})
    ]));

    // Los platos que se le parecen, aquí mismo: la decisión de crear o reutilizar
    // se toma mirando los campos, no antes de verlos.
    const bloqueParecidos = [];
    if((ini.parecidos || []).length){
      const fila = el("div", {class:"gp-par"}, []);
      ini.parecidos.forEach(function(x){
        fila.appendChild(el("button", {type:"button", class:"gp-otro", text:x.n,
          title: x.pista ? "Comparten: " + x.pista : "",
          onclick:function(){ cerrarEditor(); x.usar(); }}));
      });
      bloqueParecidos.push(el("div", {class:"full"}, [
        el("label", {class:"bloque-lbl", text:"Ya tienes platos parecidos"}),
        el("p", {class:"hint", style:"margin:-2px 0 7px",
                 text:"Si es el mismo con otro nombre, púlsalo y se usará ese en vez de crear este."}),
        fila
      ]));
    }

    const cabeza = [el("h3", {text: suelto ? (ini.titulo || "Plato del menú")
                                           : (nuevo ? ((a && a.nuevo) || "Nuevo plato") : "Editar plato")})];
    if(!nuevo){
      cabeza.push(el("span", {
        class:"badge " + (p.custom ? "local" : (p.editado ? "mod" : "repo")),
        text: p.custom ? "añadido" : (p.editado ? "modificado" : "del repositorio")
      }));
    }

    const caja = el("div", {class:"editor", role:"dialog", "aria-modal":"true",
                            "aria-label": nuevo ? "Nuevo plato" : "Editar " + p.n}, [
      el("header", null, cabeza),
      el("div", {class:"editor-body"}, bloqueParecidos.concat([
        campo("Nombre del plato", eNombre, true),
        campo("Descripción", eDesc, true),
        el("div", {class:"full"}, [
          el("label", {class:"bloque-lbl", text:"Menús en los que entra"}),
          menusGrid
        ]),
        el("div", {class:"full"}, [
          el("div", {class:"grupo-head"}, [
            el("label", {class:"bloque-lbl", text:"Tipo de alimento"}),
            el("span", {class:"base-lbl", text:"● base = color"})
          ]),
          tGrid
        ]),
        el("div", {class:"full"}, [
          el("label", {class:"bloque-lbl", text:"Momentos en que se come"}),
          momGrid
        ]),
        campo("Preparación", eTiempo), campo("Repetición", eRep),
        campo("Plato único", eUnico, true),
        el("div", {class:"full"}, [
          el("label", {class:"bloque-lbl", text:"Ingredientes"}),
          chips,
          el("div", {class:"ing-alta"}, [
            el("div", {class:"combo"}, [eIngs, panel]),
            el("button", {type:"button", class:"btn btn-sm", text:"Añadir", onclick:añadeIng})
          ]),
          altaIng,
          avisoIng
        ])
      ])),
      el("footer", null, pie)
    ]);

    capaEditor = abrirCapa(caja, eNombre);
  }

  /* ============ Cargar el menú de la guardería ============ */
  // Cada mes mandan un PDF con lo que come allí. Un asistente lo convierte en
  // JSON con este formato, y aquí se revisa antes de tocar nada: el riesgo no
  // es que falle la carga, es que entren veinte platos que ya tenías con otro
  // nombre y el repertorio se llene de duplicados.

  // Palabras que aparecen en medio recetario y no distinguen nada.
  const VACIAS = {"de":1,"del":1,"la":1,"las":1,"el":1,"los":1,"con":1,"y":1,"a":1,
                  "al":1,"en":1,"un":1,"una":1,"sin":1,"su":1,"o":1};

  // El nombre de un plato partido en palabras comparables: sin tildes, sin
  // plurales y sin las de relleno. "Albóndigas con verduras" -> albondiga, verdura.
  function palabrasDe(nombre){
    const vistas = {}, salida = [];
    sinTildes(nombre).split(/[^a-z0-9]+/).forEach(function(w){
      if(!w || VACIAS[w] || w.length < 3) return;
      const raiz = w.replace(/(es|s)$/, "");
      const k = raiz.length >= 3 ? raiz : w;
      if(vistas[k]) return;
      vistas[k] = 1; salida.push(k);
    });
    return salida;
  }

  // Cuánto distingue cada palabra. "Carne" está en veinte platos y no dice gran
  // cosa; "carbonara" está en uno y lo dice todo. Sin esto, cualquier plato con
  // pollo salía parecido a los otros quince con pollo y la revisión no servía.
  function pesoPalabras(nombres){
    const en = {};
    nombres.forEach(function(n){
      palabrasDe(n).forEach(function(w){ en[w] = (en[w] || 0) + 1; });
    });
    const total = Math.max(1, nombres.length), peso = {};
    Object.keys(en).forEach(function(w){ peso[w] = Math.log(total / en[w]) + 0.25; });
    return peso;
  }

  // Los platos del repertorio que se parecen a uno nuevo, de más a menos.
  function parecidos(nombre, candidatos, peso){
    const mias = palabrasDe(nombre);
    if(!mias.length) return [];
    const mio = mias.reduce(function(t, w){ return t + (peso[w] || 1); }, 0);
    const salida = [];
    candidatos.forEach(function(p){
      const suyas = palabrasDe(p.n);
      if(!suyas.length) return;
      const suyo = suyas.reduce(function(t, w){ return t + (peso[w] || 1); }, 0);
      let comun = 0;
      mias.forEach(function(w){ if(suyas.indexOf(w) !== -1) comun += (peso[w] || 1); });
      if(!comun) return;
      // Contra el menor de los dos: "Sopa" y "Sopa de pollo" se parecen mucho
      // aunque uno sea el doble de largo.
      const tanto = comun / Math.max(0.001, Math.min(mio, suyo));
      if(tanto < 0.42) return;
      salida.push({p:p, tanto:tanto, comun:mias.filter(function(w){ return suyas.indexOf(w) !== -1; })});
    });
    salida.sort(function(a, b){ return b.tanto - a.tanto; });
    return salida.slice(0, 5);
  }

  function mismoNombre(a, b){ return palabrasDe(a).join(" ") === palabrasDe(b).join(" "); }

  // Lo que no se puede arreglar desde la pantalla de revisión: si algo de esto
  // falla, el fichero está mal hecho y hay que volver a pedírselo al asistente.
  function revisaGuarde(g){
    const malo = [];
    if(!g || typeof g !== "object") return ["Eso no es un fichero JSON."];
    if(g.formato !== "menu-guarderia") return ["Eso no es un menú de guardería: falta «formato: menu-guarderia»."];
    if(!Array.isArray(g.dias) || !g.dias.length) malo.push("No trae ni un día.");

    const nuevos = Array.isArray(g.platos_nuevos) ? g.platos_nuevos : [];
    const ingNuevos = Array.isArray(g.ingredientes_nuevos) ? g.ingredientes_nuevos : [];

    const hayIng = {};
    ingredientes().forEach(function(x){ hayIng[x.n] = 1; });
    ingNuevos.forEach(function(x){ hayIng[x.ingrediente] = 1; });
    const hayPlato = {};
    repertorio().forEach(function(p){ hayPlato[p.n] = 1; });
    nuevos.forEach(function(p){ hayPlato[p.nombre] = 1; });

    ingNuevos.forEach(function(x){
      if(!x.ingrediente) malo.push("Un ingrediente nuevo viene sin nombre.");
      if(SECCIONES.indexOf(x.seccion) === -1)
        malo.push("El ingrediente «" + x.ingrediente + "» dice ir en «" + x.seccion + "», que no es una sección del súper.");
    });

    nuevos.forEach(function(p){
      if(!p.nombre){ malo.push("Un plato nuevo viene sin nombre."); return; }
      (p.tipo || []).forEach(function(t){
        if(TIPOS.indexOf(t) === -1) malo.push("«" + p.nombre + "» dice ser de tipo «" + t + "», que no existe.");
      });
      if(!(p.tipo || []).length) malo.push("«" + p.nombre + "» viene sin tipo.");
      (p.momento || []).forEach(function(m){
        if(IDS_MOMENTO.indexOf(m) === -1) malo.push("«" + p.nombre + "» dice comerse en «" + m + "», que no es un momento del día.");
      });
      if(!(p.momento || []).length) malo.push("«" + p.nombre + "» viene sin momento del día.");
      (p.ingredientes || []).forEach(function(i){
        if(!hayIng[i]) malo.push("«" + p.nombre + "» usa «" + i + "», que ni está en el catálogo ni viene declarado.");
      });
      if(!(p.ingredientes || []).length) malo.push("«" + p.nombre + "» viene sin ingredientes.");
    });

    const fechas = {};
    (g.dias || []).forEach(function(d){
      const f = desdeIso(d.fecha);
      if(!d.fecha || isNaN(f.getTime())){ malo.push("Hay un día con la fecha mal: «" + d.fecha + "»."); return; }
      if(fechas[d.fecha]) malo.push("El " + d.fecha + " viene dos veces.");
      fechas[d.fecha] = 1;
      if(FINDE[DIAS[(f.getDay() + 6) % 7]]) malo.push("El " + d.fecha + " cae en fin de semana, y la guardería no abre.");
      let cuantos = 0;
      Object.keys(d).forEach(function(k){
        if(k === "fecha") return;
        if(IDS_MOMENTO.indexOf(k) === -1){ malo.push("El " + d.fecha + " trae un «" + k + "» que no es un momento del día."); return; }
        cuantos += (d[k] || []).length;
        if((d[k] || []).length > PLATOS_POR_COMIDA)
          malo.push("El " + d.fecha + " pone " + d[k].length + " platos en " + (MOMENTO_LBL[k] || k) + ", y solo caben " + PLATOS_POR_COMIDA + ".");
        (d[k] || []).forEach(function(n){
          if(!hayPlato[n]) malo.push("El " + d.fecha + " come «" + n + "», que no existe ni se crea.");
        });
      });
      if(!cuantos) malo.push("El " + d.fecha + " no trae ningún plato.");
    });

    // Lo mismo repetido veinte veces no ayuda a nadie.
    const unicos = [];
    malo.forEach(function(m){ if(unicos.indexOf(m) === -1) unicos.push(m); });
    return unicos.slice(0, 25);
  }

  function pedirFicheroGuarde(){
    const f = el("input", {type:"file", accept:"application/json,.json", style:"display:none"});
    document.body.appendChild(f);
    f.addEventListener("change", async function(){
      const fich = f.files && f.files[0];
      f.remove();
      if(!fich) return;
      let g = null;
      try{ g = JSON.parse(await fich.text()); }
      catch(e){ aviso("Ese fichero no se puede leer como JSON."); return; }
      abrirGuarde(g, fich.name);
    });
    f.click();
  }

  /* ============ La pantalla de revisión ============ */
  let capaGuarde = null;
  function cerrarGuarde(){
    if(capaGuarde){ cerrarCapa(capaGuarde); capaGuarde = null; }
  }

  function abrirGuarde(g, nombreFichero){
    cerrarGuarde();
    // Lo que se revisa es el propio fichero, editado en el sitio: así el editor,
    // las sustituciones y la validación miran todos la misma copia y no hay dos
    // versiones del menú que puedan separarse.
    if(!Array.isArray(g.platos_nuevos)) g.platos_nuevos = [];
    if(!Array.isArray(g.ingredientes_nuevos)) g.ingredientes_nuevos = [];
    if(!Array.isArray(g.dias)) g.dias = [];
    const nuevos = g.platos_nuevos, ingNuevos = g.ingredientes_nuevos, dias = g.dias;
    let errores = revisaGuarde(g);
    const POR_DEFECTO = SECCIONES.indexOf("Despensa") !== -1 ? "Despensa" : (SECCIONES[0] || "");

    // El plan: qué se hace con cada plato nuevo. Empieza en "crear" salvo que
    // el nombre ya esté cogido, que entonces no hay nada que decidir.
    const sust = {};         // nombre nuevo -> nombre que se usa en su lugar
    const secciones = {};    // ingrediente nuevo -> sección elegida
    ingNuevos.forEach(function(x){ secciones[x.ingrediente] = x.seccion; });

    const delRepertorio = repertorio();
    const peso = pesoPalabras(delRepertorio.map(function(p){ return p.n; })
                              .concat(nuevos.map(function(p){ return p.nombre; })));
    const mirados = {};
    nuevos.forEach(function(p){
      mirados[p.nombre] = parecidos(p.nombre, delRepertorio, peso);
      const igual = mirados[p.nombre].filter(function(x){ return mismoNombre(x.p.n, p.nombre); })[0];
      if(igual) sust[p.nombre] = igual.p.n;
    });

    const cuerpo = el("div", {class:"carga-body"});
    const pie = el("div", {class:"carga-pie"});

    function resuelto(n){ return sust[n] || n; }
    function seCrean(){ return nuevos.filter(function(p){ return !sust[p.nombre]; }); }
    // Solo hacen falta los ingredientes de los platos que de verdad se crean.
    function ingsQueHacenFalta(){
      const usa = {};
      seCrean().forEach(function(p){ (p.ingredientes || []).forEach(function(i){ usa[i] = 1; }); });
      return ingNuevos.filter(function(x){ return usa[x.ingrediente]; });
    }

    function pinta(){
      cuerpo.textContent = "";
      errores = revisaGuarde(g);

      if(errores.length){
        cuerpo.appendChild(el("div", {class:"carga-mal"}, [
          el("strong", {text: errores.length === 1 ? "Hay un problema en el fichero"
                                                   : "Hay " + errores.length + " problemas en el fichero"}),
          el("ul", null, errores.map(function(m){ return el("li", {text:m}); })),
          el("p", {class:"hint", text:"No se carga nada hasta que el fichero venga bien. " +
                                      "Vuelve a pedírselo al asistente con esto que pone aquí."})
        ]));
      }

      /* --- Los platos, que es lo que hay que mirar --- */
      const conDudas = nuevos.filter(function(p){ return mirados[p.nombre].length; });
      const limpios = nuevos.filter(function(p){ return !mirados[p.nombre].length; });

      cuerpo.appendChild(el("h4", {class:"carga-tit"}, [
        document.createTextNode("Platos nuevos "),
        el("span", {class:"om", text:seCrean().length + " de " + nuevos.length + " se crean"})
      ]));

      if(conDudas.length){
        cuerpo.appendChild(el("p", {class:"hint", style:"margin:-4px 0 10px",
          text:"Estos se parecen a algo que ya tienes. Si es el mismo plato con otro nombre, " +
               "pulsa el que ya tienes y se usará ese en vez de crear uno nuevo."}));
        conDudas.forEach(function(p){ cuerpo.appendChild(ficha(p)); });
      }

      if(limpios.length){
        const dentro = el("div");
        limpios.forEach(function(p){ dentro.appendChild(ficha(p)); });
        const det = el("details", {class:"carga-resto"}, [
          el("summary", {text:"Sin nada parecido en el repertorio: " + limpios.length +
                              (limpios.length === 1 ? " plato" : " platos")}),
          dentro
        ]);
        cuerpo.appendChild(det);
      }

      /* --- Los ingredientes --- */
      const hacenFalta = ingsQueHacenFalta();
      cuerpo.appendChild(el("h4", {class:"carga-tit"}, [
        document.createTextNode("Ingredientes nuevos "),
        el("span", {class:"om", text:hacenFalta.length + " se añaden al catálogo"})
      ]));
      if(!hacenFalta.length){
        cuerpo.appendChild(el("p", {class:"hint", text:"Ninguno: todo lo que llevan estos platos ya lo tenías."}));
      }else{
        const caja = el("div", {class:"carga-ings"});
        hacenFalta.forEach(function(x){
          const sel = el("select", {"aria-label":"Sección de " + x.ingrediente});
          SECCIONES.forEach(function(sec){
            sel.appendChild(el("option", {value:sec, text:sec, selected: sec === secciones[x.ingrediente] ? "selected" : null}));
          });
          sel.addEventListener("change", function(){ secciones[x.ingrediente] = sel.value; });
          const fila = el("div", {class:"carga-ing"}, [el("span", {class:"nm", text:x.ingrediente}), sel]);
          // Un ingrediente que se parece a otro que ya tienes suele ser el mismo
          // escrito de otra manera, y duplicarlo rompe la lista de la compra.
          const roza = ingredientes().filter(function(y){
            const a = sinTildes(y.n), b = sinTildes(x.ingrediente);
            return a !== b && (a.indexOf(b) !== -1 || b.indexOf(a) !== -1);
          }).map(function(y){ return y.n; });
          if(roza.length) fila.appendChild(el("span", {class:"carga-roza", text:"parecido a " + roza.join(", ")}));
          caja.appendChild(fila);
        });
        cuerpo.appendChild(caja);
      }

      /* --- Y los días, ya resueltos --- */
      cuerpo.appendChild(el("h4", {class:"carga-tit"}, [
        document.createTextNode("Días "),
        el("span", {class:"om", text:dias.length + " en " + semanasDe(dias).length + " semanas"})
      ]));

      // Lo que ya hay en esas semanas. Cargar encima de una semana con cosas es
      // legítimo, pero enterarse después de que han quedado mezcladas no.
      const ocupadas = semanasDe(dias).map(function(id){
        const h = huecos("nino", id);
        const cuantos = clavesDe().filter(function(k){ return !!h[k]; }).length;
        return {id:id, cuantos:cuantos};
      }).filter(function(x){ return x.cuantos; });

      if(ocupadas.length){
        cuerpo.appendChild(el("p", {class:"carga-ojo"}, [
          el("strong", {text: soloEsto.checked ? "Se vacía lo que ya había. " : "Ojo: ya hay platos ahí. "}),
          document.createTextNode(ocupadas.map(function(x){
            return etiquetaSemana(desdeIso(x.id)) + " tiene " + x.cuantos +
                   (x.cuantos === 1 ? " plato" : " platos") + " del niño";
          }).join("; ") + ". " + (soloEsto.checked
            ? "La casilla de abajo está marcada: la semana del niño se queda solo con este menú."
            : "Se sustituyen las comidas que trae este menú; el resto se queda como está."))
        ]));
      }
      const tabla = el("div", {class:"carga-dias"});
      dias.slice().sort(function(a, b){ return String(a.fecha).localeCompare(String(b.fecha)); })
        .forEach(function(d){
          const f = desdeIso(d.fecha);
          if(isNaN(f.getTime())) return;
          const trozos = [];
          IDS_MOMENTO.forEach(function(m){
            if(!d[m] || !d[m].length) return;
            trozos.push((MOMENTO_LBL[m] || m) + ": " + d[m].map(resuelto).join(" · "));
          });
          tabla.appendChild(el("div", {class:"carga-dia"}, [
            el("span", {class:"fe", text:DIAS[(f.getDay() + 6) % 7].slice(0, 3) + " " + f.getDate() + "/" + (f.getMonth() + 1)}),
            el("span", {class:"pl", text:trozos.join("  |  ")})
          ]));
        });
      cuerpo.appendChild(tabla);

      pintaPie();
    }

    function ficha(p){
      const usado = sust[p.nombre];
      const caja = el("div", {class:"gp" + (usado ? " gp-fuera" : "")});
      const cab = el("div", {class:"gp-cab"}, [
        el("strong", {text:p.nombre}),
        el("span", {class:"gp-estado", text: usado ? "usas «" + usado + "»" : "se crea"})
      ]);
      if(!usado){
        cab.appendChild(el("button", {type:"button", class:"btn btn-sm", text:"Editar",
          title:"Ajustar tipos, momentos, ingredientes… antes de crearlo",
          onclick:function(){ editaFicha(p); }}));
      }
      caja.appendChild(cab);
      caja.appendChild(el("div", {class:"gp-meta",
        text:(p.tipo || []).join(" · ") + "  ·  " + (p.momento || []).map(function(m){ return MOMENTO_LBL[m] || m; }).join(", ") +
             (p.plato_unico ? "  ·  basta él solo" : "")}));
      caja.appendChild(el("div", {class:"gp-ings", text:(p.ingredientes || []).join(", ")}));
      if(p.descripcion) caja.appendChild(el("div", {class:"gp-desc", text:p.descripcion}));

      if(usado){
        caja.appendChild(el("button", {type:"button", class:"btn btn-sm", text:"No, créalo igualmente",
          onclick:function(){ delete sust[p.nombre]; pinta(); }}));
        return caja;
      }

      const lista = mirados[p.nombre];
      if(lista.length){
        const fila = el("div", {class:"gp-par"}, [el("span", {class:"et", text:"se parece a"})]);
        lista.forEach(function(x){
          fila.appendChild(el("button", {type:"button", class:"gp-otro",
            title:"Comparten: " + x.comun.join(", ") + ". Pulsa para usar este en vez de crear uno nuevo.",
            text:x.p.n,
            onclick:function(){ sust[p.nombre] = x.p.n; pinta(); }}));
        });
        caja.appendChild(fila);
      }
      return caja;
    }

    // El mismo editor de la pestaña Platos, pero devolviendo los campos en vez
    // de guardarlos: el plato todavía no existe y no debe existir hasta cargar.
    function editaFicha(p){
      abrirEditor(null, ambito("platos"), {
        titulo:"Plato del menú de la guardería",
        n:p.nombre, d:p.descripcion || "",
        t:(p.tipo || []).slice(), m:(p.momento || []).slice(),
        tiempo:p.tiempo, rep:p.repeticion, unico:!!p.plato_unico,
        menus: p.menus || {adultos:alAdulto.checked, nino:true},
        i:(p.ingredientes || []).slice(),
        ingsExtra: ingNuevos.map(function(x){
          return {n:x.ingrediente, seccion:secciones[x.ingrediente] || x.seccion};
        }),
        alCrearIngrediente:function(n, seccion){
          const sec = seccion || POR_DEFECTO;
          secciones[n] = sec;
          if(ingNuevos.some(function(x){ return x.ingrediente === n; })) return;
          ingNuevos.push({ingrediente:n, seccion:sec});
        },
        parecidos: mirados[p.nombre].map(function(x){
          return {n:x.p.n, pista:x.comun.join(", "),
                  usar:function(){ sust[p.nombre] = x.p.n; pinta(); }};
        }),
        enVezDeGuardar:function(c){
          const viejo = p.nombre;
          p.nombre = c.n; p.descripcion = c.d; p.tipo = c.t; p.momento = c.m;
          p.tiempo = c.tiempo; p.repeticion = c.rep; p.plato_unico = c.unico;
          p.ingredientes = c.i;
          // Lo que marques aquí manda sobre la casilla del pie, que es solo el
          // valor de partida para los que no has tocado.
          p.menus = c.menus;
          if(c.n !== viejo){
            // El menú cita los platos por su nombre: si cambia, hay que seguirlo
            // por los días y por todo lo que estaba indexado con el anterior.
            dias.forEach(function(d){
              IDS_MOMENTO.forEach(function(m){
                if(d[m]) d[m] = d[m].map(function(x){ return x === viejo ? c.n : x; });
              });
            });
            if(sust[viejo]){ sust[c.n] = sust[viejo]; delete sust[viejo]; }
            mirados[c.n] = parecidos(c.n, delRepertorio, peso);
            delete mirados[viejo];
          }
          pinta();
          aviso("«" + c.n + "» ajustado. Se creará así al cargar.");
        }
      });
    }

    const alAdulto = el("input", {type:"checkbox", id:"carga-adultos"});
    alAdulto.checked = true;

    // Cargar encima o empezar de cero. Lo segundo es lo que quieres cuando el
    // menú de la guardería es toda la semana del niño y lo de antes sobra.
    const soloEsto = el("input", {type:"checkbox", id:"carga-solo"});
    soloEsto.addEventListener("change", function(){ pinta(); });

    function pintaPie(){
      pie.textContent = "";
      pie.appendChild(el("label", {class:"carga-tambien", for:"carga-adultos",
        title:"Así el generador de la semana también puede proponerlos en la mesa"}, [
        alAdulto, el("span", {text:"también en el menú de los adultos"})
      ]));
      pie.appendChild(el("label", {class:"carga-tambien", for:"carga-solo",
        title:"Borra lo que hubiera en la semana del niño. La de los adultos no se toca"}, [
        soloEsto, el("span", {text:"dejar solo este menú"})
      ]));
      const der = el("div", {class:"der"}, [
        el("button", {class:"btn", text:"Cancelar", onclick:cerrarGuarde})
      ]);
      if(!errores.length){
        der.appendChild(el("button", {class:"btn btn-primary",
          text:"Cargar " + dias.length + (dias.length === 1 ? " día" : " días"),
          onclick:function(){
            aplicarGuarde(g, {sust:sust, secciones:secciones, adultos:alAdulto.checked,
                              soloEsto:soloEsto.checked});
          }}));
      }
      pie.appendChild(der);
    }

    const caja = el("div", {class:"editor carga"}, [
      el("header", null, [
        el("div", null, [
          el("h3", {text:"Menú de la guardería"}),
          el("div", {class:"hint", text:(g.mes ? mesLargo(g.mes) + " · " : "") + (nombreFichero || "")})
        ]),
        el("button", {class:"btn btn-sm", text:"Cerrar", onclick:cerrarGuarde})
      ]),
      cuerpo,
      el("footer", null, [pie])
    ]);
    pinta();

    capaGuarde = abrirCapa(caja);
  }

  function mesLargo(m){
    const t = String(m).split("-");
    return MESES[Number(t[1]) - 1] ? MESES[Number(t[1]) - 1] + " de " + t[0] : String(m);
  }
  function semanasDe(dias){
    const s = {};
    dias.forEach(function(d){
      const f = desdeIso(d.fecha);
      if(!isNaN(f.getTime())) s[iso(lunesDe(f))] = 1;
    });
    return Object.keys(s).sort();
  }

  /* ============ Y ahora sí, escribir ============ */
  function aplicarGuarde(g, plan){
    const nuevos = (g.platos_nuevos || []).filter(function(p){ return !plan.sust[p.nombre]; });

    // Primero los ingredientes: un plato no se puede guardar con un ingrediente
    // que todavía no existe.
    const usa = {};
    nuevos.forEach(function(p){ (p.ingredientes || []).forEach(function(i){ usa[i] = 1; }); });
    const hayIng = {};
    ingredientes().forEach(function(x){ hayIng[x.n] = 1; });
    let cuantosIng = 0;
    (g.ingredientes_nuevos || []).forEach(function(x){
      if(!usa[x.ingrediente] || hayIng[x.ingrediente]) return;
      estado.ing.extra.push({n:x.ingrediente, seccion:plan.secciones[x.ingrediente] || x.seccion});
      hayIng[x.ingrediente] = 1;
      cuantosIng++;
    });

    const hayPlato = {};
    repertorio().forEach(function(p){ hayPlato[p.n] = 1; });
    let cuantosPlatos = 0;
    nuevos.forEach(function(p){
      if(hayPlato[p.nombre]) return;   // alguien lo creó mientras tanto
      estado.platos.extra.push({
        uid:"g" + Date.now().toString(36) + cuantosPlatos,
        custom:true,
        n:p.nombre,
        d:p.descripcion || "Del menú de la guardería.",
        t:(p.tipo || []).slice(),
        m:(p.momento || []).slice(),
        tiempo:p.tiempo || "medio",
        rep:p.repeticion || "media",
        unico:!!p.plato_unico,
        menus: p.menus || {adultos:!!plan.adultos, nino:true},
        i:(p.ingredientes || []).slice()
      });
      hayPlato[p.nombre] = 1;
      cuantosPlatos++;
    });

    // Y los días, cada uno en su semana. Lo que ya hubiera en esos huecos se
    // sustituye: manda el menú que mandan de allí.
    const porSemana = {};
    (g.dias || []).forEach(function(d){
      const f = desdeIso(d.fecha);
      if(isNaN(f.getTime())) return;
      const id = iso(lunesDe(f)), dia = DIAS[(f.getDay() + 6) % 7];
      if(!porSemana[id]) porSemana[id] = [];
      porSemana[id].push({dia:dia, d:d});
    });

    const semanas = Object.keys(porSemana).sort();
    let cuantosHuecos = 0;
    semanas.forEach(function(id){
      const h = {};
      if(plan.soloEsto){
        Object.keys(NO_COMPRA).forEach(function(c){
          if(c.indexOf(id + "|nino|") === 0) delete NO_COMPRA[c];
        });
        delete REP.nino.REPO[id];
      }else{
        const origen = huecos("nino", id);
        Object.keys(origen).forEach(function(k){ h[k] = origen[k]; });
      }
      porSemana[id].forEach(function(x){
        IDS_MOMENTO.forEach(function(m){
          const platos = (x.d[m] || []).map(function(n){ return plan.sust[n] || n; });
          if(!platos.length) return;
          ordenesDe().forEach(function(o){ delete h[x.dia + "|" + m + "|" + o]; });
          platos.slice(0, PLATOS_POR_COMIDA).forEach(function(n, i){
            h[x.dia + "|" + m + "|" + String(i + 1)] = n;
          });
          cuantosHuecos++;
        });
      });
      fijarHuecos("nino", id, h);
      // Después de fijar: fijarHuecos limpia las marcas que se quedan sin plato.
      porSemana[id].forEach(function(x){
        IDS_MOMENTO.forEach(function(m){
          (x.d[m] || []).slice(0, PLATOS_POR_COMIDA).forEach(function(n, i){
            marcarCompra(id, "nino", x.dia + "|" + m + "|" + String(i + 1), false);
          });
        });
      });
    });

    cerrarGuarde();
    guardar();
    // Que se vea lo cargado: a la primera semana del menú.
    if(semanas.length){ estado.semana = semanas[0]; estado.tab = "semana"; }
    pintarTodo();
    aviso("Guardería cargada: " + cuantosHuecos + " comidas, " + cuantosPlatos +
          " platos nuevos y " + cuantosIng + " ingredientes" +
          (semanas.length > 1 ? " · " + semanas.length + " semanas" : ""));
  }

  /* ============ Compra ============ */
  // Una sola lista: los ingredientes de las dos semanas, sin duplicar.
  function ingredientesDeSemana(id){
    const mapa = {};
    PERFILES.forEach(function(pf){
      const h = huecos(pf.id, id);
      clavesDe().forEach(function(k){
        // Lo de la guardería lo compran ellos, y lo que ya está en la nevera no
        // hace falta traerlo otra vez.
        if(!marcaEfectiva(id, pf.id, k)) return;
        const p = h[k] && platoEnSemana(pf.id, h[k]);
        if(!p) return;
        p.i.forEach(function(ing){
          if(!mapa[ing]) mapa[ing] = [];
          if(mapa[ing].indexOf(p.n) === -1) mapa[ing].push(p.n);
        });
      });
    });
    return mapa;
  }
  function distintos(pid, id){
    const h = huecos(pid, id), s = {};
    clavesDe().forEach(function(k){ if(h[k]) s[h[k]] = 1; });
    return Object.keys(s).length;
  }

  function pintarCompra(){
    const id = semanaActual(), mapa = ingredientesDeSemana(id), lunes = desdeIso(id);
    $("compra-semana").textContent = "Compra de la semana";
    const et = $("cp-label");
    et.textContent = etiquetaSemana(lunes);
    $("cp-sub").textContent = subtituloSemana(lunes);
    if(id === iso(lunesDe(new Date()))) et.appendChild(el("span", {class:"now", text:"esta semana"}));
    $("c-adultos").textContent = String(distintos("adultos", id));
    $("c-nino").textContent = String(distintos("nino", id));

    const cont = $("secs"); cont.textContent = "";
    const ingredientes = Object.keys(mapa);
    if(!ingredientes.length){
      cont.appendChild(el("div", {class:"empty-state",
        text:"Esta semana no tiene platos asignados. Genera un reparto y la lista aparecerá aquí."}));
      $("c-buy").textContent = "0"; $("c-have").textContent = "0"; $("n-compra").textContent = "0";
      return;
    }

    let comprar = 0, tengo = 0;
    const porSeccion = {};
    ingredientes.sort(function(a, b){ return a.localeCompare(b, "es"); }).forEach(function(ing){
      const sec = seccionDe(ing);
      if(!porSeccion[sec]) porSeccion[sec] = [];
      porSeccion[sec].push(ing);
      if(enCasa(ing, id)) tengo++; else comprar++;
    });

    ordenSecciones(Object.keys(porSeccion)).forEach(function(titulo){
      const items = porSeccion[titulo];
      if(!items || !items.length) return;
      const sec = el("section", {class:"sec"}, [
        el("header", null, [
          el("h3", {text:titulo}),
          el("span", {class:"sec-n", text:items.filter(function(i){ return !enCasa(i, id); }).length + " de " + items.length})
        ])
      ]);
      items.forEach(function(ing){
        const cb = el("input", {type:"checkbox", id:"ing-" + ing.replace(/[^a-z0-9]+/gi, "-")});
        cb.checked = enCasa(ing, id);
        cb.addEventListener("change", function(){
          marcar(id, ing, cb.checked); pintarCompra(); pintarHistorico();
        });
        const usos = mapa[ing];
        sec.appendChild(el("label", {class:"item" + (enCasa(ing, id) ? " have" : "")}, [
          cb,
          el("div", {class:"txt"}, [
            el("div", {class:"nm", text:ing}),
            el("div", {class:"why", text: usos.length === 1 ? usos[0] : usos.length + " platos: " + usos.join(", ")})
          ])
        ]));
      });
      cont.appendChild(sec);
    });

    $("c-buy").textContent = String(comprar);
    $("c-have").textContent = String(tengo);
    $("n-compra").textContent = String(comprar);
  }

  $("btn-reset-despensa").addEventListener("click", function(){
    const id = semanaActual(), mapa = ingredientesDeSemana(id);
    Object.keys(mapa).forEach(function(ing){ marcar(id, ing, false); });
    pintarCompra(); pintarHistorico();
    aviso("Nada marcado como existencias en esta semana");
  });
  $("cp-prev").addEventListener("click", function(){ irASemana(iso(sumaDias(desdeIso(semanaActual()), -7))); });
  $("cp-next").addEventListener("click", function(){ irASemana(iso(sumaDias(desdeIso(semanaActual()), 7))); });
  $("cp-hoy").addEventListener("click", function(){ irASemana(iso(lunesDe(new Date()))); });

  $("btn-copiar").addEventListener("click", function(){
    const id = semanaActual(), mapa = ingredientesDeSemana(id);
    const lineas = ["Lista de la compra - " + etiquetaSemana(desdeIso(id)), ""];
    const presentes = Object.keys(mapa).map(seccionDe).filter(function(v, i, a){ return a.indexOf(v) === i; });
    ordenSecciones(presentes).forEach(function(titulo){
      const items = Object.keys(mapa)
        .filter(function(i){ return seccionDe(i) === titulo && !enCasa(i, id); })
        .sort(function(a, b){ return a.localeCompare(b, "es"); });
      if(!items.length) return;
      lineas.push(titulo.toUpperCase());
      items.forEach(function(i){ lineas.push("  - " + i); });
      lineas.push("");
    });
    copiar(lineas.join("\n"), "Lista copiada al portapapeles");
  });

  /* ============ Histórico ============ */
  function pintarHistorico(){
    const cuerpo = $("tbody-hist"); cuerpo.textContent = "";
    const ids = idsTodas(), actual = semanaActual(), hoyId = iso(lunesDe(new Date()));

    if(!ids.length){
      cuerpo.appendChild(el("tr", null, [
        el("td", {colspan:"6", style:"padding:26px 14px;color:var(--ink-3)",
                  text:"Todavía no hay ninguna semana planificada. Genera un reparto en la pestaña Semana."})
      ]));
    }
    ids.forEach(function(id){
      const lunes = desdeIso(id);
      function celdaPerfil(pid){
        const total = slotsDe().length, hechos = llenos(pid, id);
        return el("td", null, [
          el("div", {style:"font-variant-numeric:tabular-nums", text: hechos + " de " + total})
        ]);
      }
      const primera = el("td", null, [el("div", {class:"wk", text:etiquetaSemana(lunes)})]);
      if(id === hoyId) primera.appendChild(el("span", {class:"badge actual", text:"en curso"}));

      const mapa = ingredientesDeSemana(id);
      const total = Object.keys(mapa).length;
      const faltan = Object.keys(mapa).filter(function(i){ return !enCasa(i, id); }).length;

      cuerpo.appendChild(el("tr", {class:"hist-row"}, [
        primera,
        el("td", null, [el("div", {class:"rg", text:subtituloSemana(lunes)})]),
        celdaPerfil("adultos"),
        celdaPerfil("nino"),
        el("td", null, [ total
          ? el("div", {style:"font-variant-numeric:tabular-nums", text: total + " ingredientes"})
          : el("span", {class:"chip chip-doble", text:"sin lista"}),
          total ? el("div", {class:"hint", text: faltan + " por comprar"}) : null ]),
        el("td", {class:"col-acc"}, [
          el("button", {class:"btn btn-sm", text: id === actual ? "Abierta" : "Abrir",
            disabled: id === actual ? "disabled" : null,
            style: id === actual ? "opacity:.5" : null,
            onclick:function(){ irASemana(id); verTab("semana"); }}),
          el("button", {class:"btn btn-sm btn-ghost", style:"color:var(--pimenton);margin-left:6px",
            text:"Borrar", "aria-label":"Borrar " + etiquetaSemana(lunes),
            onclick:function(){ borrarSemana(id); }})
        ])
      ]));
    });

    $("n-historico").textContent = String(ids.length);
    pintarGuardado();
  }

  // Copiar la lista de la compra al portapapeles.
  function copiar(texto, ok){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(texto).then(function(){ aviso(ok); },
                                                function(){ aviso("No se ha podido copiar"); });
    }else{
      aviso("No se ha podido copiar");
    }
  }

  // Borrar una semana del histórico. Ya no hay nada que "guardar después": al
  // quedarse fuera de idsSemanas, sus filas salen de la base en la misma pasada.
  //
  // Hay que vaciar también REPO, la foto de la base con la que arrancó la página.
  // Marcar la semana como borrada basta para que no se guarde, pero no para que
  // no se lea: huecos() cae en REPO cuando estado no tiene nada, así que la
  // semana seguía ahí para cualquiera que preguntara por ella. Volver a poner un
  // plato en ella la sacaba de la lista de borradas y resucitaba de golpe los dos
  // menús enteros, con todo lo viejo dentro.
  function borrarSemana(id){
    if(!window.confirm("¿Borrar " + etiquetaSemana(desdeIso(id)) + " del histórico? " +
                       "Se van sus dos menús, su compra y sus filas de la base de datos."))
      return;
    vaciarSemana(id);
    guardar(); pintarTodo();
    aviso("Semana borrada del histórico");
  }

  function vaciarSemana(id){
    if(estado.semanasBorradas.indexOf(id) === -1) estado.semanasBorradas.push(id);
    PERFILES.forEach(function(pf){
      delete estado[pf.id].semanas[id];
      delete REP[pf.id].REPO[id];
    });
    delete estado.compras[id];
    delete REPO_COMPRAS[id];
    Object.keys(NO_COMPRA).forEach(function(c){ if(c.indexOf(id + "|") === 0) delete NO_COMPRA[c]; });
  }

  /* ============ Guardado ============ */
  // Cada cambio sube solo. El truco para no tener que tocar los quince sitios que
  // manipulan el estado es no mirar qué cambió, sino en qué se diferencia ahora la
  // página de lo que se sabe que hay en la base: se calculan las filas que debería
  // tener cada tabla y se mandan nada más que las diferencias.
  let BASE = {};
  let guardando = null, otraVuelta = false, ultimoFallo = "";

  /* --- Las filas que debería tener cada tabla --- */
  function filasSecciones(){
    const orden = [];
    ingredientes().forEach(function(x){
      const sec = x.seccion || "Otros";
      if(orden.indexOf(sec) === -1) orden.push(sec);
    });
    return orden.map(function(sec, i){ return {seccion:sec, orden:i}; });
  }
  function filasIngredientes(){
    return ingredientes().map(function(x){
      return {ingrediente:x.n, seccion:x.seccion || "Otros"};
    });
  }
  function filasTipos(){
    return TIPOS.map(function(t, i){ return {clave:claveDe(t), tipo:t, orden:i}; });
  }
  function filasEquilibrio(){
    return objetivos().map(function(o, i){
      return {objetivo:o.n, tipos:o.tipos.slice(), minimo:o.min, maximo:o.max, orden:i};
    });
  }
  function filasRecetas(){
    // Una receta de un plato que ya no existe no se guarda: la clave ajena la
    // rechazaría. Se queda en memoria por si el plato vuelve con ese nombre.
    const hay = {};
    repertorio().forEach(function(p){ hay[p.n] = 1; });
    return Object.keys(RECETAS).filter(function(n){ return hay[n] && hayReceta(n); })
                 .map(function(n){
                   const r = recetaDe(n);
                   return {plato:n, pasos:r.pasos, cantidades:r.cantidades};
                 });
  }
  function filasReglas(){
    return REGLAS.map(function(r){
      return {menu:r.menu, dia:r.dia, momento:r.momento, orden:Number(r.orden), plato:r.plato};
    });
  }
  function filasPlatos(){
    return repertorio().map(function(p){
      return { nombre:p.n,
               adultos:!!(p.menus && p.menus.adultos), nino:!!(p.menus && p.menus.nino),
               descripcion:p.d || "", tipo:tiposDe(p), momento:momentosDe(p),
               tiempo:p.tiempo || "medio", repeticion:p.rep || "media",
               plato_unico:!!p.unico, ingredientes:(p.i || []).slice() };
    });
  }
  function filasSemanas(){
    const out = [], hay = {};
    repertorio().forEach(function(p){ hay[p.n] = 1; });
    PERFILES.forEach(function(pf){
      const menu = pf.id === "adultos" ? "casa" : "nino";
      idsSemanas(pf.id).forEach(function(id){
        const h = huecos(pf.id, id);
        clavesDe().forEach(function(k){
          const nombre = h[k];
          // Un hueco con un plato que ya no existe no se puede guardar: la clave
          // ajena lo rechazaría. Se queda fuera, y la página lo sigue pintando
          // tachado para que se vea que hay algo que arreglar.
          if(!nombre || !hay[nombre]) return;
          const t = k.split("|");
          out.push({semana_id:id, menu:menu, dia:t[0], momento:t[1],
                    orden:Number(t[2]), plato:nombre,
                    es_para_comprar: paraComprar(id, pf.id, k)});
        });
      });
    });
    return out;
  }
  function filasCompras(){
    const out = [], cat = {}, ids = {};
    ingredientes().forEach(function(x){ cat[x.n] = 1; });
    Object.keys(REPO_COMPRAS).forEach(function(k){ ids[k] = 1; });
    Object.keys(estado.compras || {}).forEach(function(k){ ids[k] = 1; });
    Object.keys(ids).forEach(function(id){
      const unidas = {};
      Object.keys(REPO_COMPRAS[id] || {}).forEach(function(i){ unidas[i] = REPO_COMPRAS[id][i]; });
      Object.keys((estado.compras || {})[id] || {}).forEach(function(i){ unidas[i] = estado.compras[id][i]; });
      Object.keys(unidas).forEach(function(ing){
        if(cat[ing]) out.push({semana_id:id, ingrediente:ing, en_casa:!!unidas[ing]});
      });
    });
    return out;
  }
  function filasDespensa(){
    const out = [], cat = {}, unidas = {};
    ingredientes().forEach(function(x){ cat[x.n] = 1; });
    (datos.despensa || []).forEach(function(r){
      if(r.ingrediente) unidas[r.ingrediente] = /^(si|sí|1|true|x)$/i.test(r.en_casa || "");
    });
    Object.keys(estado.despensa || {}).forEach(function(i){ unidas[i] = estado.despensa[i]; });
    Object.keys(unidas).forEach(function(ing){
      if(cat[ing]) out.push({ingrediente:ing, en_casa:!!unidas[ing]});
    });
    return out;
  }

  // Padres antes que hijos: al insertar tiene que existir ya lo que se referencia.
  const TABLAS = [
    {n:"secciones",    pk:["seccion"],      filas:filasSecciones},
    {n:"tipos",        pk:["clave"],        filas:filasTipos},
    {n:"ingredientes", pk:["ingrediente"],  filas:filasIngredientes},
    {n:"equilibrio",   pk:["objetivo"],     filas:filasEquilibrio},
    {n:"platos",       pk:["nombre"],       filas:filasPlatos},
    {n:"reglas",       pk:["menu","dia","momento","orden"], filas:filasReglas},
    {n:"recetas",      pk:["plato"],        filas:filasRecetas},
    {n:"semanas",      pk:["semana_id","menu","dia","momento","orden"], filas:filasSemanas},
    {n:"compras",      pk:["semana_id","ingrediente"], filas:filasCompras},
    {n:"despensa",     pk:["ingrediente"],  filas:filasDespensa}
  ];

  function llave(t, f){ return t.pk.map(function(c){ return String(f[c]); }).join("\u0001"); }
  function mismaFila(a, b){
    const ks = Object.keys(a);
    if(ks.length !== Object.keys(b).length) return false;
    return ks.every(function(k){
      const x = a[k], y = b[k];
      if(Array.isArray(x) || Array.isArray(y)){
        if(!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
        return x.every(function(v, i){ return v === y[i]; });
      }
      return x === y;
    });
  }

  function cambios(){
    const plan = [];
    TABLAS.forEach(function(t){
      const ahora = t.filas(), antes = BASE[t.n] || [];
      const mapaAntes = {}, mapaAhora = {};
      antes.forEach(function(f){ mapaAntes[llave(t, f)] = f; });
      ahora.forEach(function(f){ mapaAhora[llave(t, f)] = f; });
      const entran = ahora.filter(function(f){
        const v = mapaAntes[llave(t, f)];
        return !v || !mismaFila(f, v);
      });
      const salen = antes.filter(function(f){ return !mapaAhora[llave(t, f)]; });
      if(entran.length || salen.length){
        plan.push({t:t, entran:entran, salen:salen, ahora:ahora});
      }
    });
    return plan;
  }

  async function empujar(plan){
    // Primero todo lo que entra, de padres a hijos. Después lo que sale, de hijos a
    // padres: así un plato renombrado no se lleva por delante sus semanas, porque
    // para cuando se borra el nombre viejo ya no lo referencia ninguna.
    for(let i = 0; i < plan.length; i++){
      const p = plan[i];
      if(!p.entran.length) continue;
      const { error } = await db.from(p.t.n).upsert(p.entran, {onConflict:p.t.pk.join(",")});
      if(error) throw error;
    }
    for(let i = plan.length - 1; i >= 0; i--){
      const p = plan[i];
      for(let j = 0; j < p.salen.length; j += 20){
        const tanda = p.salen.slice(j, j + 20).map(function(f){
          let q = db.from(p.t.n).delete();
          p.t.pk.forEach(function(c){ q = q.eq(c, f[c]); });
          return q;
        });
        const res = await Promise.all(tanda);
        for(let k = 0; k < res.length; k++) if(res[k].error) throw res[k].error;
      }
    }
  }

  async function persistir(){
    if(guardando){ otraVuelta = true; return guardando; }
    pintarGuardado("guardando");
    guardando = (async function(){
      do{
        otraVuelta = false;
        const plan = cambios();
        if(!plan.length) break;
        await empujar(plan);
        plan.forEach(function(p){ BASE[p.t.n] = p.ahora; });
      }while(otraVuelta);
    })();
    try{
      await guardando;
      ultimoFallo = "";
      pintarGuardado("hecho");
    }catch(e){
      ultimoFallo = (e && (e.message || e.details)) || String(e);
      pintarGuardado("mal");
      aviso(noContesta(e)
        ? "No se ha podido guardar: la base no responde. Puede estar pausada — míralo en Configuración."
        : "No se ha podido guardar: " + ultimoFallo);
    }
    guardando = null;
    return null;
  }

  // El semáforo de la pestaña Semana. Con guardado inmediato no hay un botón que
  // pulsar, así que lo único que hace falta es saber si lo último subió.
  function pintarGuardado(estadoG){
    const e = $("estado-guardado");
    if(!e) return;
    if(!estadoG) estadoG = guardando ? "guardando" : (ultimoFallo ? "mal" : "hecho");
    // Mientras todo va bien no dice nada: que una escritura salga bien es lo
    // normal y no merece un adorno permanente en pantalla. Habla si está
    // subiendo, y se queda en rojo si algo falló.
    e.className = "guardado " + estadoG;
    e.hidden = (estadoG === "hecho");
    e.textContent = estadoG === "guardando" ? "Guardando…" : "Sin guardar";
    e.title = estadoG === "mal" ? ultimoFallo : "Subiendo a la base de datos";
  }

  // Al arrancar, lo que la base tiene es exactamente lo que la página ve, porque
  // todavía no se ha tocado nada: la foto de partida sale de la propia página.
  function fijarBase(){
    BASE = {};
    TABLAS.forEach(function(t){ BASE[t.n] = t.filas(); });
    // Las tripas, solo en pruebas. Se preparan aquí, pero no se avisa hasta el
    // final de arrancar(): en este punto cargarEstado() todavía no ha corrido y
    // borraría lo que la prueba escribiera.
    if(PRUEBA){
      window.__app = {
        estado:estado, BASE:function(){ return BASE; }, TABLAS:TABLAS,
        repertorio:repertorio, platos:platos, plato:plato, ingredientes:ingredientes,
        objetivos:objetivos, huecos:huecos, fijarHuecos:fijarHuecos, clavesDe:clavesDe,
        slotsDe:slotsDe, ordenesDe:ordenesDe, generar:generar, completarNino:completarNino,
        adultoDesdeNino:adultoDesdeNino, cuentaEquilibrio:cuentaEquilibrio,
        fueraDeRango:fueraDeRango, ingredientesDeSemana:ingredientesDeSemana,
        paraComprar:paraComprar, marcarCompra:marcarCompra, huecosIguales:huecosIguales,
        REGLAS:function(){ return REGLAS; }, ponerReglas:function(l){ REGLAS = l; },
        aplicarReglas:aplicarReglas, huecosDeReglas:huecosDeReglas,
        RECETAS:function(){ return RECETAS; }, pasosDe:pasosDe, fijarReceta:fijarReceta, recetaDe:recetaDe,
        hayReceta:hayReceta, cantidadesDe:cantidadesDe, pasosEnApartados:pasosEnApartados,
        platosConReceta:platosConReceta, necesitaReceta:necesitaReceta,
        revisaGuarde:revisaGuarde, parecidos:parecidos, pesoPalabras:pesoPalabras,
        palabrasDe:palabrasDe, seccionProbable:seccionProbable, espejo:espejo,
        semanaActual:semanaActual, irASemana:irASemana, verTab:verTab,
        guardar:guardar, persistir:persistir, pintarTodo:pintarTodo,
        copiaEntera:copiaEntera, revisaCopia:revisaCopia, restaurarCopia:restaurarCopia,
        abrirEditor:abrirEditor, abrirSelector:abrirSelector, abrirPasos:abrirPasos,
        abrirIngrediente:abrirIngrediente, ambito:ambito, CAPAS:CAPAS
      };
    }
  }

  /* ============ Avisos ============ */
  let avisoTimer = null;
  function aviso(msg){
    const prev = document.querySelector(".toast");
    if(prev) prev.remove();
    const t = el("div", {class:"toast", role:"status", text:msg});
    document.body.appendChild(t);
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function(){ t.remove(); }, 3000);
  }

  // Lo que antes era un pie de página con letra gris vive ahora en Configuración,
  // que es donde se va a buscar. El texto de "migración a medias" que había aquí
  // se quedó de cuando la página solo leía de la base: hace tiempo que escribe.
  function pintarCreditos(){
    const cuenta = $("cfg-cuenta");
    if(cuenta){
      cuenta.textContent = "";
      cuenta.appendChild(el("span", {class:"cfg-dato", text: sesion ? sesion.email : "sin sesión"}));
      cuenta.appendChild(el("button", {class:"btn btn-sm", text:"Cerrar sesión", onclick:salir}));
    }
    const datos = $("cfg-datos"), n_semanas = idsSemanas("adultos").length;
    if(datos){
      datos.textContent = "";
      datos.appendChild(el("span", {class:"cfg-dato",
        text: PLATOS.length + " platos · " + Object.keys(SECCION).length + " ingredientes · " +
              n_semanas + (n_semanas === 1 ? " semana" : " semanas")}));
      datos.appendChild(el("span", {class:"hint",
        text:"En una base Postgres de Supabase. Cada cambio sube solo."}));
      if(PANEL){
        // El sitio al que ir si algo va mal: ahí se ven y se arreglan las filas
        // a mano. Pide tu cuenta de Supabase, no la de aquí.
        const enlaces = el("div", {class:"cfg-enlaces"}, [
          el("a", {class:"btn btn-sm", href:PANEL + "/editor", target:"_blank", rel:"noopener",
                   text:"Ver las tablas"}),
          el("a", {class:"btn btn-sm", href:PANEL + "/sql/new", target:"_blank", rel:"noopener",
                   text:"Consultas SQL"}),
          el("a", {class:"btn btn-sm", href:PANEL + "/logs/explorer", target:"_blank", rel:"noopener",
                   text:"Registro de errores"})
        ]);
        datos.appendChild(enlaces);
        datos.appendChild(el("span", {class:"hint",
          text:"Proyecto " + REF_PROYECTO + ". Entrar pide tu cuenta de Supabase."}));
      }
    }
  }

  /* ============ Reglas del día a día, en Configuración ============ */
  function montarReglas(){
    const lista = $("reglas-lista");
    if(!lista) return;
    lista.textContent = "";

    if(!REGLAS.length){
      lista.appendChild(el("p", {class:"hint", text:"Todavía no hay ninguna."}));
    }
    REGLAS.slice().sort(function(a, b){
      return (DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia)) ||
             (IDS_MOMENTO.indexOf(a.momento) - IDS_MOMENTO.indexOf(b.momento)) ||
             (Number(a.orden) - Number(b.orden)) ||
             a.menu.localeCompare(b.menu);
    }).forEach(function(r){
      const p = platoPorNombre(r.plato);
      lista.appendChild(el("div", {class:"regla-fila" + (p ? "" : " rota")}, [
        el("span", {class:"swatch", style:"background:" +
                    (p && tiposDe(p).length ? colorDe(claveDe(tiposDe(p)[0])) : "var(--surface-2)")}),
        el("span", {class:"cuando", text:r.dia + " · " + (MOMENTO_LBL[r.momento] || r.momento) +
                                         " · " + ORDEN_LBL[r.orden]}),
        el("span", {class:"que", text:r.plato}),
        el("span", {class:"quien", text:r.menu === "casa" ? "mesa" : "niño"}),
        p ? null : el("span", {class:"aviso-roto", text:"ese plato ya no existe"}),
        el("button", {type:"button", class:"quita", text:"×",
          "aria-label":"Quitar la regla de " + r.plato + " el " + r.dia,
          onclick:function(){
            REGLAS = REGLAS.filter(function(x){ return claveRegla(x) !== claveRegla(r); });
            guardar(); montarReglas();
            aviso("Regla quitada. Lo que ya estuviera puesto se queda.");
          }})
      ]));
    });
  }

  function montarAltaRegla(){
    const caja = $("reglas-alta");
    if(!caja) return;
    caja.textContent = "";

    const sel = function(opciones, valor){
      const e = el("select");
      opciones.forEach(function(o){
        e.appendChild(el("option", {value:o.id, text:o.lbl, selected:o.id === valor ? "selected" : null}));
      });
      return e;
    };
    const eMenu = sel(PERFILES.map(function(pf){
      return {id:pf.casa ? "casa" : "nino", lbl:pf.casa ? "La mesa" : "El niño"};
    }), "casa");
    const eDia = sel(DIAS.map(function(d){ return {id:d, lbl:d}; }), "domingo");
    const eMom = sel(MOMENTOS.map(function(m){ return {id:m.id, lbl:m.lbl}; }), "comida");
    const eOrden = sel(ordenesDe().map(function(o){ return {id:o, lbl:ORDEN_LBL[o]}; }), "1");
    const ePlato = el("select");

    // Solo los platos de ese menú y de ese momento: una regla que pone un
    // desayuno en la cena no la quiere nadie, y ofrecerla es invitar al error.
    function pintaPlatos(){
      const antes = ePlato.value;
      ePlato.textContent = "";
      const pid = eMenu.value === "casa" ? "adultos" : "nino";
      const aptos = platos(pid).filter(function(p){ return elegible(p, eMom.value); })
                               .sort(function(a, b){ return a.n.localeCompare(b.n, "es"); });
      if(!aptos.length){
        ePlato.appendChild(el("option", {value:"", text:"— nada de ese menú en ese momento —"}));
        return;
      }
      aptos.forEach(function(p){ ePlato.appendChild(el("option", {value:p.n, text:p.n})); });
      if(aptos.some(function(p){ return p.n === antes; })) ePlato.value = antes;
    }
    eMenu.addEventListener("change", pintaPlatos);
    eMom.addEventListener("change", pintaPlatos);
    pintaPlatos();

    const campo = function(lbl, control){
      return el("label", {class:"obj-campo"}, [el("span", {class:"obj-lbl", text:lbl}), control]);
    };

    caja.appendChild(el("div", {class:"regla-alta"}, [
      campo("Quién", eMenu), campo("Qué día", eDia),
      campo("Qué momento", eMom), campo("Qué puesto", eOrden),
      el("div", {class:"obj-campo full"}, [
        el("span", {class:"obj-lbl", text:"Qué plato"}), ePlato
      ]),
      el("div", {class:"full"}, [
        el("button", {class:"btn btn-sm btn-primary", text:"Añadir la regla", onclick:function(){
          if(!ePlato.value){ aviso("Ese menú no tiene platos para ese momento"); return; }
          const r = {menu:eMenu.value, dia:eDia.value, momento:eMom.value,
                     orden:eOrden.value, plato:ePlato.value};
          const choque = REGLAS.filter(function(x){ return claveRegla(x) === claveRegla(r); })[0];
          if(choque){
            if(!window.confirm("Ya hay una regla ahí, con «" + choque.plato + "». ¿La cambias?")) return;
            REGLAS = REGLAS.filter(function(x){ return claveRegla(x) !== claveRegla(r); });
          }
          REGLAS.push(r);
          guardar(); montarReglas();
          // Se aplica ya a la semana abierta, que si no parece que no ha hecho nada.
          const puestos = aplicarReglas(semanaActual());
          pintarTodo();
          aviso("«" + r.plato + "» los " + r.dia + (r.dia === "sábado" || r.dia === "domingo" ? "s" : "") +
                " para " + (r.menu === "casa" ? "la mesa" : "el niño") +
                (puestos ? " · puesto ya en la semana abierta" : ""));
        }})
      ])
    ]));
  }

  /* ============ Panel: recetas ============ */
  const DIF_LBL = {medio:"Media", alto:"Alta"};
  let RECETA_FILTRO = "";

  function montarRecetas(){
    const b = $("rec-buscar");
    if(b && !b.dataset.listo){
      b.dataset.listo = "1";
      b.addEventListener("input", pintarRecetas);
    }
    const f = $("rec-filtro");
    if(f){
      f.textContent = "";
      [{id:"", lbl:"Todas"}, {id:"alto", lbl:"Preparaci\u00f3n alta"},
       {id:"medio", lbl:"Preparaci\u00f3n media"}, {id:"falta", lbl:"Sin escribir"}]
        .forEach(function(o){
          const btn = el("button", {type:"button",
            class:"rec-chip" + (RECETA_FILTRO === o.id ? " activo" : ""), text:o.lbl});
          btn.addEventListener("click", function(){
            RECETA_FILTRO = o.id; montarRecetas(); pintarRecetas();
          });
          f.appendChild(btn);
        });
    }
  }

  function pintarRecetas(){
    const cont = $("rec-lista");
    if(!cont) return;
    const q = sinTildes(($("rec-buscar") || {}).value || "");
    const todos = platosConReceta();

    const vistos = todos.filter(function(p){
      if(RECETA_FILTRO === "falta" && hayReceta(p.n)) return false;
      if((RECETA_FILTRO === "alto" || RECETA_FILTRO === "medio") && p.tiempo !== RECETA_FILTRO) return false;
      if(!q) return true;
      return sinTildes(p.n).indexOf(q) !== -1 ||
             (p.i || []).some(function(i){ return sinTildes(i).indexOf(q) !== -1; });
    });

    cont.textContent = "";
    const faltan = todos.filter(function(p){ return !hayReceta(p.n); }).length;
    cont.appendChild(el("p", {class:"hint", style:"margin-bottom:12px", text:
      "Los " + todos.length + " platos de preparaci\u00f3n media o alta. Los de preparaci\u00f3n baja no salen " +
      "aqu\u00ed: no hay nada que explicar de poner fruta en un plato." +
      (faltan ? "  Faltan " + faltan + " por escribir." : "")}));

    if(!vistos.length){
      cont.appendChild(el("p", {class:"hint", text:"Nada con eso."}));
      return;
    }
    const rejilla = el("div", {class:"rec-grid"});
    vistos.forEach(function(p){ rejilla.appendChild(fichaReceta(p)); });
    cont.appendChild(rejilla);
  }

  function fichaReceta(p){
    const escrita = hayReceta(p.n);
    const caja = el("article", {class:"receta" + (escrita ? "" : " vacia")});

    caja.appendChild(el("header", null, [
      el("span", {class:"sw", style:"background:" + colorDe(claveDe(tiposDe(p)[0] || ""))}),
      el("h3", {text:p.n}),
      el("span", {class:"dif dif-" + p.tiempo, text:DIF_LBL[p.tiempo] || p.tiempo})
    ]));
    if(p.d && p.d !== "Sin descripción.") caja.appendChild(el("p", {class:"desc", text:p.d}));

    // Los ingredientes con lo que lleva cada uno, para una persona: multiplicar
    // es fácil y dividir por tres y medio no.
    const cantidades = cantidadesDe(p);
    const faltan = cantidades.filter(function(x){ return !x.cuanto; }).length;
    caja.appendChild(el("div", {class:"rec-sub"}, [
      el("span", {class:"t", text:"Ingredientes"}),
      el("span", {class:"n", text:"para una persona"})
    ]));
    caja.appendChild(el("ul", {class:"rec-ings"}, cantidades.map(function(x){
      return el("li", {class: x.cuanto ? "" : "sin-cuanto"}, [
        el("span", {class:"que", text:x.que}),
        el("span", {class:"cuanto", text:x.cuanto || "—"})
      ]);
    })));
    if(escrita && faltan){
      caja.appendChild(el("p", {class:"rec-aviso",
        text: faltan === 1 ? "Falta la cantidad de un ingrediente."
                           : "Faltan las cantidades de " + faltan + " ingredientes."}));
    }

    const grupos = pasosEnApartados(pasosDe(p.n));
    if(grupos.length){
      caja.appendChild(el("div", {class:"rec-sub"}, [el("span", {class:"t", text:"Cómo se hace"})]));
      grupos.forEach(function(g){
        if(g.titulo) caja.appendChild(el("h4", {class:"rec-apartado", text:g.titulo}));
        caja.appendChild(el("ul", {class:"pasos"}, g.puntos.map(function(x){
          return el("li", {text:x});
        })));
      });
    }else{
      caja.appendChild(el("p", {class:"sin-pasos", text:"Sin pasos escritos todavía."}));
    }

    caja.appendChild(el("button", {type:"button", class:"btn btn-sm rec-editar",
      text: escrita ? "Editar receta" : "Escribir la receta",
      onclick:function(){ abrirPasos(p); }}));
    return caja;
  }

  // Un paso por línea. Es lo que más se parece a cómo lo dirías en voz alta, y
  // evita un editor de listas con sus botones de subir y bajar.
  let capaPasos = null;
  function cerrarPasos(){
    if(capaPasos){ cerrarCapa(capaPasos); capaPasos = null; }
  }

  function abrirPasos(p){
    cerrarPasos();
    const r = recetaDe(p.n);

    // Arranca con los ingredientes del plato ya escritos, cada uno esperando su
    // cantidad: no hay que acordarse de cuáles eran ni copiarlos a mano.
    const dichas = {};
    r.cantidades.forEach(function(l){
      const x = partirCantidad(l);
      if(x.que) dichas[x.que.toLowerCase()] = x.cuanto;
    });
    const cantidades = el("textarea", {id:"rec-cantidades", rows:"7",
      placeholder:"berenjena: 1 mediana"});
    cantidades.value = (p.i || []).map(function(i){
      return i + ": " + (dichas[i.toLowerCase()] || "");
    }).join("\n");

    const area = el("textarea", {id:"pasos-texto", rows:"14",
      placeholder:"Asar las berenjenas:\nHorno a 200°.\nPartirlas a lo largo."});
    area.value = r.pasos.join("\n");

    const caja = el("div", {class:"editor", role:"dialog", "aria-modal":"true",
                            "aria-label":"Receta de " + p.n}, [
      el("header", null, [
        el("div", null, [
          el("h3", {text:p.n}),
          el("div", {class:"hint", text:"Cantidades para una persona. Esto se lee de pie: corto."})
        ]),
        el("span", {class:"dif dif-" + p.tiempo, text:DIF_LBL[p.tiempo] || p.tiempo})
      ]),
      el("div", {class:"editor-body"}, [
        el("div", {class:"full"}, [
          el("label", {class:"bloque-lbl", for:"rec-cantidades", text:"Cuánto lleva de cada cosa"}),
          el("p", {class:"hint", style:"margin:-2px 0 6px",
                   text:"Uno por línea, «ingrediente: cantidad». Los nombres salen del plato: " +
                        "para cambiar la lista, edita el plato."}),
          cantidades
        ]),
        el("div", {class:"full"}, [
          el("label", {class:"bloque-lbl", for:"pasos-texto", text:"Cómo se hace"}),
          el("p", {class:"hint", style:"margin:-2px 0 6px",
                   text:"Un paso por línea. Una línea acabada en dos puntos es un apartado, " +
                        "y lo que venga debajo son sus pasos."}),
          area
        ])
      ]),
      el("footer", null, [
        el("div", {class:"der"}, [
          el("button", {class:"btn", text:"Cancelar", onclick:cerrarPasos}),
          el("button", {class:"btn btn-primary", text:"Guardar", onclick:function(){
            // Una línea sin cantidad no se guarda: es ruido que luego habría
            // que distinguir de una cantidad de verdad.
            const cants = cantidades.value.split("\n").filter(function(l){
              return partirCantidad(l).cuanto;
            });
            fijarReceta(p.n, area.value.split("\n"), cants);
            cerrarPasos(); pintarRecetas();
            aviso("Receta de «" + p.n + "» guardada");
          }})
        ])
      ])
    ]);

    capaPasos = abrirCapa(caja, cantidades);
  }

  /* ============ Copias de seguridad ============ */
  // Todo lo que hay en la base, tal cual, en un fichero. Las tablas van en el
  // orden de TABLAS, que es de padres a hijos: así al restaurar se puede recorrer
  // en ese mismo orden sin que falle ninguna clave ajena.
  async function copiaEntera(){
    const copia = {formato:"menu-semanal", version:1, fecha:new Date().toISOString(), tablas:{}};
    for(let i = 0; i < TABLAS.length; i++){
      copia.tablas[TABLAS[i].n] = await tabla(TABLAS[i].n);
    }
    return copia;
  }

  function descargarTexto(nombre, texto){
    const url = URL.createObjectURL(new Blob([texto], {type:"application/json"}));
    const a = el("a", {href:url, download:nombre});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
  }

  async function descargarCopia(silenciosa){
    const copia = await copiaEntera();
    const cuantas = Object.keys(copia.tablas).reduce(function(n, k){ return n + copia.tablas[k].length; }, 0);
    descargarTexto("menu-semanal-" + iso(new Date()) + (silenciosa ? "-antes-de-restaurar" : "") + ".json",
                   JSON.stringify(copia, null, 1));
    return cuantas;
  }

  // Lo que llega de un fichero es lo único que no controlamos, así que se mira
  // entero antes de borrar nada: a media restauración no hay vuelta atrás.
  function revisaCopia(c){
    if(!c || c.formato !== "menu-semanal") return "Eso no es una copia de Menú Semanal.";
    if(!c.tablas || typeof c.tablas !== "object") return "A la copia le faltan las tablas.";
    for(let i = 0; i < TABLAS.length; i++){
      const n = TABLAS[i].n;
      if(!Array.isArray(c.tablas[n])) return "A la copia le falta la tabla «" + n + "».";
    }
    if(!c.tablas.platos.length) return "La copia no tiene ni un plato: no parece buena.";
    return "";
  }

  async function restaurarCopia(c){
    // De hijos a padres para vaciar, y de padres a hijos para llenar.
    for(let i = TABLAS.length - 1; i >= 0; i--){
      const t = TABLAS[i];
      const { error } = await db.from(t.n).delete().not(t.pk[0], "is", null);
      if(error) throw error;
    }
    for(let i = 0; i < TABLAS.length; i++){
      const t = TABLAS[i], filas = c.tablas[t.n];
      for(let j = 0; j < filas.length; j += 500){
        const { error } = await db.from(t.n).insert(filas.slice(j, j + 500));
        if(error) throw error;
      }
    }
  }

  function montarCopias(){
    const caja = $("cfg-copia");
    if(!caja) return;
    caja.textContent = "";

    const bajar = el("button", {class:"btn", text:"Descargar copia"});
    bajar.addEventListener("click", async function(){
      bajar.disabled = true; bajar.textContent = "Preparando…";
      try{
        const n = await descargarCopia(false);
        aviso("Copia descargada: " + n + " filas");
      }catch(e){ aviso("No se ha podido descargar: " + (e.message || e)); }
      bajar.disabled = false; bajar.textContent = "Descargar copia";
    });

    const fichero = el("input", {type:"file", accept:"application/json,.json",
                                 id:"cfg-fichero", style:"display:none"});
    const subir = el("button", {class:"btn", text:"Restaurar copia…"});
    subir.addEventListener("click", function(){ fichero.value = ""; fichero.click(); });

    fichero.addEventListener("change", async function(){
      const f = fichero.files && fichero.files[0];
      if(!f) return;
      let c = null;
      try{ c = JSON.parse(await f.text()); }
      catch(e){ aviso("Ese fichero no se puede leer como copia."); return; }

      const mal = revisaCopia(c);
      if(mal){ aviso(mal); return; }

      const cuantas = Object.keys(c.tablas).reduce(function(n, k){ return n + c.tablas[k].length; }, 0);
      const cuando = String(c.fecha || "").slice(0, 10);
      if(!window.confirm("Restaurar la copia del " + cuando + " (" + c.tablas.platos.length +
                         " platos, " + cuantas + " filas). " +
                         "Se borra todo lo que hay ahora y se pone lo de la copia. " +
                         "Antes se descargará una copia de lo actual, por si acaso.")) return;

      subir.disabled = true; bajar.disabled = true; subir.textContent = "Restaurando…";
      try{
        await descargarCopia(true);          // la red por debajo de la red
        await restaurarCopia(c);
        aviso("Copia restaurada. Recargando…");
        setTimeout(function(){ location.reload(); }, 1200);
      }catch(e){
        subir.disabled = false; bajar.disabled = false; subir.textContent = "Restaurar copia…";
        aviso("La restauración ha fallado: " + (e.message || e) +
              ". Tienes la copia de lo anterior en Descargas.");
      }
    });

    caja.appendChild(bajar);
    caja.appendChild(subir);
    caja.appendChild(fichero);
  }

  /* ============ Pintado global ============ */
  function pintarTodo(){
    pintarPlatos();
    pintarIngredientes();
    pintarSemana();
    pintarCompra(); pintarRecetas(); pintarHistorico();
  }

  /* ============ Puerta ============ */
  let sesion = null, arrancado = false, capaPuerta = null, entrando = null;

  function cerrarPuerta(){ if(capaPuerta){ capaPuerta.remove(); capaPuerta = null; } }

  function puerta(mensaje, malo){
    cerrarPuerta();
    const correo = el("input", {type:"email", id:"p-correo", placeholder:"tu@correo.com",
                                autocomplete:"username", inputmode:"email",
                                "aria-label":"Tu correo"});
    const clave = el("input", {type:"password", id:"p-clave", placeholder:"Contraseña",
                               autocomplete:"current-password", "aria-label":"Tu contraseña"});
    const nota = el("div", {class:"p-aviso" + (mensaje ? (malo ? " mal" : " bien") : ""),
                            text: mensaje || "La sesión se queda abierta en este dispositivo."});
    const boton = el("button", {class:"btn btn-primary", text:"Entrar"});

    async function entra(){
      const email = correo.value.trim(), pass = clave.value;
      if(email.indexOf("@") < 1){
        nota.className = "p-aviso mal"; nota.textContent = "Escribe un correo válido.";
        correo.focus(); return;
      }
      if(!pass){
        nota.className = "p-aviso mal"; nota.textContent = "Te falta la contraseña.";
        clave.focus(); return;
      }
      boton.disabled = true; boton.textContent = "Entrando…";
      const { error } = await db.auth.signInWithPassword({email:email, password:pass});
      boton.disabled = false; boton.textContent = "Entrar";
      if(error){
        nota.className = "p-aviso mal";
        // El mensaje de Supabase es el mismo se equivoque uno en el correo o en la
        // contraseña, a propósito: decir cuál de los dos falla ayuda a quien prueba.
        nota.textContent = /invalid login/i.test(error.message)
          ? "El correo o la contraseña no son correctos."
          : "No se ha podido entrar: " + error.message;
        clave.select(); return;
      }
      entrar();
    }
    boton.addEventListener("click", entra);
    [correo, clave].forEach(function(c){
      c.addEventListener("keydown", function(e){ if(e.key === "Enter") entra(); });
    });

    capaPuerta = el("div", {class:"puerta"}, [
      el("div", {class:"caja"}, [
        el("h2", {text:"Menú Semanal"}),
        el("p", {text:"Las comidas de casa. Entra para verlas."}),
        correo, clave, boton, nota
      ])
    ]);
    document.body.appendChild(capaPuerta);
    (correo.value ? clave : correo).focus();
  }

  async function salir(){
    await db.auth.signOut();
    location.reload();
  }

  // Un correo que no esté en la tabla `hogar` entra en Supabase pero no saca nada
  // de la base: Postgres responde 42501. Sin este aviso parecería que la
  // aplicación está rota, y es el fallo más probable de toda la migración.
  function esSinPermiso(e){
    const t = String((e && (e.message || e.code)) || e);
    return t.indexOf("42501") !== -1 || t.indexOf("permission denied") !== -1;
  }

  // Un proyecto gratuito de Supabase se pausa tras una semana sin actividad. Deja
  // de responder, y lo que llega aquí es un error de red, no de permisos. Merece
  // su propio mensaje: con el genérico parecería que la aplicación está rota.
  function noContesta(e){
    if(esSinPermiso(e)) return false;
    const t = String((e && (e.message || e.name)) || e).toLowerCase();
    return t.indexOf("fetch") !== -1 || t.indexOf("network") !== -1 ||
           t.indexOf("load failed") !== -1 || t.indexOf("timeout") !== -1 ||
           t.indexOf("503") !== -1 || t.indexOf("502") !== -1;
  }

  // Pantalla propia: ni puerta de entrar ni aplicación, porque no hay a qué entrar.
  function pantallaPausado(){
    cerrarPuerta();
    const reintentar = el("button", {class:"btn btn-primary", text:"Volver a intentarlo"});
    reintentar.addEventListener("click", function(){ location.reload(); });
    capaPuerta = el("div", {class:"puerta"}, [
      el("div", {class:"caja"}, [
        el("h2", {text:"La base de datos no responde"}),
        el("p", {text:"Lo más probable es que el proyecto de Supabase se haya pausado: el plan gratuito " +
                      "los pausa tras una semana sin usarlos. No se pierde nada — se reactiva desde el " +
                      "panel con un botón y vuelve todo."}),
        PANEL ? el("a", {class:"btn btn-primary", href:PANEL, target:"_blank", rel:"noopener",
                         style:"width:100%;margin-top:16px;justify-content:center",
                         text:"Abrir el panel y reactivarlo"}) : null,
        reintentar,
        el("div", {class:"p-aviso", text:"Si acabas de reactivarlo, espera un minuto y vuelve a intentarlo. " +
                                         "También puede ser que te hayas quedado sin conexión."})
      ])
    ]);
    document.body.appendChild(capaPuerta);
  }

  async function entrar(){
    // El cerrojo se cierra ANTES de esperar nada: si no, la llamada directa y la
    // del aviso de sesión se cuelan las dos y la aplicación se monta por
    // duplicado. Guardar la promesa y no un booleano es lo que lo evita.
    if(entrando) return entrando;
    entrando = (async function(){
      await abrir();
      entrando = null;
    })();
    return entrando;
  }

  // Mientras se pregunta por la sesión no hay nada que enseñar, y si la base no
  // responde la librería reintenta durante un buen rato: sin esto son quince
  // segundos de pantalla en blanco preguntándote si se ha roto algo.
  function pantallaCargando(){
    cerrarPuerta();
    capaPuerta = el("div", {class:"puerta"}, [
      el("div", {class:"caja", style:"text-align:center"}, [
        el("h2", {text:"Menú Semanal"}),
        el("p", {text:"Abriendo…"})
      ])
    ]);
    document.body.appendChild(capaPuerta);
  }

  async function abrir(){
    if(arrancado) return;
    pantallaCargando();
    let usuario = null;
    try{
      const { data } = await db.auth.getSession();
      usuario = data && data.session ? data.session.user : null;
    }catch(e){
      if(noContesta(e)){ pantallaPausado(); return; }
    }
    if(!usuario){ puerta(); return; }
    sesion = usuario;

    try{
      await cargar();
    }catch(e){
      // Si no contesta, la sesión no tiene la culpa: no se cierra, que al volver
      // sería un fastidio tener que entrar otra vez.
      if(noContesta(e)){ pantallaPausado(); return; }
      const correo = usuario.email;
      await db.auth.signOut();
      sesion = null;
      if(esSinPermiso(e)){
        puerta("Has entrado como " + correo + ", pero ese correo no tiene acceso a los datos. " +
               "Hay que añadirlo a la tabla «hogar» de Supabase.", true);
      }else{
        puerta("No he podido leer la base de datos: " + (e.message || e), true);
      }
      return;
    }
    arrancado = true;
    cerrarPuerta();
    arrancar();
  }

  entrar();

  /* ============ Arranque ============ */
  function arrancar(){
    construir();
    fijarBase();   // la foto de lo que hay en la base, para comparar después
    cargarEstado();
    montarPestanas();
    AMBITOS.forEach(montarPanelAmbito);
    montarPanelIngredientes();
    montarPanelSemana();
    pintarObjetivos();
    montarCopias();
    montarRecetas();
    montarReglas();
    montarAltaRegla();

    // La primera vez la semana en curso se rellena sola, para no abrir en blanco.
    // Con histórico ya guardado no se toca nada: inventar una semana marcaría
    // ficheros como "sin guardar" sin que nadie haya pedido nada.
    const id = semanaActual();
    const hayHistorico = PERFILES.some(function(pf){ return Object.keys(REP[pf.id].REPO).length > 0; });
    const h0 = huecos("adultos", id);
    if(!hayHistorico && !Object.keys(h0).some(function(k){ return !!h0[k]; })) generar(id);

    pintarTodo();
    pintarCreditos();
    const valida = PESTANAS.some(function(t){ return t.id === estado.tab; });
    verTab(valida ? estado.tab : "semana");

    // Ahora sí: todo montado y el estado en su sitio.
    if(PRUEBA){
      const avisar = deFuera("__appLista");
      if(avisar) avisar(window.__app);
    }
  }
})();
