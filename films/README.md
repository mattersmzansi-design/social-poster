# Short films (made in code)

Each film is a web page that draws one frame per call (`window.render(t)`), rendered to MP4,
then voiced and scored. Built following the **Transit Map** style of
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT; our films are our own, no credit needed),
simplified to 2D.

- `repo-line/`: "How the repo rate reaches your pocket" (45 s, 1080x1920). `site/` is the film,
  `lines.json` the voice-over (Kokoro TTS, voice `am_michael`; "Mzansi" is spelled "Mmzahnsee" for the voice),
  `TREATMENT.md` the plan and facts.
- `petrol-2026/`: "The year petrol hit R30" (2:10, 3D with three.js). `FACTS.md` lists every figure and its source.
  Render: `node tools/render3d.mjs <site> <three/build> video out.mp4 30`, then `tools/mix3d.py`.
- `tools/`: `stills.mjs` / `video.mjs` (render with playwright-core + ffmpeg), `mix.py` (voice, procedural
  percussion, foley and bed, ducked; master with ffmpeg loudnorm to -14 LUFS).

Output goes to `../media/` and is posted through a `video_file` row in the sheet.
