// Generates the profile stat card SVGs into assets/ — no external image services.
// Runs locally and in GitHub Actions (uses GITHUB_TOKEN when present).
const USER = 'OfficialRealJm';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const H = {
  'Accept': 'application/vnd.github+json',
  'User-Agent': 'profile-cards',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};
const api = (path) => fetch(`https://api.github.com${path}`, { headers: H }).then(r => r.json());

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

const FONT = 'Verdana, DejaVu Sans, sans-serif';

// ---------- data ----------
const [user, repos, commits, prs, issues] = await Promise.all([
  api(`/users/${USER}`),
  api(`/users/${USER}/repos?per_page=100&sort=updated`),
  api(`/search/commits?q=author:${USER}&per_page=1`),
  api(`/search/issues?q=author:${USER}+type:pr&per_page=1`),
  api(`/search/issues?q=author:${USER}+type:issue&per_page=1`),
]);

const stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
const totalCommits = commits.total_count ?? 0;
const totalPRs = prs.total_count ?? 0;
const totalIssues = issues.total_count ?? 0;

const langCount = {};
for (const r of repos) {
  if (r.fork || !r.language) continue;
  langCount[r.language] = (langCount[r.language] || 0) + 1;
}
const langsTotal = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
const topLangs = Object.entries(langCount)
  .sort((a, b) => b[1] - a[1]).slice(0, 6)
  .map(([name, n]) => ({ name, pct: Math.round((n / langsTotal) * 100) }));

// ---------- stats card ----------
function statsCard() {
  const stats = [
    ['REPOSITORIES', user.public_repos ?? 0],
    ['TOTAL STARS', stars],
    ['FOLLOWERS', user.followers ?? 0],
    ['TOTAL COMMITS', totalCommits],
    ['PULL REQUESTS', totalPRs],
    ['ISSUES', totalIssues],
  ];
  let cells = '';
  stats.forEach(([label, value], i) => {
    const x = 60 + (i % 3) * 240;
    const y = i < 3 ? 132 : 192;
    cells += `
  <circle cx="${x - 22}" cy="${y - 8}" r="4" fill="#f97316" opacity="0.85"/>
  <text x="${x}" y="${y}" font-family="${FONT}" font-size="26" font-weight="bold" fill="#ffffff">${fmt(value)}</text>
  <text x="${x}" y="${y + 20}" font-family="${FONT}" font-size="11" fill="#8b949e" letter-spacing="1.5">${esc(label)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="234" viewBox="0 0 760 234">
  <defs>
    <radialGradient id="glow" cx="12%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="760" height="234" rx="16" fill="#0d1117" stroke="#21262d"/>
  <rect width="760" height="234" rx="16" fill="url(#glow)"/>
  <text x="60" y="58" font-family="${FONT}" font-size="22" font-weight="bold" fill="#f97316">JM's GitHub Stats</text>
  <rect x="60" y="76" width="640" height="1.5" fill="#f97316" opacity="0.25"/>${cells}
</svg>`;
}

// ---------- top langs ----------
function topLangsCard() {
  const H = 80 + topLangs.length * 26 + 16;
  const rows = topLangs.map((l, i) => {
    const y = 92 + i * 26;
    return `
  <text x="60" y="${y}" font-family="${FONT}" font-size="13" fill="#c9d1d9">${esc(l.name)}</text>
  <text x="700" y="${y}" font-family="${FONT}" font-size="12" fill="#8b949e" text-anchor="end">${l.pct}%</text>
  <rect x="60" y="${y + 6}" width="640" height="7" rx="3.5" fill="#21262d"/>
  <rect x="60" y="${y + 6}" width="${Math.max(8, 6.4 * l.pct)}" height="7" rx="3.5" fill="#f97316" opacity="${1 - i * 0.12}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${H}" viewBox="0 0 760 ${H}">
  <rect width="760" height="${H}" rx="16" fill="#0d1117" stroke="#21262d"/>
  <text x="60" y="52" font-family="${FONT}" font-size="22" font-weight="bold" fill="#f97316">Most Used Languages</text>
  <rect x="60" y="70" width="640" height="1.5" fill="#f97316" opacity="0.25"/>${rows}
</svg>`;
}

// ---------- write ----------
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = process.env.OUT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets');

writeFileSync(join(OUT, 'stats-card.svg'), statsCard());
writeFileSync(join(OUT, 'top-langs.svg'), topLangsCard());
console.log('cards generated:', { stars, totalCommits, totalPRs, totalIssues, repos: user.public_repos, langs: topLangs });
