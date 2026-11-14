#!/usr/bin/env python3
"""Генератор музыки для магазина Ками: оригинальные 8-битные мелодии (сочинены для проекта, без чужих
произведений — авторских прав третьих лиц нет). Каждая мелодия — 16 тактов, бесшовный цикл.

Запуск:  python3 scripts/make_music.py            → assets/music/<id>.m4a
Нужны: numpy, scipy, ffmpeg.
"""
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT_SR = 32000
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'music')

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', name)
    if not m:
        raise ValueError(name)
    n = NOTE[m.group(1)] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1) + n


def freq(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_notes(sym):
    """'Am' → [57, 60, 64] (корень в 3-й октаве), 'F#m', 'Bb', 'Bdim', 'G7'."""
    m = re.fullmatch(r'([A-G][#b]?)(m|dim)?(7)?', sym)
    root = midi(m.group(1) + '3')
    third = 3 if m.group(2) in ('m', 'dim') else 4
    fifth = 6 if m.group(2) == 'dim' else 7
    notes = [root, root + third, root + fifth]
    if m.group(3):
        notes.append(root + 10)
    return notes


# ---------- генераторы звука ----------

def pulse(f, n, duty, phase0=0.0):
    t = (np.arange(n) * f / SR + phase0) % 1.0
    return np.where(t < duty, 1.0, -1.0)


def triangle(f, n):
    t = (np.arange(n) * f / SR) % 1.0
    return 4 * np.abs(t - 0.5) - 1


def env(n, attack=0.005, decay=0.08, sustain=0.6, release=0.04, gate=None):
    gate = n if gate is None else min(gate, n)
    e = np.zeros(n)
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    idx = np.arange(n)
    e = np.where(idx < a, idx / a, sustain + (1 - sustain) * np.exp(-(idx - a) / d))
    rel = idx >= gate
    e[rel] = e[gate - 1 if gate > 0 else 0] * np.exp(-(idx[rel] - gate) / r)
    return e


def place(buf, sig, start):
    """Записать звук в буфер с переносом хвоста в начало (бесшовный цикл)."""
    L = len(buf)
    start %= L
    end = start + len(sig)
    if end <= L:
        buf[start:end] += sig
    else:
        k = L - start
        buf[start:] += sig[:k]
        rest = sig[k:]
        while len(rest):
            m = min(L, len(rest))
            buf[:m] += rest[:m]
            rest = rest[m:]


# ---------- барабаны ----------

def kick():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 18)


def snare():
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(1)
    noise = rng.uniform(-1, 1, n)
    noise = sosfilt(butter(2, 1500, 'hp', fs=SR, output='sos'), noise)
    return (0.8 * noise + 0.3 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 28)


