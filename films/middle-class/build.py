"""Edit owner's 'middle class' clip into an MMM vertical ad: brand frame, burned-in captions, end card."""
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC, TR, WORK, OUT = sys.argv[1:5]
F = 'assets/fonts/Poppins-%s.ttf'
def font(w, s): return ImageFont.truetype(F % w, s)
W, H = 1080, 1920; GOLD = (247, 179, 43); INK = (240, 245, 242); DIM = (190, 210, 200)
END = 78.9  # cut before the unfinished "Don't..."
# ---- frame overlay
fr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(fr)
d.rectangle([70, 150, 150, 157], fill=GOLD)
d.text((70, 180), 'MZANSI MONEY MATTERS', font=font('SemiBold', 30), fill=GOLD)
d.text((70, 250), 'Is your salary', font=font('Bold', 74), fill=INK)
d.text((70, 345), 'making you richer?', font=font('Bold', 74), fill=GOLD)
lg = Image.open('assets/mmm-logo.jpg').convert('RGB').resize((130, 130)); m = Image.new('L', (130, 130), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 129, 129], 22, fill=255)
fr.paste(lg, (880, 150), m)
d.rounded_rectangle([40, 1756, W - 40, 1846], 45, fill=(0, 0, 0, 120))
d.text((W // 2, 1801), 'Follow Mzansi Money Matters  ·  Education, not financial advice', font=font('SemiBold', 28), fill=INK, anchor='mm')
fr.save(f'{WORK}/frame.png')
# ---- end card
ec = Image.new('RGB', (W, H), (8, 46, 32)); d = ImageDraw.Draw(ec)
lg2 = Image.open('assets/mmm-logo.jpg').convert('RGB').resize((360, 360)); m2 = Image.new('L', (360, 360), 0); ImageDraw.Draw(m2).rounded_rectangle([0, 0, 359, 359], 48, fill=255)
ec.paste(lg2, ((W - 360) // 2, 480), m2)
d.text((W // 2, 960), 'Follow', font=font('SemiBold', 48), fill=DIM, anchor='mm')
d.text((W // 2, 1050), 'Mzansi Money Matters', font=font('Bold', 76), fill=GOLD, anchor='mm')
d.text((W // 2, 1160), 'Plain-language money news', font=font('Regular', 40), fill=INK, anchor='mm')
d.text((W // 2, 1215), 'and tips for South Africans', font=font('Regular', 40), fill=INK, anchor='mm')
d.text((W // 2, 1340), 'Facebook  ·  Instagram  ·  YouTube', font=font('SemiBold', 36), fill=DIM, anchor='mm')
d.text((W // 2, 1780), 'Education, not financial advice', font=font('Regular', 28), fill=DIM, anchor='mm')
ec.save(f'{WORK}/endcard.png')
# ---- captions (ASS): cleaned text per spoken segment, split into short lines over the segment's time
FIX = {
 33.2: 'Your groceries are more expensive. Electricity, school fees, rent, insurance…',
 52.7: 'You work harder to earn more money, but the cost of the things you need to survive keeps rising.',
 66.0: 'So focus on your goals, stay consistent, and build your future.',
 70.4: 'A salary is income.',
}
segs = json.load(open(TR)); ev = []
for s in segs:
    if s['s'] >= END: continue
    key = next((k for k in FIX if abs(k - s['s']) < 0.3), None)
    if key is None:
        words = [(w[0], w[1], w[2].strip().replace('6 %','6%')) for w in s['w']]
    else:
        ws = FIX[key].split(); n = len(ws); st, en = s['s'], min(s['e'], END)
        words = [(st + (en - st) * i / n, st + (en - st) * (i + 1) / n, w) for i, w in enumerate(ws)]
    line = []
    for w in words:
        line.append(w)
        txt = ' '.join(x[2] for x in line)
        if len(line) >= 5 or len(txt) > 26 or w[2][-1] in '.,?!…':
            ev.append((line[0][0], line[-1][1], txt)); line = []
    if line: ev.append((line[0][0], line[-1][1], ' '.join(x[2] for x in line)))
# make each caption last until the next one starts (max +0.6s)
cap = []
for i, (a, b, t) in enumerate(ev):
    nb = ev[i + 1][0] if i + 1 < len(ev) else b + 0.6
    cap.append((a, min(max(b, a + 0.5), nb, END), t))
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f'{h}:{m:02d}:{s:05.2f}'
ass = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920', '', '[V4+ Styles]',
 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
 'Style: C,Poppins,110,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,3,5,60,60,0,1', '', '[Events]',
 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
for a, b, t in cap:
    ass.append(f'Dialogue: 0,{ts(a)},{ts(b)},C,,0,0,0,,{{\\pos(540,1470)\\fad(80,60)}}{t}')
open(f'{WORK}/cap.ass', 'w').write('\n'.join(ass)); json.dump(cap, open(f'{WORK}/cap.json', 'w'), indent=0)
print('captions', len(cap))
