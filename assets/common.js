// ============ CONFIGURE THIS ============
const LEAGUE_ID = "1390002454849916928";
// =========================================

const API = "https://api.sleeper.app/v1";
const PLAYERS_CACHE_KEY = "spfl_players_cache_v1";
const PLAYERS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function pct(w, l, t) {
  const g = w + l + t;
  if (g === 0) return ".000";
  return (w / g).toFixed(3).replace(/^0/, "");
}

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function getLeague() {
  return fetch(`${API}/league/${LEAGUE_ID}`).then(r => r.json());
}

async function getRostersAndUsers() {
  const [rosters, users] = await Promise.all([
    fetch(`${API}/league/${LEAGUE_ID}/rosters`).then(r => r.json()),
    fetch(`${API}/league/${LEAGUE_ID}/users`).then(r => r.json()),
  ]);

  const userMap = {};
  users.forEach(u => {
    userMap[u.user_id] = {
      teamName: (u.metadata && u.metadata.team_name) || u.display_name,
      owner: u.display_name,
    };
  });

  const rosterMap = {}; // roster_id -> {teamName, owner}
  rosters.forEach(r => {
    rosterMap[r.roster_id] = userMap[r.owner_id] || { teamName: "Unknown", owner: "Unknown" };
  });

  return { rosters, users, userMap, rosterMap };
}

async function getCurrentWeek() {
  try {
    const state = await fetch(`${API}/state/nfl`).then(r => r.json());
    return state.week || 1;
  } catch {
    return 1;
  }
}

// Players file is ~5MB — cache it in localStorage for a day so we don't
// re-download it on every page view.
async function getPlayerMap() {
  try {
    const cached = localStorage.getItem(PLAYERS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < PLAYERS_CACHE_TTL) {
        return parsed.data;
      }
    }
  } catch {
    // ignore corrupted cache, refetch below
  }

  const players = await fetch(`${API}/players/nfl`).then(r => r.json());
  const slim = {};
  Object.keys(players).forEach(id => {
    const p = players[id];
    slim[id] = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || id;
  });

  try {
    localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: slim }));
  } catch {
    // storage full or unavailable — fine, just won't cache
  }

  return slim;
}

// Full player metadata (name + search_rank, used for draft value grading).
// search_rank is Sleeper's own overall relevance ranking — it tracks closely
// with ADP for fantasy-relevant players and is the closest free proxy
// available through their public API.
const PLAYERS_META_CACHE_KEY = "spfl_players_meta_cache_v1";

async function getPlayerMeta() {
  try {
    const cached = localStorage.getItem(PLAYERS_META_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < PLAYERS_CACHE_TTL) {
        return parsed.data;
      }
    }
  } catch {
    // ignore corrupted cache, refetch below
  }

  const players = await fetch(`${API}/players/nfl`).then(r => r.json());
  const slim = {};
  Object.keys(players).forEach(id => {
    const p = players[id];
    slim[id] = {
      name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || id,
      pos: p.position || "",
      team: p.team || "FA",
      rank: typeof p.search_rank === "number" && p.search_rank > 0 ? p.search_rank : 9999,
    };
  });

  try {
    localStorage.setItem(PLAYERS_META_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: slim }));
  } catch {
    // storage full or unavailable — fine, just won't cache
  }

  return slim;
}

// ---------- ADP data ----------
// Two sources, tried in order:
//   1. FantasyPros, via our own Netlify Function proxy (keeps the API key
//      private). Only works once deployed to Netlify — silently skipped
//      when running locally or on other hosts.
//   2. Fantasy Football Calculator's free, keyless API — same units
//      (average pick number), no setup required.
// Falls back to Sleeper's search_rank (see getPlayerMeta) for any player
// neither source has.
const ADP_CACHE_KEY = "spfl_adp_cache_v1";
const ADP_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function cachedFetch(cacheKey, fetchFn) {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < ADP_CACHE_TTL) return parsed.data;
    }
  } catch {
    // ignore corrupted cache, refetch below
  }

  const data = await fetchFn();

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // storage full or unavailable — fine, just won't cache
  }

  return data;
}

async function getFantasyProsADP(season, scoringFormat) {
  // scoringFormat here is "ppr" | "half-ppr" | "standard" (our internal
  // naming) — map to what the proxy/FantasyPros expects.
  const scoringMap = { ppr: "PPR", "half-ppr": "HALF", standard: "STD" };
  const scoring = scoringMap[scoringFormat] || "PPR";
  const cacheKey = `${ADP_CACHE_KEY}_fp_${season}_${scoring}`;

  return cachedFetch(cacheKey, async () => {
    const res = await fetch(`/.netlify/functions/adp?season=${season}&scoring=${scoring}&position=ALL`);
    if (!res.ok) throw new Error(`FantasyPros proxy returned ${res.status}`);
    const json = await res.json();
    const players = json.players || [];

    const map = {};
    players.forEach(p => {
      const key = normalizeName(p.player_name || p.name);
      // consensus-rankings responses expose average draft slot as rank_ave
      // when type=ADP; fall back to rank_ecr if that's ever absent.
      const adpVal = p.rank_ave ?? p.rank_ecr;
      if (key && typeof adpVal !== "undefined") {
        map[key] = { adp: parseFloat(adpVal), name: p.player_name || p.name, position: p.player_position_id };
      }
    });
    return map;
  });
}

async function getFFCADP(season, teams, scoringFormat) {
  const cacheKey = `${ADP_CACHE_KEY}_ffc_${season}_${teams}_${scoringFormat}`;

  return cachedFetch(cacheKey, async () => {
    const url = `https://fantasyfootballcalculator.com/api/v1/adp/${scoringFormat}?teams=${teams}&year=${season}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ADP fetch failed: ${res.status}`);
    const json = await res.json();
    const players = json.players || [];

    const map = {};
    players.forEach(p => {
      const key = normalizeName(p.name);
      if (key) map[key] = { adp: p.adp, name: p.name, position: p.position };
    });
    return map;
  });
}

// Combined lookup: try FantasyPros (via proxy) first, then FFC. Returns
// { map, source } where source is "fantasypros", "ffc", or "none".
async function getADPMap(season, teams, scoringFormat) {
  try {
    const map = await getFantasyProsADP(season, scoringFormat);
    if (Object.keys(map).length > 0) return { map, source: "fantasypros" };
  } catch {
    // proxy not deployed, key missing, or FantasyPros unreachable — fall through
  }

  try {
    const map = await getFFCADP(season, teams, scoringFormat);
    if (Object.keys(map).length > 0) return { map, source: "ffc" };
  } catch {
    // FFC unreachable either — caller falls back to Sleeper ranks entirely
  }

  return { map: {}, source: "none" };
}

function setHeader(league) {
  const titleEl = document.getElementById("league-title");
  const subEl = document.getElementById("week-label");
  if (titleEl) titleEl.innerHTML = (league.name || "LEAGUE").toUpperCase();
  if (subEl) subEl.textContent = `${(league.season_type || "REGULAR").toUpperCase()} SEASON · ${league.season}`;
}
