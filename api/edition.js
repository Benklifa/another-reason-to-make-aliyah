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

There are TWO engines to the joke, and a good edition uses both:
- THE PUSH: bad news from OUTSIDE Israel (inflation, gridlock, housing costs, crime, weather, antisemitism, general societal meshugas) — reasons to leave where you are. These rate HIGH on the meter.
- THE PULL: genuinely good news FROM Israel, especially in hi-tech (start-ups, exits, breakthroughs, funding rounds, medical/defense/AI innovation) and culture (music, food, film, arts, sport, archaeology) — reasons to come. These ALSO rate HIGH on the meter, but for the opposite, happier reason: "look what you're missing." The humor here is pride and FOMO rather than kvetching.

Your job, in this exact order:
1. Do ONE web search to find 5 significant, varied news stories from TODAY. Aim for a MIX: roughly 3 "push" stories (bad news abroad) and 2 "pull" stories (good news from Israel in hi-tech or culture). If a great Israeli hi-tech or culture story is available, always include at least one. A neutral or good non-Israel story is fine too and can rate LOW on the meter ("fine, stay another year").
2. Immediately stop searching and write your output. Do not search again.

CRITICAL — VARIETY ACROSS RUNS: This edition is generated many times per day, and each run MUST feel genuinely different, not the same five stories reworded. To achieve this:
- The user message will specify which news CATEGORIES to emphasize this run and may suggest specific search terms — follow that emphasis when choosing your single search query and when selecting stories.
- Deliberately AVOID the "obvious top 5" that every news aggregator leads with. When multiple qualifying stories exist, prefer different specific events, angles, regions, and beats than the single biggest global headlines.
- Actively ROTATE between big global headlines and smaller, local, regional, or offbeat stories. At least 2 of your 5 should be lesser-covered or human-interest / niche stories rather than the day's dominant headlines.
- Pick DIFFERENT specific events when multiple qualify — do not simply reword the same shooting, wildfire, or geopolitical story that a "typical top 5" would surface. Vary the jokes, verdict labels, and meter scores too.
- If you find yourself about to pick the single most-covered story of the day, ask whether a fresher, less-obvious qualifying story would serve the edition better — usually it will.

For "pull" stories (good Israeli hi-tech/culture news), lean into pride and gentle FOMO: the verdict and commentary should make staying abroad sound like missing the party. For "push" stories, lean into the classic kvetch.

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

  // --- Per-run variety: rotate which categories get emphasized and suggest
  // varied search terms, so the model's single web search returns different
  // results on repeated clicks within the same day. ---
  const CATEGORIES = [
    { name: 'US news', terms: ['US news today', 'American politics today', 'US economy inflation today'] },
    { name: 'world news', terms: ['world news today', 'Europe news today', 'international headlines today'] },
    { name: 'Israel & Jewish news', terms: ['Israel news today', 'Jewish community news today', 'Israel current events'] },
    { name: 'Israeli hi-tech', terms: ['Israel startup news today', 'Israeli tech funding today', 'Israel innovation today'] },
    { name: 'Israeli culture', terms: ['Israel culture news today', 'Israeli film music today', 'Tel Aviv food arts today'] },
    { name: 'economy & cost of living', terms: ['cost of living news today', 'inflation housing prices today', 'economy news today'] },
    { name: 'weather & disasters', terms: ['extreme weather news today', 'natural disaster today', 'heat wave storm today'] },
    { name: 'offbeat & local', terms: ['offbeat news today', 'weird local news today', 'human interest news today'] },
    { name: 'tech & science', terms: ['technology news today', 'science breakthrough today', 'AI news today'] },
    { name: 'culture & sport', terms: ['culture news today', 'sports news today', 'entertainment news today'] }
  ];

  function pick(arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  // Always keep at least one Israeli-positive category in the mix (for the
  // "pull"), then add a random spread of others for variety.
  const israeliPull = pick(
    CATEGORIES.filter((c) => c.name === 'Israeli hi-tech' || c.name === 'Israeli culture'),
    1
  );
  const others = pick(
    CATEGORIES.filter((c) => c.name !== 'Israeli hi-tech' && c.name !== 'Israeli culture'),
    3
  );
  const emphasis = pick([...israeliPull, ...others], 4);
  const emphasisNames = emphasis.map((c) => c.name).join(', ');
  const suggestedTerms = emphasis.map((c) => c.terms[Math.floor(Math.random() * c.terms.length)]).join('  |  ');
  const seed = Math.random().toString(36).slice(2, 8);

  const userMessage =
    `Produce today's edition JSON now. ONE search only, then output the JSON.\n\n` +
    `For THIS run, emphasize these news categories (weight them roughly in this order): ${emphasisNames}.\n` +
    `Suggested search angles you may draw from (pick or adapt one for your single search): ${suggestedTerms}.\n` +
    `Variety token (ignore its meaning, just let it push you toward a different-than-usual selection): ${seed}.\n` +
    `Remember: avoid the obvious top-5 headlines, rotate in at least two lesser-covered/offbeat/local stories, and include at least one positive Israeli hi-tech or culture story.`;

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
            content: userMessage
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

    // No caching: each click should produce a fresh edition.
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
