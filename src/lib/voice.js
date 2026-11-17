// Отработка голосом.
// На телефоне: запись своего голоса (expo-audio) и прослушивание — сравниваешь с Ками сам.
// В браузере (Chrome, Edge, Safari): ещё и автоматическая проверка через распознавание речи.
// Автопроверку на телефоне можно добавить позже, в отдельной сборке приложения
// (модуль expo-speech-recognition не работает в Expo Go и Snack).
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
  createAudioPlayer,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { tr } from '../i18n';

function webRecognition() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export const canAutoCheck = () => !!webRecognition();

// Распознать одну фразу в браузере. Возвращает варианты услышанного.
export function recognizeOnce(lang = 'es-ES') {
  const Recognition = webRecognition();
  if (!Recognition) return Promise.reject(new Error('unsupported'));
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 5;
    let done = false;
    r.onresult = (e) => {
      done = true;
      const res = e.results[0];
      const list = [];
      for (let i = 0; i < res.length; i++) list.push(res[i].transcript);
      resolve(list);
    };
    r.onerror = (e) => { if (!done) { done = true; reject(new Error(e.error || 'error')); } };
    r.onend = () => { if (!done) { done = true; resolve([]); } };
    r.start();
  });
}

// Распознавание «вживую»: onPartial получает услышанное по ходу речи (для подсветки слов).
// isDone(text) → true — можно заканчивать сразу (всё нужное уже сказано).
// Возвращает все варианты услышанного (окончательные и последний промежуточный).
export function recognizeLive(lang = 'es-ES', { onPartial, isDone } = {}) {
  const Recognition = webRecognition();
  if (!Recognition) return Promise.reject(new Error('unsupported'));
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 5;
    let done = false;
    let last = '';
    const alts = new Set();
    const finish = () => { if (!done) { done = true; if (last) alts.add(last); resolve([...alts]); } };
    r.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        text += (text ? ' ' : '') + res[0].transcript;
        if (res.isFinal) for (let a = 0; a < res.length; a++) alts.add(res[a].transcript);
      }
      last = text;
      onPartial?.(text);
      if (isDone?.(text)) { try { r.stop(); } catch (err) { /* ignore */ } finish(); }
    };
    r.onerror = (e) => {
      if (done) return;
      if (e.error === 'no-speech' || e.error === 'aborted') { finish(); return; }
      done = true;
      reject(new Error(e.error || 'error'));
    };
    r.onend = finish;
    try { r.start(); } catch (err) { done = true; reject(err); }
    setTimeout(() => { try { r.stop(); } catch (err) { /* ignore */ } }, 8000); // не слушать вечно
  });
}

// Запись голоса: моно, как для речи. 17 ноя: стерео-запись с двух микрофонов iPhone
// звучала «эхом» — теперь один канал.
const VOICE_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  sampleRate: 44100,
  ios: { ...(RecordingPresets.HIGH_QUALITY.ios || {}), numberOfChannels: 1 },
  android: { ...(RecordingPresets.HIGH_QUALITY.android || {}), numberOfChannels: 1 },
};

// Запись своего голоса и прослушивание.
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(VOICE_PRESET);
  const player = useRef(null);
  const [recording, setRecording] = useState(false);
  const [uri, setUri] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => () => {
    try { player.current?.remove(); } catch (e) { /* ignore */ }
  }, []);

  async function start() {
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError(tr('Нужен доступ к микрофону. Разреши его в настройках телефона.'));
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setUri(null);
      setRecording(true);
    } catch (e) {
      setError(tr('Не получилось включить микрофон.'));
    }
  }

  async function stop() {
    let done = null;
    try {
      await recorder.stop();
      done = recorder.uri;
    } catch (e) {
      setError(tr('Запись не сохранилась, попробуй ещё раз.'));
    }
    setRecording(false);
    // Сначала выключаем режим записи (звук — в громкий динамик), и только потом даём слушать:
    // иначе запись могла начать играть, пока телефон ещё «слушает» микрофон, — получалось эхо.
    try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch (e) { /* ignore */ }
    try { player.current?.remove(); } catch (e) { /* ignore */ }
    player.current = null;
    if (done) setUri(done);
  }

  // Своя запись: один плеер на запись; повторное нажатие — сначала, а не второй плеер поверх первого.
  function playMine() {
    if (!uri) return;
    try {
      Speech.stop();
      if (!player.current || player.current.__uri !== uri) {
        try { player.current?.remove(); } catch (e) { /* ignore */ }
        player.current = createAudioPlayer(uri);
        player.current.__uri = uri;
      }
      const p = player.current;
      Promise.resolve(p.seekTo?.(0)).catch(() => {}).finally(() => p.play());
    } catch (e) {
      setError(tr('Не получилось воспроизвести запись.'));
    }
  }

  return { recording, uri, error, start, stop, playMine };
}
