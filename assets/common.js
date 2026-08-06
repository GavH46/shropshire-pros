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

// ---------- ADP data (Fantasy Football Calculator, free, no key required) ----------
// Used as the primary source for draft grading, since ADP is measured in the
// same units as draft pick number. Falls back to Sleeper's search_rank (see
// getPlayerMeta) for any player that can't be matched by name.
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

async function getADPMap(season, teams, scoringFormat) {
  const cacheKey = `${ADP_CACHE_KEY}_${season}_${teams}_${scoringFormat}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < ADP_CACHE_TTL) return parsed.data;
    }
  } catch {
    // ignore corrupted cache, refetch below
  }

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

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: map }));
  } catch {
    // storage full or unavailable — fine, just won't cache
  }

  return map;
}

function setHeader(league) {
  const titleEl = document.getElementById("league-title");
  const subEl = document.getElementById("week-label");
  if (titleEl) titleEl.innerHTML = (league.name || "LEAGUE").toUpperCase();
  if (subEl) subEl.textContent = `${(league.season_type || "REGULAR").toUpperCase()} SEASON · ${league.season}`;
}