def hat(open_=False):
    n = int((0.09 if open_ else 0.03) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(2)
    noise = sosfilt(butter(2, 7000, 'hp', fs=SR, output='sos'), rng.uniform(-1, 1, n))
    return noise * np.exp(-t * (30 if open_ else 110))


def clap():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(3)
    noise = sosfilt(butter(2, [900, 4000], 'bp', fs=SR, output='sos'), rng.uniform(-1, 1, n))
    bursts = np.zeros(n)
    for ms in (0, 9, 18):
        s = int(ms / 1000 * SR)
        bursts[s:] += np.exp(-(t[: n - s]) * 70)
    return noise * bursts * 0.9


def shaker():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(4)
    noise = sosfilt(butter(2, 5000, 'hp', fs=SR, output='sos'), rng.uniform(-1, 1, n))
    return noise * np.sin(np.pi * t / t[-1]) * 0.6


DRUMS = {
    # шаг = 8-я доля; на такт 8 шагов
    'pop':    {'k': [0, 4], 's': [2, 6], 'h': [0, 1, 2, 3, 4, 5, 6, 7]},
    'drive':  {'k': [0, 3, 4], 's': [2, 6], 'h': [0, 1, 2, 3, 4, 5, 6, 7], 'o': [7]},
    'palmas': {'k': [0, 4], 'c': [2, 3, 6, 7], 'h': [1, 5]},
    'soft':   {'k': [0, 5], 's': [4], 'sh': [0, 1, 2, 3, 4, 5, 6, 7]},
    'space':  {'k': [0], 's': [4], 'h': [2, 6]},
    'march':  {'k': [0, 2, 4, 6], 's': [2, 6, 7], 'h': [1, 3, 5, 7], 'o': [6]},
}


# ---------- партитура ----------

def parse_line(line):
    """'E5 .5 G5 .5 r 1' → [(midi|None, beats), ...]"""
    tok = line.split()
    out = []
    for i in range(0, len(tok), 2):
        n, d = tok[i], float(tok[i + 1])
        out.append((None if n == 'r' else midi(n), d))
    return out


def render(track):
    bpm = track['bpm']
    spb = 60.0 / bpm
    bars = track['chords']
    mel = track['melody']
    assert len(bars) == len(mel) == 16, track['id']
    total = int(round(16 * 4 * spb * SR))
    lead = np.zeros(total)
    harm = np.zeros(total)
    bass = np.zeros(total)
    drum = np.zeros(total)
    at = lambda beat: int(round(beat * spb * SR))
    oct_shift = track.get('octave', 0)

    # мелодия
    beat = 0.0
    for b, line in enumerate(mel):
        notes = parse_line(line)
        s = sum(d for _, d in notes)
        assert abs(s - 4) < 1e-6, f"{track['id']} такт {b + 1}: {s} долей"
        for m, d in notes:
            if m is not None:
                m += oct_shift
                n = at(d) + int(0.12 * SR)
                gate = int(at(d) * track.get('gate', 0.85))
                f0 = freq(m)
                tt = np.arange(n) / SR
                vib = 1 + (0.004 * np.sin(2 * np.pi * 5.5 * tt) * np.clip((tt - 0.18) * 4, 0, 1) if d >= 1 else 0)
                ph = np.cumsum(f0 * vib) / SR
                duty = track.get('duty', 0.25)
                w = np.where((ph % 1.0) < duty, 1.0, -1.0)
                if track.get('double'):
                    w = 0.7 * w + 0.3 * np.where(((ph * 2) % 1.0) < 0.5, 1.0, -1.0)
                e = env(n, decay=track.get('decay', 0.15), sustain=track.get('sustain', 0.65), gate=gate)
                place(lead, w * e, at(beat))
                if track.get('echo'):
                    place(lead, w * e * 0.35, at(beat + 0.75))
            beat += d

    # аккорды и бас
    beat = 0.0
    for bar in bars:
        parts = bar.split()
        each = 4 / len(parts)
        for sym in parts:
            ch = chord_notes(sym)
            root = ch[0]
            style = track['harm']
            if style in ('arp8', 'arp16'):
                step = 0.5 if style == 'arp8' else 0.25
                seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[0] + 24, ch[2] + 12]
                k = 0
                x = 0.0
                while x < each - 1e-9:
                    m = seq[k % len(seq)]
                    n = at(step) + int(0.03 * SR)
                    w = pulse(freq(m), n, 0.125)
                    place(harm, w * env(n, decay=0.06, sustain=0.3, gate=at(step) - 50), at(beat + x))
                    k += 1
                    x += step
            elif style == 'stab':
                x = 0.5
                while x < each - 1e-9:
                    n = at(0.25)
                    w = sum(pulse(freq(m + 12), n, 0.5) for m in ch) / 3
                    place(harm, w * env(n, decay=0.05, sustain=0.2, gate=n - 50), at(beat + x))
                    x += 1.0
            elif style == 'pad':
                n = at(each) + int(0.05 * SR)
                w = sum(pulse(freq(m + 12), n, 0.5, phase0=i * 0.3) for i, m in enumerate(ch)) / 3
                place(harm, w * env(n, attack=0.08, decay=0.4, sustain=0.5, gate=at(each)), at(beat))
            # бас
            bstyle = track['bass']
            b0 = root - 12
            if bstyle == 'oct8':
                pat = [(0, b0), (0.5, b0 + 12)]
                step = 1.0
            elif bstyle == 'root5':
                pat = [(0, b0), (1, b0 + 7), (2, b0), (3, b0 + 7)]
                step = 4.0
            else:  # 'half'
                pat = [(0, b0), (2, b0 + 7)]
                step = 4.0
            x = 0.0
            while x < each - 1e-9:
                for off, m in pat:
                    if x + off >= each - 1e-9:
                        continue
                    dur = 0.45 if bstyle == 'oct8' else (0.9 if bstyle == 'root5' else 1.8)
                    n = at(dur) + int(0.03 * SR)
                    place(bass, triangle(freq(m), n) * env(n, decay=0.2, sustain=0.8, gate=at(dur)), at(beat + x + off))
                x += step
            beat += each

    # барабаны
    pat = DRUMS[track['drums']]
    sounds = {'k': kick(), 's': snare(), 'h': hat(), 'o': hat(True), 'c': clap(), 'sh': shaker()}
    gains = {'k': 0.65, 's': 0.55, 'h': 0.18, 'o': 0.2, 'c': 0.5, 'sh': 0.25}
    for b in range(16):
        for key, steps in pat.items():
            for st in steps:
                place(drum, sounds[key] * gains[key], at(b * 4 + st * 0.5))

    # баланс под динамик телефона: мелодия впереди, бас и бочка тише, низ ниже 70 Гц срезаем
    mix = 0.36 * lead + 0.12 * harm + 0.26 * bass + 0.45 * drum * track.get('drum_gain', 1.0)
    mix = sosfilt(butter(2, 70, 'hp', fs=SR, output='sos'), mix)
    mix = sosfilt(butter(4, 9000, 'lp', fs=SR, output='sos'), mix)
    # одинаковая громкость у всех треков: по среднеквадратичному уровню (≈ −17 dBFS RMS),
    # пики выше −1 dBFS мягко ограничиваем
    rms = np.sqrt(np.mean(mix ** 2)) + 1e-9
    mix = mix * (10 ** (-17 / 20) / rms)
    lim = 0.8
    over = np.abs(mix) > lim
    mix[over] = np.sign(mix[over]) * (lim + (1 - lim) * np.tanh((np.abs(mix[over]) - lim) / (1 - lim)))
    return np.clip(mix, -0.99, 0.99)


