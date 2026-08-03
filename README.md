# League Dashboard

A single-file live standings dashboard for your Sleeper fantasy football league.
No build step, no dependencies, no backend — it's one `index.html` that pulls
live data straight from Sleeper's public API in the browser.

## Already configured

Your league ID (`1390002454849916928`) is already set in `index.html` near the
top of the `<script>` block:

```js
const LEAGUE_ID = "1390002454849916928";
```

## Test it locally first

Just double-click `index.html` to open it in your browser. If your league ID
is correct, standings should load within a second or two. If it says
"Couldn't load league data," double check the ID against your league URL.

## Deploy it for free (pick one)

### Option A — Netlify (drag and drop, easiest)
1. Go to https://app.netlify.com/drop
2. Drag this folder onto the page
3. You'll get a live URL immediately (e.g. `random-name-123.netlify.app`)
4. Optional: claim a nicer subdomain in Site settings → Change site name

### Option B — GitHub Pages
1. Create a new repo on GitHub (e.g. `league-dashboard`)
2. Upload `index.html` and this `README.md` to it
3. Go to Settings → Pages → set source to "main" branch, root folder
4. Your site will be live at `https://<your-username>.github.io/league-dashboard/`

### Option C — Vercel
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. No build settings needed (it's static) — just deploy

## Updating it later

Since this fetches live from Sleeper every time someone loads the page,
standings, records, and points update automatically — nothing to re-run or
regenerate weekly. If you want to add more pages (matchups, power rankings,
transactions), each can be its own HTML file calling the relevant Sleeper
endpoint, e.g.:

- `https://api.sleeper.app/v1/league/<id>/matchups/<week>` — weekly matchups
- `https://api.sleeper.app/v1/league/<id>/transactions/<week>` — waiver/trade activity
- `https://api.sleeper.app/v1/league/<id>/drafts` — draft info

Full API reference: https://docs.sleeper.com
