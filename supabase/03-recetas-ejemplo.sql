-- Dos recetas escritas enteras, para ver si el formato convence antes de hacer
-- las otras veintidós.
--
-- El criterio:
--
--   · Cantidades POR PERSONA. Multiplicar por cuatro es fácil; dividir una
--     receta «para seis» por tres y medio, no.
--   · Los pasos van en apartados. Una línea acabada en dos puntos es un
--     apartado y lo que viene debajo son sus viñetas, así que la jerarquía se
--     escribe igual que se dicta, sin editor de árboles.
--   · Viñetas cortas y en imperativo, con el tiempo dentro del paso al que
--     pertenece. Esto se lee de pie y con las manos ocupadas: lo que hace falta
--     saber es qué toca ahora y cuándo pasar a lo siguiente.
--   · Los ingredientes no se repiten en los pasos: ya están arriba con su peso.
--   · Lo que no está en la lista del plato —sal, pimienta, un chorro de aceite—
--     se nombra en el paso pero no se pesa: no se compra para una receta.
--   · Las cantidades se escriben CON NÚMEROS, nunca «media cebolla» ni «un
--     cuarto»: la pantalla las multiplica por los comensales, y una palabra no
--     se puede multiplicar.

insert into public.recetas (plato, cantidades, pasos) values

  ('Berenjenas rellenas',
   array[
     'berenjena: 1 unidad (250 g)',
     'carne picada de pollo: 100 g',
     'cebolla: 40 g',
     'tomate frito: 3 cucharadas (50 g)',
     'queso rallado: 30 g'
   ],
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
   array[
     'arroz: 100 g',
     'pechuga de pollo: 100 g',
     'calamares: 80 g',
     'gambas: 6 unidades (80 g)',
     'pimiento rojo: 40 g',
     'caldo de pescado: 250 ml',
     'azafrán: unas hebras',
     'aceite de oliva: 1 cucharada'
   ],
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
   ])

on conflict (plato) do update
  set pasos = excluded.pasos, cantidades = excluded.cantidades;
