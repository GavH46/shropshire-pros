# League Dashboard

A live, multi-page dashboard for your Sleeper fantasy football league.
No build step, no dependencies, no backend — just static files that pull
live data straight from Sleeper's public API in the browser.

## Pages

- **`index.html`** — Standings (records, points for/against)
- **`matchups.html`** — Current week's matchups, updates automatically each week
- **`transactions.html`** — Recent waiver, free agent, and trade activity (last 5 weeks)
- **`draft.html`** — Full draft board with picks, players, and rounds
- **`grades.html`** — Draft grades (A–F) and projected win/loss record per team.
  Uses real Average Draft Position (ADP) data — FantasyPros if you set it up
  (see below), otherwise Fantasy Football Calculator's free API automatically
  — comparing it against where each player was actually picked. Falls back to
  Sleeper's own ranking for anything unmatched. This is a fun, transparent
  estimate — not a real prediction — and the page says so.

All five pages share a nav bar at the top so you can click between them, plus
the same header, logo, and field-styled background.

## Already configured

Your league ID (`1390002454849916928`) is set once, in `assets/common.js`:

```js
const LEAGUE_ID = "1390002454849916928";
```

Change it there if you ever need to point this at a different league — every
page picks it up automatically.

## Test it locally first

Just double-click `index.html` to open it in your browser, then use the nav
bar to click through to the other pages. If your league ID is correct,
everything should load within a second or two (the transactions and draft
pages take a bit longer the first time, since they also download Sleeper's
player list to resolve names — see note below).

## Deploy it for free (pick one)

### Option A — Netlify (drag and drop, easiest)
1. Go to https://app.netlify.com/drop
2. Drag this whole folder (including the `assets` subfolder) onto the page
3. You'll get a live URL immediately (e.g. `random-name-123.netlify.app`)
4. Optional: claim a nicer subdomain in Site settings → Change site name

### Option B — GitHub Pages
1. Create a new repo on GitHub (e.g. `league-dashboard`)
2. Upload all four `.html` files and the `assets` folder (keep the same structure)
3. Go to Settings → Pages → set source to "main" branch, root folder
4. Your site will be live at `https://<your-username>.github.io/league-dashboard/`

### Option C — Vercel
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. No build settings needed (it's static) — just deploy

## How it stays current

Every page fetches fresh from Sleeper on load — nothing to regenerate weekly.
Standings, matchups, and transactions update automatically. The one exception
is player names, rankings, and ADP: Sleeper's full player list is ~5MB and the
ADP dataset is refetched per league size/scoring format, so the transactions,
draft, and grades pages cache these in the browser's `localStorage` for 24
hours to avoid re-downloading on every visit. They refresh automatically once
a day.

## About the ADP data

Draft grades try two real ADP sources, in order, before falling back to
Sleeper's internal ranking:

1. **FantasyPros**, via a Netlify Function proxy included in this project
   (`netlify/functions/adp.js`). This keeps your FantasyPros API key private —
   it lives only in Netlify's environment variables, never in any file here.
   **Only works once deployed to Netlify with the key configured** — see
   setup below.
2. **Fantasy Football Calculator**, a free/keyless API, used automatically
   if FantasyPros isn't set up or is unreachable. No configuration needed —
   this is what you'll get out of the box.

Either way, any player that doesn't match by name falls back to Sleeper's
own ranking, and the grades page reports which source was actually used and
how many picks matched each time it loads.

### Setting up FantasyPros (optional)

This step is optional — the dashboard works fine without it, using Fantasy
Football Calculator instead. Only do this if you specifically want
FantasyPros' rankings.

1. Deploy this project to **Netlify** specifically (the proxy function is
   Netlify-specific; Vercel or GitHub Pages won't run it as-is).
2. Get a free FantasyPros API key at
   https://www.fantasypros.com/api-data/ — free access covers personal,
   non-commercial use like this.
3. In your Netlify site's dashboard, go to **Site configuration → Environment
   variables** and add:
   - Key: `FANTASYPROS_API_KEY`
   - Value: your API key
4. Redeploy (Netlify → Deploys → Trigger deploy). The grades page will now
   use FantasyPros automatically — no code changes needed.

**Never paste your FantasyPros API key into any `.html` or `.js` file in this
project.** Anyone who views the page source of a deployed site can read
those files, and a key embedded there would be exposed to the world. The
environment variable approach above is the only safe way to use it here.

If you'd rather use FantasyPros on Vercel or another host instead of
Netlify, the same idea applies — you'd need that platform's equivalent of a
serverless function (Vercel Functions, Cloudflare Workers, etc.) with the
key set as a private environment variable there, and `common.js` would need
its FantasyPros URL updated to match. Ask if you want that built out.

## Useful Sleeper API references

- `https://api.sleeper.app/v1/league/<id>/matchups/<week>` — weekly matchups
- `https://api.sleeper.app/v1/league/<id>/transactions/<week>` — waiver/trade activity
- `https://api.sleeper.app/v1/league/<id>/drafts` — draft info
- `https://api.sleeper.app/v1/state/nfl` — current NFL week

Full API reference: https://docs.sleeper.com

