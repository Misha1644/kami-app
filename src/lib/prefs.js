// Настройки этого устройства (не синхронизируются): озвучка и упражнения.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setVoiceSlow } from './speech';

const KEY = 'kami.prefs';
export const DEFAULT_PREFS = {
  autoplay: true,     // сразу озвучивать новое слово
  speaking: true,     // упражнения «Скажи вслух»
  slowVoice: false,   // говорить медленнее
};

export async function loadPrefs() {
  try {
    const p = { ...DEFAULT_PREFS, ...JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') };
    setVoiceSlow(p.slowVoice);
    return p;
  } catch (e) {
    return DEFAULT_PREFS;
  }
}

export async function savePrefs(p) {
  setVoiceSlow(p.slowVoice);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* не страшно */ }
}
