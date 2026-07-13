# Another Reason To Make Aliyah

A daily, AI-rated, satirical newspaper. Each edition finds five of today's
real headlines — mostly the world's daily meshugas — and rates each one on
the Aliyah Meter, from 0 ("Not Yet") to 100 ("Get On A Plane"), in the same
kvetch-forward comic voice as its sister site, Is It Good For The Jews?

Every card carries a link to AliyaFinancial.com — cross-border financial
planning for U.S.-Israel moves.

## How it's built

Identical architecture to the sister site:

- `index.html` — the entire frontend (blue-and-white newspaper styling,
  Aliyah Meter gauge, meme-card images, "Submit Your Own Reason" box).
- `api/edition.js` — serverless function: one web search for today's news
  (biased toward "bad news abroad," the engine of the joke), rated by Claude.
- `api/rate.js` — serverless function for reader submissions.

The Anthropic API key lives ONLY in the server environment variable — never
in frontend code.

## Deploying (Vercel, free tier)

Same steps as the sister site. You can reuse the SAME Anthropic API key —
each Vercel project just needs its own environment variable entry:

1. Put this folder in its own GitHub repo (e.g. `another-reason-to-make-aliyah`).
2. In Vercel: **Add New → Project**, select the repo, **Deploy** (defaults are fine).
3. **Settings → Environment Variables** → add `ANTHROPIC_API_KEY` with your key.
4. **Deployments → ⋯ → Redeploy** so the functions pick up the key.
5. Visit the URL, click "Check Today's Reasons."

## Custom domain

Vercel: **Settings → Domains**. Something like anotherreasontomakealiyah.com,
or a subdomain of a domain you already own (e.g. aliyameter.aliyafinancial.com)
would work — subdomains are free if you already own the parent domain.

## Sharing

No share buttons — every story renders as a generated image card. Right-click
→ Save Image As (long-press on mobile) and attach it to any post anywhere.
Each card's footer reads AliyaFinancial.com, so shares carry the plug.

## Cost notes

Each "Check Today's Reasons" and each reader submission = one Claude API call
with web search (a fraction of a cent to a couple cents each). The edition
endpoint is edge-cached for an hour. Same scaling advice as the sister site:
for real traffic, move the daily edition to a scheduled job and add rate
limits.

## Tuning the humor

The personality lives in `SYSTEM_PROMPT` at the top of `api/edition.js` and
`api/rate.js`. The prompt currently:
- Biases the news search toward "bad news abroad" (cost of living, gridlock,
  weather, general societal meshugas) since that's the joke's engine
- Allows 1-2 neutral/good stories per edition that rate LOW on the meter
- Permits gentle Israel jokes too (bureaucracy, drivers, cottage cheese
  prices) — it's comedy, not propaganda
