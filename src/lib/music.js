// Фоновая музыка Ками: купленный трек играет в меню (на уроках — тишина, чтобы не мешать озвучке).
// Треки — оригинальные 8-битные мелодии из scripts/make_music.py, лежат в assets/music.
// value трека в магазине = имя файла.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

const TRACKS = {
  'kami-theme': require('../../assets/music/kami-theme.m4a'),
  'recess': require('../../assets/music/recess.m4a'),
  'orange-boulevard': require('../../assets/music/orange-boulevard.m4a'),
  'malvarrosa': require('../../assets/music/malvarrosa.m4a'),
  'space-review': require('../../assets/music/space-review.m4a'),
  'fallas': require('../../assets/music/fallas.m4a'),
};

const VOLUME = 0.35; // фоновая — тихо
let bg = null; // { value, player }
let preview = null; // { value, player, timer }
let wanted = { value: null, active: false };
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(preview?.value || null));
}

function safe(fn) {
  try { return fn(); } catch (e) { return null; }
}

function apply() {
  const play = wanted.active && wanted.value && TRACKS[wanted.value] && !preview && AppState.currentState !== 'background';
  if (!play) {
    if (bg) safe(() => bg.player.pause());
    return;
  }
  if (!bg || bg.value !== wanted.value) {
    if (bg) safe(() => bg.player.remove());
    const player = safe(() => createAudioPlayer(TRACKS[wanted.value]));
    if (!player) return;
    player.loop = true;
    player.volume = VOLUME;
    bg = { value: wanted.value, player };
  }
  // В браузере звук может не включиться до первого нажатия — тогда просто молчим.
  Promise.resolve(safe(() => bg.player.play())).catch(() => {});
}

AppState.addEventListener?.('change', apply);

// Фоновая музыка: value — трек (или null), active — сейчас «меню» (не урок).
export function useBackgroundMusic(value, active) {
  useEffect(() => {
    wanted = { value, active };
    apply();
  }, [value, active]);
}

// Прослушать трек в магазине (15 секунд). Повторный вызов с тем же треком — стоп.
export function togglePreview(value) {
  const same = preview?.value === value;
  stopPreview();
  if (same || !TRACKS[value]) return;
  const player = safe(() => createAudioPlayer(TRACKS[value]));
  if (!player) return;
  player.volume = 0.6;
  const timer = setTimeout(stopPreview, 15000);
  preview = { value, player, timer };
  apply(); // фоновая на паузу
  Promise.resolve(safe(() => player.play())).catch(() => {});
  notify();
}

export function stopPreview() {
  if (!preview) return;
  clearTimeout(preview.timer);
  safe(() => preview.player.remove());
  preview = null;
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
