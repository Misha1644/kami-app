// Подключение к базе Supabase.
// Публичный (publishable) ключ можно хранить в приложении: он не даёт прав сверх
// правил доступа (RLS) в базе. Секретный ключ сюда класть НЕЛЬЗЯ никогда.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xaeditsttxhpcyigbuio.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_stoOZ9pIcV34AhFmmpmhKA_y8WXS4IP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
