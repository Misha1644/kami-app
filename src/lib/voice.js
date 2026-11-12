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

// Запись своего голоса и прослушивание.
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
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
        setError('Нужен доступ к микрофону. Разреши его в настройках телефона.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setUri(null);
      setRecording(true);
    } catch (e) {
      setError('Не получилось включить микрофон.');
    }
  }

  async function stop() {
    try {
      await recorder.stop();
      setUri(recorder.uri);
    } catch (e) {
      setError('Запись не сохранилась, попробуй ещё раз.');
    }
    setRecording(false);
    // Возвращаем звук в динамик, чтобы голос Ками было слышно громко.
    try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch (e) { /* ignore */ }
  }

  function playMine() {
    if (!uri) return;
    try {
      player.current?.remove();
      player.current = createAudioPlayer(uri);
      player.current.play();
    } catch (e) {
      setError('Не получилось воспроизвести запись.');
    }
  }

  return { recording, uri, error, start, stop, playMine };
}
