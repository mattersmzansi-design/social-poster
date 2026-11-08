"""Soft procedural background music (no voice): warm pad chords + gentle piano-like arpeggio + soft chime on each step.
Usage: python music_soft.py <events.json> <duration_s> <out.wav>"""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

ev = json.load(open(sys.argv[1])); DUR = float(sys.argv[2]); OUT = sys.argv[3]
SR = 48000; N = int(DUR * SR); mix = np.zeros((N, 2)); rng = np.random.default_rng(7)
def t_(d): return np.arange(int(d * SR)) / SR
def add(x, at, g=1.0, pan=0.0):
    i = int(at * SR); x = x[: max(0, N - i)]
    if i < 0 or len(x) == 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i:i + len(x), 0] += x * g * l * 1.414; mix[i:i + len(x), 1] += x * g * r * 1.414
def env(n, a, r):
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR); e[:ai] = np.linspace(0, 1, ai); e[n - ri:] = np.linspace(1, 0, ri); return e
def piano(f, d=2.2):
    t = t_(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 2.2), (2, .35, 3.5), (3, .12, 5)]) * (1 - np.exp(-t * 300))
def bell(f, d=2.5):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)) * np.exp(-t * 2.2)

# I - vi - IV - V in C, slow (72 bpm), one chord per bar
bpm = 72; beat = 60 / bpm; bar = 4 * beat
chords = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]]
for i in range(int(DUR / bar) + 1):
    st = i * bar; ch = chords[i % 4]; tt = t_(bar + 1.2)
    pad = sum(np.sin(2 * np.pi * f / 2 * tt) + .5 * np.sin(2 * np.pi * f * 1.003 * tt) + .25 * np.sin(2 * np.pi * f * 2 * tt) for f in ch)
    add(pad * env(len(tt), .9, 1.1), st, .035)
    for j, f in enumerate([ch[0], ch[1], ch[2], ch[1] * 2, ch[2], ch[1], ch[0] * 2, ch[2]]):
        add(piano(f * 2), st + j * beat / 2, .045 if j % 2 else .06, (j % 3 - 1) * .3)
for e in ev:
    add(bell(1046.5), e["t"], .05, -.2); add(bell(1568.0), e["t"] + .18, .035, .2)
# soft low-passed air
air = sosfilt(butter(2, 900, fs=SR, output='sos'), rng.standard_normal(N)) * .01
mix += np.stack([air, air], 1)
fade = np.ones(N); fi, fo = int(1.5 * SR), int(3 * SR); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mix *= fade[:, None]; mix = np.tanh(mix * 1.2) / 1.2
sf.write(OUT, mix.astype(np.float32), SR); print("music ok", float(np.abs(mix).max()))
