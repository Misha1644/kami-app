// Политика конфиденциальности Kami (RU + ES). Тот же текст — в docs/privacy.md (для ссылки в App Store).
// Поля в [квадратных скобках] нужно заполнить перед публикацией. Текст стоит показать юристу.

export const PRIVACY = {
  ru: {
    title: 'Политика конфиденциальности',
    sections: [
      ['Кто мы', 'Приложение «Kami — школьный испанский» помогает детям-иностранцам понимать уроки в испанской школе. Ответственный за обработку данных: [имя и фамилия или название компании], [адрес]. Связь: [email поддержки].'],
      ['Кто создаёт аккаунт', 'Аккаунт создаёт только родитель или законный представитель ребёнка. В Испании согласие на обработку данных ребёнка младше 14 лет даёт родитель (ст. 7 LOPDGDD). Регистрируясь, родитель подтверждает, что он взрослый и даёт такое согласие.'],
      ['Какие данные мы храним', '• Email и пароль родителя (пароль хранится только в зашифрованном виде).\n• Профиль ребёнка: имя или прозвище, класс, родной язык. Советуем указывать прозвище, а не полное имя.\n• Учёба: выученные слова, ошибки, дни занятий, серия, монеты и купленные за монеты цвета Ками, расписание уроков.\n• Количество разборов заданий за день (только дата, без содержимого).'],
      ['Чего мы НЕ храним', '• Фото и файлы заданий: они передаются на обработку и сразу удаляются, мы их не сохраняем.\n• Записи голоса: остаются только на телефоне и никуда не отправляются.\n• Мы не показываем рекламу, не продаём данные, не используем трекинг и аналитику, а пользователи не могут переписываться друг с другом.'],
      ['Кто обрабатывает данные', '• Supabase (база данных и вход), серверы в ЕС (Париж).\n• Anthropic (ИИ Claude, США) — только когда ребёнок сам отправляет фото или файл задания; Anthropic не использует эти данные для обучения моделей по своим условиям для API.\n• В браузере проверку произношения выполняет сервис распознавания речи самого браузера (например, Google в Chrome). В приложении на телефоне эта функция не отправляет голос.'],
      ['Зачем', 'Только чтобы приложение работало: показывать уроки, считать прогресс, напоминать о занятиях и объяснять задания. Основание — договор (предоставление сервиса) и согласие родителя.'],
      ['Сколько храним', 'Пока существует аккаунт. Удалить аккаунт можно в любой момент: «Родителям» → «Удалить аккаунт». Все данные ребёнка удаляются сразу; в резервных копиях Supabase они могут храниться ещё ограниченное время, после чего удаляются.'],
      ['Ваши права', 'Вы можете получить копию данных, исправить их, удалить, ограничить обработку или возразить против неё, написав на [email поддержки]. Если вы считаете, что права нарушены, можно подать жалобу в Агентство по защите данных Испании (AEPD, www.aepd.es).'],
      ['Изменения', 'Если политика изменится, мы покажем это в приложении. Дата обновления указана ниже.'],
    ],
  },
  es: {
    title: 'Política de privacidad',
    sections: [
      ['Quiénes somos', 'La aplicación «Kami — español para el instituto» ayuda a alumnos extranjeros a entender las clases en el instituto. Responsable del tratamiento: [nombre y apellidos o empresa], [dirección]. Contacto: [email de soporte].'],
      ['Quién crea la cuenta', 'La cuenta solo la crea el padre, la madre o el tutor legal. En España, el consentimiento para tratar los datos de un menor de 14 años lo da su padre, madre o tutor (art. 7 LOPDGDD). Al registrarse, el adulto confirma que es mayor de edad y da ese consentimiento.'],
      ['Qué datos guardamos', '• Email y contraseña del adulto (la contraseña solo se guarda cifrada).\n• Perfil del alumno: nombre o apodo, curso e idioma materno. Recomendamos usar un apodo, no el nombre completo.\n• Aprendizaje: palabras aprendidas, errores, días de estudio, racha, monedas y colores de Kami comprados con monedas, horario de clases.\n• Número de explicaciones de tareas al día (solo la fecha, sin contenido).'],
      ['Qué NO guardamos', '• Fotos y archivos de tareas: se envían para su análisis y se descartan; no los guardamos.\n• Grabaciones de voz: se quedan en el teléfono y no se envían a ningún sitio.\n• No mostramos publicidad, no vendemos datos, no usamos seguimiento ni analítica, y los usuarios no pueden escribirse entre sí.'],
      ['Quién trata los datos', '• Supabase (base de datos e inicio de sesión), servidores en la UE (París).\n• Anthropic (IA Claude, EE. UU.), solo cuando el alumno envía una foto o un archivo de una tarea; según sus condiciones para la API, Anthropic no usa estos datos para entrenar modelos.\n• En el navegador, la comprobación de pronunciación la hace el servicio de reconocimiento de voz del propio navegador (por ejemplo, Google en Chrome). En la app del móvil esta función no envía la voz.'],
      ['Para qué', 'Solo para que la aplicación funcione: mostrar lecciones, contar el progreso, recordar el estudio y explicar tareas. Base legal: ejecución del servicio y consentimiento del padre, madre o tutor.'],
      ['Cuánto tiempo', 'Mientras exista la cuenta. Puede borrarla en cualquier momento: «Родителям» (Familias) → «Удалить аккаунт» (Borrar cuenta). Todos los datos del alumno se borran al instante; en las copias de seguridad de Supabase pueden permanecer un tiempo limitado y después se eliminan.'],
      ['Sus derechos', 'Puede acceder a sus datos, rectificarlos, suprimirlos, limitar su tratamiento u oponerse escribiendo a [email de soporte]. También puede reclamar ante la Agencia Española de Protección de Datos (AEPD, www.aepd.es).'],
      ['Cambios', 'Si la política cambia, lo indicaremos en la aplicación. La fecha de actualización figura abajo.'],
    ],
  },
};
