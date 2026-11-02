"""Score and mix for the petrol 2026 film: voice + procedural tuned percussion, foley and a bed."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

FD = sys.argv[1]; SR = 48000
TL = json.load(open(f"{FD}/site/timeline.json")); START, DUR = TL["start"], TL["DUR"]
ev = json.load(open(f"{FD}/picture.events.json"))
N = int(DUR * SR); mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros((N, 2))
rng = np.random.default_rng(5)
def t_(d): return np.arange(int(d * SR)) / SR
def add(buf, x, at, gain=1.0, pan=0.0):
    i = int(at * SR); x = x[: max(0, N - i)]
    if i < 0 or len(x) == 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414
def bell(f, d=1.6, bright=0.5):
    t = t_(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, 3), (2.76, bright * .5, 6), (5.4, bright * .25, 10)])
def marimba(f, d=0.6):
    t = t_(d); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 40)) * np.exp(-t * 9) * (1 - np.exp(-t * 900))
def thump(d=0.9, f0=80, f1=38):
    t = t_(d); f = (f0 - f1) * np.exp(-t * 5) + f1
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5) + 0.2 * rng.standard_normal(len(t)) * np.exp(-t * 30)
def band(d, lo, hi):
    x = rng.standard_normal(int(d * SR)); return sosfilt(butter(2, [lo, hi], btype='band', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); ai, ri = max(1, int(a * SR)), max(1, int(r * SR)); e[:ai] = np.linspace(0, 1, ai); e[n - ri:] = np.linspace(1, 0, ri); return e

SCALE = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0, 987.77, 1174.66, 1318.5, 1567.98]
k = 0
for e in ev:
    t, ty = e["t"], e["type"]
    if ty in ("chime", "chime_end"):
        add(fx, bell(1318.5), t, .2, -.2); add(fx, bell(987.8), t + .32, .2, .2)
    elif ty == "stop":
        add(fx, marimba(SCALE[min(k, len(SCALE) - 1)]), t, .3, (k % 3 - 1) * .3); add(fx, thump(.4, 120, 70), t, .12); k += 1
    elif ty == "hub":  # October's record
        add(fx, thump(1.2, 90, 32), t + .15, .7); add(fx, bell(523.25, 2.2, .9), t + .15, .2); add(fx, bell(392.0, 2.4, .7), t + .3, .16); k += 1
    elif ty == "glass":
        for j, f in enumerate([2093.0, 2637.0, 3136.0]): add(fx, bell(f, 1.2, .2), t + j * .06, .06, .3)
    elif ty == "bead":
        add(fx, bell(1046.5, 1.0, .3), t, .12, -.3)
    elif ty == "tick1":
        add(fx, marimba(1567.98, .25), t, .14, .35)
    elif ty == "flag":
        add(fx, band(.08, 1500, 6000) * np.hanning(int(.08 * SR)), t, .2); add(fx, marimba(659.25, .4), t + .05, .18)
    elif ty == "rewind":
        d = 2.4; x = band(d, 300, 3000) * env(int(d * SR), 1.8, .3); add(fx, x[::-1].copy(), t, .05)
    elif ty == "boom":
        add(fx, thump(1.6, 70, 28), t, .8); add(fx, band(1.2, 60, 400) * env(int(1.2 * SR), .01, 1.0), t, .15)

# bed: slow minor progression + light pulse; thins for the turn and the end
bpm = 88; beat = 60 / bpm; bar = 4 * beat
chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]]
for i in range(int(DUR / bar) + 1):
    st = .3 + i * bar; ch = chords[i % 4]; tt = t_(bar + .8)
    add(mus, sum(np.sin(2 * np.pi * f * tt) + .35 * np.sin(2 * np.pi * f * 2.003 * tt) for f in ch) * env(len(tt), .6, .8), st, .045)
    for j in range(8):
        tj = st + j * beat / 2
        if tj > START["v15"] - .5 or (START["v10"] - 1.2 < tj < START["v10"] + .3): continue
        add(mus, marimba(ch[j % 3] * 2, .3), tj, .06 if j % 2 else .085, (j % 2) * .4 - .2)
for vid, st in START.items():
    v, sr = sf.read(f"{FD}/voice/{vid}.wav")
    if v.ndim > 1: v = v.mean(1)
    if sr != SR: v = np.interp(np.arange(int(len(v) * SR / sr)) / SR, np.arange(len(v)) / sr, v)
    add(vo, v, st, 1.0)
level = np.abs(vo).max(1); win = int(.25 * SR)
duck = 1 - .45 * np.clip(np.convolve(level, np.ones(win) / win, 'same') * 6, 0, 1)
mix = mus * duck[:, None] + fx + vo
fade = np.ones(N); fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)); mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / 1.1
sf.write(f"{FD}/mix.wav", mix.astype(np.float32), SR)
print("mix ok", round(DUR, 2), float(np.abs(mix).max()))
