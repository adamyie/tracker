import * as db from "./db.js";
import { barChart, lineChart, donut, ring } from "./charts.js";
import { DEFAULT_LISTS, LIBRARY, LIB_VERSION, PALETTE, SOURCES, GROUP_ICON } from "./defaults.js";
import { mascot, confetti } from "./art.js";

const APP_VERSION = "2.1.0";

/* ================= helpers ================= */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymdhm = (d) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const todayStr = () => ymd(new Date());
const parse = (s) => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const weekStart = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAY = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_MON = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const fmtDay = (s) => { const d = parse(s); return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtShort = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const timeOf = (s) => (s.length > 10 ? s.slice(11, 16) : "");
const nf = new Intl.NumberFormat("id-ID");
const rp = (n) => (n < 0 ? "−" : "") + "Rp" + nf.format(Math.abs(Math.round(n || 0)));
const rpShort = (n) => {
  const a = Math.abs(n), sign = n < 0 ? "−" : "";
  if (a >= 1e6) return sign + "Rp" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",").replace(",0", "") + "jt";
  if (a >= 1e3) return sign + "Rp" + Math.round(a / 1e3) + "rb";
  return sign + "Rp" + nf.format(Math.round(a));
};
const kg = (n) => nf.format(Math.round(n * 10) / 10);
const digits = (s) => String(s).replace(/\D/g, "");
const toNum = (s) => parseFloat(String(s).replace(",", "."));
const uid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0; return (h >>> 0).toString(36); };
const habitId = (date, name) => `h_${date}_${hash(name)}`;
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const e1rm = (w, r) => (w > 0 ? w * (1 + r / 30) : 0);
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
const buzz = () => { if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {} };
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const CHEV = `<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>`;
const UNIT_LBL = { reps: "Reps", sec: "Seconds", min: "Minutes" };
const UNIT_STEP = { reps: 1, sec: 5, min: 1 };
const UNIT_MAX = { reps: 300, sec: 3600, min: 600 };

/* ================= state ================= */
const S = {
  events: [], gym: [], habits: [], deposits: [], lists: null, settings: { theme: "system" }, memOnly: false,
  tab: "spend", cat: null, when: "now", ex: null, rpe: null, gymFilter: { group: null, q: "" },
  hist: { kind: "spend", span: "week", anchor: todayStr(), q: "" },
  ins: { kind: "money", month: todayStr().slice(0, 7), ex: null },
  installEvt: null, restStart: 0, restTimer: null, game: null,
};
const ARR = { events: "events", gym_sets: "gym", habits: "habits", deposits: "deposits" };

/* ================= persistence ================= */
function migrateLists(L) {
  let changed = false;
  L.categories = (L.categories || []).map((c) => ({ ...c, name: c.name || c.category }));
  L.exercises = (L.exercises || []).map((x) => ({ ...x, name: x.name || x.exercise, group: x.group || x.muscle_group || "Other" }));
  L.habits = (L.habits || []).map((h) => ({ ...h, name: h.name || h.habit, target: h.target ?? h.target_per_week ?? 7 }));
  L.categories.forEach((c, i) => { if (!c.color) { c.color = PALETTE[i % PALETTE.length]; changed = true; } if (!c.icon) c.icon = "🏷️"; if (c.budget == null) c.budget = Number(c.monthly_limit_idr) || 0; });
  L.habits.forEach((h, i) => { if (!h.color) { h.color = PALETTE[(i * 3 + 4) % PALETTE.length]; changed = true; } if (h.active == null) h.active = true; if (!h.icon) h.icon = "✅"; });
  if ((L.lib || 0) < LIB_VERSION) {
    const have = new Set(L.exercises.map((x) => x.name.toLowerCase()));
    LIBRARY.forEach((x) => { if (!have.has(x.name.toLowerCase())) L.exercises.push({ ...x }); });
    L.lib = LIB_VERSION; changed = true;
  }
  L.exercises.forEach((x) => { if (!x.unit) { x.unit = (LIBRARY.find((y) => y.name === x.name) || {}).unit || "reps"; changed = true; } });
  return changed;
}
async function load() {
  try {
    const [e, g, h, kvDeps, lists, settings] = await Promise.all([db.all("events"), db.all("gym_sets"), db.all("habits"), db.kvGet("deposits"), db.kvGet("lists"), db.kvGet("settings")]);
    S.events = e; S.gym = g; S.habits = h.filter((x) => x.done !== false); S.deposits = Array.isArray(kvDeps) ? kvDeps : [];
    if (await db.hasStore("deposits")) {
      const legacy = await db.all("deposits"), have = new Set(S.deposits.map((d) => d.id)), add = legacy.filter((d) => !have.has(d.id));
      if (add.length) { S.deposits = S.deposits.concat(add); await db.kvSet("deposits", S.deposits); }
    }
    S.lists = lists || structuredClone(DEFAULT_LISTS);
    if (migrateLists(S.lists) || !lists) await db.kvSet("lists", S.lists);
    if (settings) Object.assign(S.settings, settings);
  } catch (err) {
    console.error(err);
    S.memOnly = true;
    S.lists = structuredClone(DEFAULT_LISTS);
    banner(err && err.message === "blocked" ? "Another copy of Tracker is open in this browser. Close all its tabs (or swipe the app away) and open it again." : "This browser won't let the app store data (private browsing?). Anything you log now disappears when you close it.");
  }
}
async function guard(p) {
  if (S.memOnly) return;
  try { await p(); } catch (err) { toast(err && err.name === "QuotaExceededError" ? "Device storage is full." : "Couldn't save to device storage."); throw err; }
}
async function upsert(store, obj) {
  const a = S[ARR[store]], i = a.findIndex((x) => x.id === obj.id);
  if (i >= 0) a[i] = obj; else a.push(obj);
  refresh();
  await guard(() => (store === "deposits" ? db.kvSet("deposits", S.deposits) : db.put(store, obj)));
}
async function remove(store, id) {
  const a = S[ARR[store]], i = a.findIndex((x) => x.id === id);
  if (i >= 0) a.splice(i, 1);
  refresh();
  await guard(() => (store === "deposits" ? db.kvSet("deposits", S.deposits) : db.del(store, id)));
}
async function saveLists() { refresh(); await guard(() => db.kvSet("lists", S.lists)); }
async function saveSettings() { try { await guard(() => db.kvSet("settings", S.settings)); } catch (e) {} }

/* ================= ui primitives ================= */
window.addEventListener("error", (e) => banner(`Something went wrong: ${e.message || "unknown error"}. Try closing and reopening the app.`));
window.addEventListener("unhandledrejection", (e) => banner(`Something went wrong: ${(e.reason && e.reason.message) || e.reason || "unknown error"}. Try closing and reopening the app.`));
function banner(msg) { const b = $("banner"); b.hidden = !msg; b.textContent = msg || ""; }
let toastTimer = null, undoFn = null;
function toast(msg, undo) {
  $("toastMsg").textContent = msg; undoFn = undo || null; $("toastUndo").hidden = !undo; $("toast").hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 5000);
}
$("toastUndo").addEventListener("click", async () => { const f = undoFn; undoFn = null; $("toast").hidden = true; if (f) try { await f(); } catch (e) {} });
function moneyInput(i) { i.addEventListener("input", () => { const d = digits(i.value).slice(0, 12); i.value = d ? nf.format(Number(d)) : ""; }); }

/* sheet */
let sheetCtx = null;
function openSheet(ctx) {
  sheetCtx = ctx;
  $("sheetTitle").textContent = ctx.title;
  $("sheetBody").innerHTML = ctx.body;
  $("sheetErr").textContent = "";
  const del = $("sheetDelete");
  del.hidden = !ctx.onDelete; del.textContent = ctx.deleteLabel || "Delete"; del.classList.remove("confirm");
  $("sheetSave").hidden = !ctx.onSubmit; $("sheetSave").textContent = ctx.saveLabel || "Save";
  $("sheetBody").querySelectorAll("[data-money]").forEach(moneyInput);
  if (!$("sheet").open) $("sheet").showModal();
  $("sheetForm").scrollTop = 0;
  ctx.onOpen && ctx.onOpen($("sheetBody"));
}
function closeSheet() { if ($("sheet").open) $("sheet").close(); sheetCtx = null; }
$("sheetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sheetCtx || !sheetCtx.onSubmit) return closeSheet();
  const ctx = sheetCtx;
  try {
    const r = await ctx.onSubmit($("sheetBody"));
    if (typeof r === "string") { $("sheetErr").textContent = r; return; }
    if (sheetCtx === ctx) closeSheet();
  } catch (err) { $("sheetErr").textContent = "Couldn't save. Try again."; }
});
$("sheetDelete").addEventListener("click", async () => {
  const b = $("sheetDelete");
  if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = "Tap again to confirm"; return; }
  const f = sheetCtx && sheetCtx.onDelete; closeSheet();
  if (f) try { await f(); } catch (e) {}
});
$("sheetClose").addEventListener("click", closeSheet);
$("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) closeSheet(); });
$("sheet").addEventListener("close", () => { sheetCtx = null; });
$("sheetBody").addEventListener("click", (e) => sheetCtx && sheetCtx.onClick && sheetCtx.onClick(e));

/* single-choice chip groups inside sheets */
function pickIn(container, btn, attr) { container.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute("aria-pressed", b === btn)); }
const pickedVal = (id, attr) => $(id)?.querySelector('[aria-pressed="true"]')?.getAttribute(attr);
const swatches = (cur) => `<div class="swatches" id="f_color">${PALETTE.map((c) => `<button type="button" data-color="${c}" style="--c:${c}" aria-pressed="${c === cur}" aria-label="Color ${c}"></button>`).join("")}</div>`;

/* chart tooltips */
function chartTip(e) {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (!t) return;
  const c = t.closest(".chart") || t.closest(".card");
  const tip = c && c.querySelector(".tip");
  if (!tip) return;
  tip.textContent = t.dataset.tip;
  c.querySelectorAll(".on").forEach((x) => x.classList.remove("on"));
  t.classList.add("on");
}
document.addEventListener("pointerover", chartTip);
document.addEventListener("click", chartTip);

/* theme */
function applyTheme() {
  const t = S.settings.theme;
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    document.querySelector('meta[name="theme-color"]').setAttribute("content", bg);
  });
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
new ResizeObserver(() => document.documentElement.style.setProperty("--headh", $("top").offsetHeight + "px")).observe($("top"));

/* ================= tabs ================= */
const TITLES = { spend: "Spend", gym: "Gym", habits: "Habits", history: "History", insights: "Insights", settings: "Settings" };
let prevTab = "spend";
function show(tab) {
  if (tab !== "settings") prevTab = tab;
  S.tab = tab;
  for (const k in TITLES) $("v-" + k).hidden = k !== tab;
  document.querySelectorAll("nav.tabs button").forEach((b) => (b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  $("settingsBtn").setAttribute("aria-pressed", tab === "settings");
  $("viewTitle").textContent = TITLES[tab];
  renderDynamic();
  window.scrollTo(0, 0);
  try { localStorage.setItem("tab", tab); } catch (e) {}
}
document.querySelectorAll("nav.tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
$("settingsBtn").addEventListener("click", () => show(S.tab === "settings" ? prevTab : "settings"));
document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) show(g.dataset.goto); });

function renderDynamic() {
  if (S.tab === "history") renderHistory();
  else if (S.tab === "insights") renderInsights();
  else if (S.tab === "settings") renderSettings();
}
function refresh() {
  renderWallet(); renderCats(); renderSpendToday(); renderExercises(); renderGymToday(); renderQuests(); renderHabits(); renderDynamic(); checkProgress();
}

/* universal edit taps */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (!b) return;
  const [store, id] = b.dataset.edit.split(":");
  if (store === "events") editSpend(id); else if (store === "gym_sets") editSet(id); else if (store === "deposits") editDeposit(id);
});

