# Kami — тексты и ответы для App Store и Google Play

## Основное
- **Название:** Kami: español para el instituto
- **Подзаголовок (iOS, до 30 символов):** Español para alumnos nuevos
- **Категория:** Образование (Education). Не «Kids Category»: приложение для 12–14 лет, аккаунт заводит родитель.
- **Возрастной рейтинг:** 4+ (iOS) / «Для всех» (Google). Нет насилия, рекламы, общения между пользователями, веб-браузера.
- **Цена:** бесплатно; подписка «Ками Плюс» через встроенные покупки (нужно подключить до выпуска, см. `src/config.js`).
- **Ссылка на политику:** https://claude.ai/artifact/JkQ65UuFf8UXMPG8fArUXN (сделать публичной; исходник — docs/privacy.html, собирается из src/data/privacy.js).
- **Поддержка:** email из `src/config.js` → `SUPPORT_EMAIL` (заполнить).
- **Bundle ID / package:** `com.misha1644.kami`

## Описание (ES)
Kami ayuda a los alumnos que acaban de llegar a España a entender las clases del instituto.
Cada tarde, Kami —un camaleón que también acaba de mudarse a Valencia— te prepara para las asignaturas de mañana según tu horario.

• Más de 600 palabras de 1º y 2º de ESO: Matemáticas, Biología, Geografía e Historia, Lengua, Física y Química, Valencià, Inglés, Educación Física, Música, Tecnología, Plástica y Tutoría.
• Escucha cómo lo dice el profesor y practica con ejercicios: elige, escucha, escribe, dictado, ordena la frase y dilo en voz alta.
• Repaso inteligente: las palabras vuelven justo cuando se te empiezan a olvidar.
• Racha diaria, monedas y colores para Kami.
• Recordatorio a las 19:00 con las clases de mañana.
• Para las familias: progreso por asignaturas y palabras difíciles.

Sin anuncios. Sin chat entre usuarios. La cuenta la crea un adulto.

## Описание (RU)
Kami помогает детям, которые только переехали в Испанию, понимать уроки в школе.
Каждый вечер хамелеон Ками — он тоже недавно переехал в Валенсию — готовит к завтрашним предметам по твоему расписанию.

• Больше 600 слов 1º и 2º ESO по всем 12 предметам, включая валенсийский.
• Слушай, как скажет учитель, и тренируйся: выбери, услышь, напиши, диктант, собери фразу, скажи вслух.
• Умное повторение: слова возвращаются, когда начинают забываться.
• Серия дней, монеты и цвета для Ками. Напоминание в 19:00.
• Для родителей: прогресс по предметам и трудные слова.

Без рекламы. Без переписки между пользователями. Аккаунт создаёт взрослый.

## Ключевые слова (iOS, до 100 символов)
español,ESO,instituto,vocabulario,extranjeros,Valencia,estudiar,deberes,colegio,idiomas

## Скриншоты
Нужны с iPhone 6,9" (1320×2868) и 6,5" (1284×2778) — минимум 3: «Сегодня», урок (карточка слова), «Собери фразу», расписание, «Родителям». Снять с настоящей сборки (TestFlight) на тестовом аккаунте с прозвищем, без реальных данных ребёнка.

## App Privacy (iOS) — «Конфиденциальность в App Store»
| Тип данных | Собирается? | Зачем | Связано с пользователем | Трекинг |
|---|---|---|---|---|
| Контакты → Email | Да | Работа приложения (вход) | Да | Нет |
| Пользовательский контент → Другое (прогресс, расписание) | Да | Работа приложения | Да | Нет |
| Фото и видео | Нет* | — | — | — |
| Аудио | Нет (запись остаётся на телефоне) | — | — | — |
| Идентификаторы, геолокация, аналитика, реклама | Нет | — | — | — |

\* Фото задания отправляется на обработку и не хранится — по правилам Apple это не «сбор», если данные не хранятся дольше, чем нужно для ответа.

## Google Play — Data safety
- Собирается: email (аккаунт), действия в приложении/прогресс (функциональность). Шифрование при передаче — да. Удаление по запросу — да (в приложении).
- Фото: передаются для обработки, не хранятся («processed ephemerally»).
- Целевая аудитория: в Play Console выбрать возраст, включающий 12–13 лет → действуют правила **Families Policy**: без рекламы и сторонних SDK для аналитики — у нас их нет.

## Аккаунт для проверки (App Review)
Apple и Google попросят тестовый вход. Создать отдельный аккаунт (email + пароль) с профилем ребёнка «Demo» и указать в форме проверки. Подтверждение по коду — пройти заранее.
