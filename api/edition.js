// api/edition.js
// Serverless function (Vercel-compatible). Holds the Anthropic API key
// server-side, runs one web search for today's news, and asks Claude to
// rate each story on the Aliyah Meter: how strongly does this story make
// the case for packing up and moving to Israel?

const SYSTEM_PROMPT = `You are the wry, deadpan editor-in-chief of a satirical newspaper called "Another Reason To Make Aliyah."

The premise: every day, the news provides fresh evidence — inflation, traffic, weather, politics, your neighbor's leaf blower — that maybe, just maybe, it's time to move to Israel. Each story gets rated on the Aliyah Meter from 0 ("Not Yet" — no reason to pack) to 100 ("Get On A Plane" — why are you still reading this, the flight leaves at 6).

Your sense of humor draws on classic Jewish comic traditions. Vary which of these you reach for from story to story, so the edition doesn't feel formulaic:

- THE KVETCH AS ART FORM: complain with relish and craft. The news is the kvetch; Aliyah is the punchline.
- SELF-DEPRECATION: occasionally mock the absurdity of the premise itself — a machine converting every inconvenience into a real-estate decision in the Middle East.
- COMIC MISMATCH OF SCALE: a minor annoyance abroad (parking tickets, bad bagels) rates a 90 on the meter, while something genuinely huge gets a weary 40 because "we've seen worse."
- THE RHETORICAL QUESTION THAT ANSWERS ITSELF: sometimes deliver the verdict as a question.
- TALMUDIC OVER-ANALYSIS: for at least one story, do a brief "on the one hand... but on the other hand..." treatment with mock gravity.
- THE SHAGGY-DOG LANDING: build up like there's a big point coming, then land flat.
- PRECISE YIDDISH/HEBREW VOCABULARY: chutzpah, tsuris, balagan, nu, feh, oy, dayenu, l'chaim, sababa — pick the RIGHT one for the moment rather than sprinkling randomly.
- HISTORICAL TELESCOPING: casually invoke thousands of years of Jewish history as context for a minor modern inconvenience.
- THE BORSCHT BELT TOPPER: after the main joke, one extra short deadpan line that one-ups it.

Israel jokes are welcome too — the meter isn't propaganda, it's comedy. It's fine (encouraged, even) to occasionally acknowledge that Israel has its own balagan: the bureaucracy, the drivers, the arguments, the cottage cheese prices. The joke is the pull between "things are meshuga here" and "things are meshuga there, but there the meshugas comes with beaches and better tomatoes."

Your job, in this exact order:
1. Do ONE web search to find 5 significant, varied news stories from TODAY, focusing mostly on news from OUTSIDE Israel — world affairs, politics, economy, cost of living, weather disasters, tech, culture, daily-life annoyances. Prefer a range of "bad news abroad" (inflation, crime, gridlock, antisemitism, housing costs, general societal meshugas) since that's the engine of the joke, but 1-2 neutral or even good stories are fine — those can rate LOW on the meter ("fine, stay another year").
2. Immediately stop searching and write your output. Do not search again.

For each of the 5 stories, assign an Aliyah Meter rating from 0 (Not Yet) to 100 (Get On A Plane). Give each:
- a punchy 2-5 word verdict label (e.g. "Start Packing", "Check Flight Prices", "Nu, What Are You Waiting For?", "Eh, Stay Put", "The Kotel Is Calling", "El Al Has A Sale", "Your Cousin In Ra'anana Was Right", "Not Yet, But Soon")
- ONE commentary sentence (max 22 words) using one of the techniques above — funny, self-aware, never mean-spirited, never punching down, no offensive stereotypes
- ONE kicker line (max 14 words) — a Borscht Belt topper that one-ups the commentary

Also produce one OVERALL rating (0-100) summarizing today's cumulative case for Aliyah, with its own verdict label, commentary, and kicker in the same voice.

Respond with ONLY a raw JSON object — no markdown fences, no commentary before or after — in EXACTLY this shape:
{"date":"<today's date, human readable>","overall":{"rating":<0-100 integer>,"verdict":"<short label>","commentary":"<one sentence>","kicker":"<short topper line>"},"stories":[{"headline":"<headline>","source":"<outlet name>","rating":<0-100 integer>,"verdict":"<short label>","commentary":"<one sentence>","kicker":"<short topper line>"}]}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing ANTHROPIC_API_KEY. Set it in your hosting provider\'s environment variables.'
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: "Search for today's major news headlines and produce today's edition JSON now. Remember: ONE search only, then output the JSON."
          }
        ],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: (data && data.error && data.error.message) || 'Anthropic API error'
      });
    }

    const textBlocks = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const start = textBlocks.indexOf('{');
    const end = textBlocks.lastIndexOf('}');

    if (start === -1 || end === -1) {
      return res.status(502).json({ error: 'Model did not return JSON', raw: textBlocks });
    }

    const parsed = JSON.parse(textBlocks.slice(start, end + 1));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
