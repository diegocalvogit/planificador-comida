// Una base de datos de mentira, en memoria, con la cara de supabase-js.
//
// Existe porque la alternativa es probar contra la base de verdad, y entonces
// una prueba mal escrita te borra la cena del martes. Implementa solo lo que la
// aplicación usa: si algún día usa algo más, esto petará ruidosamente, que es
// justo lo que tiene que hacer.
//
// Lo instala pruebas/index.html antes de cargar la aplicación con ?prueba=1.

window.bancoFalso = function(datos){
  // Copia honda: cada prueba arranca con los mismos datos aunque la anterior
  // los haya destrozado.
  const T = JSON.parse(JSON.stringify(datos));

  const PK = {
    secciones:["seccion"], tipos:["clave"], ingredientes:["ingrediente"],
    equilibrio:["objetivo"], platos:["nombre"], recetas:["plato"],
    reglas:["menu", "dia", "momento", "orden"],
    semanas:["semana_id", "menu", "dia", "momento", "orden"],
    compras:["semana_id", "ingrediente"], despensa:["ingrediente"]
  };

  const diario = [];
  const clave = function(t, f){
    if(!PK[t]) throw new Error("La base falsa no conoce la tabla «" + t + "»");
    return PK[t].map(function(c){ return String(f[c]); }).join("|");
  };

  function consulta(nombre){
    let filas = (T[nombre] || []).slice();
    const api = {
      select: function(){ return api; },
      limit:  function(){ return api; },
      order:  function(col, op){
        const asc = !op || op.ascending !== false;
        filas.sort(function(a, b){
          const x = a[col], y = b[col];
          const c = (x > y) - (x < y);
          return asc ? c : -c;
        });
        return api;
      },
      eq:  function(col, v){ filas = filas.filter(function(f){ return f[col] === v; }); return api; },
      not: function(col, op, v){
        if(op === "is" && v === null) filas = filas.filter(function(f){ return f[col] != null; });
        else throw new Error("La base falsa no sabe hacer not(" + op + ")");
        return api;
      },
      // Lo que la aplicación espera de supabase-js: un «thenable».
      then: function(ok){ return Promise.resolve({data:filas, error:null}).then(ok); }
    };
    return api;
  }

  return {
    auth: {
      getSession: function(){
        return Promise.resolve({data:{session:{user:{email:"pruebas@casa"}}}, error:null});
      },
      signInWithPassword: function(){ return Promise.resolve({data:{}, error:null}); },
      signOut: function(){ return Promise.resolve({error:null}); }
    },
    from: function(nombre){
      return {
        select: function(){ return consulta(nombre); },
        upsert: function(filas){
          if(!T[nombre]) T[nombre] = [];
          filas.forEach(function(f){
            const k = clave(nombre, f);
            const i = T[nombre].findIndex(function(x){ return clave(nombre, x) === k; });
            if(i === -1) T[nombre].push(JSON.parse(JSON.stringify(f)));
            else T[nombre][i] = JSON.parse(JSON.stringify(f));
          });
          diario.push({op:"upsert", tabla:nombre, n:filas.length});
          return Promise.resolve({error:null});
        },
        insert: function(filas){
          if(!T[nombre]) T[nombre] = [];
          filas.forEach(function(f){ T[nombre].push(JSON.parse(JSON.stringify(f))); });
          diario.push({op:"insert", tabla:nombre, n:filas.length});
          return Promise.resolve({error:null});
        },
        delete: function(){
          const cond = [];
          const api = {
            eq:  function(c, v){ cond.push(function(f){ return f[c] === v; }); return api; },
            not: function(c, op, v){
              if(op === "is" && v === null) cond.push(function(f){ return f[c] != null; });
              else throw new Error("La base falsa no sabe borrar con not(" + op + ")");
              return api;
            },
            then: function(ok){
              const quedan = (T[nombre] || []).filter(function(f){
                return !cond.every(function(c){ return c(f); });
              });
              const fuera = (T[nombre] || []).length - quedan.length;
              T[nombre] = quedan;
              diario.push({op:"delete", tabla:nombre, n:fuera});
              return Promise.resolve({error:null}).then(ok);
            }
          };
          return api;
        }
      };
    },
    // Para que las pruebas puedan mirar qué ha pasado de verdad en la base.
    _tablas: T,
    _diario: diario
  };
};
