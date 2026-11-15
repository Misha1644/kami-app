// «Фразы для школы»: самые нужные фразы для урока и общения в испанской школе.
// Дополнительный раздел: уроки дают монеты, серию верных ответов и сундуки, но огонёк дней не продлевают
// (сервер: record_extra_answer / complete_extra_lesson, миграция 034).
// Испанский — как говорят в Испании (vosotros в командах учителя).

const TOPICS = [
  {
    id: 'clase-pedir', icon: '🙋',
    title: 'Pedir en clase', titleRu: 'Просьбы на уроке', titleEn: 'Asking in class', titleAr: 'طلبات في الصف',
    phrases: [
      ['¿Puedo ir al baño?', 'Можно выйти в туалет?', 'May I go to the toilet?', 'هل يمكنني الذهاب إلى الحمام؟'],
      ['¿Puedo beber agua?', 'Можно попить воды?', 'May I drink some water?', 'هل يمكنني شرب الماء؟'],
      ['¿Puede repetir, por favor?', 'Повторите, пожалуйста', 'Could you repeat, please?', 'هل يمكنك التكرار من فضلك؟'],
      ['No lo entiendo.', 'Я не понимаю.', "I don't understand.", 'لا أفهم.'],
      ['¿Puede hablar más despacio?', 'Можете говорить медленнее?', 'Could you speak more slowly?', 'هل يمكنك التحدث ببطء أكثر؟'],
      ['¿Cómo se dice en español?', 'Как это сказать по-испански?', 'How do you say it in Spanish?', 'كيف نقولها بالإسبانية؟'],
      ['¿Qué significa esta palabra?', 'Что значит это слово?', 'What does this word mean?', 'ماذا تعني هذه الكلمة؟'],
      ['Tengo una pregunta.', 'У меня есть вопрос.', 'I have a question.', 'لدي سؤال.'],
      ['¿Me puede ayudar?', 'Можете мне помочь?', 'Can you help me?', 'هل يمكنك مساعدتي؟'],
      ['Ya he terminado.', 'Я уже закончил(а).', "I've finished.", 'لقد انتهيت.'],
    ],
  },
  {
    id: 'clase-deberes', icon: '📒',
    title: 'Deberes y exámenes', titleRu: 'Домашка и контрольные', titleEn: 'Homework and tests', titleAr: 'الواجبات والاختبارات',
    phrases: [
      ['¿Qué deberes hay para mañana?', 'Что задали на завтра?', "What's the homework for tomorrow?", 'ما هو الواجب لغد؟'],
      ['¿En qué página estamos?', 'На какой мы странице?', 'What page are we on?', 'في أي صفحة نحن؟'],
      ['¿Para cuándo es?', 'К какому дню это нужно?', "When is it due?", 'متى موعد تسليمه؟'],
      ['¿Lo hacemos en el cuaderno?', 'Делаем это в тетради?', 'Do we do it in the notebook?', 'هل نكتبه في الدفتر؟'],
      ['¿Cuándo es el examen?', 'Когда контрольная?', 'When is the test?', 'متى الاختبار؟'],
      ['¿Qué entra en el examen?', 'Что будет на контрольной?', "What's on the test?", 'ماذا يشمل الاختبار؟'],
      ['Se me ha olvidado el libro.', 'Я забыл(а) учебник.', 'I forgot my book.', 'نسيت كتابي.'],
      ['No he hecho los deberes.', 'Я не сделал(а) домашку.', "I haven't done my homework.", 'لم أقم بواجبي.'],
      ['¿Puedo entregarlo mañana?', 'Можно сдать завтра?', 'Can I hand it in tomorrow?', 'هل يمكنني تسليمه غدًا؟'],
      ['¿Está bien así?', 'Так правильно?', 'Is this right?', 'هل هذا صحيح؟'],
    ],
  },
  {
    id: 'clase-profe', icon: '👩‍🏫',
    title: 'Lo que dice el profe', titleRu: 'Что говорит учитель', titleEn: 'What the teacher says', titleAr: 'ما يقوله المعلم',
    phrases: [
      ['Abrid el libro.', 'Откройте учебник.', 'Open your books.', 'افتحوا الكتاب.'],
      ['Sacad el cuaderno.', 'Достаньте тетради.', 'Take out your notebooks.', 'أخرجوا الدفاتر.'],
      ['Silencio, por favor.', 'Тишина, пожалуйста.', 'Quiet, please.', 'هدوء من فضلكم.'],
      ['Levantad la mano.', 'Поднимите руку.', 'Raise your hand.', 'ارفعوا أيديكم.'],
      ['Trabajad en parejas.', 'Работайте в парах.', 'Work in pairs.', 'اعملوا في أزواج.'],
      ['Sal a la pizarra.', 'Выйди к доске.', 'Come to the board.', 'تعال إلى السبورة.'],
      ['Copiad el ejercicio.', 'Перепишите упражнение.', 'Copy the exercise.', 'انسخوا التمرين.'],
      ['Guardad las cosas.', 'Уберите вещи.', 'Put your things away.', 'ضعوا أغراضكم جانبًا.'],
      ['Mirad aquí, por favor.', 'Посмотрите сюда, пожалуйста.', 'Look here, please.', 'انظروا هنا من فضلكم.'],
      ['Haced fila en la puerta.', 'Постройтесь у двери.', 'Line up at the door.', 'اصطفوا عند الباب.'],
    ],
  },
  {
    id: 'clase-amigos', icon: '🤝',
    title: 'Con los compañeros', titleRu: 'С одноклассниками', titleEn: 'With classmates', titleAr: 'مع الزملاء',
    phrases: [
      ['Hola, me llamo Ana.', 'Привет, меня зовут Аня.', "Hi, I'm Ana.", 'مرحبًا، اسمي آنا.'],
      ['¿Cómo te llamas?', 'Как тебя зовут?', "What's your name?", 'ما اسمك؟'],
      ['Soy nuevo en la clase.', 'Я новенький в классе.', "I'm new in the class.", 'أنا جديد في الصف.'],
      ['¿Me dejas un boli?', 'Одолжишь ручку?', 'Can I borrow a pen?', 'هل تعيرني قلمًا؟'],
      ['¿Me explicas esto?', 'Объяснишь мне это?', 'Can you explain this to me?', 'هل تشرح لي هذا؟'],
      ['¿Qué deberes ha mandado?', 'Что задали на дом?', 'What homework did the teacher give?', 'ما الواجب الذي أعطاه المعلم؟'],
      ['¿Jugamos en el recreo?', 'Поиграем на перемене?', "Shall we play at break?", 'هل نلعب في الاستراحة؟'],
      ['¿Me puedo sentar contigo?', 'Можно сесть с тобой?', 'Can I sit with you?', 'هل يمكنني الجلوس معك؟'],
      ['¿De dónde eres?', 'Откуда ты?', 'Where are you from?', 'من أين أنت؟'],
      ['¡Gracias, eres muy majo!', 'Спасибо, ты очень классный!', "Thanks, you're really nice!", 'شكرًا، أنت لطيف جدًا!'],
    ],
  },
  {
    id: 'clase-ayuda', icon: '🆘',
    title: 'Si pasa algo', titleRu: 'Если что-то случилось', titleEn: 'If something happens', titleAr: 'إذا حدث شيء',
    phrases: [
      ['Me encuentro mal.', 'Мне плохо.', "I don't feel well.", 'أشعر بتوعك.'],
      ['Me duele la cabeza.', 'У меня болит голова.', 'I have a headache.', 'رأسي يؤلمني.'],
      ['Necesito ayuda.', 'Мне нужна помощь.', 'I need help.', 'أحتاج إلى مساعدة.'],
      ['¿Puedo llamar a mis padres?', 'Можно позвонить родителям?', 'Can I call my parents?', 'هل يمكنني الاتصال بوالديّ؟'],
      ['Alguien me está molestando.', 'Ко мне кто-то пристаёт.', 'Someone is bothering me.', 'شخص ما يزعجني.'],
      ['He perdido mi mochila.', 'Я потерял(а) рюкзак.', 'I lost my backpack.', 'أضعت حقيبتي.'],
      ['No encuentro el aula.', 'Не могу найти класс.', "I can't find the classroom.", 'لا أجد الفصل.'],
      ['¿Dónde está el comedor?', 'Где столовая?', "Where's the canteen?", 'أين المقصف؟'],
      ['Perdón, llego tarde.', 'Извините, я опоздал(а).', "Sorry, I'm late.", 'آسف، تأخرت.'],
      ['Lo siento, no era mi intención.', 'Простите, я не хотел(а).', "Sorry, I didn't mean to.", 'آسف، لم أقصد ذلك.'],
    ],
  },
];

export const CLASSROOM_SUBJECT = 'Фразы для школы';

// Темы в формате уроков: слова = фразы; «Собери фразу» собирает саму фразу.
export const CLASSROOM_TOPICS = TOPICS.map((t) => ({
  id: t.id,
  icon: t.icon,
  subject: CLASSROOM_SUBJECT,
  subjectCode: 'clase',
  title: t.title,
  titleRu: t.titleRu,
  titleEn: t.titleEn,
  titleAr: t.titleAr,
  extra: true,
  custom: true,
  words: t.phrases.map(([es, ru, en, ar], i) => ({ id: `${t.id}-${i + 1}`, es, ru, en, ar, teacher: es, lang: 'es-ES' })),
}));

export const isClassroomTopic = (id) => typeof id === 'string' && id.startsWith('clase-');
