// Настройки выпуска.
// PLUS_ENABLED — подписка «Ками Плюс» включена: отчёты и разбор фото только с Плюсом,
//   есть пробный период на 3 дня. Если false — всё открыто бесплатно, о Плюсе ни слова.
// PAYMENTS_ENABLED — подключена ли оплата через App Store / Google Play.
//   Пока false, купить нельзя (только пробный период). ПЕРЕД ПУБЛИКАЦИЕЙ: либо подключить
//   оплату и поставить true, либо поставить PLUS_ENABLED = false.
export const PLUS_ENABLED = true;
export const PAYMENTS_ENABLED = false;
export const TRIAL_DAYS = 3;

// Почта поддержки (обязательна для App Store). ЗАПОЛНИТЬ перед публикацией.
export const SUPPORT_EMAIL = '';

// Версия политики конфиденциальности: при изменении текста — обновить дату.
export const PRIVACY_UPDATED = '12.11.2026';
