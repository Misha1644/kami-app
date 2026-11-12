-- Легендарные вещи — очень дорогие, на месяцы занятий.
-- Фоны с узором: value = 'pattern:<узор>:<цвет>'.
insert into public.shop_items (id, kind, title_ru, price, value, sort, plus_only) values
  ('color-fire',      'color',  'Огненный Ками',        5000,  '#E4572E', 15, false),
  ('color-night',     'color',  'Ночной Ками',          12000, '#2E3A59', 16, false),
  ('color-platinum',  'color',  'Платиновый Ками',      50000, '#A9B8C2', 17, false),
  ('avatar-dragon',   'avatar', 'Дракон',               10000, 'dragon',    44, false),
  ('avatar-unicorn',  'avatar', 'Единорог',             15000, 'unicorn',   45, false),
  ('avatar-kami-king','avatar', 'Ками-король',          25000, 'kami-king', 46, false),
  ('avatar-astronaut','avatar', 'Космонавт',            50000, 'astronaut', 47, false),
  ('bg-oranges',      'bg',     'Апельсины Валенсии',   5000,  'pattern:oranges:#FFF6E8', 57, false),
  ('bg-stars',        'bg',     'Золотые звёзды',       10000, 'pattern:stars:#FFF9E6',   58, false),
  ('bg-confetti',     'bg',     'Конфетти Fallas',      20000, 'pattern:confetti:#FFFFFF', 59, false)
on conflict (id) do update set kind = excluded.kind, title_ru = excluded.title_ru, price = excluded.price,
  value = excluded.value, sort = excluded.sort, plus_only = excluded.plus_only;
