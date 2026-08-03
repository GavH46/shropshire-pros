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

function setHeader(league) {
  const titleEl = document.getElementById("league-title");
  const subEl = document.getElementById("week-label");
  if (titleEl) titleEl.innerHTML = (league.name || "LEAGUE").toUpperCase();
  if (subEl) subEl.textContent = `${(league.season_type || "REGULAR").toUpperCase()} SEASON · ${league.season}`;
}