TRACKS = [
    {   # бесплатная тема Ками
        'id': 'kami-theme', 'bpm': 128, 'duty': 0.25, 'harm': 'arp8', 'bass': 'oct8', 'drums': 'pop',
        'chords': ['C', 'Am', 'F', 'G', 'C', 'Am', 'F G', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Dm G', 'C'],
        'melody': [
            'E5 .5 G5 .5 C6 1 B5 .5 G5 .5 E5 1', 'A5 1.5 G5 .5 E5 1 C5 1',
            'F5 .5 A5 .5 C6 1 A5 .5 F5 .5 A5 1', 'B5 .5 A5 .5 G5 1 D5 1 r 1',
            'E5 .5 G5 .5 C6 1 D6 .5 C6 .5 G5 1', 'A5 1 C6 1 B5 .5 A5 .5 E5 1',
            'F5 1 A5 1 G5 1 B5 1', 'C6 3 r 1',
            'A5 1 C6 .5 A5 .5 F5 1 A5 1', 'B5 1 D6 .5 B5 .5 G5 1 B5 1',
            'G5 .5 B5 .5 E6 1 D6 .5 B5 .5 G5 1', 'A5 1.5 B5 .5 C6 1 E6 1',
            'F6 1 E6 .5 D6 .5 C6 1 A5 1', 'B5 1 D6 1 G6 2',
            'F6 1 D6 1 B5 1 G5 1', 'C6 1 E5 .5 G5 .5 C5 2',
        ],
    },
    {   # Валенсия: андалузская каденция, «палмас»
        'id': 'orange-boulevard', 'bpm': 108, 'duty': 0.5, 'decay': 0.09, 'sustain': 0.35, 'gate': 0.8,
        'harm': 'stab', 'bass': 'root5', 'drums': 'palmas',
        'chords': ['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E', 'Dm', 'Am', 'E', 'Am', 'Dm', 'Am', 'F', 'E'],
        'melody': [
            'E5 1 A5 .5 B5 .5 C6 1 B5 .5 A5 .5', 'B5 1 A5 .5 G5 .5 D5 1 G5 1',
            'A5 1 G5 .5 F5 .5 C5 1 F5 .5 A5 .5', 'G#5 1.5 F5 .5 E5 2',
            'C6 .5 B5 .5 A5 .5 B5 .5 C6 1 E6 1', 'D6 .5 C6 .5 B5 .5 C6 .5 D6 1 B5 1',
            'C6 .5 B5 .5 A5 .5 B5 .5 C6 1 A5 1', 'B5 .5 A5 .5 G#5 .5 F5 .5 E5 2',
            'F5 1 A5 1 D6 1.5 C6 .5', 'E6 1 C6 1 A5 2',
            'G#5 .5 B5 .5 E6 1 D6 .5 C6 .5 B5 1', 'C6 .5 B5 .5 A5 3',
            'D6 1 F6 1 E6 .5 D6 .5 C6 1', 'E6 1.5 D6 .5 C6 1 A5 1',
            'C6 .5 D6 .5 C6 .5 A5 .5 F5 1 A5 1', 'G#5 1 B5 1 E6 2',
        ],
    },
    {   # перемена: быстро и весело
        'id': 'recess', 'bpm': 150, 'duty': 0.125, 'gate': 0.6, 'harm': 'arp8', 'bass': 'oct8', 'drums': 'drive',
        'chords': ['G', 'Em', 'C', 'D', 'G', 'Em', 'C D', 'G', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'Am D', 'G'],
        'melody': [
            'D5 .5 G5 .5 B5 .5 G5 .5 D6 1 B5 1', 'E5 .5 G5 .5 B5 .5 G5 .5 E6 1 B5 1',
            'C5 .5 E5 .5 G5 .5 E5 .5 C6 1 G5 1', 'D5 .5 F#5 .5 A5 .5 F#5 .5 D6 1 r 1',
            'B5 .5 B5 .5 A5 .5 G5 .5 A5 .5 B5 .5 D6 1', 'E6 .5 D6 .5 B5 .5 G5 .5 A5 1 G5 1',
            'E5 .5 G5 .5 C6 1 F#5 .5 A5 .5 D6 1', 'G5 1 D6 1 G6 1 r 1',
            'E6 1 D6 .5 C6 .5 G5 1 E5 1', 'F#6 1 E6 .5 D6 .5 A5 1 F#5 1',
            'D6 .5 B5 .5 F#5 .5 B5 .5 D6 1 F#6 1', 'G6 1 E6 1 B5 2',
            'C6 .5 D6 .5 E6 .5 G6 .5 E6 1 C6 1', 'D6 .5 E6 .5 F#6 .5 A6 .5 F#6 1 D6 1',
            'C6 1 A5 1 D6 1 F#6 1', 'G6 1.5 D6 .5 B5 1 G5 1',
        ],
    },
    {   # космос: медленно, арпеджио и эхо
        'id': 'space-review', 'bpm': 92, 'duty': 0.5, 'echo': True, 'sustain': 0.75, 'decay': 0.3,
        'harm': 'arp16', 'bass': 'half', 'drums': 'space', 'drum_gain': 0.7, 'octave': -12,
        'chords': ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'A'],
        'melody': [
            'A5 2 F5 1 D5 1', 'D6 2 C6 1 Bb5 1', 'A5 3 C6 1', 'G5 3 r 1',
            'F5 1 A5 1 D6 2', 'F6 2 D6 2', 'Bb5 1 D6 1 G6 2', 'E6 2 C#6 2',
            'D6 1.5 F6 .5 F6 2', 'E6 1.5 G6 .5 G6 2', 'E6 1 C6 1 A5 2', 'F6 2 A6 2',
            'G6 1 F6 1 D6 1 Bb5 1', 'C6 1 E6 1 G6 2', 'A6 2 F6 2', 'E6 2 C#6 1 A5 1',
        ],
    },
    {   # пляж: спокойно, офф-бит
        'id': 'malvarrosa', 'bpm': 100, 'duty': 0.5, 'decay': 0.25, 'sustain': 0.55,
        'harm': 'stab', 'bass': 'root5', 'drums': 'soft',
        'chords': ['F', 'Dm', 'Gm', 'C', 'F', 'Dm', 'Bb C', 'F', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Gm C', 'F'],
        'melody': [
            'C5 .5 F5 .5 A5 1.5 G5 .5 F5 1', 'D5 .5 F5 .5 A5 1.5 C6 .5 A5 1',
            'Bb5 1 A5 .5 G5 .5 D5 2', 'E5 1 G5 1 C6 2',
            'A5 .5 C6 .5 A5 .5 G5 .5 F5 2', 'F5 .5 A5 .5 D6 1.5 C6 .5 A5 1',
            'D6 1 Bb5 1 C6 1 E5 1', 'F5 3 r 1',
            'D6 1.5 C6 .5 Bb5 1 F5 1', 'E6 1.5 D6 .5 C6 1 G5 1',
            'C6 1 E6 1 A5 2', 'D6 1 F6 1 D6 2',
            'F6 1 D6 1 Bb5 1 D6 1', 'E6 1 C6 1 G5 2',
            'Bb5 1 G5 1 C6 1 E6 1', 'F6 2 C6 1 A5 1',
        ],
    },
    {   # легендарная: праздник Фальяс, фанфары
        'id': 'fallas', 'bpm': 132, 'duty': 0.25, 'double': True, 'octave': -12,
        'harm': 'pad', 'bass': 'oct8', 'drums': 'march',
        'chords': ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'Eb F', 'Bb', 'Eb', 'F', 'Dm', 'Gm', 'Eb', 'F', 'Cm F', 'Bb'],
        'melody': [
            'F5 .5 Bb5 .5 D6 1 F6 1 D6 1', 'C6 1 A5 .5 C6 .5 F6 2',
            'G5 .5 Bb5 .5 D6 1 G6 1 D6 1', 'Eb6 1 D6 .5 C6 .5 Bb5 1 G5 1',
            'D6 .5 D6 .5 D6 .5 Eb6 .5 F6 2', 'F6 .5 Eb6 .5 D6 .5 C6 .5 A5 2',
            'G5 .5 Bb5 .5 Eb6 1 F5 .5 A5 .5 C6 1', 'Bb5 1 F6 1 Bb6 1.5 r .5',
            'G6 1 F6 .5 Eb6 .5 Bb5 1 G5 1', 'A6 1 G6 .5 F6 .5 C6 1 A5 1',
            'F6 .5 D6 .5 A5 .5 D6 .5 F6 1 A6 1', 'Bb6 1.5 A6 .5 G6 2',
            'Eb6 .5 F6 .5 G6 .5 Bb6 .5 G6 1 Eb6 1', 'F6 .5 G6 .5 A6 .5 C7 .5 A6 1 F6 1',
            'Eb6 1 C6 1 F6 1 A6 1', 'Bb6 2 F6 1 D6 1',
        ],
    },
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    only = set(sys.argv[1:])
    for tr in TRACKS:
        if only and tr['id'] not in only:
            continue
        audio = render(tr)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            wavfile.write(f.name, SR, (audio * 32767).astype(np.int16))
            wav = f.name
        out = os.path.join(OUT_DIR, tr['id'] + '.m4a')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(OUT_SR),
                        '-c:a', 'aac', '-b:a', '80k', out], check=True)
        os.unlink(wav)
        print(f"{tr['id']}: {len(audio) / SR:.1f} c, {os.path.getsize(out) // 1024} КБ")


if __name__ == '__main__':
    main()
