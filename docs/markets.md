# Daily market cards (pilot)

Council-reviewed plan (9 Nov 2026). Two cards per weekday, plus a Saturday wrap later.

| Time (SAST) | Card | Content |
|---|---|---|
| 07:00 weekdays | Your Money This Morning | Rand/USD, Brent, gold, JSE Top 40 (previous close), Nasdaq 100, S&P 500, plus "Overnight in New York": the US close and the session's main events in 2-3 bullets, and one "what it means for you" line |
| 17:45 weekdays | What Moved Today | JSE Top 40 close, rand, Brent, gold, London (FTSE 100) day, and the reason in plain words |

Rules: indices and macro numbers only; no individual-share tips; no buy/sell/should words (the card renderer refuses them);
every number from an end-of-day or delayed public source and cited; the "why" line is checked by the owner.
Render: `python -m social_poster.market_card spec.json out.png` (see the docstring for the spec format).
Test mode: cards are sent to the owner only; nothing is posted until the owner says go.
