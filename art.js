// Original artwork: "Koin", a little coin sprout whose face follows your wallet. Plus confetti.
const INK = "#3A2418";
const EYES = {
  happy: `<path d="M32 51q6-8 12 0M56 51q6-8 12 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  ok: `<circle cx="38" cy="51" r="5" fill="${INK}"/><circle cx="62" cy="51" r="5" fill="${INK}"/><circle cx="39.6" cy="49.3" r="1.7" fill="#fff"/><circle cx="63.6" cy="49.3" r="1.7" fill="#fff"/>`,
  worried: `<circle cx="38" cy="52" r="5" fill="${INK}"/><circle cx="62" cy="52" r="5" fill="${INK}"/><circle cx="39.6" cy="50.3" r="1.7" fill="#fff"/><circle cx="63.6" cy="50.3" r="1.7" fill="#fff"/><path d="M30 41l11 3M70 41l-11 3" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  broke: `<path d="M33 46l9 9M42 46l-9 9M58 46l9 9M67 46l-9 9" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
  sleepy: `<path d="M32 53q6 4 12 0M56 53q6 4 12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
};
const MOUTH = {
  happy: `<path d="M40 63q10 13 20 0z" fill="#8C2F22" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M45 68q5 3 10 0" fill="#FF7E8F"/>`,
  ok: `<path d="M42 64q8 7 16 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  worried: `<path d="M41 68q4.5-5 9 0t9 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  broke: `<path d="M41 70q9-9 18 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  sleepy: `<ellipse cx="50" cy="66" rx="4" ry="3.2" fill="#8C2F22"/>`,
};
const EXTRA = {
  worried: `<path d="M77 34q4 7 0 10q-4-3 0-10z" fill="#5CC4FF"/>`,
  broke: `<path d="M68 59q4 7 0 10q-4-3 0-10z" fill="#5CC4FF"/>`,
  sleepy: `<text x="74" y="30" font-size="15" font-weight="800" fill="#7C5CFF" font-family="Fredoka,sans-serif">z</text><text x="83" y="20" font-size="11" font-weight="800" fill="#7C5CFF" font-family="Fredoka,sans-serif">z</text>`,
  happy: `<path d="M84 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FFC53D"/>`,
};

export function mascot(mood = "happy", size = 56) {
  const m = EYES[mood] ? mood : "ok";
  return `<svg class="mascot m-${m}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <path d="M50 18C50 12 51 9 53 6" stroke="#22A86E" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M52 10C58 2 70 3 72 8C66 13 57 14 52 10z" fill="#3DD68C" stroke="#1E9A63" stroke-width="2"/>
    <path d="M50 12C44 5 34 6 33 11C38 15 46 16 50 12z" fill="#57E3A0" stroke="#1E9A63" stroke-width="2"/>
    <ellipse cx="50" cy="91" rx="26" ry="4" fill="rgba(60,30,90,.12)"/>
    <circle cx="50" cy="55" r="36" fill="#FFC93C" stroke="#E8A000" stroke-width="4"/>
    <circle cx="50" cy="55" r="28" fill="none" stroke="#FFE38A" stroke-width="3"/>
    <path d="M27 40q6-13 20-16" stroke="#FFF4C8" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="28" cy="62" rx="6" ry="4" fill="#FF8FB1" opacity=".75"/><ellipse cx="72" cy="62" rx="6" ry="4" fill="#FF8FB1" opacity=".75"/>
    ${EYES[m]}${MOUTH[m]}${EXTRA[m] || ""}
  </svg>`;
}

export function confetti(n = 70) {
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {}
  const box = document.createElement("div");
  box.className = "confetti";
  const cols = ["#7C5CFF", "#FF6FA5", "#2EC98A", "#FFC53D", "#4DB5FF", "#FF8A5B"];
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%";
    s.style.background = cols[i % cols.length];
    s.style.animationDelay = Math.random() * 0.35 + "s";
    s.style.animationDuration = 1.3 + Math.random() * 1 + "s";
    s.style.setProperty("--dx", Math.random() * 180 - 90 + "px");
    s.style.setProperty("--r", Math.random() * 900 - 450 + "deg");
    if (i % 3 === 0) s.style.borderRadius = "50%";
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2800);
}
