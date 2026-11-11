// Учебный контент первой версии: 1º ESO, две темы.
// Позже эти данные переедут в базу Supabase (таблицы topics и words).
// У каждого слова: испанский термин, перевод (ru, en) и фраза, как её скажет учитель.

export const GRADE = '1º ESO';

export const topics = [
  {
    id: 'mat-fracciones',
    subject: 'Matemáticas',
    title: 'las fracciones',
    titleRu: 'дроби',
    lessonSlot: '1-й урок',
    words: [
      { id: 'w-fraccion', es: 'la fracción', ru: 'дробь', en: 'fraction', teacher: 'Una fracción representa una parte de la unidad.' },
      { id: 'w-numerador', es: 'el numerador', ru: 'числитель', en: 'numerator', teacher: 'El numerador indica cuántas partes tomamos.' },
      { id: 'w-denominador', es: 'el denominador', ru: 'знаменатель', en: 'denominator', teacher: 'El denominador indica en cuántas partes iguales se divide la unidad.' },
      { id: 'w-simplificar', es: 'simplificar', ru: 'сокращать (дробь)', en: 'to simplify', teacher: 'Para simplificar, dividimos el numerador y el denominador entre el mismo número.' },
      { id: 'w-equivalentes', es: 'las fracciones equivalentes', ru: 'равные дроби', en: 'equivalent fractions', teacher: 'Dos fracciones son equivalentes si representan la misma cantidad.' },
      { id: 'w-irreducible', es: 'la fracción irreducible', ru: 'несократимая дробь', en: 'irreducible fraction', teacher: 'Una fracción irreducible no se puede simplificar más.' },
      { id: 'w-mcd', es: 'el máximo común divisor', ru: 'наибольший общий делитель', en: 'greatest common divisor', teacher: 'Usamos el máximo común divisor para simplificar la fracción al máximo.' },
    ],
  },
  {
    id: 'bio-celula',
    subject: 'Biología',
    title: 'la célula',
    titleRu: 'клетка',
    lessonSlot: '3-й урок',
    words: [
      { id: 'w-celula', es: 'la célula', ru: 'клетка', en: 'cell', teacher: 'La célula es la unidad básica de los seres vivos.' },
      { id: 'w-nucleo', es: 'el núcleo', ru: 'ядро', en: 'nucleus', teacher: 'El núcleo contiene el material genético.' },
      { id: 'w-membrana', es: 'la membrana plasmática', ru: 'клеточная мембрана', en: 'cell membrane', teacher: 'La membrana plasmática rodea la célula.' },
      { id: 'w-citoplasma', es: 'el citoplasma', ru: 'цитоплазма', en: 'cytoplasm', teacher: 'El citoplasma está entre la membrana y el núcleo.' },
      { id: 'w-mitocondria', es: 'la mitocondria', ru: 'митохондрия', en: 'mitochondrion', teacher: 'Las mitocondrias obtienen energía de los nutrientes.' },
      { id: 'w-eucariota', es: 'la célula eucariota', ru: 'эукариотическая клетка', en: 'eukaryotic cell', teacher: 'Las células eucariotas tienen núcleo.' },
    ],
  },
];

export function learnedCount(topic, learned) {
  return topic.words.filter((w) => learned[w.id]).length;
}
