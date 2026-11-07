"""Score and mix for the Vote-to-Rates film (DUR and VO timings below); same sound design as the Repo Line film: voice + procedural tuned percussion, foley and a soft bed."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

FD = sys.argv[1]; SR = 48000; DUR = 55.0
ev = json.load(open(f"{FD}/picture.events.json"))
VO = {"v1": .6, "v2": 6.1, "v3": 10.8, "v4": 19.0, "v5": 25.6, "v6": 31.2, "v7": 37.3, "v8": 42.4, "v9": 50.0}
N = int(DUR * SR); mus = np.zeros((N, 2)); fx = np.zeros((N, 2)); vo = np.zeros((N, 2))
rng = np.random.default_rng(3)
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
def thump():
    t = t_(0.7); f = 90 * np.exp(-t * 6) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + 0.25 * rng.standard_normal(len(t)) * np.exp(-t * 40)
def noise_band(d, lo, hi):
    x = rng.standard_normal(int(d * SR)); sos = butter(2, [lo, hi], btype='band', fs=SR, output='sos'); return sosfilt(sos, x)
def env(n, a, r):
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR); e[:ai] = np.linspace(0, 1, ai); e[n - ri:] = np.linspace(1, 0, ri); return e

PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7]
k = 0
for e in ev:
    t, ty = e["t"], e["type"]
    if ty in ("chime", "chime_end"):
        add(fx, bell(1318.5), t, .22, -.2); add(fx, bell(987.8), t + .32, .22, .2)
    elif ty == "stop" and t < DUR:
        add(fx, marimba(PENTA[k % len(PENTA)]), t, .32, (k % 3 - 1) * .3); k += 1
    elif ty == "hub":
        add(fx, thump(), t + .38, .55); add(fx, bell(659.25, 1.2, .8), t + .38, .18); add(fx, bell(392.0, 1.4, .6), t + .5, .14)
    elif ty == "draw":
        d = e["d"]; x = noise_band(d, 2500, 6000) * env(int(d * SR), .15, .25); add(fx, x, t, .035, .1)
    elif ty == "tick":
        for j in range(8): add(fx, noise_band(.012, 3000, 9000) * np.hanning(int(.012 * SR)), t - .45 + j * .055, .25, .4)
        add(fx, marimba(1567.98, .3), t, .2, .4)
    elif ty == "callout":
        add(fx, marimba(783.99), t, .3); add(fx, marimba(1174.7), t + .12, .25)

# music bed: soft pad chords + a light marimba pulse, thinning before "Next stop"
bpm = 96; beat = 60 / bpm; chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]]
bar = 4 * beat; t0 = 0.4
for i in range(int((DUR - t0) / bar) + 1):
    st = t0 + i * bar; ch = chords[i % 4]; tt = t_(bar + .6)
    pad = sum(np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2.001 * tt) for f in ch) * env(len(tt), .5, .6)
    add(mus, pad, st, .05)
    for j in range(8):
        tj = st + j * beat / 2
        if 45.6 < tj < 46.4 or tj > 52.0: continue
        if tj < 2.0 and j % 2: continue
        add(mus, marimba(ch[j % 3] * 2, .35), tj, .07 if j % 2 else .1, (j % 2) * .4 - .2)
# gentle ducking under the voice
for vid, st in VO.items():
    v, sr = sf.read(f"{FD}/voice/{vid}.wav"); 
    if v.ndim > 1: v = v.mean(1)
    if sr != SR: v = np.interp(np.arange(int(len(v) * SR / sr)) / SR, np.arange(len(v)) / sr, v)
    add(vo, v, st, 1.0)
level = np.abs(vo).max(1); win = int(.25 * SR)
duck = 1 - .45 * np.clip(np.convolve(level, np.ones(win) / win, 'same') * 6, 0, 1)
# near-silence before the turn to "Next stop"
quiet = np.ones(N); a, b = int(45.7 * SR), int(46.3 * SR); quiet[a:b] = .15
mix = mus * duck[:, None] * quiet[:, None] + fx + vo
fade = np.ones(N); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)); mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / 1.1  # soft-clip the transients before mastering
sf.write(f"{FD}/mix.wav", mix.astype(np.float32), SR)
print("mix ok", mix.shape, float(np.abs(mix).max()))
