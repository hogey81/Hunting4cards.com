import { chromium, devices } from "playwright";
import fs from "node:fs";
const BASE = "https://www.hunting4cards.com";
fs.mkdirSync("audit", { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["Pixel 7"], locale: "nl-NL" });
const p = await ctx.newPage();
const report = [];
const contrast = () => p.evaluate(() => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.5)) return c; } return "rgb(238,242,248)"; };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || ["INPUT", "SELECT"].includes(el.tagName);
    if (!own) continue; const r0 = el.getBoundingClientRect(); if (!r0.width || !r0.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
    const a = lum(cs.color), c = lum(bgOf(el)); const r = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
    if (r < 3) out.push(`${r.toFixed(1)} <${el.tagName.toLowerCase()} class="${el.className}"> "${(el.textContent || el.placeholder || "").trim().slice(0, 50)}"`);
    if (el.scrollWidth > el.clientWidth + 2 && cs.textOverflow === "ellipsis") out.push(`afgekapt <${el.tagName.toLowerCase()} class="${el.className}"> "${el.textContent.trim().slice(0, 60)}"`);
  }
  return [...new Set(out)].slice(0, 25);
});
let n = 0;
async function visit(path, label) {
  const t0 = Date.now();
  let status = 0;
  try { const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 }); status = r?.status() ?? 0; } catch (e) { status = "timeout"; }
  const dom = Date.now() - t0;
  await p.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  const idle = Date.now() - t0;
  const issues = await contrast().catch(() => ["(check mislukt)"]);
  const file = `audit/${String(++n).padStart(2, "0")}-${label}.png`;
  await p.screenshot({ path: file, fullPage: true }).catch(() => {});
  report.push({ label, path, status, dom, idle, issues });
  console.log(`${label} ${path} HTTP ${status} dom ${dom}ms idle ${idle}ms ${issues.length} issues`);
}
async function clickTime(label, selector) {
  const el = p.locator(selector).first();
  if (!(await el.count())) { report.push({ label, error: "geen link " + selector }); return; }
  const href = await el.getAttribute("href");
  const t0 = Date.now();
  await el.click();
  await p.waitForURL((u) => u.pathname === new URL(href, BASE).pathname, { timeout: 30000 }).catch(() => {});
  const urlMs = Date.now() - t0;
  await p.waitForSelector(".skel-page", { state: "detached", timeout: 30000 }).catch(() => {});
  await p.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  const doneMs = Date.now() - t0;
  const issues = await contrast().catch(() => []);
  const file = `audit/${String(++n).padStart(2, "0")}-${label}.png`;
  await p.screenshot({ path: file, fullPage: true }).catch(() => {});
  report.push({ label, path: href, tapToNewPage: urlMs, tapToContent: doneMs, issues });
  console.log(`${label} click ${href}: page ${urlMs}ms content ${doneMs}ms`);
}
await visit("/", "spelkeuze");
await visit("/pokemon", "pokemon-home");
await visit("/sets", "pokemon-sets");
await clickTime("pokemon-set", "a[href^='/sets/']");
await clickTime("pokemon-kaart", "a[href^='/kaart/']");
await visit("/zoeken?q=Pikachu", "zoeken");
await visit("/jp/sets/SV2a", "japanse-set");
for (const g of ["yugioh", "magic", "lorcana", "onepiece", "digimon", "starwars", "fab"]) {
  await visit(`/${g}`, `${g}-home`);
  await visit(`/${g}/sets`, `${g}-sets`);
  await clickTime(`${g}-set`, `a[href^='/${g}/sets/']`);
  await clickTime(`${g}-kaart`, `a[href^='/${g}/kaart/']`);
}
await visit("/collectie", "collectie");
await visit("/collectie/sets", "mijn-sets");
await visit("/scan", "scan");
await visit("/account", "account");
await visit("/privacy", "privacy");
fs.writeFileSync("audit/report.json", JSON.stringify(report, null, 2));
await b.close();
