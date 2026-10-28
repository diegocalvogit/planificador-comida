-- Las recetas de los platos de preparación media o alta, que son los que no se
-- resuelven solos. Los de preparación baja no salen en la pestaña: de poner
-- fruta en un plato no hay nada que explicar.
--
-- El criterio, por si hay que añadir más:
--
--   · Cantidades POR PERSONA y CON NÚMEROS. La pantalla las multiplica por los
--     comensales, y «media cebolla» no se puede multiplicar pero «40 g» sí.
--   · Los pasos van en apartados cuando la receta tiene fases de verdad. Una
--     línea acabada en dos puntos es un apartado y lo que viene debajo son sus
--     viñetas. Una receta de tres pasos no necesita apartados y no los lleva.
--   · Viñetas cortas y en imperativo, con el tiempo dentro del paso al que
--     pertenece. Esto se lee de pie y con las manos ocupadas.
--   · Los ingredientes no se repiten en los pasos: ya están arriba con su peso.
--   · Lo que no está en la lista del plato —sal, pimienta, un chorro de aceite—
--     se nombra en el paso pero no se pesa: no se compra para una receta.

insert into public.recetas (plato, cantidades, pasos) values

/* ───────────────────────── Preparación alta ───────────────────────── */

  ('Berenjenas rellenas',
   array['berenjena: 1 unidad (250 g)', 'carne picada de pollo: 100 g', 'cebolla: 40 g',
         'tomate frito: 3 cucharadas (50 g)', 'queso rallado: 30 g'],
   array[
     'Asar las berenjenas:',
     'Horno a 200°, arriba y abajo.',
     'Partir la berenjena a lo largo y hacerle cortes en cruz en la carne, sin llegar a la piel.',
     'Un chorro de aceite y sal por encima, y 25 min al horno boca arriba.',
     'Está cuando la carne cede al apretar con el dedo.',
     'El relleno:',
     'Vaciar las medias berenjenas con una cuchara, dejando medio centímetro de pared. Picar esa carne y reservarla.',
     'Pochar la cebolla picada muy fina, 8 min a fuego medio, hasta que esté transparente.',
     'Subir el fuego, añadir el pollo picado y dorarlo removiendo, 5 min.',
     'Echar la carne de berenjena y el tomate frito. 5 min más, hasta que no quede líquido en la sartén.',
     'Probar de sal: a partir de aquí ya no se corrige.',
     'Montar y gratinar:',
     'Rellenar las dos barcas apretando un poco para que no queden huecos.',
     'Cubrir con el queso rallado.',
     'Gratinar 5 min, vigilando: pasa de dorado a quemado en un minuto.'
   ]),

  ('Paella de marisco y carne',
   array['arroz: 100 g', 'pechuga de pollo: 100 g', 'calamares: 80 g',
         'gambas: 6 unidades (80 g)', 'pimiento rojo: 40 g', 'caldo de pescado: 250 ml',
         'azafrán: unas hebras', 'aceite de oliva: 1 cucharada'],
   array[
     'Antes de empezar:',
     'Poner el caldo a calentar aparte: añadirlo frío corta la cocción y el arroz sale desigual.',
     'Cortar el pollo a tacos, los calamares en aros y el pimiento en tiras.',
     'El sofrito:',
     'Salpimentar el pollo y dorarlo en la paellera con el aceite, 5 min. Retirarlo a un plato.',
     'En ese mismo aceite, el pimiento 5 min a fuego medio.',
     'Añadir los calamares y 3 min más.',
     'Devolver el pollo a la paellera.',
     'El arroz:',
     'Echar el arroz y removerlo 2 min con el sofrito, hasta que los granos brillen.',
     'Añadir el caldo caliente y el azafrán, y repartir el arroz de un golpe para que quede en capa fina.',
     'Probar de sal ahora: es la última vez que se puede.',
     'Fuego fuerte 8 min y luego flojo 8 min. A partir de aquí no se remueve.',
     'Poner las gambas por encima en los últimos 5 min.',
     'El reposo:',
     'Apagar y tapar con un paño limpio 5 min. El arroz termina de hacerse con su propio calor.',
     'Si queda algo de caldo, tapar es justo lo que hay que hacer: se acaba de beber.'
   ]),

  ('Lentejas con verduras y pollo',
   array['lentejas: 80 g', 'pechuga de pollo: 80 g', 'zanahoria: 50 g', 'calabacín: 50 g',
         'patata: 80 g', 'pimiento verde: 30 g', 'cebolla: 40 g', 'aceite de oliva: 1 cucharada'],
   array[
     'El sofrito:',
     'Pochar en la olla la cebolla y el pimiento picados, 8 min a fuego medio.',
     'Añadir la zanahoria y el calabacín en dados, 5 min más.',
     'Subir el fuego y dorar el pollo a tacos con las verduras, 5 min.',
     'La cocción:',
     'Echar las lentejas y la patata en cascos, y remover un minuto para que se impregnen.',
     'Cubrir con agua dos dedos por encima y llevar a hervir. Retirar la espuma.',
     'Fuego bajo 35 min en olla normal, o 12 min desde que silba en olla rápida.',
     'Probar de sal al final: salar antes endurece la piel de la lenteja.',
     'Dejar reposar 10 min. Espesan bastante al enfriarse un poco.'
   ]),

  ('Pimientos rellenos de bacalao y gambas',
   array['pimientos del piquillo: 3 unidades', 'bacalao: 80 g', 'gambas: 5 unidades (60 g)',
         'cebolla: 50 g', 'nata para cocinar: 60 ml', 'tomate triturado: 40 g', 'harina: 15 g'],
   array[
     'El relleno:',
     'Si el bacalao es salado, desalarlo 24 h en la nevera cambiando el agua tres veces.',
     'Desmigar el bacalao y picar las gambas.',
     'Pochar la mitad de la cebolla picada muy fina, 8 min.',
     'Añadir el bacalao y las gambas, 3 min, hasta que las gambas pierdan el color gris.',
     'Echar la harina y tostarla 2 min removiendo sin parar.',
     'Añadir la nata poco a poco sin dejar de remover, hasta que espese y se despegue de la sartén.',
     'Extenderlo en un plato y dejarlo enfriar: en caliente no se puede rellenar.',
     'La salsa:',
     'Pochar el resto de la cebolla, añadir el tomate y 10 min a fuego lento.',
     'Triturar y pasar por el chino si se quiere fina.',
     'Montar:',
     'Rellenar los pimientos con una cuchara pequeña, sin pasarse o se rajan.',
     'Colocarlos en una fuente sobre la salsa y calentar 10 min a fuego muy suave.'
   ]),

  ('Ensaladilla rusa casera',
   array['patata: 150 g', 'zanahoria: 50 g', 'guisantes: 40 g', 'atún en conserva: 40 g',
         'huevos: 1 unidad', 'mayonesa: 40 g'],
   array[
     'Cocer:',
     'Patata y zanahoria enteras y con piel, en agua fría con sal. 25 min desde que hierve.',
     'Enteras y con piel para que no se empapen de agua: la ensaladilla aguada no tiene arreglo.',
     'El huevo, 10 min en el mismo agua.',
     'Los guisantes, 5 min aparte si son congelados.',
     'Montar:',
     'Pelar y cortar patata y zanahoria en dados de un centímetro, ya templadas.',
     'Dejar enfriar del todo antes de mezclar: en caliente, la mayonesa se corta.',
     'Mezclar con el atún escurrido, los guisantes y la mayonesa.',
     'Picar el huevo y repartirlo por encima.',
     'Una hora en la nevera antes de servir.'
   ]),

  ('Bizcocho casero de yogur',
   array['harina: 47 g', 'azúcar: 31 g', 'yogur natural: 16 g', 'huevos: 0,4 unidades',
         'aceite de oliva: 16 ml'],
   array[
     'Esto sale mejor entero: pon 8 comensales arriba y tendrás las cantidades de un molde de 22 cm.',
     'La masa:',
     'Horno a 180°, arriba y abajo, mientras se hace la masa.',
     'Batir los huevos con el azúcar 3 min, hasta que la mezcla blanquee y doble de volumen.',
     'Añadir el yogur y el aceite, y batir solo hasta integrar.',
     'Incorporar la harina tamizada en tres veces, con movimientos envolventes.',
     'Dejar de mezclar en cuanto no se vea harina: batir de más la deja dura.',
     'Hornear:',
     'Verter en el molde engrasado, sin llegar a dos tercios.',
     '35 min a media altura, sin abrir el horno los primeros 25.',
     'Está cuando un palillo sale limpio.',
     'Desmoldar templado, no caliente, y enfriar sobre una rejilla.'
   ]),