/* ================= lookups ================= */
const catOf = (name) => S.lists.categories.find((c) => c.name === name) || { name, icon: "🏷️", budget: 0, color: "#8A97A8" };
const exOf = (name) => S.lists.exercises.find((x) => x.name === name) || { name, group: "Other", unit: "reps" };
const groupOf = (name) => exOf(name).group || "";
const GROUP_ORDER = Object.keys(GROUP_ICON);
const groupList = () => [...new Set(S.lists.exercises.map((x) => x.group || "Other"))].sort((a, b) => ((GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99)));
const habitOf = (name) => S.lists.habits.find((h) => h.name === name) || { name, icon: "✅", target: 7, active: false, color: "#7C5CFF" };
const srcOf = (name) => SOURCES.find((s) => s.name === name) || { name: name || "Deposit", icon: "💰" };
const monthKey = () => todayStr().slice(0, 7);
const monthBy = (mk) => { const by = {}; S.events.forEach((r) => { if (r.date.startsWith(mk)) by[r.category] = (by[r.category] || 0) + r.amount; }); return by; };
const totalBudget = () => sum(S.lists.categories, (c) => c.budget);
const doneSet = (h) => new Set(S.habits.filter((x) => x.habit === h).map((x) => x.date));
function runLen(set, from = new Date()) {
  let day = new Date(from); if (!set.has(ymd(day))) day = addDays(day, -1);
  let n = 0; while (set.has(ymd(day)) && n < 5000) { n++; day = addDays(day, -1); }
  return n;
}
function bestRun(set) {
  const ds = [...set].sort(); let best = 0, cur = 0, prev = null;
  for (const s of ds) { cur = prev && ymd(addDays(parse(prev), 1)) === s ? cur + 1 : 1; best = Math.max(best, cur); prev = s; }
  return best;
}
const streak = (h) => runLen(doneSet(h));
const bestStreak = (h) => bestRun(doneSet(h));
const weekCount = (h, ws = weekStart(new Date())) => { const d = doneSet(h); let c = 0; for (let i = 0; i < 7; i++) if (d.has(ymd(addDays(ws, i)))) c++; return c; };
const activeHabits = () => S.lists.habits.filter((h) => h.active);
const levelCls = (spent, lim) => (lim && spent > lim ? "bad" : lim && spent > lim * 0.85 ? "warn" : "");

/* ================= WALLET ================= */
function walletState() {
  if (!S.deposits.length) return null;
  const deps = [...S.deposits].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);
  let si = 0; deps.forEach((d, i) => { if (d.mode === "reset") si = i; });
  const start = deps[si], period = deps.slice(si);
  const funds = sum(period, (d) => d.amount);
  const spent = sum(S.events.filter((e) => e.date > start.date || (e.date === start.date && (e.ts || 0) >= (start.ts || 0))), (e) => e.amount);
  return { start, period, funds, spent, left: funds - spent };
}
function walletMood(w) {
  if (!w) return "sleepy";
  if (w.left < 0) return "broke";
  const f = w.funds ? w.left / w.funds : 0;
  return f < 0.2 ? "worried" : f < 0.5 ? "ok" : "happy";
}
function walletSay(w) {
  if (!w) return "Hi! I'm Koin. Add your first deposit and I'll count down every rupiah you spend.";
  const m = walletMood(w);
  if (m === "broke") return `Uh oh, we're ${rp(-w.left)} past this deposit. Time for a top-up or a no-spend day?`;
  if (m === "worried") return `Only ${rp(w.left)} left. Let's go easy on the jajan!`;
  if (m === "ok") return `Halfway there. ${rp(w.left)} still in the pocket.`;
  return `Looking great! ${rp(w.left)} left from your deposit.`;
}
function renderWallet() {
  const w = walletState(), el = $("walletBar"), typed = Number(digits($("amt").value));
  const mood = walletMood(w);
  el.className = "wallet " + mood;
  if (!w) {
    el.innerHTML = `${mascot("sleepy", 46)}<span class="wmain"><span class="wl">Amount Left</span><span class="wv">Add your first deposit</span><span class="ws">Tap here, then add your allowance or salary</span></span><span class="wplus" aria-hidden="true">+</span>`;
    return;
  }
  const after = w.left - typed;
  const fNow = w.funds ? Math.max(0, Math.min(1, w.left / w.funds)) : 0, fAfter = w.funds ? Math.max(0, Math.min(1, after / w.funds)) : 0;
  el.innerHTML = `${mascot(typed && after < 0 ? "broke" : mood, 46)}<span class="wmain"><span class="wl">Amount Left${typed ? ` <em>→ ${rp(after)} after this</em>` : ""}</span>
    <span class="wv">${rp(w.left)}</span>
    <span class="wbar"><i class="now" style="width:${fNow * 100}%"></i><i class="after" style="width:${(typed ? fAfter : fNow) * 100}%"></i></span>
    <span class="ws">of ${rp(w.funds)} · since ${fmtShort(w.start.date)}</span></span><span class="wplus" aria-hidden="true">+</span>`;
}
$("walletBar").addEventListener("click", () => walletSheet());

function depositItem(d) {
  const s = srcOf(d.source);
  return `<button type="button" class="item" data-edit="deposits:${esc(d.id)}" style="--c:var(--good)"><span class="ico">${s.icon}</span><span class="main"><span class="t">${esc(d.source || "Deposit")}${d.mode === "reset" ? " · fresh start" : ""}</span><span class="s">${fmtShort(d.date)} ${timeOf(d.date)}${d.note ? " · " + esc(d.note) : ""}</span></span><span class="amt good">+${rp(d.amount)}</span>${CHEV}</button>`;
}
function depositFields(d, isNew) {
  const hasAny = S.deposits.length > 0;
  return `<div class="field"><label class="label" for="d_amt">Deposit amount</label><div class="amount sm"><span class="cur">Rp</span><input id="d_amt" data-money inputmode="numeric" placeholder="0" value="${d.amount ? nf.format(d.amount) : ""}"></div></div>
    ${isNew ? `<div class="chips">${[100000, 250000, 500000, 1000000, 2000000].map((v) => `<button type="button" class="chip" data-dq="${v}">${rpShort(v)}</button>`).join("")}</div>` : ""}
    <div class="field"><span class="label">Source</span><div class="chips" id="d_src">${SOURCES.map((s) => `<button type="button" class="chip" data-src="${esc(s.name)}" aria-pressed="${(d.source || "Gaji") === s.name}">${s.icon} ${s.name}</button>`).join("")}</div></div>
    <div class="field"><label class="label" for="d_note">Note</label><input id="d_note" maxlength="60" placeholder="Optional" value="${esc(d.note || "")}"></div>
    <div class="field"><label class="label" for="d_date">When</label><input id="d_date" type="datetime-local" max="${ymdhm(new Date())}" value="${d.date || ymdhm(new Date())}"></div>
    ${hasAny || !isNew ? `<div class="field"><span class="label">How to count it</span><div class="seg" id="d_mode"><button type="button" data-mode="topup" aria-pressed="${d.mode !== "reset"}">➕ Add to balance</button><button type="button" data-mode="reset" aria-pressed="${d.mode === "reset"}">🔄 Start fresh</button></div>
      <div class="hint" id="d_hint">${d.mode === "reset" ? "Starts a new balance from this deposit. Leftover money isn't counted." : "Whatever is left stays, and this is added on top."}</div></div>` : ""}`;
}
function depositClick(e) {
  const q = e.target.closest("[data-dq]"), s = e.target.closest("[data-src]"), m = e.target.closest("[data-mode]");
  if (q) $("d_amt").value = nf.format(Number(q.dataset.dq));
  if (s) pickIn($("d_src"), s, "data-src");
  if (m) { pickIn($("d_mode"), m, "data-mode"); $("d_hint").textContent = m.dataset.mode === "reset" ? "Starts a new balance from this deposit. Leftover money isn't counted." : "Whatever is left stays, and this is added on top."; }
}
function readDeposit() {
  const amount = Number(digits($("d_amt").value)), date = $("d_date").value;
  if (!amount) return "Enter a deposit amount.";
  if (!date) return "Pick a date.";
  if (date > ymdhm(new Date())) return "The date can't be in the future.";
  return { amount, date, source: pickedVal("d_src", "data-src") || "Lainnya", note: $("d_note").value.trim(), mode: pickedVal("d_mode", "data-mode") || "topup" };
}
function walletSheet() {
  const w = walletState(), mood = walletMood(w);
  const recent = [...S.deposits].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 8);
  openSheet({
    title: "Wallet",
    body: `<div class="wallet-hero">${mascot(mood, 76)}<div><span class="label">Amount left</span><div class="big ${w && w.left < 0 ? "" : "good"}" style="${w && w.left < 0 ? "color:var(--bad)" : ""}">${rp(w ? w.left : 0)}</div>
      <div class="hint">${w ? `${rp(w.funds)} in · ${rp(w.spent)} spent since ${fmtShort(w.start.date)}` : "No deposits yet"}</div></div></div>
      <div class="say">${esc(walletSay(w))}</div>
      <h2>Add a deposit</h2>${depositFields({}, true)}
      ${recent.length ? `<div class="stack-sm"><span class="label">Recent deposits</span><div class="list">${recent.map(depositItem).join("")}</div></div>` : ""}`,
    saveLabel: "Add deposit +10 XP",
    onClick: depositClick,
    onSubmit: async () => {
      const r = readDeposit(); if (typeof r === "string") return r;
      const row = { id: uid("d"), ...r, ts: Date.now() };
      await upsert("deposits", row);
      confetti(40); buzz();
      toast(`Deposited ${rp(row.amount)} 💰`, () => remove("deposits", row.id));
      requestPersist();
    },
  });
}
function editDeposit(id) {
  const d = S.deposits.find((x) => x.id === id); if (!d) return;
  openSheet({
    title: "Edit deposit", body: depositFields(d, false), onClick: depositClick,
    onSubmit: async () => { const r = readDeposit(); if (typeof r === "string") return r; await upsert("deposits", { ...d, ...r }); toast("Deposit updated"); },
    onDelete: async () => { await remove("deposits", d.id); toast("Deposit deleted", () => upsert("deposits", d)); },
  });
}

/* ================= SPEND ================= */
const QUICK = [10000, 15000, 20000, 25000, 50000, 100000];
$("quick").innerHTML = QUICK.map((v) => `<button class="chip" type="button" data-q="${v}">${rpShort(v)}</button>`).join("");
$("quick").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; $("amt").value = nf.format(Number(b.dataset.q)); $("spendErr").textContent = ""; renderWallet(); buzz(); });
moneyInput($("amt"));
$("amt").addEventListener("input", () => { $("spendErr").textContent = ""; renderWallet(); });
$("amt").addEventListener("keydown", (e) => { if (e.key === "Enter") $("saveSpend").click(); });
$("note").addEventListener("keydown", (e) => { if (e.key === "Enter") $("saveSpend").click(); });

function setWhen(w) {
  S.when = w;
  $("whenSeg").querySelectorAll("[data-when]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.when === w));
  $("sdate").hidden = w !== "pick";
  if (w === "pick") { $("sdate").max = ymdhm(new Date()); if (!$("sdate").value) $("sdate").value = ymdhm(new Date()); }
}
$("whenSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-when]"); if (b) setWhen(b.dataset.when); });

function renderCats() {
  const by = monthBy(monthKey()), cats = S.lists.categories;
  if (!cats.length) { $("cats").innerHTML = '<span class="empty">No categories. Add some in Settings.</span>'; return; }
  $("cats").innerHTML = cats.map((c) => {
    const sp = by[c.name] || 0, left = c.budget - sp, k = levelCls(sp, c.budget);
    const used = c.budget ? Math.min(100, (sp / c.budget) * 100) : sp ? 100 : 0;
    const lf = c.budget ? (left >= 0 ? rpShort(left) : rpShort(-left) + " over") : sp ? rpShort(sp) + " spent" : "no limit";
    return `<button class="cat" type="button" style="--c:${esc(c.color)}" data-cat="${esc(c.name)}" aria-pressed="${S.cat === c.name}">
      <span class="bubble${k === "bad" ? " over" : ""}"><span class="fill" style="height:${used}%"></span><span class="ico">${esc(c.icon)}</span></span>
      <span class="nm">${esc(c.name)}</span><span class="lf ${k}">${lf}</span></button>`;
  }).join("");
}
$("cats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  S.cat = S.cat === b.dataset.cat ? null : b.dataset.cat;
  $("cats").querySelectorAll("[data-cat]").forEach((t) => t.setAttribute("aria-pressed", t.dataset.cat === S.cat));
  $("spendErr").textContent = ""; buzz();
  fillNoteSuggest();
});
function fillNoteSuggest() {
  const seen = new Set(), out = [];
  [...S.events].sort((a, b) => b.ts - a.ts).forEach((r) => { if (r.note && (!S.cat || r.category === S.cat) && !seen.has(r.note)) { seen.add(r.note); out.push(r.note); } });
  $("noteSuggest").innerHTML = out.slice(0, 12).map((n) => `<option value="${esc(n)}">`).join("");
}

