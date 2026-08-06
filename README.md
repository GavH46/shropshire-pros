# League Dashboard

A live, multi-page dashboard for your Sleeper fantasy football league.
No build step, no dependencies, no backend — just static files that pull
live data straight from Sleeper's public API in the browser.

## Pages

- **`index.html`** — Standings (records, points for/against)
- **`matchups.html`** — Current week's matchups, updates automatically each week
- **`transactions.html`** — Recent waiver, free agent, and trade activity (last 5 weeks)
- **`draft.html`** — Full draft board with picks, players, and rounds
- **`grades.html`** — Draft grades (A–F) and projected win/loss record per team,
  based on where each player was picked vs. Sleeper's overall relevance ranking
  (the closest free proxy to ADP available through their public API). This is a
  fun, transparent estimate — not a real prediction — and the page says so.

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
is player names and rankings: Sleeper's full player list is ~5MB, so the
transactions, draft, and grades pages cache it in the browser's `localStorage`
for 24 hours to avoid re-downloading it on every visit. It refreshes
automatically once a day — so if you check draft grades right after the
draft, then again 25+ hours later, rankings will be freshly pulled each time.

## Useful Sleeper API references

- `https://api.sleeper.app/v1/league/<id>/matchups/<week>` — weekly matchups
- `https://api.sleeper.app/v1/league/<id>/transactions/<week>` — waiver/trade activity
- `https://api.sleeper.app/v1/league/<id>/drafts` — draft info
- `https://api.sleeper.app/v1/state/nfl` — current NFL week

Full API reference: https://docs.sleeper.com

