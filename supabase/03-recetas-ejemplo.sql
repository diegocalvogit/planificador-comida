-- Tres recetas de ejemplo, de las más elaboradas que tienes, para ver si el
-- formato convence antes de escribir las otras veintiuna.
--
-- El criterio: pasos cortos, en imperativo, con el tiempo dentro del paso al
-- que pertenece y no en una línea aparte. Se leen de pie y con las manos
-- ocupadas, así que lo que importa es el orden y cuándo pasar al siguiente.
-- Los ingredientes no se repiten aquí: ya salen arriba en la ficha.

insert into public.recetas (plato, pasos) values
  ('Berenjenas rellenas', array[
    'Horno a 200°. Partir las berenjenas a lo largo y hacerles cortes en cruz sin llegar a la piel.',
    'Un chorro de aceite y 25 min al horno, boca arriba, hasta que la carne ceda al apretar.',
    'Vaciarlas con una cuchara dejando medio centímetro de pared. Picar la carne y reservar.',
    'Pochar la cebolla picada 8 min. Añadir el pollo picado y dorarlo.',
    'Echar la carne de berenjena y el tomate frito. 5 min a fuego medio hasta que no suelte agua.',
    'Rellenar las barcas, cubrir de queso rallado y gratinar 5 min.'
  ]),
  ('Paella de marisco y carne', array[
    'Salpimentar el pollo a tacos y dorarlo en la paellera con aceite. Retirar.',
    'En el mismo aceite, el pimiento rojo en tiras 5 min. Añadir los calamares en aros, 3 min más.',
    'Volver a meter el pollo. Añadir el arroz y remover 2 min para que se nacare.',
    'Caldo caliente, el doble de volumen que de arroz, y el azafrán. Probar de sal ahora: después ya no se toca.',
    'Fuego fuerte 8 min, luego flojo 8 min. No remover a partir de aquí.',
    'Poner las gambas por encima en los últimos 5 min.',
    'Apagar y dejar 5 min tapada con un paño antes de servir.'
  ]),
  ('Lentejas con verduras y pollo', array[
    'Pochar en la olla la cebolla y el pimiento verde picados, 8 min.',
    'Añadir la zanahoria y el calabacín en dados, 5 min más.',
    'Dorar el pollo a tacos con las verduras.',
    'Echar las lentejas y la patata en cascos. Remover un minuto.',
    'Cubrir con agua dos dedos por encima y llevar a hervir. Espumar.',
    'Fuego bajo 35 min en olla normal, o 12 min desde la válvula en olla rápida.',
    'Dejar reposar 10 min: espesan al enfriarse un poco.'
  ])
on conflict (plato) do update set pasos = excluded.pasos;
