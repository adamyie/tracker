// Dependency-free SVG charts. Each chart carries data-tip on its marks; app.js shows the tip on tap/hover.
const W = 320;
let gid = 0;
const e = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function barChart({ data, height = 150, ref = null, refLabel = "", yFmt = (v) => v, tip = "", labelEvery = 1 }) {
  const H = height, top = 16, bottom = 20, n = data.length || 1;
  const max = Math.max(1, ref || 0, ...data.map((d) => d.value));
  const plotH = H - top - bottom, slot = W / n, bw = Math.max(3, Math.min(30, slot * 0.66));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(tip)}">`;
  s += `<line class="grid" x1="0" x2="${W}" y1="${top}" y2="${top}"/><text class="ylab" x="0" y="${top - 4}">${e(yFmt(max))}</text>`;
  s += `<line class="axis" x1="0" x2="${W}" y1="${top + plotH}" y2="${top + plotH}"/>`;
  data.forEach((d, i) => {
    const h = d.value > 0 ? Math.max(2, (d.value / max) * plotH) : 0;
    const x = i * slot + (slot - bw) / 2, y = top + plotH - h;
    s += `<g class="b${d.hl ? " hl" : ""}${d.muted ? " mu" : ""}" data-tip="${e(d.tip || "")}"><rect class="hit" x="${i * slot}" y="0" width="${slot}" height="${H}"/>` +
      `<rect class="col" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}"/></g>`;
    if (i % labelEvery === 0 || d.hl) s += `<text class="xlab${d.hl ? " hl" : ""}" x="${(i * slot + slot / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${e(d.label)}</text>`;
  });
  if (ref) {
    const y = top + plotH - (ref / max) * plotH;
    s += `<line class="ref" x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="reflab" x="${W}" y="${(y - 4).toFixed(1)}" text-anchor="end">${e(refLabel)}</text>`;
  }
  return `<div class="chart"><div class="tip">${e(tip)}</div>${s}</svg></div>`;
}

export function lineChart({ points, height = 160, yFmt = (v) => v, tip = "" }) {
  const n = points.length;
  if (!n) return "";
  const H = height, top = 18, bottom = 22, lx = 8, rx = 8;
  const vals = points.map((p) => p.value);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pv = (mx - mn) * 0.18; mn -= pv; mx += pv;
  const X = (i) => (n === 1 ? W / 2 : lx + (i * (W - lx - rx)) / (n - 1));
  const Y = (v) => top + (1 - (v - mn) / (mx - mn)) * (H - top - bottom);
  const path = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join("");
  const id = "lg" + ++gid;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(tip)}"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="ga"/><stop offset="1" class="gb"/></linearGradient></defs>`;
  s += `<line class="axis" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>`;
  if (n > 1) s += `<path class="area" fill="url(#${id})" d="${path}L${X(n - 1).toFixed(1)},${H - bottom}L${X(0).toFixed(1)},${H - bottom}Z"/>`;
  s += `<path class="line" d="${path}"/>`;
  const hw = n === 1 ? W : (W - lx - rx) / (n - 1);
  points.forEach((p, i) => {
    s += `<g class="pt${i === n - 1 ? " hl" : ""}" data-tip="${e(p.tip || "")}"><rect class="hit" x="${(X(i) - hw / 2).toFixed(1)}" y="0" width="${hw.toFixed(1)}" height="${H}"/><circle cx="${X(i).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="4"/></g>`;
  });
  s += `<text class="xlab" x="${X(0)}" y="${H - 5}" text-anchor="${n === 1 ? "middle" : "start"}">${e(points[0].label)}</text>`;
  if (n > 1) s += `<text class="xlab" x="${X(n - 1)}" y="${H - 5}" text-anchor="end">${e(points[n - 1].label)}</text>`;
  const maxI = vals.indexOf(Math.max(...vals));
  s += `<text class="ylab" x="${Math.min(W - 4, Math.max(4, X(maxI))).toFixed(1)}" y="${(Y(vals[maxI]) - 9).toFixed(1)}" text-anchor="${maxI === 0 ? "start" : maxI === n - 1 ? "end" : "middle"}">${e(yFmt(vals[maxI]))}</text>`;
  return `<div class="chart"><div class="tip">${e(tip)}</div>${s}</svg></div>`;
}

export function donut({ segments, center = "", sub = "" }) {
  const r = 60, c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;
  let s = `<svg class="donut" viewBox="0 0 160 160" role="img" aria-label="${e(center + " " + sub)}"><circle class="track" cx="80" cy="80" r="${r}" fill="none" stroke-width="22"/>`;
  segments.forEach((g) => {
    const len = (g.value / total) * c;
    const gap = segments.length > 1 ? 2 : 0;
    s += `<circle class="seg" cx="80" cy="80" r="${r}" fill="none" style="stroke:${g.color}" stroke-width="22" stroke-dasharray="${Math.max(0.01, len - gap).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)" data-tip="${e(g.tip || g.label)}"/>`;
    off += len;
  });
  s += `<text x="80" y="80" text-anchor="middle" class="dc">${e(center)}</text><text x="80" y="99" text-anchor="middle" class="ds">${e(sub)}</text></svg>`;
  return s;
}

export function ring(frac, cls = "") {
  const r = 26, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return `<svg class="ring ${cls}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="track" fill="none" stroke-width="7"/>` +
    `<circle cx="32" cy="32" r="${r}" class="fill" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 32 32)"/>` +
    `<text x="32" y="37" text-anchor="middle">${Math.round((frac || 0) * 100)}%</text></svg>`;
}
