#!/usr/bin/env python3
"""Короткие звуки ответов для уроков (свои, сгенерированы для Ками):
  correct.m4a — два светлых звонких тона вверх;
  wrong.m4a   — мягкий низкий «бум» вниз.
Запуск: python3 scripts/make_sfx.py → assets/sfx/*.m4a (нужны numpy, scipy, ffmpeg).
"""
import os
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sfx')


def tone(f, dur, decay, harmonics=((1, 1.0), (2, 0.25), (3, 0.08))):
    t = np.arange(int(dur * SR)) / SR
    w = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in harmonics)
    attack = np.clip(t / 0.004, 0, 1)
    return w * attack * np.exp(-t * decay)


def correct():
    a = tone(1046.5, 0.18, 14)            # C6
    b = tone(1568.0, 0.45, 8)             # G6
    out = np.zeros(int(0.5 * SR))
    out[: len(a)] += a
    s = int(0.085 * SR)
    out[s: s + len(b)] += b[: len(out) - s]
    return out


def wrong():
    t = np.arange(int(0.32 * SR)) / SR
    f = 220 - 90 * t / t[-1]              # плавно вниз
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = 0.8 * np.sin(ph) + 0.2 * np.sin(2 * ph)
    return w * np.clip(t / 0.006, 0, 1) * np.exp(-t * 9)


def save(name, x, level=0.7):
    x = x / (np.max(np.abs(x)) + 1e-9) * level
    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        wavfile.write(f.name, SR, (x * 32767).astype(np.int16))
        wav = f.name
    out = os.path.join(OUT, name + '.m4a')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '44100',
                    '-c:a', 'aac', '-b:a', '64k', out], check=True)
    os.unlink(wav)
    print(name, os.path.getsize(out), 'байт')


if __name__ == '__main__':
    save('correct', correct(), 0.6)
    save('wrong', wrong(), 0.55)
