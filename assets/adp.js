// Netlify Function: /.netlify/functions/adp
//
// Proxies requests to FantasyPros' consensus-rankings endpoint (which
// includes ADP data). The API key lives ONLY in Netlify's environment
// variables (set in the Netlify dashboard, never in this file or anywhere
// in the repo) so it's never exposed to anyone viewing the site's source.
//
// Called by the dashboard as:
//   /.netlify/functions/adp?season=2025&scoring=PPR&position=ALL
//
// This only works once deployed to Netlify — it won't respond if you're
// just opening index.html locally, since there's no server running.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  const apiKey = process.env.FANTASYPROS_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "FANTASYPROS_API_KEY is not set in this site's environment variables.",
      }),
    };
  }

  const params = event.queryStringParameters || {};
  const season = params.season || new Date().getFullYear().toString();
  const scoring = (params.scoring || "PPR").toUpperCase(); // STD | HALF | PPR
  const position = params.position || "ALL";

  const url = `https://api.fantasypros.com/public/v2/json/nfl/${season}/consensus-rankings?position=${encodeURIComponent(position)}&scoring=${encodeURIComponent(scoring)}&type=ADP`;

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({ error: `FantasyPros API returned ${res.status}` }),
      };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Failed to reach FantasyPros API", detail: String(err) }),
    };
  }
};