/* ──────────────────────── Preparación media ──────────────────────── */

  ('Arroz con huevo y carne',
   array['arroz: 80 g', 'filetes de ternera: 120 g', 'huevos: 1 unidad',
         'tomate frito: 3 cucharadas (50 g)', 'aceite de oliva: 1 cucharada'],
   array[
     'Cocer el arroz en agua con sal, 15 min. Escurrir y reservar.',
     'Mientras, hacer el filete a la plancha a fuego fuerte, 2 min por lado. Salar al sacarlo.',
     'Freír el huevo en aceite bien caliente, echándole aceite por encima con la cuchara.',
     'Calentar el tomate frito y mezclarlo con el arroz.',
     'Montar: el arroz de base, el filete al lado y el huevo encima.'
   ]),

  ('Arroz con pollo',
   array['arroz: 80 g', 'pechuga de pollo: 120 g', 'caldo de pollo: 200 ml',
         'cebolla: 40 g', 'aceite de oliva: 1 cucharada'],
   array[
     'Poner el caldo a calentar aparte.',
     'Dorar el pollo a tacos en la cazuela con el aceite, 5 min. Retirarlo.',
     'Pochar la cebolla picada en ese aceite, 8 min.',
     'Echar el arroz y removerlo 2 min hasta que brille.',
     'Devolver el pollo, añadir el caldo caliente y probar de sal.',
     'Fuego medio 18 min sin remover. Reposar 5 min tapado.'
   ]),

  ('Macarrones con queso y pollo',
   array['macarrones: 80 g', 'pechuga de pollo: 100 g', 'nata para cocinar: 60 ml',
         'queso rallado: 40 g', 'aceite de oliva: 1 cucharada'],
   array[
     'Poner el agua a hervir con sal: un litro por cada 100 g de pasta.',
     'Mientras, dorar el pollo a tiras en el aceite, 6 min. Salpimentar.',
     'Cocer los macarrones un minuto menos de lo que diga el paquete.',
     'Bajar el fuego del pollo, añadir la nata y la mitad del queso, y remover hasta que ligue.',
     'Escurrir la pasta guardando medio vaso del agua, y echarla a la sartén.',
     'Saltear un minuto. Si la salsa está espesa, aflojarla con el agua de la pasta.',
     'Servir con el resto del queso por encima.'
   ]),

  ('Fajitas de pollo y pimientos',
   array['tortillas de trigo: 2 unidades', 'pechuga de pollo: 120 g', 'pimiento rojo: 50 g',
         'pimiento verde: 50 g', 'cebolla: 50 g', 'especias para fajitas: 1 cucharadita'],
   array[
     'Cortar el pollo, los pimientos y la cebolla en tiras finas y del mismo grosor.',
     'Mezclar el pollo con las especias y dejarlo 10 min, que es lo que tarda en coger el sabor.',
     'Sartén muy caliente: el pollo primero, 5 min, sin moverlo mucho para que se dore.',
     'Añadir las verduras y saltear 5 min. Tienen que quedar enteras, no blandas.',
     'Calentar las tortillas 20 segundos por lado en una sartén seca.',
     'Rellenar y doblar en el momento de comer: si se hace antes, se reblandecen.'
   ]),

  ('Hamburguesas caseras de pollo con queso',
   array['carne picada de pollo: 150 g', 'pan de hamburguesa: 1 unidad',
         'queso en lonchas: 1 loncha', 'lechuga: 2 hojas', 'tomate: 2 rodajas', 'cebolla: 20 g'],
   array[
     'Formar la hamburguesa:',
     'Salpimentar la carne y mezclarla lo justo: amasarla de más la deja gomosa.',
     'Formar una bola y aplastarla a un centímetro, más ancha que el pan porque encoge.',
     'Hundir el centro con el pulgar para que no se abombe al cocinarse.',
     '15 min en la nevera para que agarre.',
     'Hacerla:',
     'Plancha muy caliente, 4 min por lado. Darle la vuelta una sola vez.',
     'Poner el queso en el último minuto y tapar para que funda.',
     'Tostar el pan por dentro en la misma plancha, 1 min.',
     'Montar: pan, lechuga, hamburguesa con queso, tomate y cebolla en aros finos.'
   ]),

  ('Judías blancas con verduras y gambas',
   array['judías blancas cocidas: 150 g', 'gambas: 6 unidades (80 g)', 'cebolla: 40 g',
         'pimiento verde: 30 g', 'zanahoria: 40 g', 'tomate triturado: 60 g', 'ajo: 1 diente'],
   array[
     'Pochar la cebolla, el pimiento y el ajo picados, 8 min a fuego medio.',
     'Añadir la zanahoria en dados pequeños y 5 min más.',
     'Echar el tomate y dejarlo 10 min a fuego lento, hasta que pierda la acidez y oscurezca.',
     'Añadir las judías escurridas y enjuagadas, y un vaso de agua. 10 min a fuego suave.',
     'Mover la cazuela por el asa en vez de remover con cuchara: las judías se deshacen.',
     'Las gambas, los últimos 2 min: más tiempo y se ponen correosas.'
   ]),

  ('Solomillo de cerdo o ternera a la plancha',
   array['solomillo de cerdo: 150 g', 'champiñones: 80 g', 'guisantes: 50 g',
         'ajo: 1 diente', 'aceite de oliva: 1 cucharada'],
   array[
     'Sacar la carne de la nevera 20 min antes: fría por dentro se hace desigual.',
     'Cortar el solomillo en medallones de dos dedos.',
     'Laminar los champiñones y el ajo.',
     'Saltear los champiñones con el ajo a fuego fuerte, 6 min, hasta que suelten el agua y se dore.',
     'Cocer los guisantes 5 min y escurrir.',
     'Plancha muy caliente con unas gotas de aceite: los medallones 3 min por lado.',
     'Salar al sacarlos y dejarlos reposar 3 min antes de cortarlos.'
   ]),

  ('Tiras de lomo salteadas con verduras al wok',
   array['lomo de cerdo: 130 g', 'calabacín: 60 g', 'zanahoria: 50 g', 'pimiento rojo: 50 g',
         'salsa de soja: 1 cucharada', 'aceite de oliva: 1 cucharada'],
   array[
     'Cortar todo en tiras finas y del mismo tamaño: en el wok todo se hace a la vez o no se hace.',
     'Tenerlo todo cortado al lado del fuego antes de encenderlo. Esto va muy rápido.',
     'Wok al máximo con el aceite, hasta que humee.',
     'El lomo primero, 3 min removiendo sin parar. Retirarlo.',
     'La zanahoria 2 min, luego el pimiento 2 min, y el calabacín 1 min.',
     'Devolver la carne, echar la soja y saltear 1 min más.',
     'No salar: la soja ya sala.'
   ]),

  ('Ensalada de garbanzos',
   array['garbanzos cocidos: 150 g', 'patata: 80 g', 'zanahoria: 40 g',
         'atún en conserva: 40 g', 'huevos: 1 unidad', 'mayonesa: 30 g'],
   array[
     'Cocer la patata y la zanahoria enteras y con piel, 25 min desde que hierve.',
     'El huevo, 10 min en el mismo agua.',
     'Enjuagar los garbanzos bajo el grifo y escurrirlos bien.',
     'Pelar y cortar la patata y la zanahoria en dados, y dejar enfriar del todo.',
     'Mezclar con los garbanzos, el atún escurrido y la mayonesa.',
     'El huevo picado por encima, al servir.'
   ]),

  ('Parrillada de verduras',
   array['calabacín: 80 g', 'berenjena: 80 g', 'pimiento rojo: 60 g', 'cebolla: 50 g',
         'espárragos trigueros: 4 unidades', 'aceite de oliva: 1 cucharada'],
   array[
     'Cortar todo en láminas de medio centímetro, del mismo grosor.',
     'Salar la berenjena y dejarla 15 min en un colador. Secarla con papel: así no amarga ni chupa aceite.',
     'Plancha muy caliente, sin aceite en la plancha: el aceite va sobre la verdura con una brocha.',
     'Por tiempos: el pimiento 6 min, la cebolla 5, la berenjena 4, el calabacín 3 y los espárragos 3.',
     'Una sola vuelta a cada cosa, para que marque.',
     'Sal gorda y un hilo de aceite crudo al servir.'
   ]),

  ('Puré o crema de verduras',
   array['patata: 100 g', 'zanahoria: 60 g', 'puerro: 60 g', 'calabacín: 60 g',
         'aceite de oliva: 1 cucharada'],
   array[
     'Pochar el puerro en rodajas con el aceite, 8 min a fuego medio sin que coja color.',
     'Añadir el resto en trozos parecidos y rehogar 3 min.',
     'Cubrir con agua justo hasta tapar la verdura: de más sale aguado y no tiene arreglo.',
     '20 min a fuego medio, hasta que la patata se deshaga al pincharla.',
     'Triturar reservando parte del caldo, y añadirlo poco a poco hasta la textura que quieras.',
     'Probar de sal al final, con el puré ya hecho.'
   ]),

  ('Puré de verduras con carne',
   array['patata: 100 g', 'zanahoria: 60 g', 'puerro: 60 g', 'calabacín: 60 g',
         'pechuga de pollo: 80 g', 'aceite de oliva: 1 cucharada'],
   array[
     'Pochar el puerro en rodajas con el aceite, 8 min sin que coja color.',
     'Añadir el resto de la verdura en trozos parecidos y rehogar 3 min.',
     'Echar el pollo a tacos y cubrir con agua justo hasta tapar.',
     '20 min a fuego medio.',
     'Sacar el pollo, triturar la verdura y devolver el pollo desmenuzado.',
     'Dejarlo con tropezones si es para un niño que ya mastica: así aprende la textura.'
   ]),

  ('Puré de verduras con pescado',
   array['patata: 100 g', 'zanahoria: 60 g', 'puerro: 60 g', 'calabacín: 60 g',
         'merluza: 80 g', 'aceite de oliva: 1 cucharada'],
   array[
     'Pochar el puerro en rodajas con el aceite, 8 min sin que coja color.',
     'Añadir el resto de la verdura en trozos parecidos y rehogar 3 min.',
     'Cubrir con agua justo hasta tapar y cocer 20 min.',
     'Añadir la merluza en los últimos 5 min: más tiempo y se deshace en hilos.',
     'Revisar que no quede ninguna espina antes de triturar. Esto no se hace con prisa.',
     'Triturar y ajustar con el caldo reservado.'
   ]),

  ('Niguiri de tortilla',
   array['arroz: 70 g', 'huevos: 1 unidad'],
   array[
     'El arroz:',
     'Lavar el arroz en agua fría frotándolo hasta que el agua salga casi clara, tres o cuatro veces.',
     'Cocer con el mismo volumen de agua, tapado, 12 min a fuego muy bajo. No destapar.',
     'Reposar 10 min tapado y luego removerlo con una espátula, cortando en vez de aplastar.',
     'Usarlo templado: frío no se pega y caliente cuece la tortilla.',
     'La tortilla:',
     'Batir el huevo con una pizca de sal y hacer una tortilla fina en sartén antiadherente, a fuego bajo.',
     'Enrollarla y cortarla en tiras del ancho de un dedo.',
     'Montar:',
     'Formar bolitas de arroz alargadas con la mano húmeda, apretando lo justo para que no se deshagan.',
     'Poner una tira de tortilla encima de cada una.'
   ]),

  ('Brocoli',
   array['brócoli: 200 g', 'aceite de oliva: 1 cucharada'],
   array[
     'Separar en ramilletes del mismo tamaño, con un poco de tallo.',
     'Al vapor 8 min, o hervido 6 min en abundante agua con sal y sin tapar, que así no amarillea.',
     'Está cuando el cuchillo entra sin forzar pero el ramillete aguanta su forma.',
     'Escurrir muy bien y aliñar con el aceite en crudo.'
   ]),

  ('Patatas fritas',
   array['patata: 250 g'],
   array[
     'Cortar en bastones del mismo grosor y dejarlos 10 min en agua fría, para quitarles el almidón.',
     'Secarlos bien con un paño: el agua salta en el aceite.',
     'Primera fritura a 150°, 8 min. Salen blandas y pálidas: es lo que tiene que pasar.',
     'Sacar y dejar reposar al menos 10 min.',
     'Segunda fritura a 190°, 3 min, hasta que doren.',
     'Escurrir en papel y salar fuera del aceite.'
   ]),

  ('Dorada o Lubina',
   array[]::text[],
   array[
     'Horno a 200°.',
     'Pedir el pescado limpio y descamado en la pescadería.',
     'Hacerle dos cortes en el lomo, sal gorda por dentro y por fuera y un chorro de aceite.',
     '20 min al horno para una pieza de 400 g, cinco más por cada 100 g de más.',
     'Está cuando la aleta dorsal sale tirando con los dedos.',
     'A este plato le falta la lista de ingredientes en la pestaña Platos: por eso aquí no hay cantidades.'
   ]),

  ('Queso fresco',
   array['queso fresco: 100 g'],
   array[
     'Escurrirlo del suero y cortarlo en lascas gruesas.',
     'Un hilo de aceite y sal en escamas, o miel y nueces si va de postre.',
     'Esto no es una receta: el plato está marcado como preparación media y probablemente debería ser baja, en la pestaña Platos.'
   ])

on conflict (plato) do update
  set pasos = excluded.pasos, cantidades = excluded.cantidades;
