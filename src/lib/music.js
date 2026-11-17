// Фоновая музыка Ками: купленный трек играет в меню (на уроках — тишина, чтобы не мешать озвучке).
// Треки — оригинальные 8-битные мелодии из scripts/make_music.py, лежат в assets/music.
// value трека в магазине = имя файла.
//
// 17 ноя: «музыку невозможно выключить» — исправлено:
//  1) плееры хранятся в globalThis: после перезагрузки кода (обновление в Expo Go) старый плеер
//     больше не остаётся играть «сиротой» — его находим и останавливаем;
//  2) в меню музыка слушается беззвучного режима iPhone (переключатель сбоку); на уроках звук
//     слов работает и в беззвучном режиме, как раньше;
//  3) быстрая кнопка 🔇 на главной (prefs.music) и выключение при уходе приложения в фон.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const TRACKS = {
  'kami-theme': require('../../assets/music/kami-theme.m4a'),
  'recess': require('../../assets/music/recess.m4a'),
  'orange-boulevard': require('../../assets/music/orange-boulevard.m4a'),
  'malvarrosa': require('../../assets/music/malvarrosa.m4a'),
  'space-review': require('../../assets/music/space-review.m4a'),
  'fallas': require('../../assets/music/fallas.m4a'),
};

const VOLUME = 0.35; // фоновая — тихо

// Общее состояние переживает перезагрузку модуля.
if (!globalThis.__kamiMusic) globalThis.__kamiMusic = { bg: null, preview: null, wanted: { value: null, active: false }, sub: null, silentMode: null };
const S = globalThis.__kamiMusic;
const listeners = new Set();

function safe(fn) {
  try { return fn(); } catch (e) { return null; }
}

function kill(entry) {
  if (!entry) return;
  safe(() => entry.player.pause());
  safe(() => entry.player.remove());
}

// Пока играет фоновая музыка — уважать беззвучный режим; иначе (уроки, озвучка слов) — звук слышен всегда.
function audioMode(music) {
  const silent = music ? 'respect' : 'ignore';
  if (S.silentMode === silent) return;
  S.silentMode = silent;
  Promise.resolve(safe(() => setAudioModeAsync({ playsInSilentMode: !music }))).catch(() => {});
}

function notify() {
  listeners.forEach((fn) => fn(S.preview?.value || null));
}

function apply() {
  const { value, active } = S.wanted;
  const foreground = AppState.currentState === 'active' || AppState.currentState == null;
  const play = !!(active && value && TRACKS[value] && !S.preview && foreground);
  audioMode(play);
  if (!play) {
    // Не просто пауза: плеер удаляем, чтобы ничего не могло «доиграть».
    kill(S.bg);
    S.bg = null;
    return;
  }
  if (!S.bg || S.bg.value !== value) {
    kill(S.bg);
    const player = safe(() => createAudioPlayer(TRACKS[value]));
    if (!player) { S.bg = null; return; }
    player.loop = true;
    player.volume = VOLUME;
    S.bg = { value, player };
  }
  // В браузере звук может не включиться до первого нажатия — тогда просто молчим.
  Promise.resolve(safe(() => S.bg.player.play())).catch(() => {});
}

// Подписка на фон/возврат — одна, даже после перезагрузки кода.
safe(() => S.sub?.remove?.());
S.sub = safe(() => AppState.addEventListener('change', apply));

// Фоновая музыка: value — трек (или null = тишина), active — сейчас «меню» (не урок).
export function useBackgroundMusic(value, active) {
  useEffect(() => {
    S.wanted = { value, active };
    apply();
  }, [value, active]);
  // Приложение закрыли/вышли из аккаунта — тишина.
  useEffect(() => () => { S.wanted = { value: null, active: false }; apply(); }, []);
}

// Прослушать трек в магазине (15 секунд). Повторный вызов с тем же треком — стоп.
export function togglePreview(value) {
  const same = S.preview?.value === value;
  stopPreview();
  if (same || !TRACKS[value]) return;
  const player = safe(() => createAudioPlayer(TRACKS[value]));
  if (!player) return;
  player.volume = 0.6;
  const timer = setTimeout(stopPreview, 15000);
  S.preview = { value, player, timer };
  apply(); // фоновая останавливается
  Promise.resolve(safe(() => player.play())).catch(() => {});
  notify();
}

export function stopPreview() {
  if (!S.preview) return;
  clearTimeout(S.preview.timer);
  kill(S.preview);
  S.preview = null;
  apply();
  notify();
}

// Какой трек сейчас играет в прослушивании (для кнопки ▶ / ■).
export function usePreviewState(setter) {
  useEffect(() => {
    listeners.add(setter);
    return () => { listeners.delete(setter); };
  }, [setter]);
}

export const hasTrack = (value) => !!TRACKS[value];
