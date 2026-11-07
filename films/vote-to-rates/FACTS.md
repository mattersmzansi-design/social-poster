# From your vote to your rates bill: facts and sources

Vertical 1080x1920, 30 fps, 55 s. 2D Transit Map (template: `../repo-line`). Voice: Kokoro `am_michael`.
Story: vote → results → coalition talks → new council and mayor → service lines (rates, water and
refuse, electricity via NERSA) → draft budget → approval before 1 July → new tariffs on your bill, 1 July 2027.
Ending: dashed line to the next local election, 2031.

The film uses processes and dates from law, not election numbers, so it stays true once final results are out.

| Claim in film | Source 1 | Source 2 | Status |
|---|---|---|---|
| Local elections held 4 November 2026 | IEC (elections.org.za) | Wikipedia "2026 South African municipal elections" | OK |
| IEC has seven days to declare results | TimesLIVE 4 Nov 2026 (IEC CEO Sy Mamabolo) | Novanews: official results Sunday 8 Nov; Electoral Act/Municipal Electoral Act 7-day period | OK |
| New council meets and elects a mayor | Municipal Structures Act s29 (first meeting called by municipal manager) | gov.za CoGTA notice on first council meetings (2016) | OK. Timing not stated in film: 14 days, possibly 30 after the 2025 amendment |
| No majority → coalition needed | Municipal Structures Act (mayor elected by council majority) | News coverage of hung councils (Northern Cape, metros) | OK |
| NERSA must approve municipal electricity increases | NERSA municipal tariff guideline and approval process | MFMA circulars and municipal budget documents | CHECK wording "every increase" |
| Mayor tables draft budget around end of March | MFMA s16(2): at least 90 days before start of budget year (1 July) | Municipal draft budget documents tabled in March (e.g. Mandeni KZN291 draft 2027, Lekwa March 2026) | OK |
| Residents can comment | MFMA s22/s23: publish budget and invite community submissions | Municipal draft budget notices | OK |
| Council approves before 1 July with tariffs | MFMA s16(1), s17(3)(a), s24 (acts.co.za) | Municipal budget resolutions "tariffs with effect from 1 July" | OK |
| New rates reach the bill on 1 July 2027 | Municipal financial year starts 1 July (MFMA s1 "financial year") | First full budget of the councils elected Nov 2026 is 2027/28 | OK |
| Next local election 2031 | Constitution s159: five-year municipal term | 2016 → 2021 → 2026 cycle | OK (normal term) |

Counter: Election 4 Nov 2026 · Budget Mar 2027 · New rates 1 Jul 2027.

Production: voice `lines.json` → lemo `core/tts/tts.py`; picture `tools/video.mjs site`; mix `tools/mix_vtr.py`
(the Repo Line sound design with new timings); master loudnorm -14 LUFS, AAC 128k 48 kHz, BT.709, faststart.
