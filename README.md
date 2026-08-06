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
  Uses real Average Draft Position (ADP) data from Fantasy Football Calculator's
  free public API as the primary source, comparing it against where each player
  was actually picked. For any player not found there, it falls back to
  Sleeper's own overall relevance ranking. This is a fun, transparent estimate —
  not a real prediction — and the page says so.

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

Draft grades pull real Average Draft Position data from Fantasy Football
Calculator's free, keyless REST API (`fantasyfootballcalculator.com/api/v1/adp`),
matched to your draft by player name. A few things worth knowing:

- It's free for personal and commercial use, no signup required — good fit for
  a static site like this one, since there's no API key to accidentally expose
  in the page source.
- Matching is done by normalizing player names (handling things like "Jr."/"II"
  suffixes and punctuation), so a small number of players — especially rookies
  or very deep bench picks — may not match and will fall back to Sleeper's
  internal ranking instead. The grades page's ticker reports how many picks
  were matched vs. fell back each time it loads.
- FantasyPros also has an official API with ADP data, but it requires a
  personal API key tied to an account, which isn't safe to embed in a public
  static site (anyone viewing the page source could see and use it). If you'd
  rather use FantasyPros specifically, that would need a small backend/proxy
  to keep the key private — a bigger lift than this project currently needs.

## Useful Sleeper API references

- `https://api.sleeper.app/v1/league/<id>/matchups/<week>` — weekly matchups
- `https://api.sleeper.app/v1/league/<id>/transactions/<week>` — waiver/trade activity
- `https://api.sleeper.app/v1/league/<id>/drafts` — draft info
- `https://api.sleeper.app/v1/state/nfl` — current NFL week

Full API reference: https://docs.sleeper.com