$("saveSpend").addEventListener("click", async () => {
  const err = $("spendErr"), amount = Number(digits($("amt").value));
  if (!amount) { err.textContent = "Enter an amount above Rp0."; return; }
  if (!S.cat) { err.textContent = "Tap a category."; return; }
  let date = ymdhm(new Date());
  if (S.when === "yesterday") date = ymdhm(addDays(new Date(), -1));
  if (S.when === "pick") {
    date = $("sdate").value;
    if (!date) { err.textContent = "Pick a date and time."; return; }
    if (date > ymdhm(new Date())) { err.textContent = "The date can't be in the future."; return; }
  }
  const row = { id: uid("e"), date, category: S.cat, amount, note: $("note").value.trim(), ts: Date.now() };
  $("amt").value = ""; $("note").value = ""; $("sdate").value = ""; S.cat = null; setWhen("now");
  try { await upsert("events", row); } catch (e) { return; }
  buzz();
  const w = walletState();
  toast(`Saved ${row.category} ${rp(amount)}${w ? ` · ${rp(w.left)} left` : ""}`, () => remove("events", row.id));
  requestPersist();
});

function spendItem(r, withDate) {
  const c = catOf(r.category);
  const sub = [withDate ? fmtShort(r.date) : "", timeOf(r.date), r.note ? esc(r.note) : ""].filter(Boolean).join(" · ");
  return `<button type="button" class="item" style="--c:${esc(c.color)}" data-edit="events:${esc(r.id)}"><span class="ico">${esc(c.icon)}</span><span class="main"><span class="t">${esc(r.category)}</span><span class="s">${sub || "&nbsp;"}</span></span><span class="amt">${rp(r.amount)}</span>${CHEV}</button>`;
}
function renderSpendToday() {
  const t = todayStr();
  const rows = S.events.filter((e) => e.date.startsWith(t)).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  $("todayTotal").textContent = rows.length ? rp(sum(rows, (r) => r.amount)) : "";
  $("spendToday").innerHTML = rows.length ? rows.map((r) => spendItem(r)).join("") : '<div class="empty">Nothing logged today yet. Koin is proud of you. 🪙</div>';
}
function catOptions(cur) {
  const names = S.lists.categories.map((c) => c.name);
  if (cur && !names.includes(cur)) names.push(cur);
  return names.map((n) => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("");
}
function editSpend(id) {
  const r = S.events.find((x) => x.id === id); if (!r) return;
  openSheet({
    title: "Edit expense",
    body: `<div class="field"><label class="label" for="f_amt">Amount (Rp)</label><input id="f_amt" data-money class="num" inputmode="numeric" value="${nf.format(r.amount)}"></div>
      <div class="field"><label class="label" for="f_cat">Category</label><select id="f_cat">${catOptions(r.category)}</select></div>
      <div class="field"><label class="label" for="f_date">When</label><input id="f_date" type="datetime-local" max="${ymdhm(new Date())}" value="${r.date.length > 10 ? r.date : r.date + "T12:00"}"></div>
      <div class="field"><label class="label" for="f_note">Note</label><input id="f_note" maxlength="80" value="${esc(r.note)}"></div>`,
    onSubmit: async () => {
      const amount = Number(digits($("f_amt").value)), date = $("f_date").value;
      if (!amount) return "Enter an amount above Rp0.";
      if (!date) return "Pick a date.";
      if (date > ymdhm(new Date())) return "The date can't be in the future.";
      await upsert("events", { ...r, amount, category: $("f_cat").value, date, note: $("f_note").value.trim() });
      toast("Expense updated");
    },
    onDelete: async () => { await remove("events", r.id); toast("Expense deleted", () => upsert("events", r)); },
  });
}

/* ================= GYM ================= */
const RPES = ["6", "7", "7.5", "8", "8.5", "9", "9.5", "10"];
$("rpe").innerHTML = RPES.map((v) => `<button class="chip num" type="button" data-rpe="${v}" aria-pressed="false">${v}</button>`).join("");
const paintRpe = () => $("rpe").querySelectorAll("[data-rpe]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.rpe === S.rpe));
$("rpe").addEventListener("click", (e) => { const b = e.target.closest("[data-rpe]"); if (!b) return; S.rpe = S.rpe === b.dataset.rpe ? null : b.dataset.rpe; paintRpe(); });
document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
  const [f, s] = b.dataset.step.split(":"), i = $(f);
  let v = (toNum(i.value) || 0) + Number(s); if (v < 0) v = 0;
  i.value = f === "reps" ? Math.round(v) : String(Math.round(v * 10) / 10);
  buzz();
}));

const sortSets = (a, b) => b.date.localeCompare(a.date) || b.set_no - a.set_no || b.ts - a.ts;
const nextSetNo = (n, date = todayStr()) => S.gym.filter((s) => s.exercise === n && s.date === date).length + 1;
function setLabel(s) {
  const u = s.unit || "reps", w = s.weight > 0 ? kg(s.weight) : "";
  const core = u === "sec" ? `${s.reps}s` : u === "min" ? `${s.reps} min` : w ? `${w}×${s.reps}` : `${s.reps} reps`;
  return (u !== "reps" && w ? `${w}kg · ` : "") + core + (s.rpe ? ` @${s.rpe}` : "");
}
const scoreOf = (s) => ((s.unit || "reps") === "reps" ? (s.weight > 0 ? e1rm(s.weight, s.reps) : s.reps) : s.reps);

function recentEx() {
  const last = {}; S.gym.forEach((s) => { if (!last[s.exercise] || s.date > last[s.exercise]) last[s.exercise] = s.date; });
  const since = ymd(addDays(new Date(), -21));
  return Object.keys(last).filter((n) => last[n] >= since).sort((a, b) => last[b].localeCompare(last[a]));
}
function exChip(n, t) {
  const c = S.gym.filter((s) => s.exercise === n && s.date === t).length;
  return `<button class="chip" type="button" data-ex="${esc(n)}" aria-pressed="${S.ex === n}">${esc(n)}${c ? `<span class="badge">${c}</span>` : ""}</button>`;
}
function renderExercises() {
  const ex = S.lists.exercises, f = S.gymFilter, rec = recentEx(), t = todayStr();
  const groups = groupList();
  if (!f.group || (f.group === "recent" && !rec.length) || (f.group !== "recent" && f.group !== "all" && !groups.includes(f.group))) f.group = rec.length ? "recent" : groups[0] || "all";
  $("grpChips").innerHTML = (rec.length ? `<button class="chip" type="button" data-grp="recent" aria-pressed="${f.group === "recent"}">⭐ Recent</button>` : "") +
    `<button class="chip" type="button" data-grp="all" aria-pressed="${f.group === "all"}">All ${ex.length}</button>` +
    groups.map((g) => `<button class="chip" type="button" data-grp="${esc(g)}" aria-pressed="${f.group === g}">${GROUP_ICON[g] || "⭐"} ${esc(g)}</button>`).join("");
  $("grpChips").hidden = !!f.q;
  const box = $("exList");
  if (!ex.length) { box.innerHTML = '<span class="empty">No exercises. Tap + Custom to add one.</span>'; return; }
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hits = ex.filter((x) => x.name.toLowerCase().includes(q) || (x.group || "").toLowerCase().includes(q));
    box.innerHTML = hits.length ? `<div class="chips">${hits.map((x) => exChip(x.name, t)).join("")}</div>`
      : `<div class="empty">No exercise called “${esc(f.q)}” yet.</div><div class="chips"><button type="button" class="chip add" data-newex="${esc(f.q.trim())}">+ Add “${esc(f.q.trim())}”</button></div>`;
    return;
  }
  if (f.group === "all") { box.innerHTML = groups.map((g) => `<div class="group"><span class="label">${GROUP_ICON[g] || "⭐"} ${esc(g)}</span><div class="chips">${ex.filter((x) => (x.group || "Other") === g).map((x) => exChip(x.name, t)).join("")}</div></div>`).join(""); return; }
  const names = f.group === "recent" ? rec : ex.filter((x) => (x.group || "Other") === f.group).map((x) => x.name);
  box.innerHTML = `<div class="chips">${names.map((n) => exChip(n, t)).join("")}<button type="button" class="chip add" data-newex="">+ Add</button></div>`;
}
$("grpChips").addEventListener("click", (e) => { const b = e.target.closest("[data-grp]"); if (!b) return; S.gymFilter.group = b.dataset.grp; renderExercises(); });
$("exSearch").addEventListener("input", () => { S.gymFilter.q = $("exSearch").value; renderExercises(); });
$("exList").addEventListener("click", (e) => {
  const n = e.target.closest("[data-newex]");
  if (n) return editExercise(null, { name: n.dataset.newex, group: ["recent", "all"].includes(S.gymFilter.group) ? undefined : S.gymFilter.group, onAdded: (name) => { S.gymFilter.q = ""; $("exSearch").value = ""; renderExercises(); pickExercise(name); } });
  const b = e.target.closest("[data-ex]"); if (b) { buzz(); pickExercise(b.dataset.ex); }
});
$("addExBtn").addEventListener("click", () => editExercise(null, { group: ["recent", "all"].includes(S.gymFilter.group) ? undefined : S.gymFilter.group, onAdded: (name) => { renderExercises(); pickExercise(name); } }));

