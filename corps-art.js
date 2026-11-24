"use strict";
// ============================================================================
//  LE PERSONNAGE : silhouette, visage, coiffures, zones cliquables, habillage.
//  Les accessoires sont dans accessoires-art.js.
//  Repère général : 400 x 640. Les bras et les jambes ont leur propre repère
//  (origine à l'épaule / à la hanche, y vers le bas), ce qui permet de dessiner
//  un accessoire une seule fois : il est recopié en miroir de l'autre côté.
// ============================================================================
(function () {
  // ---------- Couleurs ----------
  const hx = h => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const dk = (c, t = .42) => mix(c, "#2a1838", t), lt = (c, t = .4) => mix(c, "#ffffff", t);

  // ---------- Motifs et dégradés partagés (un seul <svg> caché dans la page) ----------
  const pat = (id, w, h, bg, inner, tr) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tr ? ` patternTransform="${tr}"` : ""}><rect width="${w}" height="${h}" fill="${bg}"/>${inner}</pattern>`;
  const grad = (id, stops, dir = 'x1="0" y1="0" x2="1" y2="1"') => `<linearGradient id="${id}" ${dir}>${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`;
  const V = 'x1="0" y1="0" x2="0" y2="1"', HZ = 'x1="0" y1="0" x2="1" y2="0"';
  const starD = (x, y, r) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .46 : r; d += (i ? "L" : "M") + (x + q * Math.cos(a)).toFixed(1) + "," + (y + q * Math.sin(a)).toFixed(1); } return d + "Z"; };
  const heartD = (x, y, s) => `M${x},${y + s} C${x - s * 1.5},${y - s * .1} ${x - s * .9},${y - s * 1.1} ${x},${y - s * .35} C${x + s * .9},${y - s * 1.1} ${x + s * 1.5},${y - s * .1} ${x},${y + s} Z`;
  const DEFS =
    grad("gGold", [[0, "#fff3c4"], [.4, "#fbc93d"], [.7, "#f0a818"], [1, "#b8740f"]]) +
    grad("gSilver", [[0, "#ffffff"], [.45, "#c9d3e2"], [1, "#7d8aa3"]]) +
    grad("gCrystal", [[0, "#f0fdff"], [.5, "#9be7f5"], [1, "#6f9df0"]]) +
    grad("gRainbow", [[0, "#ff6b8b"], [.2, "#ffa552"], [.4, "#ffe066"], [.6, "#6fdc8c"], [.8, "#5db7f5"], [1, "#b18cf2"]], V) +
    grad("gRainbowH", [[0, "#ff6b8b"], [.2, "#ffa552"], [.4, "#ffe066"], [.6, "#6fdc8c"], [.8, "#5db7f5"], [1, "#b18cf2"]], HZ) +
    grad("gGalaxyBase", [[0, "#3b2a78"], [.5, "#6d3fa8"], [1, "#20307a"]]) +
    grad("gWing", [[0, "#ffffff"], [1, "#d7e3fb"]], V) +
    grad("gFairy", [[0, "#f6d9ff", .92], [.5, "#c9e4ff", .85], [1, "#c6ffe9", .8]]) +
    grad("gButter", [[0, "#ffb35c"], [.5, "#ff7a59"], [1, "#c2417a"]]) +
    grad("gDragon", [[0, "#5fd3a1"], [1, "#1d7a68"]], V) +
    grad("gBat", [[0, "#5a3d7a"], [1, "#2a1b42"]], V) +
    grad("gCape", [[0, "#e2485c"], [1, "#a81f3f"]], V) +
    grad("gFlame", [[0, "#ffe066"], [.5, "#ff9a3c"], [1, "#f04b4b"]], V) +
    grad("gHairS", [[0, "#fff", .2], [.3, "#fff", 0], [.65, "#1a0a20", 0], [1, "#1a0a20", .2]], V) +
    grad("gShade", [[0, "#000", 0], [1, "#3a1030", .16]], HZ) +
    grad("gLimb", [[0, "#5a1f3a", .16], [.3, "#5a1f3a", 0], [.75, "#fff", .1], [1, "#fff", 0]], HZ) +
    `<radialGradient id="gGlow"><stop offset="0" stop-color="#fff6c9" stop-opacity=".95"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="gBlush"><stop offset="0" stop-color="#ff6f8f" stop-opacity=".5"/><stop offset="1" stop-color="#ff6f8f" stop-opacity="0"/></radialGradient>` +
    pat("pStripeRed", 10, 9, "#fffdf8", `<rect width="10" height="4" fill="#ef5366"/>`) +
    pat("pStripeNavy", 10, 8, "#fffdf8", `<rect width="10" height="3.2" fill="#2f4a86"/>`) +
    pat("pStripePink", 10, 10, "#fff", `<rect width="10" height="5" fill="#f9a8c9"/>`) +
    pat("pStripeV", 10, 10, "#7dd3fc", `<rect width="4" height="10" fill="#fff"/>`) +
    pat("pStripeRainbow", 12, 30, "#fff", ["#ff6b8b", "#ffa552", "#ffe066", "#6fdc8c", "#5db7f5", "#b18cf2"].map((c, i) => `<rect y="${i * 5}" width="12" height="5" fill="${c}"/>`).join("")) +
    pat("pDots", 10, 10, "#ffd3e2", `<circle cx="3" cy="3" r="1.9" fill="#fff"/><circle cx="8" cy="8" r="1.9" fill="#fff"/>`) +
    pat("pDotsBlue", 10, 10, "#5f8ee8", `<circle cx="3" cy="3" r="1.8" fill="#fff"/><circle cx="8" cy="8" r="1.8" fill="#fff"/>`) +
    pat("pHearts", 13, 13, "#fff5f7", `<path d="${heartD(4, 4, 2.6)}" fill="#f0567c"/><path d="${heartD(10.5, 10.5, 2.6)}" fill="#f0567c"/>`) +
    pat("pStars", 14, 14, "#3b4a9a", `<path d="${starD(4, 4, 2.8)}" fill="#ffe27a"/><path d="${starD(11, 11, 2.2)}" fill="#fff"/>`) +
    pat("pPlaid", 14, 14, "#c93a4e", `<rect width="5" height="14" fill="#7c1f38" opacity=".55"/><rect width="14" height="5" fill="#7c1f38" opacity=".55"/><path d="M10,0V14M0,10H14" stroke="#ffe9b0" stroke-width="1"/>`) +
    pat("pPlaidGreen", 14, 14, "#2f7a5c", `<rect width="5" height="14" fill="#123f3a" opacity=".55"/><rect width="14" height="5" fill="#123f3a" opacity=".55"/><path d="M10,0V14M0,10H14" stroke="#f6d365" stroke-width="1"/>`) +
    pat("pArgyle", 14, 20, "#f5e6cf", `<path d="M7,0 L14,10 L7,20 L0,10Z" fill="#b9784a"/><path d="M0,0L14,20M14,0L0,20" stroke="#6d3d1e" stroke-width=".8" stroke-dasharray="2 1.6"/>`) +
    pat("pKnit", 7, 7, "#e9cfa8", `<path d="M0,1 L3.5,4.5 L7,1 M0,4.5 L3.5,8 L7,4.5" fill="none" stroke="#c9a573" stroke-width="1.4"/>`) +
    pat("pKnitRed", 7, 7, "#d64550", `<path d="M0,1 L3.5,4.5 L7,1 M0,4.5 L3.5,8 L7,4.5" fill="none" stroke="#b02c3a" stroke-width="1.4"/>`) +
    pat("pKnitLilac", 7, 7, "#c8b0f0", `<path d="M0,1 L3.5,4.5 L7,1 M0,4.5 L3.5,8 L7,4.5" fill="none" stroke="#a487dc" stroke-width="1.4"/>`) +
    pat("pFlowers", 18, 18, "#fff3e2", `<g fill="#f58aa6"><circle cx="5" cy="3" r="2"/><circle cx="7.2" cy="5" r="2"/><circle cx="2.8" cy="5" r="2"/><circle cx="5" cy="7" r="2"/></g><circle cx="5" cy="5" r="1.4" fill="#ffd166"/><g fill="#7fb7f0"><circle cx="14" cy="12" r="1.7"/><circle cx="16" cy="14" r="1.7"/><circle cx="12" cy="14" r="1.7"/><circle cx="14" cy="16" r="1.7"/></g><circle cx="14" cy="14" r="1.2" fill="#fff"/>`) +
    pat("pTropic", 20, 20, "#1fa79a", `<path d="M2,10 Q8,2 12,4 Q9,11 2,10Z" fill="#ffd166"/><path d="M11,18 Q18,9 19,14 Q17,19 11,18Z" fill="#ff7a8a"/><circle cx="15" cy="5" r="1.8" fill="#fff"/>`) +
    pat("pDenim", 4, 4, "#5f86bd", `<path d="M0,4L4,0" stroke="#8fb0dc" stroke-width=".8"/>`) +
    pat("pScale", 8, 8, "#9aa8bd", `<path d="M0,0 A4,4 0 0 0 8,0 M-4,4 A4,4 0 0 0 4,4 A4,4 0 0 0 12,4" fill="none" stroke="#5f6d86" stroke-width="1"/>`) +
    pat("pSequin", 6, 6, "#f06aa8", `<circle cx="1.5" cy="1.5" r="1.3" fill="#ffd0e6"/><circle cx="4.5" cy="4.5" r="1.3" fill="#c93a86"/><circle cx="4.5" cy="1.5" r=".7" fill="#fff"/>`) +
    pat("pLace", 8, 8, "rgba(255,255,255,.35)", `<circle cx="4" cy="4" r="2.4" fill="none" stroke="#fff" stroke-width="1.1"/><path d="M0,0L8,8M8,0L0,8" stroke="#fff" stroke-width=".7"/>`) +
    `<radialGradient id="gNeb1"><stop offset="0" stop-color="#c15fd6" stop-opacity=".75"/><stop offset="1" stop-color="#c15fd6" stop-opacity="0"/></radialGradient><radialGradient id="gNeb2"><stop offset="0" stop-color="#3f8fe8" stop-opacity=".75"/><stop offset="1" stop-color="#3f8fe8" stop-opacity="0"/></radialGradient>` +
    pat("pGalaxy", 92, 92, "#35266f", `<circle cx="26" cy="30" r="30" fill="url(#gNeb1)"/><circle cx="66" cy="62" r="30" fill="url(#gNeb2)"/><circle cx="70" cy="16" r="18" fill="url(#gNeb1)"/><circle cx="20" cy="74" r="18" fill="url(#gNeb2)"/><g fill="#fff"><circle cx="8" cy="10" r="1"/><circle cx="22" cy="18" r="1.4"/><circle cx="40" cy="8" r=".8"/><circle cx="55" cy="24" r="1.1"/><circle cx="78" cy="12" r="1"/><circle cx="86" cy="34" r="1.3"/><circle cx="12" cy="46" r=".9"/><circle cx="34" cy="44" r="1.2"/><circle cx="60" cy="50" r=".8"/><circle cx="76" cy="58" r="1.1"/><circle cx="46" cy="66" r="1.4"/><circle cx="16" cy="78" r="1.1"/><circle cx="32" cy="86" r=".8"/><circle cx="64" cy="82" r="1.2"/><circle cx="84" cy="78" r=".9"/></g>`) +
    pat("pLeopard", 14, 14, "#f3c57c", `<path d="M3,3 q2,-2 4,0 q-1,3 -3,2Z M10,9 q2,-1 3,1 q-2,2 -3,1Z M2,11 q2,-1 3,0" fill="#7a4a1c" stroke="#7a4a1c" stroke-width="1"/>`);

  // ---------- Profils des membres : x en fonction de y, lissé ----------
  const LEG_O = [[-8, -30], [20, -31], [50, -28], [80, -22.5], [100, -19.5], [112, -19.8], [124, -19.5], [146, -20.5], [168, -18.5], [190, -15], [210, -12], [228, -11]];
  const LEG_I = [[-8, 30], [20, 30], [50, 26.5], [80, 20.5], [100, 17.5], [112, 17.6], [124, 16.6], [146, 18], [168, 17], [190, 13.8], [210, 11.4], [228, 11]];
  const ARM_O = [[-2, -20], [14, -20], [30, -18.5], [50, -16.8], [70, -15], [90, -14.2], [104, -14.8], [120, -14.4], [140, -12.4], [160, -10], [174, -9.4]];
  const ARM_I = [[-2, 17], [14, 17], [30, 16], [50, 14.8], [70, 13.4], [90, 12.6], [104, 13.6], [120, 13.4], [140, 11.4], [160, 9.4], [174, 9]];
  const at = (T, y) => {
    if (y <= T[0][0]) return T[0][1]; const n = T.length - 1; if (y >= T[n][0]) return T[n][1];
    let i = 0; while (y > T[i + 1][0]) i++;
    const [y0, x0] = T[i], [y1, x1] = T[i + 1], t = (y - y0) / (y1 - y0);
    const m = k => { const a = T[Math.max(0, k - 1)], b = T[Math.min(n, k + 1)]; return (b[1] - a[1]) / (b[0] - a[0]); };
    const m0 = m(i) * (y1 - y0), m1 = m(i + 1) * (y1 - y0), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * x0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * x1 + (t3 - t2) * m1;
  };
  const f1 = n => Math.round(n * 10) / 10;
  const side = (T, y0, y1, p) => { const out = []; const st = y1 > y0 ? 4 : -4; for (let y = y0; st > 0 ? y < y1 : y > y1; y += st) out.push(`${f1(at(T, y) + p)},${f1(y)}`); out.push(`${f1(at(T, y1) + p)},${f1(y1)}`); return out.join(" L"); };
  // bande de tissu entre y0 et y1, légèrement bombée comme un vrai vêtement
  const seg = (O, I, y0, y1, p = 1.4, c0 = 3, c1 = 4) => `M${side(O, y0, y1, -p)} Q0,${f1(y1 + c1 * 2)} ${side(I, y1, y0, p)} Q0,${f1(y0 + c0 * 2)} ${f1(at(O, y0) - p)},${y0}Z`;
  const legSeg = (y0, y1, p, c0, c1) => seg(LEG_O, LEG_I, y0, y1, p, c0, c1);
  const armSeg = (y0, y1, p, c0, c1) => seg(ARM_O, ARM_I, y0, y1, p, c0, c1);

  const FOOT = p => `C-14,236 ${-25 - p},244 ${-27 - p},256 C${-28 - p},${264 + p} -20,${267 + p} -12,${267 + p} L8,${267 + p} C${17 + p},${267 + p} ${17 + p},256 ${14 + p},248 C12,240 11,234 `;
  const HAND = `C11,178 16,182 19,190 C22,198 17,203 12.5,197 C14,208 12,218 8,224 C4,230 -5,230 -9,223 C-13,212 -13,190 `;
  const LEG = `M${side(LEG_O, -8, 228, 0)} ${FOOT(0)}${f1(at(LEG_I, 228))},228 L${side(LEG_I, 228, -8, 0)}Z`;
  const ARM = `M${side(ARM_O, 2, 172, 0)} L-9.5,172 C-13,188 -13,212 -9,223 C-5,230 4,230 8,224 C12,218 14,208 12.5,197 C17,203 22,198 19,190 C16,182 11,178 9,172 L${side(ARM_I, 172, 2, 0)} C19,-12 14,-21 2,-22 C-12,-22 -21,-12 -20,2Z`;
  const CAP = p => `C${19 + p},-12 ${14 + p},${-21 - p} 2,${-22 - p} C-12,${-22 - p} ${-21 - p},-12 ${-20 - p},2`;
  const sleeve = (y1, p = 2.5, c1 = 4) => `M${side(ARM_O, 2, y1, -p)} Q0,${y1 + c1 * 2} ${side(ARM_I, y1, 2, p)} ${CAP(p)}Z`;
  const handPath = p => `M${-9.5 - p},168 C${-13 - p},188 ${-13 - p},212 ${-9 - p},${223 + p} C-5,${231 + p} 4,${231 + p} ${8 + p},${224 + p} C${12 + p},218 ${14 + p},208 ${12.5 + p},${198 + p} C17,${203 + p} ${22 + p},${198 + p} ${19 + p},190 C${16 + p},182 11,178 ${9 + p},168 Q0,171 ${-9.5 - p},168Z`;
  const footPath = (y0, p = 1.6) => `M${side(LEG_O, y0, 228, -p)} ${FOOT(p)}${f1(at(LEG_I, 228) + p)},228 L${side(LEG_I, 228, y0, p)} Q0,${y0 + 5} ${f1(at(LEG_O, y0) - p)},${y0}Z`;

  const TORSO = `M185,140 L185,166 C184,175 172,179 158,182 C146,185 138,190 138,200 C140,218 146,234 150,250 C153,264 155,274 155,284 C155,298 152,310 148,324 C143,338 140,350 141,366 C160,382 184,382 200,390 C216,382 240,382 259,366 C260,350 257,338 252,324 C248,310 245,298 245,284 C245,274 247,264 250,250 C254,234 260,218 262,200 C262,190 254,185 242,182 C228,179 216,175 215,166 L215,140 Z`;
  const FACE = `M148,86 C146,48 168,30 200,30 C232,30 254,48 252,86 C252,108 244,126 230,139 C220,148 210,152 200,152 C190,152 180,148 170,139 C156,126 148,108 148,86 Z`;
  const T_ARM = "translate(142 202) rotate(14)", T_LEG = "translate(171 352) rotate(2.5)";
  const MIR = s => s ? `<g transform="matrix(-1 0 0 1 400 0)">${s}</g>` : "";
  const armG = s => s ? `<g transform="${T_ARM}">${s}</g>` : "", legG = s => s ? `<g transform="${T_LEG}">${s}</g>` : "";

  // ---------- Coiffures ----------
  // Chaque coupe a trois couches : f (derrière le corps), BANGS (devant le visage et les épaules) et b (vue de dos).
  const HV = (d, c) => `<path d="${d}" ${c.s}/><path d="${d}" fill="url(#gHairS)"/>`;
  const HL = (d, c) => `<path d="${d}" ${c.l}/>`, HH = (d, c) => `<path d="${d}" ${c.h}/>`;
  const H2 = s => s + `<g transform="matrix(-1 0 0 1 400 0)">${s}</g>`;
  const HCAP = "M141,108 C128,42 162,6 200,6 C238,6 272,42 259,108Z";                       // volume arrière (face)
  const BCAP = "M140,98 C128,36 164,6 200,6 C236,6 272,36 260,98 C257,130 236,150 200,150 C164,150 143,130 140,98Z"; // crâne vu de dos
  const bcap = (c, part = 1) => HV(BCAP, c) + HL("M152,104 C160,66 178,34 196,20 M248,104 C240,66 222,34 204,20 M168,132 C172,92 186,50 198,24 M232,132 C228,92 214,50 202,24", c) + (part ? HL("M200,10 V146", c) : "") + HH("M158,52 Q176,28 196,24", c);
  const plait = (c, x, y, n, dx = 0, w = 1) => { let s = `<path d="M${x + dx * n - 7},${y + n * 19 + 8} Q${x + dx * n},${y + n * 19 + 2} ${x + dx * n + 7},${y + n * 19 + 8} C${x + dx * n + 12},${y + n * 19 + 24} ${x + dx * n + 4},${y + n * 19 + 36} ${x + dx * n},${y + n * 19 + 38} C${x + dx * n - 4},${y + n * 19 + 36} ${x + dx * n - 12},${y + n * 19 + 24} ${x + dx * n - 7},${y + n * 19 + 8}Z" ${c.s}/><rect x="${x + dx * n - 8}" y="${y + n * 19 + 3}" width="16" height="7" rx="3.500" fill="#f472b6" stroke="#a83a72" stroke-width="1.400"/>`;
    for (let i = n - 1; i >= 0; i--) { const X = x + dx * i, Y = y + i * 19, k = w * (1 - i * .035); s += HV(`M${X - 13 * k},${Y} C${X - 18 * k},${Y + 12} ${X - 9 * k},${Y + 23} ${X},${Y + 25} C${X + 9 * k},${Y + 23} ${X + 18 * k},${Y + 12} ${X + 13 * k},${Y} C${X + 9 * k},${Y - 7} ${X + 3 * k},${Y - 5} ${X},${Y + 5} C${X - 3 * k},${Y - 5} ${X - 9 * k},${Y - 7} ${X - 13 * k},${Y}Z`, c) + HL(`M${X - 9 * k},${Y + 4} Q${X - 6 * k},${Y + 14} ${X},${Y + 18} M${X + 9 * k},${Y + 4} Q${X + 6 * k},${Y + 14} ${X},${Y + 18}`, c); } return s; };
  const ring = (c, x, y, n, w = 12, dx = 0) => { let s = ""; for (let i = n - 1; i >= 0; i--) { const X = x + dx * i, Y = y + i * 14; s += `<g transform="translate(${X} ${Y}) rotate(-24)"><ellipse rx="${w}" ry="${w * .72}" ${c.s}/><path d="M${-w * .6},${w * .1} Q0,${w * .62} ${w * .62},${w * .05}" ${c.l}/><path d="M${-w * .5},${-w * .28} Q${-w * .1},${-w * .55} ${w * .3},${-w * .46}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".28"/></g>`; } return s; };
  const puffs = (c, L) => L.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" ${c.s}/>`).join("") + L.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.5}" fill="${c.c}"/>` + (r > 12 ? HL(`M${x - r * .45},${y} a${r * .45},${r * .45} 0 1 1 ${r * .45},${r * .45} a${r * .24},${r * .24} 0 1 1 ${r * .18},${-r * .36}`, c) : "")).join("");
  const scrunchie = (x, y, a = 0) => `<g transform="rotate(${a} ${x} ${y})"><path d="M${x - 15},${y} q2,-9 8,-6 q4,-5 8,0 q4,-5 8,0 q7,-2 7,6 q0,8 -7,6 q-4,5 -8,0 q-4,5 -8,0 q-7,3 -8,-6Z" fill="#f472b6" stroke="#a83a72" stroke-width="1.800"/></g>`;
  const LONGB = "M136,100 C124,40 160,6 200,6 C240,6 276,40 264,100 C266,140 282,178 276,228 C273,250 256,260 247,244 C249,262 234,264 231,242 L231,120 L169,120 L169,242 C166,264 151,262 153,244 C144,260 127,250 124,228 C118,178 134,140 136,100Z";
  const LONGBACK = "M134,92 C126,36 162,6 200,6 C238,6 274,36 266,92 C267,132 276,160 268,184 C258,198 244,188 234,194 C222,200 210,190 200,197 C190,190 178,200 166,194 C156,188 142,198 132,184 C124,160 133,132 134,92Z";
  const HAIRS = {
    long: { f: c => HV(LONGB, c) + HL("M142,120 C136,160 134,196 140,236 M258,120 C264,160 266,196 260,236 M154,140 C150,180 152,210 156,236 M246,140 C250,180 248,210 244,236", c), b: c => HV(LONGBACK, c) + HL("M160,38 C146,90 150,140 148,180 M180,22 C172,80 178,140 174,186 M220,22 C228,80 222,140 226,186 M240,38 C254,90 250,140 252,180 M200,12 V188", c) + HH("M152,58 Q176,30 204,28", c) },
    wavy: { f: c => HV("M134,100 C120,40 158,4 200,4 C242,4 280,40 266,100 C282,124 266,146 282,168 C296,190 276,206 286,226 C286,248 262,256 250,240 C246,262 230,256 231,236 L231,120 L169,120 L169,236 C170,256 154,262 150,240 C138,256 114,248 114,226 C124,206 104,190 118,168 C134,146 118,124 134,100Z", c) + HL("M140,116 C130,140 144,158 132,180 C126,200 140,214 134,234 M260,116 C270,140 256,158 268,180 C274,200 260,214 266,234", c), b: c => HV("M132,92 C122,34 160,4 200,4 C240,4 278,34 268,92 C282,116 266,136 280,158 C290,178 274,194 262,188 C250,204 234,190 222,198 C212,206 204,196 200,200 C196,196 188,206 178,198 C166,190 150,204 138,188 C126,194 110,178 120,158 C134,136 118,116 132,92Z", c) + HL("M156,44 C140,90 160,120 146,160 M182,22 C172,74 188,120 176,180 M218,22 C228,74 212,120 224,180 M244,44 C260,90 240,120 254,160", c) + HH("M150,60 Q174,28 206,26", c) },
    hime: { f: c => HV("M134,100 C124,40 160,4 200,4 C240,4 276,40 266,100 L276,262 Q254,272 232,264 L231,120 L169,120 L168,264 Q146,272 124,262Z", c) + HL("M142,120 L136,258 M154,130 L150,262 M258,120 L264,258 M246,130 L250,262", c), b: c => HV("M132,92 C124,34 162,4 200,4 C238,4 276,34 268,92 L272,192 Q236,204 200,202 Q164,204 128,192Z", c) + HL("M158,40 L148,192 M180,22 L174,196 M220,22 L226,196 M242,40 L252,192 M200,12 V198", c) + HH("M146,72 Q196,52 254,72", c) },
    half: { f: c => HV(LONGB, c) + HL("M142,120 C136,160 134,196 140,236 M258,120 C264,160 266,196 260,236", c), b: c => HV(LONGBACK, c) + HL("M150,120 C148,150 150,170 148,182 M250,120 C252,150 250,170 252,182 M176,120 V186 M224,120 V186", c) + HV("M136,86 C150,96 178,78 196,74 L204,74 C222,78 250,96 264,86 C262,40 236,6 200,6 C164,6 138,40 136,86Z", c) + HL("M150,78 C166,60 182,40 198,30 M250,78 C234,60 218,40 202,30", c) + HV("M186,72 C176,100 178,130 190,160 Q200,172 210,160 C222,130 224,100 214,72Z", c) + `<path d="M200,72 C188,56 168,60 170,72 C168,84 188,88 200,72 C212,88 232,84 230,72 C232,60 212,56 200,72Z" fill="#f472b6" stroke="#a83a72" stroke-width="2"/>` },
    pony: { f: c => HV("M206,10 C262,-14 312,30 302,92 C300,132 316,160 298,200 C294,212 284,214 282,202 C276,212 266,208 268,196 C276,156 262,130 264,96 C266,66 250,44 224,40Z", c) + HL("M240,14 C286,22 296,70 288,110 C284,150 298,170 290,196 M232,28 C268,40 280,76 276,112 C272,150 284,166 278,198", c) + HH("M252,20 Q282,34 290,66", c) + HV(HCAP, c), b: c => bcap(c, 0) + HV("M182,30 C156,64 160,118 176,158 C184,180 198,186 204,202 C214,182 238,160 236,116 C236,82 228,52 218,30Z", c) + HL("M190,44 C178,96 188,140 202,184 M210,44 C218,92 218,132 208,178", c) + scrunchie(200, 32) },
    bun: { f: c => HV("M200,-34 C226,-36 238,-14 230,6 C222,24 178,24 170,6 C162,-14 174,-36 200,-34Z", c) + HL("M176,2 Q200,-20 224,2 M172,-10 Q200,-36 228,-10 M184,12 Q200,2 216,12 M196,-32 Q212,-22 206,-8", c) + HH("M184,-18 Q196,-28 210,-25", c) + HV(HCAP, c) + scrunchie(200, 14), b: c => bcap(c, 0) + HV("M200,-34 C228,-36 240,-12 232,10 C222,30 178,30 168,10 C160,-12 172,-36 200,-34Z", c) + HL("M176,6 Q200,-20 224,6 M172,-8 Q200,-36 228,-8 M186,18 Q200,8 214,18", c) + scrunchie(200, 26) },
    buns: { f: c => H2(HV("M152,-12 C176,-18 190,2 182,20 C174,36 142,36 136,18 C130,2 138,-10 152,-12Z", c) + HL("M142,16 Q158,-4 178,14 M140,4 Q160,-14 180,4 M150,26 Q160,18 170,26", c) + HH("M146,2 Q154,-6 164,-5", c)) + HV(HCAP, c), b: c => H2(HV("M150,-12 C174,-18 190,2 182,22 C174,38 140,38 134,20 C128,2 136,-10 150,-12Z", c) + HL("M140,18 Q156,-4 178,16 M138,4 Q158,-14 180,4", c)) + bcap(c) + H2(scrunchie(160, 30, -24)) },
    bob: { f: c => HV("M132,96 C122,36 160,4 200,4 C240,4 278,36 268,96 C276,122 280,146 268,162 C256,172 242,164 238,150 L238,110 L162,110 L162,150 C158,164 144,172 132,162 C120,146 124,122 132,96Z", c), b: c => HV("M130,92 C122,34 160,4 200,4 C240,4 278,34 270,92 C274,122 280,146 268,166 C248,180 224,172 200,180 C176,172 152,180 132,166 C120,146 126,122 130,92Z", c) + HL("M158,38 C146,90 148,130 146,162 M180,22 C172,80 176,130 174,170 M220,22 C228,80 224,130 226,170 M242,38 C254,90 252,130 254,162 M200,12 V174", c) + HH("M146,70 Q176,36 214,34", c) },
    pixie: { f: c => HV("M138,104 C124,40 160,2 200,2 C240,2 276,40 262,104 C256,114 250,116 246,110 L154,110 C150,116 144,114 138,104Z", c), b: c => HV("M138,96 C124,34 160,2 200,2 C240,2 276,34 262,96 C258,116 248,132 236,142 L228,134 L220,148 L210,138 L200,152 L190,138 L180,148 L172,134 L164,142 C152,132 142,116 138,96Z", c) + HL("M160,44 C170,70 168,100 172,130 M182,22 C188,60 186,104 190,132 M218,22 C212,60 214,104 210,132 M240,44 C230,70 232,100 228,130", c) + HH("M156,56 Q176,30 204,28", c) },
    braids: { f: c => HV(HCAP, c), b: c => bcap(c) + H2(plait(c, 154, 126, 5, -1.5)) },
    sidebraid: { f: c => HV(HCAP, c), b: c => bcap(c, 0) + HL("M236,110 Q210,140 168,134", c) + plait(c, 246, 126, 5, 2) },
    crown: { f: c => HV("M136,100 C124,40 160,6 200,6 C240,6 276,40 264,100 C268,130 276,160 268,190 C258,202 240,196 232,186 L231,120 L169,120 L168,186 C160,196 142,202 132,190 C124,160 132,130 136,100Z", c), b: c => HV(LONGBACK, c) + HL("M160,60 C150,100 152,140 150,178 M240,60 C250,100 248,140 250,178 M180,70 V186 M220,70 V186 M200,70 V190", c) + [-52, -35, -17, 0, 17, 35, 52].map(x => `<g transform="translate(${200 + x} ${50 - (52 * 52 - x * x) / 150}) rotate(${x * .6})">${HV("M-14,-6 C-8,-14 8,-14 14,-4 C12,8 -8,12 -14,-6Z", c)}${HL("M-9,-3 Q0,-8 9,-1", c)}</g>`).join("") },
    curls: { f: c => HV("M140,110 C126,40 162,6 200,6 C238,6 274,40 260,110Z", c) + H2(ring(c, 138, 96, 7, 14, -1.5) + ring(c, 154, 120, 6, 12, -1)), b: c => HV("M140,98 C128,36 164,6 200,6 C236,6 272,36 260,98 L268,150 H132Z", c) + [[138, 92, 6], [264, 92, 6], [158, 104, 6], [242, 104, 6], [180, 110, 6], [222, 110, 6], [201, 114, 6]].map(([x, y, n]) => ring(c, x, y, n, 15, (x - 200) * .02)).join("") + HL("M160,40 C150,64 148,80 146,96 M200,12 V108 M240,40 C250,64 252,80 254,96 M180,24 C174,60 176,84 178,104 M220,24 C226,60 224,84 222,104", c) + HH("M152,56 Q176,28 206,26", c) },
    afro: { f: c => puffs(c, [[200, -6, 34], [164, 2, 32], [236, 2, 32], [134, 28, 32], [266, 28, 32], [118, 62, 30], [282, 62, 30], [116, 98, 28], [284, 98, 28], [128, 128, 26], [272, 128, 26], [146, 148, 20], [254, 148, 20]]) + `<path d="M136,130 C120,60 150,10 200,10 C250,10 280,60 264,130Z" fill="${c.c}"/>`, b: c => puffs(c, [[200, -6, 34], [164, 2, 32], [236, 2, 32], [134, 28, 32], [266, 28, 32], [118, 62, 30], [282, 62, 30], [116, 98, 28], [284, 98, 28], [130, 132, 28], [270, 132, 28], [158, 154, 26], [200, 160, 28], [242, 154, 26]]) + `<rect x="126" y="20" width="148" height="134" rx="60" fill="${c.c}"/>` + [[150, 50], [190, 36], [232, 48], [140, 88], [180, 80], [222, 84], [260, 90], [160, 120], [204, 124], [244, 124]].map(([x, y]) => HL(`M${x - 8},${y} a8,8 0 1 1 8,8 a4,4 0 1 1 3,-7`, c)).join("") },
    spiky: { f: c => HV("M140,112 L120,94 L136,80 L112,58 L138,52 L126,20 L156,28 L162,-4 L186,14 L204,-16 L220,12 L248,-6 L248,26 L276,18 L264,50 L290,58 L266,82 L280,96 L260,112Z", c), b: c => HV("M140,112 L120,94 L136,80 L112,58 L138,52 L126,20 L156,28 L162,-4 L186,14 L204,-16 L220,12 L248,-6 L248,26 L276,18 L264,50 L290,58 L266,82 L280,96 L258,118 L246,154 L230,140 L216,162 L200,144 L184,162 L170,140 L154,154Z", c) + HL("M162,60 L180,100 M200,44 L200,100 M238,60 L222,100 M178,112 L184,140 M222,112 L216,140", c) }
  };
  // Devant : frange, mèches qui encadrent le visage et rejoignent la coiffure (plus de vide autour des oreilles)
  const LOCK = "M152,66 C138,92 138,130 147,168 C150,186 146,200 138,208 C158,206 168,188 164,164 C158,138 155,108 163,80Z";
  const lock = (c, d = LOCK) => H2(HV(d, c) + HL("M150,96 C144,130 152,164 156,186", c));
  const SWEEP = "M143,98 C132,46 160,8 200,8 C240,8 268,46 257,98 C254,82 246,68 238,60 C226,74 208,80 188,80 C196,74 201,66 203,58 C186,76 164,82 152,82 C148,86 145,92 143,98Z";
  const CURT = "M201,10 C164,10 136,40 138,92 C138,108 141,122 147,134 C156,136 162,128 160,118 C155,104 155,88 163,74 C172,58 190,48 201,42Z";
  const BANGS = {
    long: c => lock(c) + HV(SWEEP, c) + HL("M214,22 C212,44 204,62 192,76 M232,34 C230,50 224,62 216,70 M176,26 C166,44 158,62 154,78", c) + HH("M164,42 Q190,20 222,30", c),
    wavy: c => H2(HV("M152,66 C134,88 148,110 138,132 C130,152 148,168 142,190 C140,200 136,206 130,210 C154,210 168,196 160,174 C154,156 168,142 160,122 C154,106 156,92 164,78Z", c) + HL("M150,92 C142,116 154,134 146,156 C142,172 152,184 150,196", c)) + H2(HV(CURT, c) + HL("M190,20 C166,32 152,62 150,100", c)) + HH("M158,52 Q172,28 192,22", c),
    hime: c => H2(HV("M146,60 L140,168 Q152,176 164,168 L164,84Z", c) + HL("M150,96 L148,168", c)) + HV("M143,96 C134,46 160,8 200,8 C240,8 266,46 257,96 L253,80 Q200,88 147,80Z", c) + HL("M168,28 L166,82 M184,18 L182,84 M200,14 V85 M216,18 L218,84 M232,28 L234,82", c) + HH("M158,52 Q200,30 242,52", c),
    half: c => lock(c) + H2(HV(CURT, c) + HL("M190,20 C166,34 152,64 150,100", c)) + HH("M160,50 Q172,28 192,22", c),
    pony: c => H2(HV("M154,74 C142,94 144,116 150,136 C152,144 150,150 146,154 C158,152 164,142 160,128 C156,112 158,96 164,84Z", c)) + HV("M143,96 C132,46 160,8 200,8 C240,8 268,46 257,96 C253,80 246,68 238,60 L231,76 L221,60 L209,80 L197,60 L185,78 L173,62 L163,80 L154,76 C149,82 146,88 143,96Z", c) + HL("M200,14 L197,56 M222,20 L222,56 M178,20 L174,58", c) + HH("M164,40 Q196,20 230,38", c),
    bun: c => H2(HV("M153,78 C144,96 146,118 152,134 C153,140 151,145 148,148 C158,146 162,136 159,124 C156,110 158,98 163,88Z", c)) + HV("M144,94 C134,44 162,8 200,8 C238,8 266,44 256,94 C250,72 238,56 218,48 C198,68 170,70 154,78 C149,82 146,88 144,94Z", c) + HL("M206,14 C196,40 176,58 156,70 M226,24 C236,38 246,54 251,72", c) + HH("M166,42 Q192,20 224,32", c),
    buns: c => H2(HV("M153,76 C143,98 146,124 153,146 C154,154 151,160 147,164 C160,162 166,148 161,130 C156,112 158,98 164,86Z", c)) + HV("M143,96 C132,44 160,8 200,8 C240,8 268,44 257,96 L252,78 Q238,86 226,80 L218,84 L208,78 L200,84 L192,78 L182,84 L174,80 Q162,86 148,78Z", c) + HL("M200,12 V80 M176,22 L172,80 M224,22 L228,80", c) + HH("M162,44 Q198,22 238,44", c),
    bob: c => H2(HV("M148,62 C134,96 134,134 146,158 C160,164 170,154 166,138 C158,120 156,98 164,78Z", c) + HL("M148,96 C144,120 150,142 156,152", c)) + HV("M142,98 C132,46 160,6 200,6 C240,6 268,46 258,98 C253,86 248,80 244,78 Q200,90 156,78 C150,82 146,90 142,98Z", c) + HL("M170,26 L170,80 M186,16 L184,84 M202,14 V85 M218,18 L220,84 M234,30 L234,82", c) + HH("M158,50 Q200,28 240,48", c),
    pixie: c => H2(HV("M150,70 C142,86 142,104 148,118 C154,118 158,110 157,100 C156,92 158,86 162,80Z", c)) + HV("M142,98 C130,44 160,4 202,4 C244,4 270,46 258,96 C252,84 244,78 238,66 C232,78 214,84 196,82 C204,76 208,70 208,62 C190,80 168,84 152,80 C148,86 145,92 142,98Z", c) + HL("M222,14 C222,40 212,62 200,78 M240,32 C242,48 240,58 238,66 M176,20 C166,44 158,62 152,78", c) + HH("M164,38 Q192,16 226,28", c),
    braids: c => H2(plait(c, 150, 124, 5, -1.5) + HV("M150,70 C136,88 134,112 142,132 C150,140 160,134 161,122 C156,106 156,90 164,78Z", c)) + H2(HV(CURT, c) + HL("M192,18 C166,34 150,64 148,104 M180,34 C164,52 156,78 154,110", c)) + HL("M200,10 V42", c) + HH("M158,50 Q172,28 192,22", c),
    sidebraid: c => plait(c, 250, 128, 5, -1) + HV("M248,66 C266,88 268,116 258,138 C248,144 238,138 238,126 C246,110 246,92 238,78Z", c) + HV("M152,70 C142,92 144,112 150,126 C156,124 160,114 159,104 C158,94 160,86 164,80Z", c) + HV(SWEEP, c) + HL("M214,22 C212,44 204,62 192,76 M232,34 C240,56 250,84 254,120 M176,26 C166,44 158,62 154,78", c) + HH("M164,42 Q190,20 222,30", c),
    crown: c => lock(c, "M152,70 C140,94 142,124 150,152 C152,164 148,174 142,180 C158,178 166,164 162,146 C156,124 156,102 163,84Z") + H2(HV(CURT, c)) + [-54, -36, -18, 0, 18, 36, 54].map(x => `<g transform="translate(${200 + x} ${40 - (54 * 54 - x * x) / 150}) rotate(${x * .7})">${HV("M-13,-5 C-8,-13 8,-13 13,-3 C11,8 -8,11 -13,-5Z", c)}${HL("M-8,-3 Q0,-7 8,-1", c)}</g>`).join("") + [[-40, 25], [0, 18], [40, 25]].map(([x, y]) => `<circle cx="${200 + x}" cy="${y}" r="5" fill="#fff" stroke="#e0a9c0" stroke-width="1.400"/><circle cx="${200 + x}" cy="${y}" r="2" fill="#ffc93c"/>`).join(""),
    curls: c => H2(ring(c, 148, 92, 5, 11, -.5)) + H2(HV(CURT.replace("M201,10", "M201,8"), c) + HL("M192,18 C166,34 150,64 150,100", c)) + [[168, 62], [184, 54], [216, 54], [232, 62]].map(([x, y]) => HL(`M${x - 7},${y} a7,7 0 1 1 7,7 a4,4 0 1 1 3,-6`, c)).join("") + HH("M158,50 Q172,28 192,22", c),
    afro: c => puffs(c, [[152, 62, 17], [172, 48, 18], [196, 42, 19], [220, 46, 18], [244, 60, 17], [142, 84, 14], [258, 84, 14]]),
    spiky: c => HV("M144,100 C134,48 162,12 200,12 C238,12 266,48 256,100 L248,76 L238,94 L229,64 L213,88 L201,58 L183,86 L174,62 L162,92 L153,74Z", c) + HL("M200,18 L201,54 M222,26 L228,60 M178,26 L175,58", c) + HH("M166,40 Q196,20 228,38", c)
  };
  const hairCol = c => ({ c, s: `fill="${c}" stroke="${dk(c, .45)}" stroke-width="2.2" stroke-linejoin="round"`, l: `fill="none" stroke="${dk(c, .35)}" stroke-width="1.6" stroke-linecap="round" opacity=".5"`, h: `fill="none" stroke="${lt(c, .55)}" stroke-width="4.5" stroke-linecap="round" opacity=".45"` });

  const LOOKS = {
    skin: ["#fbdcc6", "#f3c5a3", "#dda37a", "#b87a52", "#8a5636"],
    hair: ["#6b4226", "#2e2530", "#b5552b", "#e7bd74", "#f08bb4", "#7d6fd6", "#5aa7c7"],
    eyes: ["#6b4a2e", "#3f7fb5", "#4b8a57", "#7a5bb5"],
    base: ["#b9a7ee", "#8fd0cf", "#f6a9bf", "#f6cf8a", "#5b6480"]
  };
  const LOOK0 = { skin: LOOKS.skin[0], hair: LOOKS.hair[0], eyes: LOOKS.eyes[0], base: LOOKS.base[0] };

  // ---------- Zones cliquables ----------
  const ARM_Z = [["epaule", -30, 26], ["bras", 26, 78], ["coude", 78, 104], ["avantbras", 104, 168], ["main", 168, 240]];
  const LEG_Z = [["cuisse", -12, 94], ["genou", 94, 125], ["jambe", 125, 218], ["pied", 218, 280]];
  const TOR_F = [["cou", 130, 177], ["thorax", 177, 280], ["abdomen", 280, 326], ["bassin", 326, 400]];
  const TOR_B = [["cou", 130, 177], ["dos", 177, 322], ["bassin", 322, 400]];
  const CROP = { tete: "90 -60 220 220", cou: "140 124 120 120", epaule: "88 152 106 106", thorax: "128 160 144 144", bras: "82 206 92 92", coude: "78 246 86 86", abdomen: "134 246 132 132", avantbras: "62 288 92 92", dos: "100 140 200 200", main: "46 346 96 96", bassin: "120 296 160 160", cuisse: "115 346 112 112", genou: "122 414 92 92", jambe: "106 466 116 116", pied: "110 540 104 104" };

  // ---------- Dessin complet ----------
  // o : { view:'f'|'b', worn:[accessoires], col:z=>couleur|null, tint:bool, look, hair, sel, crop, click:bool, behind, cls, label }
  function svg(o) {
    const v = o.view || "f", L = { ...LOOK0, ...(o.look || {}) }, hs = HAIRS[o.hair] ? o.hair : "long", hc = hairCol(L.hair);
    const skin = L.skin, ln = mix(skin, "#6b2f33", .55), sh = mix(skin, "#b8503f", .28), base = L.base;
    const tf = o.topFab || { fill: base, st: dk(base, .35) }, sf = o.shortFab || { fill: base, st: dk(base, .35) };
    const uid = "c" + v, worn = (o.worn || []).slice().sort((a, b) => (a.l || 5) - (b.l || 5));
    const g = (k, part) => worn.filter(a => a[k]).map(a => `<g>${a[k]}</g>`).join("");
    // parties d'un accessoire selon la vue
    const pick = (a, part) => v === "b" ? (a[part + "B"] !== undefined ? a[part + "B"] : a[part]) : a[part];
    const list = part => worn.map(a => { const s = pick(a, part); return s ? { s, a } : null; }).filter(Boolean);
    const tint = z => { const c = o.tint && o.col ? o.col(z) : null; return c ? `fill="${c}" fill-opacity="${z === "tete" ? .26 : .55}"` : `fill="#fff" fill-opacity="0"`; };
    const att = z => o.click ? ` class="bz" data-act="zone" data-z="${z}"` : "";
    const ttl = z => o.click && o.names ? `<title>${o.names[z]}</title>` : "";
    const rects = (zs, clip, x, w) => zs.map(([z, y0, y1]) => `<rect x="${x}" y="${y0}" width="${w}" height="${y1 - y0}" clip-path="url(#${clip})" ${tint(z)}${att(z)}>${ttl(z)}</rect>`).join("");
    const selRects = (zs, d, clip, x, w) => zs.filter(z => z[0] === o.sel).map(([z, y0, y1]) => `<g clip-path="url(#${clip})"><rect x="${x}" y="${y0}" width="${w}" height="${y1 - y0}" fill="#fff" fill-opacity=".28"/><path d="${d}" fill="none" stroke="#7c5cf0" stroke-width="7" clip-path="url(#${clip}-${z})"/></g>`).join("");
    const S = `stroke="${ln}" stroke-width="2.2" stroke-linejoin="round"`;

    // --- jambe ---
    const toes = v === "f" ? `<path d="M-20,262 q1,-5 4,-6 M-13,264 q1,-6 4,-6 M-6,265 q1,-6 4,-6 M2,265 q0,-7 4,-7" fill="none" stroke="${ln}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>` : `<path d="M-10,250 Q0,258 10,250" fill="none" stroke="${ln}" stroke-width="1.3" opacity=".6"/>`;
    const knee = v === "f" ? `<path d="M-9,104 Q0,98 9,104 M-8,117 Q0,123 8,117" fill="none" stroke="${sh}" stroke-width="2" stroke-linecap="round"/>` : `<path d="M-12,110 Q0,114 12,110" fill="none" stroke="${sh}" stroke-width="2" stroke-linecap="round"/><path d="M-9,140 Q-2,160 -4,186 M9,140 Q4,160 5,182" fill="none" stroke="${sh}" stroke-width="1.8" stroke-linecap="round"/>`;
    const legArt = `<path d="${LEG}" fill="${skin}" ${S}/>${knee}${toes}<path d="${LEG}" fill="url(#gLimb)"/><path d="${legSeg(8, 30, .8, 0, 4)}" fill="${sf.fill}" stroke="${sf.st}" stroke-width="1.6"/>`;
    const legFull = (left) => legG(legArt + rects(LEG_Z, uid + "L", -60, 120) + `<g class="acc">${list("leg").filter(x => !x.a.single || left).map(x => x.s).join("")}</g>` + (o.sel ? selRects(LEG_Z, LEG, uid + "L", -60, 120) : ""));
    // --- bras ---
    const elbow = v === "f" ? `<path d="M-6,92 Q0,96 7,91" fill="none" stroke="${sh}" stroke-width="1.8" stroke-linecap="round"/>` : `<path d="M-6,88 Q0,82 6,88 M-5,98 Q0,101 5,98" fill="none" stroke="${sh}" stroke-width="1.8" stroke-linecap="round"/>`;
    const fingers = `<path d="M-5,228 Q-6,218 -5,210 M1,229 Q1,218 1,209 M6,226 Q7,217 7,209" fill="none" stroke="${ln}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`;
    const armArt = `<path d="${ARM}" fill="${skin}" ${S}/>${elbow}${fingers}<path d="${ARM}" fill="url(#gLimb)"/>`;
    const armFull = (left) => armG(armArt + rects(ARM_Z, uid + "A", -60, 120) + `<g class="acc">${list("arm").filter(x => !x.a.single || left).map(x => x.s).join("")}</g>` + (o.sel ? selRects(ARM_Z, ARM, uid + "A", -60, 120) : ""));
    // --- tronc ---
    const topF = `M167,180 L177,178 C179,198 190,206 200,206 C210,206 221,198 223,178 L233,180 C233,198 240,212 250,220 C250,238 248,250 246,266 Q200,276 154,266 C152,250 150,238 150,220 C160,212 167,198 167,180Z`;
    const topB = `M167,180 L177,178 C180,190 190,196 200,196 C210,196 220,190 223,178 L233,180 C233,200 240,214 250,222 C250,238 248,250 246,266 Q200,276 154,266 C152,250 150,238 150,222 C160,214 167,200 167,180Z`;
    const shorts = `M150,318 Q200,330 250,318 C256,338 260,350 259,366 C240,382 216,382 200,390 C184,382 160,382 141,366 C140,350 144,338 150,318Z`;
    const torsoDet = v === "f"
      ? `<path d="M178,186 Q188,192 196,190 M222,186 Q212,192 204,190" fill="none" stroke="${sh}" stroke-width="2" stroke-linecap="round"/><path d="M200,282 V296" stroke="${sh}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><ellipse cx="200" cy="306" rx="2.2" ry="3.4" fill="${mix(skin, "#8a3f35", .5)}"/><path d="M185,150 Q200,166 215,150 L215,140 L185,140Z" fill="${sh}" opacity=".75"/>`
      : `<path d="M200,182 C201,220 199,270 200,316" fill="none" stroke="${sh}" stroke-width="2.2" stroke-linecap="round"/><path d="M172,200 Q184,220 180,240 M228,200 Q216,220 220,240" fill="none" stroke="${sh}" stroke-width="2" stroke-linecap="round"/>`;
    const baseTop = `<path d="${v === "f" ? topF : topB}" fill="${tf.fill}" stroke="${tf.st}" stroke-width="1.7" stroke-linejoin="round"/>` + (v === "f" ? `<path d="M156,258 Q200,268 244,258" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>` + (o.topPrint ? `<g transform="translate(200 236)">${o.topPrint}</g>` : "") : "");
    const baseSh = `<path d="${shorts}" fill="${sf.fill}"/><path d="M141,366 C140,350 144,338 150,318 Q200,330 250,318 C256,338 260,350 259,366 M194,386 L200,390 L206,386" fill="none" stroke="${sf.st}" stroke-width="1.7" stroke-linejoin="round"/><path d="M151,325 Q200,337 249,325" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>` + (v === "f" ? `<path d="M200,336 V388" stroke="${sf.st}" stroke-width="1.2" opacity=".5"/>` + (o.shortPrint ? `<g transform="translate(168 353) scale(.72)">${o.shortPrint}</g>` : "") : `<path d="M200,332 V388 M158,374 Q180,386 198,376 M242,374 Q220,386 202,376" stroke="${sf.st}" stroke-width="1.3" fill="none" opacity=".6"/>` + (o.shortPrint ? `<g transform="translate(228 350) scale(.72)">${o.shortPrint}</g>` : ""));
    const TZ = v === "f" ? TOR_F : TOR_B;
    const torso = `<path d="${TORSO}" fill="${skin}" ${S}/>${torsoDet}${worn.some(w => w.noTop) ? "" : baseTop}${worn.some(w => w.s === "robe") ? "" : baseSh}<path d="${TORSO}" fill="url(#gShade)" opacity=".8"/>` + rects(TZ, uid + "T", 120, 160) + (o.sel ? selRects(TZ, TORSO, uid + "T", 120, 160) : "");
    // --- tête ---
    const eye = x => `<g class="eye"><ellipse cx="${x}" cy="102" rx="10.5" ry="13.5" fill="#fff"/><ellipse cx="${x}" cy="103" rx="8.6" ry="11.6" fill="${L.eyes}"/><ellipse cx="${x}" cy="105" rx="4.4" ry="6.4" fill="#1d1426"/><path d="M${x - 8},108 Q${x},116 ${x + 8},108 Q${x},119 ${x - 8},108Z" fill="${lt(L.eyes, .55)}" opacity=".85"/><circle cx="${x - 3}" cy="97.5" r="3.4" fill="#fff"/><circle cx="${x + 3.6}" cy="107" r="1.7" fill="#fff" opacity=".9"/><path d="M${x - 12},98 Q${x - 9},86.5 ${x},87 Q${x + 9},86.5 ${x + 12},98" fill="none" stroke="#2b1a24" stroke-width="3.2" stroke-linecap="round"/></g>`;
    const face = `<path d="M${145},92 C136,88 134,108 147,112Z M255,92 C264,88 266,108 253,112Z" fill="${skin}" ${S}/><path d="${FACE}" fill="${skin}" ${S}/>${o.tint || o.click ? `<path d="${FACE}" ${tint("tete")}${att("tete")}>${ttl("tete")}</path>` : ""}
      <g class="acc"><ellipse cx="163" cy="124" rx="14" ry="9" fill="url(#gBlush)"/><ellipse cx="237" cy="124" rx="14" ry="9" fill="url(#gBlush)"/>
      ${eye(177)}<g transform="matrix(-1 0 0 1 400 0)">${eye(177)}</g>
      <path d="M165,80 Q176,74 188,79 M235,80 Q224,74 212,79" fill="none" stroke="${dk(L.hair, .25)}" stroke-width="3" stroke-linecap="round"/>
      <path d="M198,119 Q200,122 203,119" fill="none" stroke="${mix(skin, "#a8473c", .6)}" stroke-width="2" stroke-linecap="round"/>
      <path d="M188,130 Q200,143 212,130 Q200,135 188,130Z" fill="#c4485a" stroke="#8f2f42" stroke-width="1.8" stroke-linejoin="round"/></g>`;
    const headSel = o.sel === "tete" ? `<path d="${FACE}" fill="#fff" fill-opacity=".2" stroke="#7c5cf0" stroke-width="4" class="acc"/>` : "";
    const head = v === "f"
      ? face + `<g class="${o.click ? "bz" : "acc"}"${o.click ? ' data-act="zone" data-z="tete"' : ""}>${BANGS[hs](hc)}</g>` + headSel + `<g class="acc">${list("head").map(x => x.s).join("")}</g>`
      : `<path d="M145,92 C136,88 134,108 147,112Z M255,92 C264,88 266,108 253,112Z" fill="${skin}" ${S}/><path d="${FACE}" fill="${skin}" ${S}/><g class="${o.click ? "bz" : "acc"}"${o.click ? ' data-act="zone" data-z="tete"' : ""}>${HAIRS[hs].b(hc)}</g>${o.sel === "tete" ? `<path d="${FACE}" fill="none" stroke="#7c5cf0" stroke-width="4"/>` : ""}<g class="acc">${list("headB").map(x => x.s).join("")}</g>`;
    const hairBack = v === "f" ? `<g class="acc">${HAIRS[hs].f(hc)}</g>` : "";
    const under = `<g class="acc">${worn.map(a => v === "f" ? a.under : a.underB).filter(Boolean).join("")}</g>`;
    const body = worn.map(a => v === "f" ? a.f : a.b).filter(Boolean).join("");
    const over = worn.map(a => v === "f" ? a.over : a.overB).filter(Boolean).join("");
    const held = list("held").map(x => armG(x.s)).join("");
    const clipS = (id, d, zs, x, w) => `<clipPath id="${id}"><path d="${d}"/></clipPath>` + (o.sel ? zs.filter(z => z[0] === o.sel).map(([z, a, b]) => `<clipPath id="${id}-${z}"><rect x="${x}" y="${a}" width="${w}" height="${b - a}"/></clipPath>`).join("") : "");
    const clips = `<defs>${clipS(uid + "L", LEG, LEG_Z, -60, 120)}${clipS(uid + "A", ARM, ARM_Z, -60, 120)}${clipS(uid + "T", TORSO, TZ, 120, 160)}</defs>`;
    const vb = o.vb || (o.crop ? CROP[o.crop] : "0 -62 400 716");
    // en vue de dos, l'ordre change : les cheveux et le sac passent au-dessus du tronc
    return `<svg class="${o.cls || "perso"}" viewBox="${vb}" role="img" aria-label="${o.label || "Mon personnage"}">${clips}
      ${o.behind || ""}${o.crop ? "" : `<ellipse cx="200" cy="624" rx="92" ry="13" fill="#3a1f4a" opacity=".14"/>`}
      <g class="${o.crop ? "" : "breathe"}">${under}${hairBack}${legFull(true)}${MIR(legFull(false))}${torso}<g class="acc">${body}</g>${armFull(true)}${MIR(armFull(false))}<g class="acc">${over}</g>${head}<g class="acc">${held}${worn.map(a => v === "f" ? a.top : a.topB).filter(Boolean).join("")}</g></g></svg>`;
  }

  window.CORPS = { svg, DEFS, CROP, LOOKS, LOOK0, HAIRS, mix, dk, lt, starD, heartD, legSeg, armSeg, sleeve, handPath, footPath, at, LEG_O, LEG_I, ARM_O, ARM_I, FACE, TORSO };
})();
