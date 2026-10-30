// Fills the Apps section of the README with the public repos tagged with the
// "app" topic. To list a new app, add that topic to its repository.
//
// Icon: the first of ICON_PATHS that exists in the repo.
// Name and text: descripciones.json when the app is there; otherwise the repo's
// name and description.
import { readFileSync, writeFileSync } from "node:fs";

const USER = "dferrandizmont";
const TOPIC = "app";
const PER_ROW = 2;
const ICON_PATHS = ["docs/readme/icon-512.png", "docs/readme/en/icon-512.png", "docs/readme/es/icon-512.png", "assets/brand/png/icon-1024.png"];

const headers = { Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function exists(url) {
  return (await fetch(url, { method: "HEAD" })).ok;
}

const texts = JSON.parse(readFileSync(new URL("../descripciones.json", import.meta.url), "utf8"));
const repos = (await gh(`/users/${USER}/repos?type=owner&per_page=100&sort=created`))
  .filter((r) => !r.fork && !r.archived && r.topics?.includes(TOPIC))
  .sort((a, b) => b.created_at.localeCompare(a.created_at));

const cells = [];
for (const r of repos) {
  const raw = `https://raw.githubusercontent.com/${r.full_name}/${r.default_branch}/`;
  let icon = `https://opengraph.githubassets.com/1/${r.full_name}`;
  for (const p of ICON_PATHS) {
    if (await exists(raw + p)) {
      icon = raw + p;
      break;
    }
  }
  const [release] = await gh(`/repos/${r.full_name}/releases?per_page=1`);
  const own0 = texts[r.name] ?? {};
  const links = [`<a href="${r.html_url}">${own0.codigo === false ? "Info" : "Source"}</a>`];
  if (release) links.unshift(`<a href="${r.html_url}/releases">Download</a>`);
  if (r.homepage) links.push(`<a href="${r.homepage}">Website</a>`);
  const own = texts[r.name] ?? {};
  const name = own.nombre ?? r.name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const text = own.texto ?? r.description ?? "";

  cells.push(`<td width="${100 / PER_ROW}%" valign="top">
<br>
<a href="${r.html_url}"><img src="${icon}" width="56" height="56" alt="${name}"></a>
<br><br>
<b><a href="${r.html_url}">${name}</a></b><br>
${text}<br><br>
<sub>${links.join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</sub>
<br><br>
</td>`);
}

const rows = [];
for (let i = 0; i < cells.length; i += PER_ROW) rows.push(`<tr>\n${cells.slice(i, i + PER_ROW).join("\n")}\n</tr>`);
const block = `<!-- APPS:START -->\n<table>\n${rows.join("\n")}\n</table>\n<!-- APPS:END -->`;

const file = new URL("../README.md", import.meta.url);
const readme = readFileSync(file, "utf8");
const next = readme.replace(/<!-- APPS:START -->[\s\S]*<!-- APPS:END -->/, block);
if (next !== readme) writeFileSync(file, next);
console.log(`${repos.length} apps: ${repos.map((r) => r.name).join(", ")}`);