function applyUnit(unit) {
  $("repsLbl").textContent = UNIT_LBL[unit];
  $("wLbl").textContent = unit === "reps" ? "Weight kg" : "Weight kg (optional)";
  $("repsMinus").dataset.step = `reps:-${UNIT_STEP[unit]}`; $("repsPlus").dataset.step = `reps:${UNIT_STEP[unit]}`;
}
function pickExercise(n) {
  S.ex = n;
  const x = exOf(n), unit = x.unit || "reps";
  $("exList").querySelectorAll("[data-ex]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.ex === n));
  $("exName").textContent = n; $("setNo").hidden = false; $("setNo").textContent = "Set " + nextSetNo(n);
  $("saveSet").disabled = false; $("gymErr").textContent = "";
  applyUnit(unit);
  const all = S.gym.filter((s) => s.exercise === n).sort(sortSets);
  const last = all[0], prevDate = all.find((s) => s.date !== todayStr())?.date;
  if (last) {
    $("wkg").value = last.weight; $("reps").value = last.reps; S.rpe = last.rpe ? String(last.rpe) : null;
    const parts = [];
    if (prevDate) parts.push(`Last time (${fmtShort(prevDate)}): ` + all.filter((s) => s.date === prevDate).sort((a, b) => a.set_no - b.set_no).map(setLabel).join(" · "));
    const best = all.reduce((b, s) => (scoreOf(s) > scoreOf(b) ? s : b), all[0]);
    parts.push(`🏆 Best: ${setLabel(best)}`);
    $("lastInfo").textContent = parts.join(". ");
  } else {
    $("wkg").value = unit === "reps" ? "" : "0"; $("reps").value = ""; S.rpe = null;
    $("lastInfo").textContent = `New exercise unlocked! ${GROUP_ICON[x.group] || ""} ${x.group}. ${unit === "reps" ? "Use 0 kg for bodyweight." : `Enter the ${UNIT_LBL[unit].toLowerCase()}.`}`;
  }
  paintRpe();
  $("setCard").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

$("saveSet").addEventListener("click", async () => {
  const err = $("gymErr"), n = S.ex, unit = exOf(n || "").unit || "reps", w = toNum($("wkg").value || "0"), r = Number($("reps").value);
  if (!n) { err.textContent = "Pick an exercise first."; return; }
  if (isNaN(w) || w < 0 || w > 500) { err.textContent = "Enter a weight from 0 to 500 kg (0 for bodyweight)."; return; }
  if (!Number.isInteger(r) || r < 1 || r > UNIT_MAX[unit]) { err.textContent = `Enter ${UNIT_LBL[unit].toLowerCase()} as a whole number from 1 to ${UNIT_MAX[unit]}.`; return; }
  const row = { id: uid("g"), date: todayStr(), exercise: n, group: groupOf(n), unit, set_no: nextSetNo(n), weight: w, reps: r, rpe: S.rpe ? Number(S.rpe) : null, note: $("gnote").value.trim(), ts: Date.now() };
  const prior = S.gym.filter((s) => s.exercise === n);
  const priorBest = prior.length ? Math.max(...prior.map(scoreOf)) : null;
  $("gnote").value = "";
  try { await upsert("gym_sets", row); } catch (e) { return; }
  buzz();
  if (priorBest != null && scoreOf(row) > priorBest) { confetti(80); toast(`🏆 New PR! ${n} ${setLabel(row)}`, () => remove("gym_sets", row.id)); }
  else toast(`Saved ${n} set ${row.set_no} 💪`, () => remove("gym_sets", row.id));
  startRest();
  requestPersist();
});

function prIds() {
  const best = {}, ids = new Set();
  [...S.gym].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts).forEach((s) => {
    const v = scoreOf(s);
    if (best[s.exercise] != null && v > best[s.exercise]) ids.add(s.id);
    best[s.exercise] = Math.max(best[s.exercise] ?? -1, v);
  });
  return ids;
}
function setsBlock(rows) {
  const prs = prIds(), order = [];
  rows.sort((a, b) => a.ts - b.ts).forEach((s) => { if (!order.includes(s.exercise)) order.push(s.exercise); });
  return order.map((ex) => {
    const ss = rows.filter((s) => s.exercise === ex).sort((a, b) => a.set_no - b.set_no);
    return `<div class="exblock"><div class="row-between"><span class="t">${esc(ex)}</span><span class="hint">${GROUP_ICON[ss[0].group] || ""} ${esc(ss[0].group)}</span></div><div class="sets">${ss.map((s) => `<button type="button" class="setchip${prs.has(s.id) ? " pr" : ""}" data-edit="gym_sets:${esc(s.id)}"><small>${s.set_no}</small>${setLabel(s)}${prs.has(s.id) ? " 🏆" : ""}</button>`).join("")}</div></div>`;
  }).join("");
}
function renderGymToday() {
  const t = todayStr(), rows = S.gym.filter((s) => s.date === t);
  const vol = sum(rows.filter((s) => (s.unit || "reps") === "reps"), (s) => s.weight * s.reps);
  $("gymToday").textContent = rows.length ? `${rows.length} sets · ${kg(vol)} kg` : "";
  $("setsToday").innerHTML = rows.length ? setsBlock(rows) : '<div class="empty">No sets yet today. Let\'s get those gains! 💪</div>';
  if (S.ex) $("setNo").textContent = "Set " + nextSetNo(S.ex);
}

function startRest() {
  S.restStart = Date.now(); $("rest").hidden = false; clearInterval(S.restTimer);
  const tick = () => { const s = Math.floor((Date.now() - S.restStart) / 1000); if (s > 600) return stopRest(); $("restT").textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  tick(); S.restTimer = setInterval(tick, 1000);
}
function stopRest() { clearInterval(S.restTimer); $("rest").hidden = true; }
$("restStop").addEventListener("click", stopRest);

function exOptions(cur) {
  const names = S.lists.exercises.map((x) => x.name);
  if (cur && !names.includes(cur)) names.push(cur);
  return names.map((n) => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("");
}
function editSet(id) {
  const r = S.gym.find((x) => x.id === id); if (!r) return;
  const unit = r.unit || "reps";
  openSheet({
    title: "Edit set",
    body: `<div class="field"><label class="label" for="f_ex">Exercise</label><select id="f_ex">${exOptions(r.exercise)}</select></div>
      <div class="two"><div class="field"><label class="label" for="f_w">Weight kg</label><input id="f_w" class="num" inputmode="decimal" value="${r.weight}"></div>
      <div class="field"><label class="label" for="f_r">${UNIT_LBL[unit]}</label><input id="f_r" class="num" inputmode="numeric" value="${r.reps}"></div></div>
      <div class="two"><div class="field"><label class="label" for="f_rpe">RPE</label><select id="f_rpe"><option value="">None</option>${RPES.map((v) => `<option ${String(r.rpe) === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label class="label" for="f_d">Date</label><input id="f_d" type="date" max="${todayStr()}" value="${r.date}"></div></div>
      <div class="field"><label class="label" for="f_n">Note</label><input id="f_n" maxlength="80" value="${esc(r.note)}"></div>`,
    onSubmit: async () => {
      const w = toNum($("f_w").value || "0"), reps = Number($("f_r").value), date = $("f_d").value, ex = $("f_ex").value, u = ex === r.exercise ? unit : exOf(ex).unit || "reps";
      if (isNaN(w) || w < 0 || w > 500) return "Enter a weight from 0 to 500 kg.";
      if (!Number.isInteger(reps) || reps < 1 || reps > UNIT_MAX[u]) return `Enter ${UNIT_LBL[u].toLowerCase()} as a whole number.`;
      if (!date || date > todayStr()) return "Pick a date that isn't in the future.";
      const moved = date !== r.date || ex !== r.exercise;
      await upsert("gym_sets", { ...r, exercise: ex, group: groupOf(ex) || r.group, unit: u, weight: w, reps, rpe: $("f_rpe").value ? Number($("f_rpe").value) : null, date, note: $("f_n").value.trim(), set_no: moved ? nextSetNo(ex, date) : r.set_no });
      toast("Set updated");
    },
    onDelete: async () => { await remove("gym_sets", r.id); toast("Set deleted", () => upsert("gym_sets", r)); },
  });
}

/* ================= HABITS & QUESTS ================= */
async function toggleHabit(name, date) {
  const id = habitId(date, name), ex = S.habits.find((x) => x.id === id);
  if (ex) { await remove("habits", id); return; }
  await upsert("habits", { id, date, habit: name, done: true, ts: Date.now() });
  requestPersist();
  const act = activeHabits();
  if (date === todayStr() && act.length && act.every((h) => doneSet(h.name).has(date))) { confetti(90); toast("All habits done today! +20 XP bonus 🎉"); }
}
function quests() {
  const t = todayStr(), act = activeHabits();
  return [
    { icon: "🧾", name: "Log today's spending", done: S.events.some((e) => e.date.startsWith(t)), xp: "+5 XP", tab: "spend" },
    { icon: "🏋️", name: "Train or move", done: S.gym.some((s) => s.date === t) || S.habits.some((h) => h.date === t && /gym|olahraga|lari|run|walk|jalan/i.test(h.habit)), xp: "+3/set", tab: "gym" },
    { icon: "✅", name: act.length > 1 ? `Finish all ${act.length} habits` : act.length ? `Finish “${act[0].name}”` : "Add a habit", done: act.length > 0 && act.every((h) => doneSet(h.name).has(t)), xp: "+20 XP", tab: act.length ? null : "settings" },
  ];
}
function renderQuests() {
  const q = quests(), n = q.filter((x) => x.done).length;
  $("quests").innerHTML = `<div class="qhead">${mascot(n === 3 ? "happy" : n ? "ok" : "sleepy", 58)}<div><h2>Daily quests</h2><div class="hint">${n === 3 ? "Legendary day! All quests done 🎉" : `${n}/3 done · new quests at midnight`}</div></div></div>
    <div class="qlist">${q.map((x) => `<button type="button" class="quest${x.done ? " done" : ""}" ${x.tab && !x.done ? `data-goto="${x.tab}"` : ""}><span class="qi">${x.icon}</span><span class="qn">${x.name}</span><span class="qx">${x.done ? CHECK : x.xp}</span></button>`).join("")}</div>`;
}
function renderHabits() {
  const act = activeHabits(), t = todayStr(), ws = weekStart(new Date());
  if (!act.length) { $("habitList").innerHTML = '<div class="card empty">No active habits. Add one in Settings.</div>'; return; }
  $("habitList").innerHTML = act.map((h) => {
    const d = doneSet(h.name), on = d.has(t), st = streak(h.name), wc = weekCount(h.name);
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const day = addDays(ws, i), k = ymd(day);
      return `<button type="button" class="wd${d.has(k) ? " on" : ""}${k === t ? " today" : ""}" data-hday="${esc(h.name)}|${k}" ${k > t ? "disabled" : ""} aria-pressed="${d.has(k)}" aria-label="${esc(h.name)} ${DAY_MON[i]} ${day.getDate()}"><span>${DAY_MON[i]}</span><b>${day.getDate()}</b></button>`;
    }).join("");
    return `<div class="card habit" style="--c:${esc(h.color)}"><div class="hrow"><span class="ico">${esc(h.icon || "✅")}</span><div class="main"><div class="t">${esc(h.name)}</div>
      <div class="s">${wc}/${h.target} this week${st ? ` · 🔥 ${st} day${st === 1 ? "" : "s"}` : ""}${wc >= h.target ? " · goal hit ⭐" : ""}</div></div>
      <button type="button" class="check" data-hday="${esc(h.name)}|${t}" aria-pressed="${on}" aria-label="${esc(h.name)} done today">${CHECK}</button></div>
      <div class="prog"><i style="width:${Math.min(100, (wc / h.target) * 100)}%"></i></div><div class="week">${days}</div></div>`;
  }).join("");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-hday]"); if (!b || b.disabled) return;
  const i = b.dataset.hday.lastIndexOf("|");
  buzz();
  toggleHabit(b.dataset.hday.slice(0, i), b.dataset.hday.slice(i + 1));
  if (b.closest("#sheetBody")) b.setAttribute("aria-checked", b.getAttribute("aria-checked") !== "true");
});

/* ================= GAME: XP, levels, badges ================= */
const TITLES_LV = [[1, "Rookie"], [3, "Saver"], [5, "Grinder"], [8, "Budget Ninja"], [12, "Iron Will"], [16, "Legend"], [20, "Mythic"]];
const titleOf = (L) => TITLES_LV.filter(([l]) => L >= l).pop()[1];
function levelOf(xp) { let L = 1, need = 100, acc = 0; while (xp >= acc + need) { acc += need; L++; need = 100 + 50 * (L - 1); } return { L, into: xp - acc, need }; }
const BADGES = [
  { id: "first", icon: "🌱", name: "First Step", desc: "Log your first expense", test: (g) => g.nExp >= 1 },
  { id: "payday", icon: "💰", name: "Payday", desc: "Add a deposit", test: (g) => g.nDep >= 1 },
  { id: "green", icon: "🛡️", name: "In the Green", desc: "Finish a month under budget", test: (g) => g.underMonth },
  { id: "book", icon: "🧾", name: "Bookkeeper", desc: "Log 100 expenses", test: (g) => g.nExp >= 100 },
  { id: "fire7", icon: "🔥", name: "On Fire", desc: "Log something 7 days in a row", test: (g) => g.bestStreak >= 7 },
  { id: "fire30", icon: "☄️", name: "Unstoppable", desc: "30-day logging streak", test: (g) => g.bestStreak >= 30 },
  { id: "rat", icon: "🏋️", name: "Gym Rat", desc: "Log your first set", test: (g) => g.nSets >= 1 },
  { id: "century", icon: "💯", name: "Century", desc: "Log 100 sets", test: (g) => g.nSets >= 100 },
  { id: "regular", icon: "📅", name: "Regular", desc: "Train on 20 different days", test: (g) => g.nSessions >= 20 },
  { id: "explorer", icon: "🧭", name: "Explorer", desc: "Train 20 different exercises", test: (g) => g.variety >= 20 },
  { id: "pr", icon: "🏆", name: "New PR", desc: "Beat your best on any exercise", test: (g) => g.hadPR },
  { id: "perfect", icon: "⭐", name: "Perfect Week", desc: "Hit every habit target in a week", test: (g) => g.perfectWeek },
  { id: "hero", icon: "🌟", name: "Habit Hero", desc: "50 habit check-ins", test: (g) => g.nCheck >= 50 },
];
function game() {
  const days = {}, day = (d) => (days[d] = days[d] || { e: 0, s: 0, h: new Set(), dep: 0 });
  S.events.forEach((e) => day(e.date.slice(0, 10)).e++);
  S.gym.forEach((s) => day(s.date).s++);
  S.habits.forEach((h) => day(h.date).h.add(h.habit));
  S.deposits.forEach((d) => day(d.date.slice(0, 10)).dep++);
  const act = activeHabits();
  let xp = 0;
  for (const k in days) {
    const p = days[k];
    xp += Math.min(25, p.e * 5) + Math.min(45, p.s * 3) + p.h.size * 10 + p.dep * 10;
    if (act.length && act.every((h) => p.h.has(h.name))) xp += 20;
  }
  const active = new Set(Object.keys(days));
  const ws = weekStart(new Date());
  let perfectWeek = false;
  if (act.length) for (let i = 0; i < 52 && !perfectWeek; i++) { const w = addDays(ws, -7 * i); if (act.every((h) => weekCount(h.name, w) >= h.target)) perfectWeek = true; }
  const budget = totalBudget(), cur = monthKey(), months = {};
  S.events.forEach((e) => { const m = e.date.slice(0, 7); if (m < cur) months[m] = (months[m] || 0) + e.amount; });
  const g = {
    xp, level: levelOf(xp), streak: runLen(active), bestStreak: bestRun(active),
    nExp: S.events.length, nSets: S.gym.length, nCheck: S.habits.length, nDep: S.deposits.length,
    nSessions: new Set(S.gym.map((s) => s.date)).size, variety: new Set(S.gym.map((s) => s.exercise)).size,
    hadPR: prIds().size > 0, perfectWeek, underMonth: budget > 0 && Object.values(months).some((v) => v <= budget),
  };
  g.unlocked = BADGES.filter((b) => b.test(g)).map((b) => b.id);
  return g;
}
function renderPlayer(g) {
  $("avatar").innerHTML = mascot(walletMood(walletState()), 40);
  $("lvlLbl").textContent = `Lv ${g.level.L} · ${titleOf(g.level.L)}`;
  $("xpFill").style.width = (g.level.into / g.level.need) * 100 + "%";
  $("xpTxt").textContent = `${g.level.into}/${g.level.need} XP`;
  $("streakN").textContent = g.streak;
}
function checkProgress() {
  const g = game(); S.game = g; renderPlayer(g);
  const seen = S.settings.seen;
  if (!seen) { S.settings.seen = { L: g.level.L, badges: g.unlocked }; saveSettings(); return; }
  const fresh = g.unlocked.filter((b) => !seen.badges.includes(b));
  if (g.level.L <= seen.L && !fresh.length) return;
  if (g.level.L > seen.L) {
    confetti(110);
    if (!$("sheet").open) openSheet({ title: "Level up! 🎉", body: `<div class="lvcard">${mascot("happy", 84)}<div><div class="label">You reached</div><div class="big">Level ${g.level.L}</div><div class="hint">Title: <b>${titleOf(g.level.L)}</b>. ${g.level.need - g.level.into} XP to the next level.</div></div></div>`, saveLabel: "Let's go!", onSubmit: () => {} });
    else toast(`Level up! You're now Level ${g.level.L} 🎉`);
  } else {
    const b = BADGES.find((x) => x.id === fresh[0]);
    setTimeout(() => { confetti(60); toast(`${b.icon} Badge unlocked: ${b.name}!`); }, 700);
  }
  seen.L = Math.max(seen.L, g.level.L); seen.badges = [...new Set([...seen.badges, ...fresh])];
  saveSettings();
}
$("playerBtn").addEventListener("click", () => {
  const g = S.game || game();
  openSheet({
    title: "Your progress",
    body: `<div class="lvcard">${mascot(walletMood(walletState()), 80)}<div style="flex:1;min-width:0"><div class="label">Level ${g.level.L}</div><div class="big">${titleOf(g.level.L)}</div>
        <div class="xpbar" style="margin:6px 0 4px"><i style="width:${(g.level.into / g.level.need) * 100}%"></i></div><div class="hint">${g.level.into}/${g.level.need} XP · ${g.xp} XP total · 🔥 ${g.streak}-day streak (best ${g.bestStreak})</div></div></div>
      <div class="row-between"><h2>Trophies</h2><span class="pill ok">${g.unlocked.length}/${BADGES.length}</span></div>
      <div class="badges">${BADGES.map((b) => `<div class="badge${g.unlocked.includes(b.id) ? "" : " locked"}"><span class="bi">${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join("")}</div>
      <h2>How to earn XP</h2><div class="xprules"><span>Log an expense</span><span>+5 (25/day max)</span><span>Log a gym set</span><span>+3 (45/day max)</span><span>Check off a habit</span><span>+10</span><span>All habits in one day</span><span>+20 bonus</span><span>Add a deposit</span><span>+10</span></div>`,
    saveLabel: "Close", onSubmit: () => {},
  });
});

/* ================= HISTORY ================= */
function histRange() {
  const a = parse(S.hist.anchor), span = S.hist.kind === "habits" ? "month" : S.hist.span;
  if (span === "day") return [a, a];
  if (span === "week") { const s = weekStart(a); return [s, addDays(s, 6)]; }
  return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 0)];
}
function histLabel() {
  const [s, e] = histRange(), span = S.hist.kind === "habits" ? "month" : S.hist.span, t = todayStr();
  if (span === "day") return ymd(s) === t ? "Today" : ymd(s) === ymd(addDays(new Date(), -1)) ? "Yesterday" : fmtDay(ymd(s)) + " " + s.getFullYear();
  if (span === "week") return (ymd(s) === ymd(weekStart(new Date())) ? "This week · " : "") + `${s.getDate()} ${s.getMonth() !== e.getMonth() ? MON[s.getMonth()] + " " : ""}– ${e.getDate()} ${MON[e.getMonth()]}`;
  return `${MONTH[s.getMonth()]} ${s.getFullYear()}`;
}
function histShift(d) {
  const a = parse(S.hist.anchor), span = S.hist.kind === "habits" ? "month" : S.hist.span;
  S.hist.anchor = ymd(span === "day" ? addDays(a, d) : span === "week" ? addDays(a, 7 * d) : addMonths(a, d));
  const [s] = histRange(); if (ymd(s) > todayStr()) S.hist.anchor = todayStr();
  renderHistory();
}
function renderHistory() {
  const h = S.hist, box = $("v-history");
  const [, e] = histRange(), canNext = ymd(e) < todayStr();
  const segBtn = (key, val, label) => `<button type="button" data-h${key}="${val}" aria-pressed="${h[key] === val}">${label}</button>`;
  box.innerHTML = `<div class="seg">${segBtn("kind", "spend", "💸 Money")}${segBtn("kind", "gym", "🏋️ Gym")}${segBtn("kind", "habits", "✅ Habits")}</div>
    ${h.kind !== "habits" ? `<div class="seg sm">${segBtn("span", "day", "Day")}${segBtn("span", "week", "Week")}${segBtn("span", "month", "Month")}</div>` : ""}
    <div class="pnav"><button type="button" data-hnav="-1" aria-label="Previous">‹</button><div class="plabel">${histLabel()}</div><button type="button" data-hnav="1" aria-label="Next" ${canNext ? "" : "disabled"}>›</button></div>
    ${h.kind === "spend" ? `<input type="search" id="hq" placeholder="Search notes or categories" value="${esc(h.q)}" autocomplete="off">` : ""}
    <div id="histBody" class="stack"></div>`;
  const q = $("hq"); if (q) q.addEventListener("input", () => { S.hist.q = q.value; renderHistBody(); });
  renderHistBody();
}
$("v-history").addEventListener("click", (e) => {
  const k = e.target.closest("[data-hkind]"), s = e.target.closest("[data-hspan]"), n = e.target.closest("[data-hnav]"), c = e.target.closest("[data-hcal]");
  if (k) { S.hist.kind = k.dataset.hkind; renderHistory(); }
  else if (s) { S.hist.span = s.dataset.hspan; renderHistory(); }
  else if (n && !n.disabled) histShift(Number(n.dataset.hnav));
  else if (c && !c.disabled) habitDaySheet(c.dataset.hcal);
});
function inRange(date) { const [s, e] = histRange(), d = date.slice(0, 10); return d >= ymd(s) && d <= ymd(e); }
function renderHistBody() {
  const body = $("histBody"), kind = S.hist.kind;
  if (kind === "spend") {
    const q = S.hist.q.trim().toLowerCase();
    const ex = S.events.filter((r) => inRange(r.date) && (!q || r.category.toLowerCase().includes(q) || (r.note || "").toLowerCase().includes(q))).map((r) => ({ ...r, _k: "e" }));
    const dp = S.deposits.filter((d) => inRange(d.date) && (!q || (d.source || "").toLowerCase().includes(q) || (d.note || "").toLowerCase().includes(q))).map((d) => ({ ...d, _k: "d" }));
    const rows = [...ex, ...dp].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
    if (!rows.length) { body.innerHTML = `<div class="card empty">${q ? "No matches in this period." : "Nothing logged in this period."}</div>`; return; }
    const days = {}; rows.forEach((r) => (days[r.date.slice(0, 10)] = days[r.date.slice(0, 10)] || []).push(r));
    body.innerHTML = `<div class="split"><div class="stat"><span class="label">Spent</span><span class="v">${rpShort(sum(ex, (r) => r.amount))}</span><span class="d">${ex.length} expense${ex.length === 1 ? "" : "s"}</span></div>
        <div class="stat"><span class="label">Deposited</span><span class="v good">${rpShort(sum(dp, (r) => r.amount))}</span><span class="d">${dp.length} deposit${dp.length === 1 ? "" : "s"}</span></div></div>` +
      Object.keys(days).map((d) => {
        const spent = sum(days[d].filter((r) => r._k === "e"), (r) => r.amount);
        return `<div class="stack-sm"><div class="dayhead"><span>${fmtDay(d)}</span><span class="num">${spent ? rp(spent) : ""}</span></div><div class="card"><div class="list">${days[d].map((r) => (r._k === "e" ? spendItem(r) : depositItem(r))).join("")}</div></div></div>`;
      }).join("");
  } else if (kind === "gym") {
    const rows = S.gym.filter((s) => inRange(s.date));
    if (!rows.length) { body.innerHTML = '<div class="card empty">No sets in this period.</div>'; return; }
    const days = [...new Set(rows.map((s) => s.date))].sort().reverse();
    body.innerHTML = days.map((d) => {
      const ds = rows.filter((s) => s.date === d);
      return `<div class="stack-sm"><div class="dayhead"><span>${fmtDay(d)}</span><span class="num">${ds.length} sets · ${kg(sum(ds.filter((s) => (s.unit || "reps") === "reps"), (s) => s.weight * s.reps))} kg</span></div><div class="card">${setsBlock(ds)}</div></div>`;
    }).join("");
  } else {
    const [s, e] = histRange(), t = todayStr(), act = activeHabits(), n = act.length || 1;
    const lead = (s.getDay() + 6) % 7;
    let cells = DAY_MON.map((d) => `<span class="dh">${d.slice(0, 2)}</span>`).join("") + "<span></span>".repeat(lead);
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
      const k = ymd(d), c = S.habits.filter((x) => x.date === k).length, f = c / n;
      const l = c === 0 ? "" : f >= 1 ? "l3" : f >= 0.5 ? "l2" : "l1";
      cells += `<button type="button" class="${l}${k === t ? " today" : ""}" data-hcal="${k}" ${k > t ? "disabled" : ""} aria-label="${fmtDay(k)}: ${c} habits"><span>${d.getDate()}</span><span class="c">${c ? (f >= 1 ? "⭐" : c + "/" + act.length) : ""}</span></button>`;
    }
    const monthDays = Math.min(daysInMonth(s.getFullYear(), s.getMonth()), ymd(e) > t ? new Date().getDate() : 99);
    body.innerHTML = `<div class="card"><div class="cal">${cells}</div><div class="hint">⭐ = every habit done. Tap a day to add or remove check-ins.</div></div>
      <div class="card"><h2>This month</h2>${act.map((h) => {
        const c = S.habits.filter((x) => x.habit === h.name && inRange(x.date)).length, goal = Math.round((monthDays / 7) * h.target) || 1;
        return `<div class="brow" style="--c:${esc(h.color)}"><div class="top"><b>${esc(h.icon || "")} ${esc(h.name)}</b><span class="num">${c} days</span></div><div class="bar"><i style="width:${Math.min(100, (c / goal) * 100)}%"></i></div></div>`;
      }).join("") || '<div class="empty">No active habits.</div>'}</div>`;
  }
}
function habitDaySheet(date) {
  const names = [...new Set([...activeHabits().map((h) => h.name), ...S.habits.filter((x) => x.date === date).map((x) => x.habit)])];
  openSheet({
    title: fmtDay(date) + " " + parse(date).getFullYear(),
    body: names.length ? `<div class="list">${names.map((n) => {
      const on = S.habits.some((x) => x.id === habitId(date, n)), h = habitOf(n);
      return `<div class="item" style="--c:${esc(h.color)}"><span class="ico">${esc(h.icon || "✅")}</span><span class="main"><span class="t">${esc(n)}</span></span><button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${esc(n)}" data-hday="${esc(n)}|${date}"></button></div>`;
    }).join("")}</div>` : '<div class="empty">No habits set up.</div>',
    saveLabel: "Done", onSubmit: () => {},
  });
}

/* ================= INSIGHTS ================= */
function renderInsights() {
  const k = S.ins.kind, box = $("v-insights");
  const segBtn = (val, label) => `<button type="button" data-ikind="${val}" aria-pressed="${k === val}">${label}</button>`;
  box.innerHTML = `<div class="seg">${segBtn("money", "💸 Money")}${segBtn("gym", "🏋️ Gym")}${segBtn("habits", "✅ Habits")}</div><div id="insBody" class="stack"></div>`;
  if (k === "money") insMoney($("insBody")); else if (k === "gym") insGym($("insBody")); else insHabits($("insBody"));
}
$("v-insights").addEventListener("click", (e) => {
  const k = e.target.closest("[data-ikind]"), m = e.target.closest("[data-imonth]"), x = e.target.closest("[data-iex]");
  if (k) { S.ins.kind = k.dataset.ikind; renderInsights(); }
  else if (m && !m.disabled) { const [y, mo] = S.ins.month.split("-").map(Number); S.ins.month = ymd(addMonths(new Date(y, mo - 1, 1), Number(m.dataset.imonth))).slice(0, 7); renderInsights(); }
  else if (x) { S.ins.ex = x.dataset.iex; renderInsights(); }
});

function insMoney(box) {
  const mk = S.ins.month, [y, m] = mk.split("-").map(Number), now = new Date(), isCur = mk === monthKey();
  const rows = S.events.filter((e) => e.date.startsWith(mk)), total = sum(rows, (r) => r.amount), limit = totalBudget();
  const deposited = sum(S.deposits.filter((d) => d.date.startsWith(mk)), (d) => d.amount);
  const dim = daysInMonth(y, m - 1), dayN = isCur ? now.getDate() : dim, daysLeft = isCur ? dim - dayN + 1 : 0;
  const daily = Array(dim).fill(0); rows.forEach((r) => (daily[Number(r.date.slice(8, 10)) - 1] += r.amount));
  const pk = ymd(addMonths(new Date(y, m - 1, 1), -1)).slice(0, 7);
  const prevTot = sum(S.events.filter((e) => e.date.startsWith(pk) && (!isCur || Number(e.date.slice(8, 10)) <= dayN)), (r) => r.amount);
  const frac = limit ? total / limit : 0, cls = levelCls(total, limit) || "good", diff = pct(total, prevTot);
  let callout = "";
  if (isCur && limit) {
    const left = limit - total;
    callout = left >= 0 ? `<div class="callout ${cls === "good" ? "" : cls}">🪙 You can spend about <b>${rpShort(left / daysLeft)}</b> a day for the ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.</div>`
      : `<div class="callout bad">😵 You're ${rpShort(-left)} over this month's budget.</div>`;
  }
  const nav = `<div class="pnav"><button type="button" data-imonth="-1" aria-label="Previous month">‹</button><div class="plabel">${MONTH[m - 1]} ${y}</div><button type="button" data-imonth="1" aria-label="Next month" ${isCur ? "disabled" : ""}>›</button></div>`;
  const hero = `<div class="card"><div class="hero">${ring(frac, cls)}<div class="main"><span class="label">Spent${isCur ? " so far" : ""}</span><span class="big">${rp(total)}</span>
    <span class="hint">${limit ? `of ${rp(limit)} budget` : "No budgets set"}${diff != null && prevTot ? ` · ${diff > 0 ? "+" : ""}${diff}% vs ${MON[(m + 10) % 12]}${isCur ? " so far" : ""}` : ""}</span></div></div>
    <div class="split"><div class="stat"><span class="label">Deposited</span><span class="v good">${rpShort(deposited)}</span><span class="d">this month</span></div><div class="stat"><span class="label">Net</span><span class="v" style="color:${deposited - total >= 0 ? "var(--good)" : "var(--bad)"}">${rpShort(deposited - total)}</span><span class="d">in minus out</span></div></div>${callout}</div>`;
  if (!rows.length) { box.innerHTML = nav + hero + `<div class="card empty">${mascot("sleepy", 48)} No expenses this month yet. Charts appear once you log some.</div>` + trendCard(mk, limit); return; }

  const dailyChart = barChart({
    data: daily.map((v, i) => ({ label: String(i + 1), value: v, hl: isCur && i + 1 === dayN, muted: isCur && i + 1 > dayN, tip: `${i + 1} ${MON[m - 1]}: ${rp(v)}` })),
    ref: limit ? limit / dim : null, refLabel: "daily budget", yFmt: rpShort, labelEvery: 5, tip: `Average ${rp(total / dayN)} a day. Tap a bar for details.`,
  });
  const by = monthBy(mk), sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5), rest = sum(sorted.slice(5), (x) => x[1]);
  const segs = top.map(([c, v]) => ({ label: c, value: v, color: catOf(c).color, tip: `${catOf(c).icon} ${c}: ${rp(v)} (${Math.round((v / total) * 100)}%)` }));
  if (rest) segs.push({ label: "Other", value: rest, color: "var(--c6)", tip: `Other: ${rp(rest)} (${Math.round((rest / total) * 100)}%)` });
  const donutCard = `<div class="card"><h2>Where it went</h2><div class="tip hint">Tap a slice for details.</div><div class="donut-wrap">${donut({ segments: segs, center: rpShort(total), sub: `${rows.length} expenses` })}
    <div class="legend">${segs.map((s) => `<div><span><i class="swatch" style="background:${s.color}"></i>${esc(s.label)}</span><span class="num">${Math.round((s.value / total) * 100)}%</span></div>`).join("")}</div></div></div>`;
  const cats = [...S.lists.categories.map((c) => c.name), ...Object.keys(by).filter((c) => !S.lists.categories.some((x) => x.name === c))];
  const budgetCard = `<div class="card"><div class="row-between"><h2>Budgets</h2><span class="hint">${MON[m - 1]}</span></div>${cats.filter((c) => by[c] || catOf(c).budget).map((c) => {
    const sp = by[c] || 0, cc = catOf(c), lim = cc.budget, k = levelCls(sp, lim), p = lim ? Math.min(100, (sp / lim) * 100) : 100;
    const left = lim ? (sp <= lim ? `${rpShort(lim - sp)} left` : `${rpShort(sp - lim)} over`) : "no budget";
    return `<div class="brow" style="--c:${esc(cc.color)}"><div class="top"><b>${esc(cc.icon)} ${esc(c)}</b><span class="num">${rpShort(sp)}${lim ? " / " + rpShort(lim) : ""}</span></div><div class="bar ${k}"><i style="width:${p}%"></i></div><div class="left ${k}">${left}</div></div>`;
  }).join("")}</div>`;
  const biggest = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const bigCard = `<div class="card"><h2>Biggest expenses</h2><div class="list">${biggest.map((r) => spendItem(r, true)).join("")}</div></div>`;
  box.innerHTML = nav + hero + `<div class="card"><h2>Day by day</h2>${dailyChart}</div>` + donutCard + budgetCard + trendCard(mk, limit) + bigCard;
}
function trendCard(mk, limit) {
  const [y, m] = mk.split("-").map(Number), data = [];
  for (let i = 5; i >= 0; i--) {
    const d = addMonths(new Date(y, m - 1, 1), -i), k = ymd(d).slice(0, 7), v = sum(S.events.filter((e) => e.date.startsWith(k)), (r) => r.amount);
    data.push({ label: MON[d.getMonth()], value: v, hl: i === 0, tip: `${MONTH[d.getMonth()]} ${d.getFullYear()}: ${rp(v)}` });
  }
  if (!data.some((d) => d.value)) return "";
  const prev = data.slice(0, 5).filter((d) => d.value), avg = prev.length ? sum(prev, (d) => d.value) / prev.length : 0;
  return `<div class="card"><h2>Last 6 months</h2>${barChart({ data, ref: limit || null, refLabel: "budget", yFmt: rpShort, tip: avg ? `Earlier months averaged ${rp(avg)}.` : "Tap a bar for details." })}</div>`;
}

function insGym(box) {
  const ws = weekStart(new Date()), wsS = ymd(ws), lwS = ymd(addDays(ws, -7));
  const wk = S.gym.filter((s) => s.date >= wsS), lw = S.gym.filter((s) => s.date >= lwS && s.date < wsS);
  const st = (a) => ({ sessions: new Set(a.map((s) => s.date)).size, sets: a.length, vol: sum(a.filter((s) => (s.unit || "reps") === "reps"), (s) => s.weight * s.reps) });
  const a = st(wk), b = st(lw);
  const delta = (x, y) => { const d = x - y; return d === 0 ? `<span class="d">same as last wk</span>` : `<span class="d ${d > 0 ? "up" : "down"}">${d > 0 ? "▲" : "▼"} ${kg(Math.abs(d))} vs last wk</span>`; };
  const stats = `<div class="stats"><div class="stat"><span class="label">Sessions</span><span class="v">${a.sessions}</span>${delta(a.sessions, b.sessions)}</div>
    <div class="stat"><span class="label">Sets</span><span class="v">${a.sets}</span>${delta(a.sets, b.sets)}</div>
    <div class="stat"><span class="label">Volume</span><span class="v">${a.vol >= 10000 ? Math.round(a.vol / 1000) + "t" : kg(a.vol)}</span>${delta(Math.round(a.vol), Math.round(b.vol))}</div></div>`;
  if (!S.gym.length) { box.innerHTML = `<div class="label">This week</div>` + stats + `<div class="card empty">${mascot("sleepy", 48)} Log some sets and your progress charts show up here.</div>`; return; }

  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const s = addDays(ws, -7 * i), e = ymd(addDays(s, 6)), ss = ymd(s);
    const n = new Set(S.gym.filter((x) => x.date >= ss && x.date <= e).map((x) => x.date)).size;
    weeks.push({ label: `${s.getDate()}/${s.getMonth() + 1}`, value: n, hl: i === 0, tip: `Week of ${s.getDate()} ${MON[s.getMonth()]}: ${n} session${n === 1 ? "" : "s"}` });
  }
  const gymHabit = S.lists.habits.find((h) => h.name.toLowerCase() === "gym");
  const sessChart = barChart({ data: weeks, ref: gymHabit ? gymHabit.target : null, refLabel: "target", tip: "Sessions per week. Tap a bar." });

  const lastDate = {}; S.gym.forEach((s) => { if (!lastDate[s.exercise] || s.date > lastDate[s.exercise]) lastDate[s.exercise] = s.date; });
  const exs = Object.keys(lastDate).sort((x, y) => lastDate[y].localeCompare(lastDate[x]));
  if (!S.ins.ex || !exs.includes(S.ins.ex)) S.ins.ex = exs[0];
  const ex = S.ins.ex, sets = S.gym.filter((s) => s.exercise === ex), unit = sets[0].unit || "reps";
  const weighted = unit === "reps" && sets.some((s) => s.weight > 0);
  const metricLbl = unit === "sec" ? "longest (seconds)" : unit === "min" ? "longest (minutes)" : weighted ? "estimated 1-rep max" : "best reps";
  const fmtV = (v) => (weighted ? kg(v) + " kg" : unit === "sec" ? v + "s" : unit === "min" ? v + " min" : v + " reps");
  const dates = [...new Set(sets.map((s) => s.date))].sort().slice(-16);
  const pts = dates.map((d) => {
    const ds = sets.filter((s) => s.date === d), best = ds.reduce((p, s) => (scoreOf(s) > scoreOf(p) ? s : p), ds[0]);
    const v = Math.round(scoreOf(best) * 10) / 10;
    return { label: fmtShort(d), value: v, tip: `${fmtShort(d)}: ${setLabel(best)}${weighted ? ` → est. 1RM ${kg(v)} kg` : ""} (${ds.length} sets)` };
  });
  const ch = pts.length > 1 ? pts[pts.length - 1].value - pts[0].value : 0;
  const prSet = sets.reduce((p, s) => (scoreOf(s) > scoreOf(p) ? s : p), sets[0]);
  const progCard = `<div class="card"><div class="row-between"><h2>Progress</h2><span class="hint">${metricLbl}</span></div>
    <div class="chips scroll">${exs.map((n) => `<button class="chip" type="button" data-iex="${esc(n)}" aria-pressed="${n === ex}">${esc(n)}</button>`).join("")}</div>
    ${pts.length > 1 ? lineChart({ points: pts, yFmt: fmtV, tip: ch ? `${ch > 0 ? "📈 Up" : "📉 Down"} ${fmtV(Math.abs(Math.round(ch * 10) / 10))} since ${pts[0].label}. Tap a point.` : "Tap a point for details." }) : `<div class="empty">One session so far. Log another to see a trend.</div>`}
    <div class="callout sun">🏆 PR: ${setLabel(prSet)} on ${fmtShort(prSet.date)}</div></div>`;

  const mg = {}, mgl = {};
  wk.forEach((s) => { const g = s.group || "Other"; mg[g] = (mg[g] || 0) + 1; });
  lw.forEach((s) => { const g = s.group || "Other"; mgl[g] = (mgl[g] || 0) + 1; });
  const groups = [...new Set([...S.lists.exercises.map((x) => x.group), ...Object.keys(mg), ...Object.keys(mgl)])].filter(Boolean);
  const maxS = Math.max(1, ...Object.values(mg), ...Object.values(mgl));
  const mgCard = `<div class="card"><div class="row-between"><h2>Sets by muscle group</h2><span class="hint">this week</span></div>${groups.map((g) => {
    const c = mg[g] || 0, l = mgl[g] || 0;
    return `<div class="brow"><div class="top"><b>${GROUP_ICON[g] || "⭐"} ${esc(g)}</b><span class="num">${c} set${c === 1 ? "" : "s"}</span></div><div class="bar"><i style="width:${(c / maxS) * 100}%"></i></div><div class="left">${l ? `last week ${l}` : c ? "" : "not trained yet"}</div></div>`;
  }).join("")}</div>`;
  box.innerHTML = `<div class="label">This week</div>` + stats + `<div class="card"><h2>Sessions per week</h2>${sessChart}</div>` + progCard + mgCard;
}

function insHabits(box) {
  const act = activeHabits(), t = todayStr(), ws = weekStart(new Date()), start = addDays(ws, -7 * 11);
  if (!act.length) { box.innerHTML = '<div class="card empty">No active habits. Add some in Settings.</div>'; return; }
  const since30 = ymd(addDays(new Date(), -29));
  box.innerHTML = act.map((h) => {
    const d = doneSet(h.name), c30 = [...d].filter((x) => x >= since30 && x <= t).length, goal30 = Math.round((30 / 7) * h.target);
    let cells = "";
    for (let i = 0; i < 84; i++) { const k = ymd(addDays(start, i)); cells += `<i class="${k > t ? "fut" : d.has(k) ? "on" : ""}${k === t ? " today" : ""}" title="${fmtDay(k)}"></i>`; }
    return `<div class="card" style="--c:${esc(h.color)}"><div class="row-between"><h2>${esc(h.icon || "")} ${esc(h.name)}</h2><span class="pill ${weekCount(h.name) >= h.target ? "ok" : ""}">${weekCount(h.name)}/${h.target} this week</span></div>
      <div class="stats"><div class="stat"><span class="label">Streak</span><span class="v">🔥${streak(h.name)}</span><span class="d">days</span></div>
      <div class="stat"><span class="label">Best</span><span class="v">${bestStreak(h.name)}</span><span class="d">days</span></div>
      <div class="stat"><span class="label">30 days</span><span class="v">${Math.min(100, Math.round((c30 / (goal30 || 1)) * 100))}%</span><span class="d">${c30} of ${goal30}</span></div></div>
      <div class="heatwrap"><div class="dl">${DAY_MON.map((x, i) => `<span>${i % 2 === 0 ? x[0] : ""}</span>`).join("")}</div><div class="heat" aria-label="Last 12 weeks">${cells}</div></div>
      <div class="hint">Last 12 weeks, one column per week.</div></div>`;
  }).join("");
}

/* ================= SETTINGS ================= */
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); S.installEvt = e; if (S.tab === "settings") renderSettings(); });

function renderSettings() {
  const L = S.lists, th = S.settings.theme;
  let install = "";
  if (!isStandalone()) {
    install = `<div class="card"><h2>📲 Install the app</h2>${S.installEvt ? `<div class="hint">Adds Tracker to your home screen. It opens full screen and works offline.</div><button class="primary" id="installBtn">Install</button>`
      : isIOS() ? `<div class="hint">In Safari, tap the Share button, then <b>Add to Home Screen</b>. It then opens full screen and works offline.</div>`
      : `<div class="hint">Use your browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</div>`}</div>`;
  }
  const groups = groupList();
  $("v-settings").innerHTML = install + `
    <div class="card"><h2>🎨 Appearance</h2><div class="seg">${[["system", "Auto"], ["light", "☀️ Light"], ["dark", "🌙 Dark"]].map(([v, l]) => `<button type="button" data-theme-set="${v}" aria-pressed="${th === v}">${l}</button>`).join("")}</div></div>
    <div class="card"><div class="row-between"><h2>💸 Categories &amp; budgets</h2><span class="num hint">${rpShort(totalBudget())}/mo</span></div>
      <div class="list">${L.categories.map((c, i) => `<button type="button" class="item" style="--c:${esc(c.color)}" data-lcat="${i}"><span class="ico">${esc(c.icon)}</span><span class="main"><span class="t">${esc(c.name)}</span><span class="s">${c.budget ? rp(c.budget) + " a month" : "No budget"}</span></span>${CHEV}</button>`).join("")}</div>
      <button type="button" class="ghost add" data-lcat="new">+ Add category</button></div>
    <div class="card"><div class="row-between"><h2>🏋️ Exercises</h2><span class="hint">${L.exercises.length} total</span></div>
      ${groups.map((g) => `<details><summary class="row-between" style="cursor:pointer;list-style:none;padding:6px 0"><span class="label">${GROUP_ICON[g] || "⭐"} ${esc(g)}</span><span class="hint">${L.exercises.filter((x) => (x.group || "Other") === g).length} ›</span></summary><div class="list">${L.exercises.map((x, i) => ((x.group || "Other") === g ? `<button type="button" class="item" data-lex="${i}"><span class="main"><span class="t">${esc(x.name)}</span><span class="s">${UNIT_LBL[x.unit || "reps"]}</span></span>${CHEV}</button>` : "")).join("")}</div></details>`).join("")}
      <button type="button" class="ghost add" data-lex="new">+ Add exercise</button></div>
    <div class="card"><h2>✅ Habits</h2><div class="list">${L.habits.map((h, i) => `<button type="button" class="item" style="--c:${esc(h.color)}" data-lhab="${i}"><span class="ico">${esc(h.icon || "✅")}</span><span class="main"><span class="t">${esc(h.name)}</span><span class="s">${h.target}× a week${h.active ? "" : " · paused"}</span></span>${CHEV}</button>`).join("")}</div>
      <button type="button" class="ghost add" data-lhab="new">+ Add habit</button></div>
    <div class="card"><h2>💾 Backup &amp; export</h2>
      <div class="hint">Your data is stored only on this device. Download a backup now and then. Use it to move to a new phone or browser.</div>
      <button class="primary" id="bkExport">Download backup</button>
      <label class="ghost" for="bkImport">Restore from backup…</label><input type="file" id="bkImport" accept=".json,application/json" hidden>
      <button type="button" class="ghost" id="csvExport">Export CSV for Google Sheets</button>
      <div class="hint" id="persistInfo"></div></div>
    <div class="card"><h2>🧹 Erase data</h2><div class="hint">Deletes every expense, deposit, set and habit check-in on this device. Your lists stay.</div><button type="button" class="danger-ghost" id="eraseAll">Erase all entries…</button></div>
    <p class="hint center">Tracker ${APP_VERSION} · ${S.events.length} expenses · ${S.deposits.length} deposits · ${S.gym.length} sets · ${S.habits.length} check-ins</p>`;
  persistInfo();
}
async function persistInfo() {
  const el = $("persistInfo"); if (!el || !navigator.storage || !navigator.storage.persisted) return;
  try { el.textContent = (await navigator.storage.persisted()) ? "✓ The browser has agreed to keep this data, even when space runs low." : "The browser may clear this data if your device runs out of space. Installing the app makes that less likely."; } catch (e) {}
}
let persistAsked = false;
function requestPersist() { if (persistAsked || !navigator.storage || !navigator.storage.persist) return; persistAsked = true; navigator.storage.persist().catch(() => {}); }

$("v-settings").addEventListener("click", async (e) => {
  const t = e.target;
  const th = t.closest("[data-theme-set]");
  if (th) { S.settings.theme = th.dataset.themeSet; applyTheme(); saveSettings(); renderSettings(); return; }
  const c = t.closest("[data-lcat]"); if (c) return editCategory(c.dataset.lcat === "new" ? null : Number(c.dataset.lcat));
  const x = t.closest("[data-lex]"); if (x) return editExercise(x.dataset.lex === "new" ? null : Number(x.dataset.lex));
  const h = t.closest("[data-lhab]"); if (h) return editHabit(h.dataset.lhab === "new" ? null : Number(h.dataset.lhab));
  if (t.closest("#installBtn") && S.installEvt) { S.installEvt.prompt(); try { await S.installEvt.userChoice; } catch (err) {} S.installEvt = null; renderSettings(); return; }
  if (t.closest("#bkExport")) return exportBackup();
  if (t.closest("#csvExport")) return exportCsv();
  if (t.closest("#eraseAll")) return openSheet({ title: "Erase all entries?", body: `<div class="hint">This removes ${S.events.length} expenses, ${S.deposits.length} deposits, ${S.gym.length} sets and ${S.habits.length} habit check-ins from this device. It can't be undone. Download a backup first if you might want them back.</div>`, deleteLabel: "Erase everything", onDelete: eraseAll });
});
$("v-settings").addEventListener("change", (e) => { if (e.target.id === "bkImport" && e.target.files[0]) { importBackup(e.target.files[0]); e.target.value = ""; } });

const moveIn = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return i; [arr[i], arr[j]] = [arr[j], arr[i]]; return j; };
const dupName = (arr, name, skip) => arr.some((x, i) => i !== skip && x.name.trim().toLowerCase() === name.toLowerCase());
const moveBtns = `<div class="two"><button type="button" class="ghost" data-act="up">↑ Move up</button><button type="button" class="ghost" data-act="down">↓ Move down</button></div>`;
function colorClick(e) { const s = e.target.closest("[data-color]"); if (s) { pickIn($("f_color"), s, "data-color"); return true; } return false; }

function editCategory(i) {
  const isNew = i == null, c = isNew ? { name: "", icon: "🏷️", budget: 0, color: PALETTE[S.lists.categories.length % PALETTE.length] } : S.lists.categories[i];
  openSheet({
    title: isNew ? "New category" : "Edit category",
    body: `<div class="two"><div class="field" style="flex:0 0 76px"><label class="label" for="f_icon">Icon</label><input id="f_icon" class="emoji-in" value="${esc(c.icon)}" maxlength="8"></div>
      <div class="field"><label class="label" for="f_name">Name</label><input id="f_name" value="${esc(c.name)}" maxlength="40" autocomplete="off"></div></div>
      <div class="field"><span class="label">Color</span>${swatches(c.color)}</div>
      <div class="field"><label class="label" for="f_budget">Monthly budget (Rp)</label><input id="f_budget" data-money class="num" inputmode="numeric" value="${c.budget ? nf.format(c.budget) : ""}" placeholder="No limit"></div>
      ${isNew ? "" : `<label class="check-row"><input type="checkbox" id="f_ren" checked> If renamed, update past expenses too</label>${moveBtns}`}`,
    onClick: (e) => { if (colorClick(e)) return; const a = e.target.closest("[data-act]"); if (!a) return; i = moveIn(S.lists.categories, i, a.dataset.act === "up" ? -1 : 1); saveLists(); toast(`Moved to position ${i + 1}`); },
    onSubmit: async () => {
      const name = $("f_name").value.trim(), icon = $("f_icon").value.trim() || "🏷️", budget = Number(digits($("f_budget").value)) || 0, color = pickedVal("f_color", "data-color") || c.color;
      if (!name) return "Give the category a name.";
      if (dupName(S.lists.categories, name, isNew ? -1 : i)) return "There's already a category with that name.";
      if (isNew) { S.lists.categories.push({ name, icon, budget, color }); await saveLists(); toast(`Added ${name}`); return; }
      const old = c.name; Object.assign(c, { name, icon, budget, color });
      let n = 0;
      if (old !== name && $("f_ren").checked) { const arr = S.events.filter((x) => x.category === old); arr.forEach((x) => (x.category = name)); if (arr.length) await guard(() => db.putMany("events", arr)); n = arr.length; }
      if (S.cat === old) S.cat = name;
      await saveLists(); toast(n ? `Saved. ${n} past expense${n === 1 ? "" : "s"} renamed.` : "Category saved");
    },
    onDelete: isNew ? null : async () => {
      const idx = S.lists.categories.indexOf(c); S.lists.categories.splice(idx, 1); await saveLists();
      toast(`Removed ${c.name}. Past expenses keep it.`, async () => { S.lists.categories.splice(idx, 0, c); await saveLists(); });
    },
  });
}
function editExercise(i, opts = {}) {
  const isNew = i == null, groups = [...new Set(S.lists.exercises.map((e) => e.group).filter(Boolean))];
  const x = isNew ? { name: opts.name || "", group: opts.group || groups[0] || "", unit: "reps" } : S.lists.exercises[i];
  openSheet({
    title: isNew ? "New exercise" : "Edit exercise",
    body: `<div class="field"><label class="label" for="f_name">Name</label><input id="f_name" value="${esc(x.name)}" maxlength="50" autocomplete="off" placeholder="e.g. Cable Crossover"></div>
      <div class="field"><span class="label">Muscle group</span><div class="chips" id="f_grp">${groups.map((g) => `<button type="button" class="chip" data-g="${esc(g)}" aria-pressed="${g === x.group}">${GROUP_ICON[g] || "⭐"} ${esc(g)}</button>`).join("")}</div>
        <input id="f_group" maxlength="30" autocomplete="off" placeholder="…or type a new group" value="${groups.includes(x.group) ? "" : esc(x.group)}"></div>
      <div class="field"><span class="label">Measured in</span><div class="seg" id="f_unit">${["reps", "sec", "min"].map((u) => `<button type="button" data-u="${u}" aria-pressed="${(x.unit || "reps") === u}">${UNIT_LBL[u]}</button>`).join("")}</div></div>
      ${isNew ? "" : `<label class="check-row"><input type="checkbox" id="f_ren" checked> Update past sets too</label>${moveBtns}`}`,
    onClick: (e) => {
      const g = e.target.closest("[data-g]"); if (g) { pickIn($("f_grp"), g, "data-g"); $("f_group").value = ""; return; }
      const u = e.target.closest("[data-u]"); if (u) { pickIn($("f_unit"), u, "data-u"); return; }
      const a = e.target.closest("[data-act]"); if (!a) return; i = moveIn(S.lists.exercises, i, a.dataset.act === "up" ? -1 : 1); saveLists(); toast("Moved");
    },
    onSubmit: async () => {
      const name = $("f_name").value.trim(), group = $("f_group").value.trim() || pickedVal("f_grp", "data-g") || "Other", unit = pickedVal("f_unit", "data-u") || "reps";
      if (!name) return "Give the exercise a name.";
      if (dupName(S.lists.exercises, name, isNew ? -1 : i)) return "That exercise is already on the list.";
      if (isNew) { S.lists.exercises.push({ name, group, unit }); await saveLists(); toast(`Added ${name} 🎉`); opts.onAdded && opts.onAdded(name); return; }
      const old = x.name; Object.assign(x, { name, group, unit });
      let n = 0;
      if ($("f_ren").checked) { const arr = S.gym.filter((s) => s.exercise === old); arr.forEach((s) => { s.exercise = name; s.group = group; }); if (arr.length) await guard(() => db.putMany("gym_sets", arr)); n = arr.length; }
      if (S.ex === old) S.ex = name;
      if (S.ins.ex === old) S.ins.ex = name;
      await saveLists(); toast(n ? `Saved. ${n} past set${n === 1 ? "" : "s"} updated.` : "Exercise saved");
    },
    onDelete: isNew ? null : async () => {
      const idx = S.lists.exercises.indexOf(x); S.lists.exercises.splice(idx, 1); if (S.ex === x.name) S.ex = null; await saveLists();
      toast(`Removed ${x.name}. Past sets keep it.`, async () => { S.lists.exercises.splice(idx, 0, x); await saveLists(); });
    },
  });
}
function editHabit(i) {
  const isNew = i == null, h = isNew ? { name: "", icon: "✅", target: 7, active: true, color: PALETTE[(S.lists.habits.length * 3 + 4) % PALETTE.length] } : S.lists.habits[i];
  openSheet({
    title: isNew ? "New habit" : "Edit habit",
    body: `<div class="two"><div class="field" style="flex:0 0 76px"><label class="label" for="f_icon">Icon</label><input id="f_icon" class="emoji-in" value="${esc(h.icon || "✅")}" maxlength="8"></div>
      <div class="field"><label class="label" for="f_name">Name</label><input id="f_name" value="${esc(h.name)}" maxlength="40" autocomplete="off"></div></div>
      <div class="field"><span class="label">Color</span>${swatches(h.color)}</div>
      <div class="field"><span class="label">Days per week</span><div class="seg sm" id="f_target">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" data-t="${n}" aria-pressed="${h.target === n}">${n}</button>`).join("")}</div></div>
      <div class="row-between"><span>Show on the Habits screen</span><button type="button" class="switch" role="switch" id="f_active" aria-checked="${h.active}" aria-label="Active"></button></div>
      ${isNew ? "" : `<label class="check-row"><input type="checkbox" id="f_ren" checked> If renamed, keep past check-ins</label>${moveBtns}`}`,
    onClick: (e) => {
      if (colorClick(e)) return;
      const t = e.target.closest("[data-t]"); if (t) { pickIn($("f_target"), t, "data-t"); return; }
      if (e.target.closest("#f_active")) { const s = $("f_active"); s.setAttribute("aria-checked", s.getAttribute("aria-checked") !== "true"); return; }
      const a = e.target.closest("[data-act]"); if (!a) return; i = moveIn(S.lists.habits, i, a.dataset.act === "up" ? -1 : 1); saveLists(); toast("Moved");
    },
    onSubmit: async () => {
      const name = $("f_name").value.trim(), icon = $("f_icon").value.trim() || "✅", color = pickedVal("f_color", "data-color") || h.color;
      const target = Number(pickedVal("f_target", "data-t") || 7), active = $("f_active").getAttribute("aria-checked") === "true";
      if (!name) return "Give the habit a name.";
      if (dupName(S.lists.habits, name, isNew ? -1 : i)) return "There's already a habit with that name.";
      if (isNew) { S.lists.habits.push({ name, icon, target, active, color }); await saveLists(); toast(`Added ${name}`); return; }
      const old = h.name; Object.assign(h, { name, icon, target, active, color });
      if (old !== name && $("f_ren").checked) {
        const olds = S.habits.filter((x) => x.habit === old), news = olds.map((x) => ({ ...x, id: habitId(x.date, name), habit: name }));
        S.habits = S.habits.filter((x) => x.habit !== old).concat(news);
        await guard(async () => { await db.delMany("habits", olds.map((x) => x.id)); await db.putMany("habits", news); });
      }
      await saveLists(); toast("Habit saved");
    },
    onDelete: isNew ? null : async () => {
      const idx = S.lists.habits.indexOf(h); S.lists.habits.splice(idx, 1); await saveLists();
      toast(`Removed ${h.name}. Past check-ins are kept.`, async () => { S.lists.habits.splice(idx, 0, h); await saveLists(); });
    },
  });
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportBackup() {
  const data = { app: "all-in-one-tracker", version: 2, exported: new Date().toISOString(), lists: S.lists, settings: S.settings, events: S.events, deposits: S.deposits, gym_sets: S.gym, habits: S.habits };
  download(`tracker-backup-${todayStr()}.json`, JSON.stringify(data, null, 1), "application/json");
  toast("Backup downloaded 💾");
}
const ALL_COLS = ["table", "event_id", "date", "domain", "category", "item", "amount_idr", "unit", "exercise", "muscle_group", "set_no", "weight_kg", "reps", "rpe", "habit", "done", "note"];
const csvCell = (v) => { v = v === true ? "TRUE" : v === false ? "FALSE" : String(v ?? ""); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
function exportCsv() {
  const rows = [
    ...S.events.map((r) => ({ table: "events", event_id: r.id, date: r.date, domain: "finance", category: r.category, item: "", amount_idr: r.amount, unit: "IDR", note: r.note })),
    ...S.deposits.map((d) => ({ table: "deposits", event_id: d.id, date: d.date, domain: "income", category: d.source, item: d.mode === "reset" ? "fresh start" : "top up", amount_idr: d.amount, unit: "IDR", note: d.note })),
    ...S.gym.map((s) => ({ table: "gym_sets", date: s.date, exercise: s.exercise, muscle_group: s.group, set_no: s.set_no, weight_kg: s.weight, reps: s.reps, unit: s.unit || "reps", rpe: s.rpe ?? "", note: s.note })),
    ...S.habits.map((h) => ({ table: "habits", date: h.date, habit: h.habit, done: true, note: "" })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  download(`tracker-all-${todayStr()}.csv`, [ALL_COLS.join(","), ...rows.map((r) => ALL_COLS.map((h) => csvCell(r[h])).join(","))].join("\n"), "text/csv");
  toast(`Exported ${rows.length} rows`);
}
async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { toast("That file isn't a tracker backup."); return; }
  if (!data || data.app !== "all-in-one-tracker" || !Array.isArray(data.events) || !Array.isArray(data.gym_sets) || !Array.isArray(data.habits)) { toast("That file isn't a tracker backup."); return; }
  const ok = (r) => r && typeof r.id === "string" && typeof r.date === "string";
  const ev = data.events.filter((r) => ok(r) && typeof r.amount === "number"), gs = data.gym_sets.filter((r) => ok(r) && typeof r.exercise === "string"), hb = data.habits.filter((r) => ok(r) && typeof r.habit === "string");
  const dp = (Array.isArray(data.deposits) ? data.deposits : []).filter((r) => ok(r) && typeof r.amount === "number");
  openSheet({
    title: "Restore backup?",
    body: `<div class="hint">From ${esc(data.exported ? new Date(data.exported).toLocaleString() : "an unknown date")}: ${ev.length} expenses, ${dp.length} deposits, ${gs.length} sets, ${hb.length} habit check-ins.</div>
      <div class="hint">Entries are merged with what's here; matching entries are replaced by the backup's copy.</div>
      ${data.lists ? `<label class="check-row"><input type="checkbox" id="f_lists" checked> Also replace my categories, exercises and habits</label>` : ""}`,
    saveLabel: "Restore",
    onSubmit: async () => {
      const merge = (arr, add) => { const m = new Map(arr.map((x) => [x.id, x])); add.forEach((x) => m.set(x.id, x)); return [...m.values()]; };
      S.events = merge(S.events, ev); S.gym = merge(S.gym, gs); S.habits = merge(S.habits, hb); S.deposits = merge(S.deposits, dp);
      if (data.lists && $("f_lists") && $("f_lists").checked && Array.isArray(data.lists.categories)) { S.lists = { ...structuredClone(DEFAULT_LISTS), ...data.lists }; migrateLists(S.lists); }
      await guard(async () => { await db.putMany("events", ev); await db.putMany("gym_sets", gs); await db.putMany("habits", hb); await db.kvSet("deposits", S.deposits); await db.kvSet("lists", S.lists); });
      refresh(); toast("Backup restored ✨");
    },
  });
}
async function eraseAll() {
  S.events = []; S.gym = []; S.habits = []; S.deposits = [];
  await guard(async () => { for (const s of db.STORES) await db.clear(s); await db.kvSet("deposits", []); if (await db.hasStore("deposits")) await db.clear("deposits"); });
  refresh(); toast("All entries erased");
}

/* ================= boot ================= */
function setToday() { const d = new Date(); $("todayLbl").textContent = `${DAY[d.getDay()]}, ${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`; }
let lastDay = todayStr();
function dayCheck() { if (todayStr() !== lastDay) { lastDay = todayStr(); setToday(); refresh(); } }
document.addEventListener("visibilitychange", () => { if (!document.hidden) dayCheck(); });
setInterval(dayCheck, 60000);

(async function init() {
  setToday();
  await load();
  applyTheme();
  try { const t = localStorage.getItem("tab"); if (t && TITLES[t] && t !== "settings") S.tab = t; } catch (e) {}
  refresh();
  show(S.tab);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
