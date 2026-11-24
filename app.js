"use strict";
// Révisions anat : application. Dessins : corps-art.js, accessoires-art.js, animals-*.js, cadeaux-art.js


// ======================== Données ========================
const D = window.QDATA || { questions: [], fiches: {}, sources: {}, regions: {} };
const QS = D.questions;
const QBY = {}; QS.forEach(q => (QBY[q.s] ||= []).push(q)); // questions par structure
const BY_ID = Object.fromEntries(QS.map(q => [q.id, q]));
const TABS = [
  { id: "g", label: "Général", cat: null },
  { id: "muscle", label: "Muscles", cat: "muscle" },
  { id: "nerf", label: "Nerfs", cat: "nerf" },
  { id: "ligament", label: "Ligaments", cat: "ligament" },
  { id: "artic", label: "Articulations", cat: "artic" },
  { id: "os", label: "Os", cat: "os" },
  { id: "autre", label: "Autres", cat: "autre" },
  { id: "palpa", label: "Palpation", cat: "palpa" }
];
const POOLS = {
  ko: { label: "Échecs", hint: "Les QCM où tu t'es trompée la dernière fois" },
  todo: { label: "Pas encore interrogées", hint: "Les QCM que tu n'as encore jamais faits" },
  ok: { label: "Déjà eu bon", hint: "Les QCM réussis la dernière fois" }
};
const REG_LABEL = { all: "Tout", ms: "Membre sup.", mi: "Membre inf.", ax: "Tête, cou, tronc" };
const CAT_LABEL = { muscle: "Muscle", nerf: "Nerf", ligament: "Ligament", artic: "Articulation", os: "Os", autre: "Autre", palpa: "Palpation" };
const CAT_PLURAL = { muscle: "Muscles", nerf: "Nerfs", ligament: "Ligaments", artic: "Articulations", os: "Os", autre: "Autres", palpa: "Palpation" };

const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ======================== Images (chargées à la demande depuis images-XX.js) ========================
const PACKS = {};
function loadPack(p) {
  return PACKS[p] || (PACKS[p] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = p + ".js";
    s.onload = res; s.onerror = () => { delete PACKS[p]; rej(new Error("image indisponible")); };
    document.head.appendChild(s);
  }));
}
const imgTags = keys => (keys || []).filter(k => D.imgs && D.imgs[k]).map(k => `<img class="pic" data-k="${esc(k)}" alt="Image du cours" loading="lazy">`).join("");
// image ajoutée (Wikimedia Commons), hors cours
const webImg = f => !f || !f.web || !D.imgs[f.web[0]] ? "" : `<figure class="web"><div class="pics">${imgTags([f.web[0]])}</div><figcaption class="small">${f.web[1] ? "Planche d'ensemble de la région ou de l'os : la structure n'y est pas toujours légendée. " : ""}Image ajoutée (hors cours) · Wikimedia Commons : <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent((D.imgCap[f.web[0]] || "").split(" – ")[0])}" target="_blank" rel="noopener">${esc(D.imgCap[f.web[0]] || "")}</a></figcaption></figure>`;
function hydrateImgs() {
  document.querySelectorAll("img.pic[data-k]:not([src])").forEach(el => {
    if (el.closest("details:not([open])")) return; // chargée seulement quand on ouvre le volet
    const k = el.dataset.k, p = D.imgs[k];
    if (!p) return;
    loadPack(p).then(() => { if (window.IMGP && IMGP[k]) el.src = IMGP[k]; }).catch(() => { el.alt = navigator.onLine ? "Image absente du site : fichier " + p + ".js introuvable sur GitHub" : "Image indisponible hors ligne (jamais affichée)"; });
  });
}

// ======================== Stockage (sur le téléphone) ========================
const K_PROG = "revanat-progress-v1", K_SET = "revanat-settings-v1", K_FLAG = "revanat-flags-v1";
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
let PROG = load(K_PROG, {});       // id -> { r: 1|0 (dernier résultat), n: essais, ok: réussites, t: date }
let SET = { reg: "all", len: 20, ...load(K_SET, {}) };
let FLAGS = load(K_FLAG, {});      // id -> date
const K_OVR = "revanat-corrections-v1"; let OVR = load(K_OVR, {}); // corrections manuelles
const applyOvr = () => { for (const id in OVR) { const q = BY_ID[id]; if (q) { q.q = OVR[id].q; q.a = OVR[id].a; if (q.m) { q.m = q.a.split(" ; "); q.d = q.d.filter(x => !q.m.includes(x)); } else q.d = q.d.filter(x => x !== q.a); } } };
applyOvr();
// ======================== Widget Android (appli « Widget Révisions anat ») ========================
const K_WLAST = "revanat-widget-last-v1"; // date de la dernière réponse du widget déjà importée
function qsHash() { // empreinte de la liste des questions, identique côté widget
  let h = 0x811c9dc5;
  for (let i = 0; i < QS.length; i++) { const s = (i ? "\n" : "") + QS[i].id; for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 0x01000193) >>> 0; } }
  return h >>> 0;
}
function widgetLink() { // lien qui ouvre le widget et lui donne les QCM déjà faits ici
  const bytes = new Uint8Array(Math.ceil(QS.length / 8));
  QS.forEach((q, i) => { if (PROG[q.id]) bytes[i >> 3] |= 1 << (i & 7); });
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
  const d = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const back = location.href.split("#")[0] + "#/widget";
  return `intent://sync?h=${qsHash()}&w=${load(K_WLAST, 0)}&d=${d}#Intent;scheme=revanat;package=fr.jadanat.revwidget;S.browser_fallback_url=${encodeURIComponent(back)};end`;
}
// Réponses données hors de cette page (widget, autre version du site) : elles comptent aussi pour les animaux, croquettes, niveaux…
const K_SEEN = "revanat-vu-v1"; let SEEN = null, NO_RUN = false;
const totals = () => { let ok = 0, ko = 0; for (const id in PROG) { const p = PROG[id]; ok += p.ok || 0; ko += Math.max(0, (p.n || 0) - (p.ok || 0)); } return [ok, ko]; };
const markSeen = () => { SEEN = totals(); save(K_SEEN, SEEN); };
function catchUp() {
  const [o, k] = totals(), g = Math.min(400, Math.max(0, o - SEEN[0])), b = Math.min(400, Math.max(0, k - SEEN[1])); markSeen(); if (!g && !b) return { n: 0, won: "" };
  const run = PET.run, bad = PET.bad, got = { pet: 0, rate: 0, kib: 0, gift: 0 }; NO_RUN = true;
  for (let i = 0; i < b; i++) { const r = badAnswer(); if (r.rate) got.rate++; }
  for (let i = 0; i < g; i++) { const r = goodAnswer(); if (r.pet) got.pet++; if (r.kibble) got.kib++; if (r.gift) got.gift++; }
  NO_RUN = false; PET.run = run; PET.bad = bad; save(K_PET, PET); const acc = syncUnlocks().length, gear = syncLevel().length, np = got.pet + got.rate;
  const L = [np && plural(np, "animal", "animaux"), got.kib && plural(got.kib, "croquette"), got.gift && "1 cadeau", acc && plural(acc, "accessoire"), gear && plural(gear, "accessoire") + " de compagnon"].filter(Boolean);
  return { n: g + b, won: L.length ? `Tu as gagné : ${L.join(", ")} !` : "" };
}
function importWidget(payload) { // réponses envoyées par le widget (#/sync/<base64>)
  if (!payload) return "";
  let data;
  try { data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)))); }
  catch { return "Lien du widget illisible."; }
  const last = load(K_WLAST, 0); let max = last, n = 0, ok = 0;
  for (const [id, r, t] of (data.r || [])) {
    if (!BY_ID[id] || !(t > last)) continue;
    const p = PROG[id] || { n: 0, ok: 0 };
    if (!p.n) p.f = r ? 1 : 0; p.n++; if (r) p.ok++;
    if (!(p.t > t)) { p.r = r ? 1 : 0; p.t = t; }
    PROG[id] = p; n++; if (r) ok++; if (t > max) max = t;
  }
  save(K_PROG, PROG); save(K_WLAST, max);
  const won = catchUp().won;
  return n ? `✔ ${plural(n, "réponse")} du widget ${n > 1 ? "enregistrées" : "enregistrée"} : ${ok} dans « Déjà eu bon », ${n - ok} dans « Échecs ». ${won}` : "Ces réponses du widget étaient déjà enregistrées.";
}
const widgetBtn = () => `<a class="btn primary" href="${esc(widgetLink())}">📲 Mettre à jour le widget</a>`;
function viewWidget() {
  const msg = MSG; MSG = "";
  return `<section class="card"><h2>📲 Widget Android</h2>
      ${msg ? `<p class="big">${esc(msg)}</p>` : ""}
      <p class="small">Touche « Mettre à jour le widget » : il saura quels QCM tu as déjà faits ici et ne te proposera que des structures pas encore interrogées.</p>
      <div class="actions">${widgetBtn()}<a class="btn" href="#/g">Accueil</a></div></section>`;
}
let SESSION = null;
let MSG = "";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const status = q => { const p = PROG[q.id]; return !p ? "todo" : p.r ? "ok" : "ko"; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + "s") : s}`;
const cap = s => { s = String(s ?? ""); return s.charAt(0).toUpperCase() + s.slice(1); };
const srcText = src =>src ? `${D.sources[src[0]] || src[0]}, page ${src[1]} du PDF` : "";

function questionsOf(tab, reg = SET.reg) {
  const t = TABS.find(x => x.id === tab);
  return QS.filter(q => (!t || !t.cat || q.c === t.cat) && (reg === "all" || q.r === reg));
}
function stats(list) {
  let ok = 0, ko = 0;
  for (const q of list) { const s = status(q); if (s === "ok") ok++; else if (s === "ko") ko++; }
  return { total: list.length, ok, ko, done: ok + ko, todo: list.length - ok - ko };
}
const pct = (a, b) => b ? (a / b * 100) : 0;

function renderTabs(active, pre = "") {
  $("#tabs").innerHTML = TABS.map(t => {
    const s = stats(questionsOf(t.id));
    return `<a href="#/${pre}${t.id}" class="${t.id === active ? "on" : ""}">${t.label} <span class="small">${s.done}/${s.total}</span></a>`;
  }).join("");
  $("#tabs").classList.toggle("hidden", !active);
}

function progressBlock(s) {
  return `<div class="stack" role="img" aria-label="${s.ok} réussis, ${s.ko} échoués, ${s.todo} restants">
      <div class="g" style="width:${pct(s.ok, s.total)}%"></div><div class="r" style="width:${pct(s.ko, s.total)}%"></div></div>
    <div class="legend"><span><i style="background:var(--ok)"></i>${s.ok} réussis</span><span><i style="background:var(--ko)"></i>${s.ko} échoués</span><span><i style="background:var(--todo)"></i>${s.todo} restants</span></div>`;
}

// ======================== Fiches, révision, explorateur nerveux ========================

function ficheList(f) {
  return `<ul class="facts">${f.facts.map(([k, v]) => `<li><b>${esc(k)}</b>${esc(v)}</li>`).join("")}</ul>
    <div class="small" style="margin-top:6px">📄 ${f.src.map(s => esc(srcText(s))).join(" · ")}</div>`;
}

function viewFiches(query) {
  const qn = norm(query || "");
  const names = Object.keys(D.fiches).filter(n => (SET.reg === "all" || D.fiches[n].reg === SET.reg) && (!qn || norm(n).includes(qn)))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const groups = {};
  for (const n of names) (groups[D.fiches[n].cat] ||= []).push(n);
  const dotFor = n => {
    const s = stats(QBY[n] || []);
    const c = s.ko ? "var(--ko)" : s.todo ? "var(--todo)" : "var(--ok)";
    return `<span class="small">${s.done}/${s.total}<span class="dot" style="background:${c}"></span></span>`;
  };
  return `<section class="card"><h2>Fiches des structures</h2>
      <p class="small">Toutes les informations de tes cours, structure par structure. Touche une fiche pour la lire ou t'interroger dessus.</p>
      <input type="search" id="search" placeholder="Rechercher (ex. médian, fémur, trapèze…)" value="${esc(query || "")}">
      <div class="chips">${Object.entries(REG_LABEL).map(([k, v]) => `<button data-act="reg" data-reg="${k}" class="${SET.reg === k ? "on" : ""}">${v}</button>`).join("")}</div>
    </section>
    ${["muscle", "nerf", "ligament", "artic", "os", "autre", "palpa"].filter(c => groups[c]).map(c => `<section class="card"><h2>${CAT_PLURAL[c]} (${groups[c].length})</h2>
      <div class="list">${groups[c].map(n => `<a href="#/fiche/${encodeURIComponent(n)}"><span>${esc(cap(n))}</span>${dotFor(n)}</a>`).join("")}</div></section>`).join("")
    || `<div class="card small">Aucune structure trouvée.</div>`}`;
}

function palpaBlocks(f) {
  return (f.palpa || []).map(b => `<div class="palpa"><b>🖐 Palpation${b.titre && norm(b.titre) !== norm(f._name || "") ? " – " + esc(b.titre) : ""}</b>
    <div>${esc(b.how)}</div><div class="small">📄 ${esc(srcText(b.src))}</div>
    ${b.imgs && b.imgs.length ? `<div class="pics">${imgTags(b.imgs)}</div>` : ""}</div>`).join("");
}
const PART_OF = D.partOf || {};
const bare = s => norm(s.replace(/\s*\(.*?\)/g, ""));
function trajets(name) { // muscle -> nerf -> ... -> vertèbres
  const want = [name, ...(PART_OF[name] || [])].map(bare), out = [];
  for (const n of Object.values(D.nerfs)) for (const m of n.muscles || []) if (want.includes(bare(m.n))) {
    let cur = n, src = n.rac ? n : null, txt = cap(n.nom);
    while (cur.parent) { txt += " → " + (cur.kind || "branche") + " de : "; cur = D.nerfs[cur.parent]; txt += cur.nom; if (!src && cur.rac) src = cur; }
    txt += src ? " → vient de " + src.rac + (src === n ? "" : " (racines de : " + src.nom + ")") : " → racines non précisées dans le cours";
    out.push([m.n, txt]);
  }
  return out.length ? `<ul class="facts">${out.map(([m, x]) => `<li><b>Trajet nerveux – ${esc(m)}</b>${esc(x)}</li>`).join("")}</ul>` : "";
}
function ficheBody(name) {
  const f = D.fiches[name];
  if (!f) return "";
  f._name = name;
  const qs = QBY[name] || [], s = stats(qs);
  return `${trajets(name)}${f.facts.length ? ficheList(f) : ""}
    ${palpaBlocks(f)}
    ${f.imgs && f.imgs.length ? `<details ${f.cat === "nerf" ? "" : "open"}><summary>📑 Pages de tes cours (${f.imgs.length})</summary><div class="pics big">${imgTags(f.imgs)}</div></details>` : ""}
    ${qs.length ? `<p class="small" style="margin-top:12px">${s.done} QCM sur ${s.total} réalisés, ${s.ok} réussis, ${s.ko} échoués</p>${progressBlock(s)}
    <div class="actions"><button class="primary" data-act="ficheQuiz" data-name="${esc(name)}">M'interroger sur cette structure (${qs.length})</button></div>` : ""}`;
}
function viewFiche(name) {
  const f = D.fiches[name];
  if (!f) return `<div class="card">Fiche introuvable. <a href="#/fiches">Retour</a></div>`;
  const back = TABS.some(t => t.cat === f.cat) ? `#/rev/${f.cat}` : "#/fiches";
  return `<p><a href="${back}">← Révision ${esc(CAT_PLURAL[f.cat] || "")}</a></p>
    <section class="card"><span class="tag">${CAT_LABEL[f.cat]} · ${REG_LABEL[f.reg] || ""}</span>
      <h2 style="margin-top:8px">${esc(cap(name))}</h2>${webImg(f)}${ficheBody(name)}</section>`;
}

// ======================== Révision ========================
function viewRev(tab, query) {
  const t = TABS.find(x => x.id === tab) || TABS[0];
  const qn = norm(query || "");
  let names;
  if (t.cat === "palpa") names = [...new Set((D.palpas || []).map(p => D.fiches[p.nom] ? p.nom : null).filter(Boolean)
    .concat(Object.keys(D.fiches).filter(n => D.fiches[n].cat === "palpa")))];
  else names = Object.keys(D.fiches).filter(n => !t.cat || D.fiches[n].cat === t.cat);
  names = names.filter(n => (SET.reg === "all" || D.fiches[n].reg === SET.reg || !D.fiches[n].reg) && (!qn || norm(n).includes(qn)))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const dot = n => { const s = stats(QBY[n] || []); const c = !s.total ? "transparent" : s.ko ? "var(--ko)" : s.todo ? "var(--todo)" : "var(--ok)"; return `<span class="small">${s.total ? s.done + "/" + s.total : ""}<span class="dot" style="background:${c}"></span></span>`; };
  const nerf = t.cat === "nerf" ? `<section class="card"><h2>Explorateur : vertèbre → nerfs</h2>
      <p class="small">Choisis un niveau : tu verras tous les nerfs qui en naissent, avec leurs collatérales et leurs terminales.</p>
      <div class="levels">${D.levels.map(l => `<a href="#/vert/${l}">${l}</a>`).join("")}</div>
      <p class="small" style="margin-top:10px">Plexus : ${Object.entries(D.nerfs).filter(([id, n]) => !n.parent && (id.startsWith("plexus") || id.startsWith("branches"))).map(([id, n]) => `<a href="#/nx/${id}">${esc(n.nom)}</a>`).join(" · ")}</p>
      <p class="small">Nerfs crâniens : ${Object.entries(D.nerfs).filter(([id]) => /^[IVX]+$/.test(id)).map(([id, n]) => `<a href="#/nx/${id}">${esc(id)}</a>`).join(" · ")}</p></section>` : "";
  return `<p><a href="#/${t.id}">← ${esc(t.label)}</a></p>${nerf}
    <section class="card"><h2>Révision : ${esc(t.id === "g" ? "toutes les structures" : t.label)} (${names.length})</h2>
      <input type="search" id="search" data-tab="${t.id}" placeholder="Rechercher…" value="${esc(query || "")}">
      <div class="chips">${Object.entries(REG_LABEL).map(([k, v]) => `<button data-act="reg" data-reg="${k}" class="${SET.reg === k ? "on" : ""}">${v}</button>`).join("")}</div>
      <div class="list">${names.map(n => `<a href="#/fiche/${encodeURIComponent(n)}"><span>${esc(cap(n))}</span>${dot(n)}</a>`).join("") || `<p class="small">Aucune structure.</p>`}</div>
    </section>`;
}

function viewVert(lv) {
  const list = Object.entries(D.nerfs).filter(([, n]) => (n.lv || []).includes(lv))
    .sort((a, b) => (a[1].parent ? 1 : 0) - (b[1].parent ? 1 : 0) || a[1].nom.localeCompare(b[1].nom, "fr"));
  return `<p><a href="#/rev/nerf">← Révision Nerfs</a></p>
    <section class="card"><h2>Explorateur : vertèbre → nerfs</h2>
      <div class="levels">${D.levels.map(l => `<a href="#/vert/${l}" class="${l === lv ? "on" : ""}">${l}</a>`).join("")}</div></section>
    <section class="card"><h2>Nerfs issus de ${esc(lv)} (${list.length})</h2>
      <div class="list">${list.map(([id, n]) => `<a href="#/nx/${id}"><span>${esc(cap(n.nom))}${n.parent ? ` <span class="small">(${esc(n.kind || "branche")} de ${esc(D.nerfs[n.parent].nom)})</span>` : ""}</span>
        <span class="small">${esc(n.rac || (n.herite ? "via " + n.herite : ""))}</span></a>`).join("") || `<p class="small">Aucun nerf décrit dans tes cours pour ce niveau.</p>`}</div></section>`;
}

function nerveCard(id, withLink) {
  const n = D.nerfs[id];
  const mus = (n.muscles || []).map(m => `<li><b>${esc(m.n)}</b>${m.a ? esc(m.a) : `<span class="small">Action non décrite dans tes cours de myologie</span>`}</li>`).join("");
  return `<h2 style="margin-top:4px">${esc(cap(n.nom))}</h2>
    <ul class="facts">
      <li><b>Origine (racines)</b>${esc(n.rac || (n.herite ? "Comme le " + n.herite + " (non précisé)" : "Non précisé dans le cours"))}</li>
      ${n.parent ? `<li><b>Naît de</b>${esc(D.nerfs[n.parent].nom)} (${esc(n.kind || "branche")})</li>` : ""}
      ${n.sens ? `<li><b>Territoire sensitif</b>${esc(n.sens)}</li>` : ""}
      ${n.fct ? `<li><b>Fonction</b>${esc(n.fct)}</li>` : ""}
    </ul>
    ${mus ? `<h3 style="margin:12px 0 4px;font-size:.95rem">Muscles innervés et leurs actions</h3><ul class="facts">${mus}</ul>` : ""}
    ${withLink ? `<div class="actions"><a class="btn" href="#/nx/${id}">Explorer ce nerf →</a></div>` : ""}`;
}

function viewNx(id, kind, sub) {
  const n = D.nerfs[id];
  if (!n) return `<div class="card">Nerf introuvable. <a href="#/rev/nerf">Retour</a></div>`;
  const kids = (n.children || []).map(c => [c, D.nerfs[c]]);
  const col = kids.filter(([, c]) => c.kind === "collatérale"), ter = kids.filter(([, c]) => c.kind === "terminale");
  const k = kind || (col.length ? "c" : "t");
  const shown = k === "c" ? col : ter;
  const lvLinks = (n.lv || []).map(l => `<a href="#/vert/${l}">${l}</a>`).join(" ");
  const f = D.fiches[n.fiche];
  return `<p><a href="${n.parent ? "#/nx/" + n.parent : "#/rev/nerf"}">← ${n.parent ? esc(D.nerfs[n.parent].nom) : "Révision Nerfs"}</a> ${lvLinks ? `<span class="small"> · niveaux : ${lvLinks}</span>` : ""}</p>
    <section class="card"><span class="tag">Nerf</span>${nerveCard(id, false)}</section>
    ${kids.length ? `<section class="card">
      <div class="subtabs"><a href="#/nx/${id}/c" class="${k === "c" ? "on" : ""}">Collatérales (${col.length})</a><a href="#/nx/${id}/t" class="${k === "t" ? "on" : ""}">Terminales (${ter.length})</a></div>
      <div class="list">${shown.map(([cid, c]) => `<a href="#/nx/${id}/${k}/${cid}" style="${cid === sub ? "font-weight:700;color:var(--accent)" : ""}"><span>${esc(cap(c.nom))}</span><span class="small">${esc(c.rac || "")}</span></a>`).join("") || `<p class="small">Aucune dans le cours.</p>`}</div>
      ${sub && D.nerfs[sub] ? `<div class="palpa" style="margin-top:12px">${nerveCard(sub, true)}</div>` : ""}
    </section>` : ""}
    <section class="card"><h2>Description complète${f ? "" : " (cours)"}</h2>
      ${f ? ficheBody(n.fiche) : ""}
      ${n.imgs && n.imgs.length && !(f && f.imgs && f.imgs.length) ? `<div class="pics big">${imgTags(n.imgs)}</div>` : ""}
    </section>`;
}

function viewSettings() {
  const all = stats(QS), nf = Object.keys(FLAGS).length;
  const msg = MSG; MSG = "";
  const bySrc = {};
  for (const q of QS) if (q.src) bySrc[q.src[0]] = (bySrc[q.src[0]] || 0) + 1;
  return `<section class="card"><h2>Ma progression</h2>
      <p>${all.done} QCM sur ${all.total} réalisés, ${all.ok} réussis, ${all.ko} échoués.</p>${progressBlock(all)}
      <p class="small">Ta progression, tes accessoires et tes animaux sont enregistrés uniquement sur cet appareil. Exporte-les de temps en temps pour ne pas les perdre.</p>
      <div class="actions"><button class="primary" data-act="export">Exporter ma progression</button><button data-act="import">Importer</button>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden"></div>
      <div class="msg">${esc(msg)}</div></section>
    <section class="card"><h2>📲 Widget Android</h2>
      <p class="small">Les réponses données sur le widget arrivent ici quand tu touches « ↻ Envoyer à l'appli » sur le widget. Dans l'autre sens, ce bouton envoie ta progression au widget.</p>
      <div class="actions">${widgetBtn()}</div></section>
    <section class="card"><h2>Questions signalées (${nf})</h2>
      <p class="small">Si une question te paraît fausse, touche « 🚩 Signaler » en haut de la question. Tu retrouves la liste ici pour la faire corriger.</p>
      ${nf ? `<div class="list">${Object.keys(FLAGS).map(id => BY_ID[id]).filter(Boolean).map(q => `<a href="#/fiche/${encodeURIComponent(q.s)}"><span>${esc(q.q)}</span><span class="small">${esc(q.s)}</span></a><button class="flag" data-act="fixQ" data-id="${q.id}">✏ Corriger la question ou la réponse</button>`).join("")}</div>
      <div class="actions"><button data-act="flagQuiz">Revoir ces questions</button><button data-act="copyFlags">Copier la liste</button></div>` : ""}
    </section>
    <section class="card"><h2>Sources utilisées</h2>
      <p class="small">Toutes les réponses viennent de ces cours (le numéro de page est donné après chaque question) :</p>
      <ul class="facts">${Object.entries(D.sources).map(([k, v]) => `<li>${esc(v)} <span class="small">— ${bySrc[k] || 0} questions</span></li>`).join("")}</ul>
      <p class="small">Banque générée le ${esc(D.version)} · ${QS.length} QCM · ${Object.keys(D.fiches).length} fiches.</p></section>
    <section class="card"><h2>Hors ligne</h2><p class="big" id="offst">Vérification…</p>
      <p class="small">Les questions, les fiches, le jeu et tous les dessins marchent sans internet dès la première ouverture. Les photos de cours et les tableaux se gardent quand tu les ouvres : touche ce bouton une fois, avec internet, pour tout avoir (environ 55 Mo).</p>
      <button data-act="dlImgs">Tout télécharger pour le hors ligne</button></section>
    <section class="card"><h2>Remarques sur tes cours</h2>
      <p class="small">Points relevés en préparant les questions. Quand deux cours se contredisent, la notion n'est pas interrogée.</p>
      <ul class="facts">
        <li><b>Grand dorsal – insertion iliaque</b>« 1/3 médial » de la lèvre externe de la crête iliaque (Membre supérieur – Myologie p. 4) contre « 1/3 postérieur » (Squelette axial – Myologie p. 11) : la crête iliaque est interrogée, mais pas la fraction.</li>
        <li><b>Plexus sacral</b>Le texte dit L4 à S3 (SNP p. 192 et 195), un schéma indique L5 et S4 : la question retient L4 à S3.</li>
        <li><b>3e fibulaire</b>SNP p. 215 et palpation p. 46 disent fibulaire superficiel, SNP p. 232 rattache les muscles antérieurs au fibulaire profond : selon ta consigne, la question retient le fibulaire profond et ne propose jamais le superficiel.</li>
        <li><b>Nerfs plantaires</b>Le cours SNP utilise les anciens noms : « adducteur du gros orteil » = abducteur de l'hallux, « abducteurs oblique et transverse du gros orteil » = adducteur de l'hallux. Les questions utilisent les noms actuels.</li>
        <li><b>Interosseux dorsaux de la main</b>L'action « extension de la P3 sur la P2 et de la P2 sur la P3 » contient une faute de frappe : seule l'action « écartement des P1 par rapport au majeur » est interrogée.</li>
        <li><b>Quadriceps</b>« Tendon quadricipital ou ligament patellaire » : formulation ambiguë, non interrogée.</li>
        <li><b>Muscles sans innervation dans tes cours</b>${(D.sansInnerv || []).map(esc).join(", ")} : aucune question d'innervation possible.</li>
        <li><b>Articulations costo-vertébrales</b>L'orientation des fossettes vertébrales diffère entre l'arthrologie (p. 11) et l'ostéologie axiale (p. 8) : non interrogée.</li>
        <li><b>Palpation du tronc</b>Le texte imprimé s'arrête au milieu des obliques de l'abdomen (p. 13) ; l'écriture manuscrite est ignorée.</li>
        <li><b>Innervation des muscles</b>Les cours de myologie ne la donnent pas : elle vient uniquement du cours SNP.</li>
        <li><b>Schémas</b>Les questions viennent du texte des cours ; les informations présentes uniquement dans les schémas (images) ne sont pas interrogées.</li>
      </ul></section>
    <section class="card"><h2>Recommencer à zéro</h2>
      <p class="small">Efface ta progression et tes accessoires (les questions et tes animaux restent).</p>
      <button class="danger" data-act="reset">Effacer ma progression</button></section>`;
}

// ======================== Zones du corps ========================

const ZONES = { tete: "Tête", cou: "Cou", epaule: "Épaule", thorax: "Thorax", bras: "Bras", coude: "Coude", abdomen: "Abdomen",
  avantbras: "Avant-bras", dos: "Dos et colonne", main: "Poignet et main", bassin: "Bassin et hanche", cuisse: "Cuisse",
  genou: "Genou", jambe: "Jambe", pied: "Cheville et pied" };
const ZRULES = [
  ["main", /\b(main|mains|poignet|carp|scaphoide|lunatum|semi-lunaire|triquetrum|pyramidal|pisiforme|trapeze \(os\)|trapezoide|capitatum|grand os|hamatum|crochu|metacarp|phalang|doigt|pouce|index|auriculaire|majeur|thenar|hypothenar|lombricaux|interosseux (palmaires|dorsaux de la main)|tabatiere|retinaculum des (flechisseurs|extenseurs) \(poignet\)|canal carpien|loge de guyon|radio-carp|styloide)/],
  ["pied", /\b(pied|cheville|talus|astragale|calcane|naviculaire|cuboide|cuneiforme|metatars|orteil|hallux|plantaire|tarse|tarsien|malleol|talo-crural|tibio-tarsien|achille|calcaneen|lisfranc|chopart|pedieux|sinus du tarse|retinaculum des (flechisseurs|extenseurs|fibulaires)|interosseux (plantaires|dorsaux du pied)|carre plantaire|sesamoide|retromalleol|subtalaire|sous-talaire|sustentacul|bifurque)/],
  ["genou", /\b(genou|patella|patellaire|rotule|menisque|croise|poplite|tibio-femoral|femoro-patellaire|femoro-tibial|plateau tibial|patte d'oie|hoffa|condyle|coques condyliennes|intercondylaire|infra-condylaire|tuberosite tibiale|fabella|bourse pre)/],
  ["jambe", /\b(tibia|tibial|fibula|fibulaire|perone|jambe|triceps sural|gastrocnemien|jumeaux de la jambe|soleaire|plantaire grele|long extenseur des orteils|long flechisseur des orteils|long extenseur de l'hallux|long flechisseur de l'hallux|crural|sural|mollet|tibio-fibulaire|membrane interosseuse de la jambe|saphene)/],
  ["cuisse", /\b(femur|femoral|cuisse|quadriceps|vaste|sartorius|couturier|adducteur|ischio-jambier|biceps femoral|semi-tendineux|semi-membraneux|gracile|droit interne|tenseur du fascia lata|fascia lata|tractus ilio-tibial|bandelette|sciatique|scarpa|pectine|ligne apre|hunter|obturateur? ?nerf)/],
  ["bassin", /\b(bassin|pelvi|hanche|coxo|coxal|fessier|glute|piriforme|pyramidal du bassin|obturat|jumeau|gemell|carre femoral|psoas|iliaque|ilio|acetabul|cotyle|trochanter|sacr|coccy|pubi|ischi|symphyse|plexus lombaire|plexus sacral|plexus pudendal|pudendal|ligament inguinal|inguinal|perinee|anal|anus|honteux|surface auriculaire|obture|epine iliaque|crete iliaque|ails)/],
  ["coude", /\b(coude|olecran|epicondyl|epitrochle|trochlee|capitulum|condyle humeral|huméro-ulnaire|humero-ulnaire|humero-radial|radio-ulnaire proximal|tete radiale|anconé|anconee|ancone|fossette (coronoide|olecranienne)|processus coronoide|tuberosite bicipitale|bourse olecranienne)/],
  ["avantbras", /\b(avant-bras|radius|radial|ulna|ulnaire|cubital|pronateur|supinateur|flechisseur|extenseur|brachio-radial|long supinateur|palmaire|supinat|long abducteur du pouce|court extenseur du pouce|membrane interosseuse|radio-ulnaire|union des os)/],
  ["bras", /\b(bras|humer|biceps|triceps|brachial|coraco-brachial|musculo-cutane|sillon du nerf radial|velpeau|quadrilatere|triangle (humero-tricipital|omo-tricipital))/],
  ["epaule", /\b(epaule|scapula|omoplate|clavicul|acromi|deltoid|coiffe|supra-epineux|sus-epineux|infra-epineux|sous-epineux|subscapulaire|sous-scapulaire|petit rond|grand rond|gleno|scapulo|axillaire|aisselle|creux axillaire|coraco|conoide|trapezoide \(ligament\)|subclavier|sous-clavier|elevateur de la scapula|rhomboide|dentele anterieur|grand dentele|petit pectoral|plexus brachial|thoracique long|suprascapulaire|sus-scapulaire|dorsal de la scapula|thoraco-dorsal|triangle des ronds|sterno-claviculaire|subclavi)/],
  ["tete", /\b(crane|cranien|tete|face\b|faciale?\b|mandibul|maxill|temporal|occipital|frontal|parietal|sphenoid|ethmoid|zygoma|orbit|oeil|œil|oculo|nasal|nez|bouche|langue|machoire|masseter|pterygoid|temporo-mandibulaire|atm|hypoglosse|trijumeau|olfactif|optique|trochleaire|abducens|vestibulo|glosso-pharyngien|vague|nerf accessoire|foramen jugulaire|suboccipital|sous-occipital|sous occipital|petit droit posterieur|grand droit posterieur|oblique (superieur|inferieur) de la tete|occiput|mastoid|front|cuir chevelu|ophtalmique|foramen magnum|basilaire|menton)/],
  ["cou", /\b(cou\b|cervica|atlanto|atloido|axoid|odonto|nucal|tectoria|grand auriculaire|supra-claviculaire|nuque|sterno-cleido|scm|scalene|hyoid|larynx|thyroid|trachee|atlas|axis|c[1-7]\b|plexus cervical|phrenique|jugulaire|carotid|splenius|elevateur|semi-epineux de la tete|longissimus de la tete|long du cou|long de la tete|platysma)/],
  ["thorax", /\b(thorax|thorac|cote|costal|costo|sternum|sternal|xiphoid|manubrium|intercost|pector|mammaire|diaphragm|sein|poumon|coeur|aorte thoracique|subcostal|transverse du thorax)/],
  ["abdomen", /\b(abdom|abdominal|oblique|droit de l'abdomen|grand droit|transverse de l'abdomen|pyramidal de l'abdomen|ligne blanche|ombilic|nombril|aorte abdominale|rectus|gaine des droits|arcade de senac|carre des lombes|ilio-hypogastrique|ilio-inguinal|genito-femoral)/],
  ["dos", /\b(dos\b|trapeze(?! \(os\))|intervertebr|paravertebr|masse commune|dentele postero|supraepineux|promontoire|mamillaire|dorsal|vertebr|rachis|colonne|spinal|spinaux|epineu|lombaire|lombal|lombes|disque|anneau fibreux|nucleus|noyau pulpeux|interepineux|intertransversaire|multifide|transversaire|longissimus|ilio-costal|iliocostal|erecteur|grand dorsal|latissimus|thoraco-lombaire|lombo-sacre|jaune|ligament longitudinal|ligaments? (jaunes|supra-epineux|interepineux)|zygapophys|articulaire|t1[0-2]?\b|t[2-9]\b|l[1-5]\b|th[0-9]+)/],
];
const Z_REG = { main: "ms", avantbras: "ms", coude: "ms", bras: "ms", epaule: "ms ax", abdomen: "ax", pied: "mi", jambe: "mi", genou: "mi", cuisse: "mi" };
const Z_FALLBACK = { ms: "bras", mi: "cuisse", ax: "dos" };
const ZONE_OF = {}, ZQ = {};
for (const q of QS) {
  let z = null;
  for (const t of [norm(q.s), norm(q.q)]) {
    for (const [k, re] of ZRULES) if ((!Z_REG[k] || Z_REG[k].includes(q.r)) && re.test(t)) { z = k; break; }
    if (z) break;
  }
  z = z || Z_FALLBACK[q.r] || "dos";
  ZONE_OF[q.id] = z; (ZQ[z] ||= []).push(q);
}


// ======================== Jeu : état sauvegardé ========================
const K_BODY = "revanat-corps-v3", K_DAILY = "revanat-daily-v3", K_PET = "revanat-pet-v3", K_SESS = "revanat-serie-v1", K_TAB = "revanat-tableaux-v1", K_WARD = "revanat-garderobe-v1";
const ART = window.ANIMALS_ART, ANIMALS = ART.animals, RATES = window.ANIMALS_RATES || [], GIFT = window.CADEAUX, GEAR = window.PETGEAR;
const ANIMAL_BY_ID = { ...ART.byId, ...Object.fromEntries(RATES.map(a => [a.id, a])) };
document.getElementById("svgdefs").innerHTML = CORPS.DEFS + ART.DEFS + GIFT.DEFS + window.GARDEROBE.DEFS;
const todayKey = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const pickOne = a => a[Math.floor(Math.random() * a.length)];

// ---------- Accessoires du corps : un au hasard tous les 5 % réussis dans une zone ----------
const STEPS = 20, ACC = CORPS.ACC, ACC_BY = CORPS.ACC_BY;
function zstat(z) { const s = stats(ZQ[z] || []); s.m = s.total ? s.ok / s.total : 0; s.p = Math.floor(s.m * 100 + 1e-9); return s; }
const zTarget = z => { const s = zstat(z); return s.total ? Math.floor(s.ok * STEPS / s.total + 1e-9) : 0; };
let BODY = load(K_BODY, null);
const bodyNew = !BODY; BODY ||= {};
BODY.got = (BODY.got || []).filter(id => ACC_BY[id]); BODY.eq ||= {}; BODY.look = { ...CORPS.LOOK0, ...(BODY.look || {}) };
if (BODY.tint === undefined) BODY.tint = true;
const has = a => BODY.got.includes(a.id), isEq = a => has(a) && !!BODY.eq[a.id];
const gotIn = z => BODY.got.filter(id => ACC_BY[id].z === z).map(id => ACC_BY[id]);
// ---------- Garde-robe achetée avec l'XP ----------
const SHOP = window.GARDEROBE, START_XP = 1500; // au premier lancement, l'XP passé est crédité dans cette limite
let WARD = { got: [], eq: {}, fab: {}, spent: null, ...load(K_WARD, {}) }; WARD.got = WARD.got.filter(id => SHOP.byId[id]);
for (const s in WARD.eq) if (!WARD.got.includes(WARD.eq[s])) delete WARD.eq[s];
for (const s in WARD.fab) if (!WARD.got.includes(WARD.fab[s])) delete WARD.fab[s];
const FABCATS = ["top", "short", "dtop", "dshort"];
const wallet = () => Math.max(0, xp() - (WARD.spent || 0));
const clothes = () => Object.values(WARD.eq).map(id => SHOP.byId[id]).filter(Boolean);
const wornAcc = () => BODY.got.filter(id => BODY.eq[id]).map(id => ACC_BY[id]);
const worn = () => [...wornAcc(), ...clothes()];
// un haut, un bas et une robe ne se portent pas en même temps ; un accessoire et un vêtement du même emplacement non plus
const clash = s => s === "robe" ? ["robe", "haut", "bas"] : s === "haut" || s === "bas" ? [s, "robe"] : [s];
function wear(a, on) {
  const cs = clash(a.s); if (on) { for (const w of wornAcc()) if (cs.includes(w.s)) BODY.eq[w.id] = false; for (const s of cs) delete WARD.eq[s]; }
  if (a.cat) { if (on) WARD.eq[a.s] = a.id; else if (WARD.eq[a.s] === a.id) delete WARD.eq[a.s]; } else BODY.eq[a.id] = on;
  save(K_WARD, WARD); save(K_BODY, BODY);
}
const fabOpts = (f = WARD.fab) => ({ topFab: f.top && SHOP.byId[f.top].fab, shortFab: f.short && SHOP.byId[f.short].fab, topPrint: f.dtop && SHOP.byId[f.dtop].draw, shortPrint: f.dshort && SHOP.byId[f.dshort].draw });
function grant(z, quiet) {
  const pool = CORPS.accByZone(z).filter(a => !has(a)); if (!pool.length) return null;
  const a = pickOne(pool); BODY.got.push(a.id);
  if (!worn().some(w => (quiet && w.z === z) || clash(a.s).includes(w.s))) wear(a, true);
  return a;
}
function syncUnlocks(quiet) {
  const fresh = [];
  for (const z of Object.keys(ZONES)) { let n = zTarget(z) - gotIn(z).length; while (n-- > 0) { const a = grant(z, quiet); if (!a) break; fresh.push(a); } }
  if (fresh.length) save(K_BODY, BODY);
  return fresh;
}
if (bodyNew) { // reprise des anciennes versions : on ne perd aucun accessoire déjà gagné
  const v2 = (load("revanat-corps-v2", {}).got || []), v1 = (load("revanat-corps-v1", {}).got || []);
  for (const z of Object.keys(ZONES)) {
    const n1 = [2, 10, 20].reduce((m, n, i) => v1.includes(z + i) ? n : m, 0), n2 = v2.filter(id => String(id).startsWith(z + "_p")).length;
    for (let n = Math.max(n1, n2) - gotIn(z).length; n > 0; n--) grant(z, true);
  }
  syncUnlocks(true); save(K_BODY, BODY);
}
// ---------- XP et niveaux ----------
const xp = () => { let n = 0; for (const id in PROG) n += PROG[id].ok || 0; return n * 10 + BODY.got.length * 25; };
const need = L => 50 * L * (L - 1);
const level = x => { let L = 1; while (need(L + 1) <= x) L++; return L; };
const TITLES = [[1, "Première année"], [3, "Palpeuse en herbe"], [5, "Chasseuse d'insertions"], [8, "Dompteuse de nerfs"], [11, "Reine des ligaments"], [14, "Maîtresse du plexus"], [18, "Légende de l'anat"], [22, "Kiné d'or 🏆"], [28, "Déesse de l'anatomie"], [35, "Immortelle du plexus"]];
const title = L => TITLES.filter(t => L >= t[0]).pop()[1];
function zcol(z) { const s = zstat(z); if (!s.ok) return null; if (s.m >= 1) return "url(#gGold)"; return `hsl(${Math.round(262 - 122 * s.m)} 78% ${Math.round(74 - 14 * s.m)}%)`; }

// ---------- Jour, série de jours, croquettes et cadeaux ----------
let DAILY = { streak: 0, lastActiveDay: null, todayKey: todayKey(), todayGood: 0, todayRewardClaimed: false, kibbleEarnedToday: false, kibbles: 0, got: [], ...load(K_DAILY, {}) };
DAILY.equipped = { coiffure: null, decor: null, ...(DAILY.equipped || {}) };
const OLD_GOT = DAILY.got || [], OLD_EQ = { ...DAILY.equipped };
// ---------- Tableaux : un par jour de connexion ----------
let TAB = { got: [], cur: null, day: null, ...load(K_TAB, {}) };
for (const id of OLD_GOT) if (GIFT.TAB[id] && !TAB.got.includes(id)) TAB.got.push(id);
TAB.got = TAB.got.filter(id => GIFT.TAB[id]); if (!TAB.got.includes(TAB.cur)) TAB.cur = TAB.got.includes(OLD_EQ.tableau) ? OLD_EQ.tableau : TAB.got[0] || null;
function dailyPainting() { // renvoie le tableau gagné aujourd'hui, s'il est nouveau
  const tk = todayKey(); if (TAB.day === tk) return null; TAB.day = tk;
  const pool = Object.keys(GIFT.TAB).filter(id => !TAB.got.includes(id)), id = pool.length ? pickOne(pool) : null;
  if (id) { TAB.got.push(id); TAB.cur ||= id; } save(K_TAB, TAB); return id;
}
DAILY.got = (DAILY.got || []).filter(id => GIFT.byId[id]);
for (const c in DAILY.equipped) if (DAILY.equipped[c] && !DAILY.got.includes(DAILY.equipped[c])) DAILY.equipped[c] = null;
function syncDaily() {
  const tk = todayKey();
  if (DAILY.todayKey !== tk) {
    if (DAILY.lastActiveDay !== todayKey(-1) && DAILY.lastActiveDay !== tk) DAILY.streak = 0;
    Object.assign(DAILY, { todayKey: tk, todayGood: 0, todayRewardClaimed: false, kibbleEarnedToday: false }); save(K_DAILY, DAILY);
  }
  if (PET.dayKey !== tk) { PET.dayKey = tk; PET.dayCount = 0; save(K_PET, PET); }
}
const eqv = c => DAILY.equipped[c] ? GIFT.byId[DAILY.equipped[c]].v : null;
// ---------- Animaux ----------
const MAX_DAY = 20; // animaux gagnés par jour au maximum
const randomTarget = () => 5 + Math.floor(Math.random() * 26); // entre 5 et 30 bonnes réponses
let PET = { got: [], companion: null, targetGood: randomTarget(), goodSincePet: 0, dayKey: todayKey(), dayCount: 0, care: {}, ...load(K_PET, {}) };
PET.got = [...new Set(PET.got || [])].filter(id => ART.byId[id]); PET.rates = [...new Set(PET.rates || [])].filter(id => ANIMAL_BY_ID[id]); PET.care ||= {}; PET.fav ||= {}; PET.when ||= {};
PET.koCount ||= 0; PET.run ||= 0; PET.bad ||= 0; if (PET.targetGood > 30) PET.targetGood = randomTarget();
if (PET.companion && !PET.got.includes(PET.companion) && !PET.rates.includes(PET.companion)) PET.companion = null;
// accessoires du compagnon : un par niveau, un toutes les 10 bonnes réponses d'affilée
PET.gear = { got: [], eq: {}, lv: 0, ...(PET.gear || {}) }; PET.gear.got = PET.gear.got.filter(id => GEAR.byId[id]);
for (const id of OLD_GOT) if (GEAR.byId[id] && !PET.gear.got.includes(id)) PET.gear.got.push(id);
if (OLD_EQ.animal_gear && GEAR.byId[OLD_EQ.animal_gear]) { PET.gear.eq[GEAR.byId[OLD_EQ.animal_gear].s] = OLD_EQ.animal_gear; DAILY.equipped.animal_gear = null; }
for (const s in PET.gear.eq) if (!PET.gear.got.includes(PET.gear.eq[s])) delete PET.gear.eq[s];
function grantGear() { const pool = GEAR.list.filter(g => !PET.gear.got.includes(g.id)); if (!pool.length) return null; const g = pickOne(pool); PET.gear.got.push(g.id); PET.gear.eq[g.s] ||= g.id; return g.id; }
const KIB_LEVEL = 20, FEED_MAX = 5, KIB_EVERY = 5, KIB_DAY = 10; // 20 croquettes par niveau, 1 toutes les 5 bonnes réponses (10 par jour) ; un même animal en mange 5 par jour au plus
function syncLevel() { const L = level(xp()), out = []; if (PET.gear.lv < 1) PET.gear.lv = 1;
  if (!PET.kibLv) PET.kibLv = L; if (PET.kibLv < L) { DAILY.kibbles = (DAILY.kibbles || 0) + KIB_LEVEL * (L - PET.kibLv); PET.kibLv = L; save(K_DAILY, DAILY); save(K_PET, PET); }
  while (PET.gear.lv < L) { PET.gear.lv++; const id = grantGear(); if (id) out.push(id); } if (out.length) save(K_PET, PET); return out; }
const gearOn = () => Object.values(PET.gear.eq);
for (const id in PET.care) { const c = PET.care[id]; if (c.babyId) { c.babies = Math.max(1, c.babies || 0); delete c.babyId; } } // les bébés sont désormais de la race du parent
const petCare = id => (PET.care[id] ||= { happiness: 0, fedDays: 0, lastFedDay: null, babies: 0 });
const MAX_BABIES = 3, FEED_FOR_BABY = 5;
syncDaily(); save(K_PET, PET);
function goodAnswer() { // une bonne réponse : série, croquette, cadeau, animal
  syncDaily(); const out = {}, tk = todayKey();
  if (DAILY.lastActiveDay !== tk) { DAILY.streak = DAILY.lastActiveDay === todayKey(-1) ? (DAILY.streak || 0) + 1 : 1; DAILY.lastActiveDay = tk; }
  DAILY.todayGood = (DAILY.todayGood || 0) + 1;
  if (DAILY.todayGood % KIB_EVERY === 0 && DAILY.todayGood <= KIB_EVERY * KIB_DAY) { DAILY.kibbles = (DAILY.kibbles || 0) + 1; out.kibble = true; }
  if (DAILY.todayGood >= 5 && !DAILY.todayRewardClaimed) {
    DAILY.todayRewardClaimed = true; const pool = GIFT.REWARDS.filter(r => !DAILY.got.includes(r.id));
    if (pool.length) { const r = pickOne(pool); DAILY.got.push(r.id); DAILY.equipped[r.cat] ||= r.id; out.gift = r.id; }
  }
  PET.goodSincePet = (PET.goodSincePet || 0) + 1;
  if (PET.goodSincePet >= PET.targetGood && PET.dayCount < MAX_DAY) {
    const pool = ANIMALS.filter(a => !PET.got.includes(a.id));
    PET.goodSincePet = 0; PET.targetGood = randomTarget();
    if (pool.length) { const a = pickOne(pool); PET.got.push(a.id); PET.dayCount++; petCare(a.id); PET.companion ||= a.id; PET.when[a.id] = Date.now(); out.pet = a.id; }
  }
  PET.run++; PET.bad = 0; if (!NO_RUN && PET.run % 10 === 0) out.gear10 = grantGear();
  save(K_DAILY, DAILY); save(K_PET, PET); return out;
}
const PER_RATE = 15; // un animal « raté » toutes les 15 questions ratées
function badAnswer() {
  const out = {}; PET.koCount++; PET.run = 0; PET.bad++;
  if (PET.koCount % PER_RATE === 0) { const pool = RATES.filter(a => !PET.rates.includes(a.id)); if (pool.length) { const a = pickOne(pool); PET.rates.push(a.id); PET.when[a.id] = Date.now(); petCare(a.id); PET.companion ||= a.id; out.rate = a.id; } }
  save(K_PET, PET); return out;
}
const COURAGE = ["Je crois en toi !", "Courage !", "Ne baisse pas les bras, tu vas y arriver !"];
const kibToday = () => Math.min(KIB_DAY, Math.floor((DAILY.todayGood || 0) / KIB_EVERY));
function feed() {
  syncDaily(); const id = PET.companion; if (!id) return { msg: "Choisis d'abord un compagnon dans la ménagerie." };
  if (!(DAILY.kibbles > 0)) return { msg: kibToday() >= KIB_DAY ? "Plus de croquette : encore demain, et 20 au prochain niveau !" : `Plus de croquette : encore ${plural(KIB_EVERY - (DAILY.todayGood || 0) % KIB_EVERY, "bonne réponse", "bonnes réponses")} pour la prochaine.` };
  const c = petCare(id), tk = todayKey(); if (c.lastFedDay !== tk) c.fedToday = 0; else if (c.fedToday === undefined) c.fedToday = 1;
  if (c.fedToday >= FEED_MAX) return { msg: "Il a assez mangé pour aujourd'hui ! Tu peux nourrir un autre animal." };
  DAILY.kibbles--; c.lastFedDay = tk; c.fedToday++; c.fedDays = (c.fedDays || 0) + 1; c.happiness = Math.min(100, (c.happiness || 0) + 10); const grew = STAGES.find(s => s[0] === c.fedDays);
  let baby = false; if (c.fedDays % FEED_FOR_BABY === 0 && (c.babies || 0) < MAX_BABIES) { c.babies = (c.babies || 0) + 1; baby = true; }
  save(K_DAILY, DAILY); save(K_PET, PET);
  return { ok: true, baby, grew: !!grew, msg: baby ? `🍼 Un bébé ${ANIMAL_BY_ID[id].name.toLowerCase()} est né !${grew ? ` Et ton compagnon a grandi : ${grew[1]} !` : ""}` : grew ? `🎉 Il a grandi ! Le voilà ${grew[1]} !` : `Miam ! Bonheur : ${c.happiness} %` };
}
// taille : celle de l'espèce, puis 5 paliers de croissance selon les croquettes mangées ; les bébés grandissent avec celles de leur parent
const STAGES = [[0, "tout jeune", .78], [3, "petit", .92], [8, "adulte", 1.06], [15, "grand", 1.2], [25, "géant", 1.36]], BSTAGES = [[0, .78], [4, .95], [8, 1.15], [12, 1.35]];
const stageOf = n => { let k = 0; STAGES.forEach((s, i) => { if (n >= s[0]) k = i; }); return k; };
const petZ = a => Math.round(ART.size(a) * STAGES[stageOf((PET.care[a.id] || {}).fedDays || 0)][2] * 100) / 100;
const babyZ = (id, i) => { const since = Math.max(0, ((PET.care[id] || {}).fedDays || 0) - FEED_FOR_BABY * (i + 1)); return Math.round(ART.size(ANIMAL_BY_ID[id]) * BSTAGES.filter(s => since >= s[0]).pop()[1] * 100) / 100; };
const petSvg = (a, cls = "pet-svg", o = {}) => a ? ART.renderSvg(a, cls, { z: petZ(a), ...o }, a.id === PET.companion && !o.bare ? gearOn() : null, esc) : "";
const gearThumb = id => ART.renderSvg(ANIMAL_BY_ID[PET.companion] || ART.byId["chat-tigre-roux"], "thumb", {}, [id], esc);
const babiesSvg = (id, cls = "pet-svg baby") => Array.from({ length: (PET.care[id] || {}).babies || 0 }, (_, i) => petSvg(ANIMAL_BY_ID[id], cls, { isBaby: true, babyN: i, z: babyZ(id, i) })).join("");
function toast(html, kind = "") { document.querySelectorAll(".toast").forEach(x => x.remove()); const t = document.createElement("div"); t.className = "toast " + kind; t.setAttribute("role", "status"); t.innerHTML = html; document.body.appendChild(t); setTimeout(() => t.classList.add("out"), 2600); setTimeout(() => t.remove(), 3100); }

// le compagnon vient parler à l'écran
function petSays(text) {
  document.querySelectorAll(".petpop").forEach(x => x.remove()); const a = ANIMAL_BY_ID[PET.companion]; if (!text) return; if (!a) return toast(esc(text), "ok");
  const d = document.createElement("div"); d.className = "petpop"; d.setAttribute("role", "status"); d.innerHTML = `<div class="bubble">${esc(text)}</div>${petSvg(a, "pet-svg")}`; document.body.appendChild(d);
  setTimeout(() => d.classList.add("out"), 4200); setTimeout(() => d.remove(), 4800);
}
// images des tableaux : chargées quand elles arrivent à l'écran
const artIO = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { artIO.unobserve(e.target); loadArt(e.target); } }), { rootMargin: "200px" }) : null;
function loadArt(el) {
  const a = GIFT.TAB[el.dataset.art]; if (!a) return;
  loadPack(a.pack).then(() => { if (window.TABX && TABX[a.id]) el.src = TABX[a.id]; }).catch(() => { const s = GIFT.svgArt[a.id]; if (s) { const [w, h] = /width="160"/.test(s) ? [160, 120] : [120, 150]; el.src = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${s}</svg>`); } });
}
function hydrateArts(root = document) { root.querySelectorAll("img.artimg:not([src])").forEach(el => artIO ? artIO.observe(el) : loadArt(el)); }
function modal(html) { document.querySelector(".modal")?.remove(); const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}</div>`; m.addEventListener("click", e => { if (e.target === m) m.remove(); }); document.body.appendChild(m); hydrateArts(m); m.querySelector("button")?.focus(); }
const artCap = a => `<b>${esc(a.name)}</b><span class="small">${esc(a.by)}, ${GIFT.annee(a.y)}</span>`;
const artCredit = a => `<a class="small" target="_blank" rel="noopener" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(a.file)}">Wikimedia Commons · ${esc(a.lic)}${a.credit ? " · " + esc(a.credit) : ""}</a>`;
function showDaily() {
  const id = dailyPainting(); if (!id) return; const a = GIFT.TAB[id]; render();
  modal(`<h2>Ton tableau du jour</h2>${GIFT.painting(id, 220)}<p class="cap">${artCap(a)}</p><p class="small">${TAB.got.length}/${Object.keys(GIFT.TAB).length} œuvres dans ta collection</p><div class="actions center"><button class="primary" data-act="expose" data-id="${id}">L'exposer</button><button data-act="closeM">Plus tard</button></div>${artCredit(a)}`);
}

// ======================== Vues ========================
const persoSvg = (o = {}) => CORPS.svg({ worn: worn(), look: BODY.look, hair: eqv("coiffure") || "long", ...fabOpts(), ...o });
function lvBlock() {
  const X = xp(), L = level(X), lo = need(L), hi = need(L + 1);
  return `<span class="lvbadge">${L}</span><span class="t"><b>Niveau ${L} · ${esc(title(L))}</b>
    <span class="small">${X.toLocaleString("fr")} XP · encore ${(hi - X).toLocaleString("fr")} XP pour le niveau ${L + 1}</span>
    <span class="xpbar"><i style="width:${pct(X - lo, hi - lo)}%"></i></span></span>`;
}
const resumeBanner = () => SESSION && SESSION.pos < SESSION.ids.length ? `<a class="card resume" href="#/quiz"><span class="ri">▶</span><span class="t"><b>Reprendre ma série</b><span class="small">${esc(SESSION.label)} · question ${SESSION.pos + 1} / ${SESSION.ids.length}</span></span></a>` : "";
function dailyStrip() {
  syncDaily(); const left = Math.max(1, PET.targetGood - PET.goodSincePet), g = Math.min(5, DAILY.todayGood || 0);
  return `<div class="strip"><span class="chip fire">🔥 <b>${DAILY.streak || 0}</b> ${DAILY.streak > 1 ? "jours" : "jour"}</span>
    <span class="chip kib">${KIB} <b>${DAILY.kibbles || 0}</b> croquette${DAILY.kibbles > 1 ? "s" : ""}</span>
    <span class="chip paw">🐾 <b>${PET.got.length}</b>/${ANIMALS.length}</span><span class="chip xpc">💎 <b>${wallet().toLocaleString("fr")}</b> XP à dépenser</span></div>
    <div class="small daily">${DAILY.todayRewardClaimed ? "✔ Cadeau du jour gagné" : `Cadeau du jour : ${g}/5 bonnes réponses`} · ${PET.dayCount >= MAX_DAY ? `${MAX_DAY} animaux aujourd'hui, la suite demain !` : `prochain animal dans ${plural(left, "bonne réponse", "bonnes réponses")} (${PET.dayCount}/${MAX_DAY} aujourd'hui)`} · croquettes : ${kibToday()}/${KIB_DAY} aujourd'hui</div>`;
}
const KIB = `<svg viewBox="0 0 40 40" class="kib-ico" aria-hidden="true"><path d="M11 16a6 6 0 1 1 4-6h10a6 6 0 1 1 4 6v8a6 6 0 1 1-4 6H15a6 6 0 1 1-4-6z" fill="#d79a5b" stroke="#80501f" stroke-width="2.4" stroke-linejoin="round"/><circle cx="17" cy="18" r="1.7" fill="#80501f"/><circle cx="23" cy="22" r="1.7" fill="#80501f"/></svg>`;
function viewTab(tab) {
  const t = TABS.find(x => x.id === tab) || TABS[0], list = questionsOf(t.id), s = stats(list), len = SET.len;
  const msg = MSG; MSG = "";
  const comp = PET.companion ? ANIMAL_BY_ID[PET.companion] : null;
  const pool = k => { const n = k === "ok" ? s.ok : k === "ko" ? s.ko : s.todo; return `<button class="pool ${k}" data-act="start" data-tab="${t.id}" data-pool="${k}" ${n ? "" : "disabled"}><span class="n">${n}</span><span class="t"><b>${POOLS[k].label}</b><span class="small">${POOLS[k].hint}</span></span><span class="go" aria-hidden="true">›</span></button>`; };
  return `${t.id === "g" ? `<section class="card hero"><a class="heroart" href="#/corps" aria-label="Mon corps d'anat">${persoSvg({ vb: "84 -60 232 290", cls: "bust" })}</a><div class="herot"><a class="lvrow" href="#/corps">${lvBlock()}</a>${dailyStrip()}</div>${comp ? `<a class="heropet" href="#/menagerie" aria-label="${esc(comp.name)}">${petSvg(comp)}</a>` : ""}</section>` : ""}
  ${resumeBanner()}${msg ? `<div class="card small">${esc(msg)}</div>` : ""}
  <section class="card"><h2>${t.id === "g" ? "Toutes les structures" : t.label}</h2>
    <p class="big">${s.done} QCM sur ${s.total} réalisés, ${s.ok} réussis, ${s.ko} échoués</p>${progressBlock(s)}
    <div class="chips" role="group" aria-label="Région">${Object.entries(REG_LABEL).map(([k, v]) => `<button data-act="reg" data-reg="${k}" class="${SET.reg === k ? "on" : ""}">${v}</button>`).join("")}</div></section>
  <div class="pools">${pool("ko")}${pool("todo")}${pool("ok")}</div>
  <section class="card"><label for="len"><b>Nombre de QCM par série</b></label>
    <div class="range"><input id="len" type="range" min="5" max="100" step="5" value="${Math.min(len, 100)}" data-set="len"><output id="lenOut">${len >= 100 ? "Tous" : len}</output></div>
    <div class="small">Tout à droite = toutes les questions de la case choisie.</div></section>
  <a class="btn primary revbtn" href="#/rev/${t.id}">📖 Révision : cours${t.id === "nerf" ? " (et l'explorateur vertèbre → nerfs)" : t.id === "g" ? " de toutes les structures" : ""}</a>
  ${t.id === "g" ? `<section class="card"><h2>S'interroger par zone du corps</h2><div class="zgrid">${Object.keys(ZONES).map(z => { const st = zstat(z); return `<button class="zbtn" data-act="zoneQuiz" data-z="${z}"><span class="zth">${persoSvg({ view: z === "dos" ? "b" : "f", crop: z, worn: [], cls: "thumb" })}</span><b>${esc(ZONES[z])}</b><span class="zmini"><i style="width:${st.m * 100}%"></i></span></button>`; }).join("")}</div></section>` : ""}`;
}

// ---------- Jouer avec le compagnon : questions réussies, mais pas du premier coup ----------
const replayable = () => QS.filter(q => { const p = PROG[q.id]; return p && p.r && (p.f !== undefined ? !p.f : (p.n || 0) > (p.ok || 0)); });
function startPlay(list, label) {
  const a = ANIMAL_BY_ID[PET.companion]; if (!a || !list.length) return; let l = shuffle(list.map(q => q.id)); if (SET.len < 100) l = l.slice(0, SET.len);
  MOOD = null; document.querySelector(".modal")?.remove(); startSession("corps", "ok", l, label || `Jeu avec ${a.name}`); SESSION.play = a.id; saveSession();
}
function endPlay(S) { // fin de partie : bonheur, et une croquette une fois par jour si on a répondu à 5 questions
  if (!S || !S.play || S.paid || !ANIMAL_BY_ID[S.play]) return; S.paid = true; const c = petCare(S.play), tk = todayKey(), n = S.ok + S.ko; if (!n) return;
  c.happiness = Math.min(100, (c.happiness || 0) + 5); if (n >= 5 && DAILY.lastPlayDay !== tk) { DAILY.lastPlayDay = tk; DAILY.kibbles = (DAILY.kibbles || 0) + 1; S.playKib = true; } save(K_PET, PET); save(K_DAILY, DAILY);
}
// ---------- Série de QCM ----------
const saveSession = () => save(K_SESS, SESSION && SESSION.pos < SESSION.ids.length ? { ...SESSION, ev: null } : null);
function startSession(tab, pool, ids, label) {
  let list;
  if (ids) list = ids.map(id => BY_ID[id]).filter(Boolean);
  else { list = shuffle(questionsOf(tab).filter(q => status(q) === pool)); if (pool === "ko") list.sort((a, b) => (PROG[a.id]?.t || 0) - (PROG[b.id]?.t || 0)); }
  if (SET.len < 100 && !ids) list = list.slice(0, SET.len);
  if (!list.length) return toast("Aucune question ici pour le moment.");
  SESSION = { tab, pool, label: label || POOLS[pool].label, ids: list.map(q => q.id), pos: 0, answered: null, opts: null, ok: 0, ko: 0, streak: 0, badRun: 0, res: [] };
  saveSession();
  if (location.hash === "#/quiz") { render(); window.scrollTo(0, 0); } else location.hash = "#/quiz";
}
function viewQuiz() {
  const S = SESSION;
  if (!S) return `<div class="card">Aucune série en cours. <a href="#/g">Retour</a></div>`;
  const back = "#/" + (S.tab || "g");
  if (S.pos >= S.ids.length) {
    const tot = S.ok + S.ko, p = tot ? Math.round(S.ok / tot * 100) : 0, comp = ANIMAL_BY_ID[PET.companion];
    return `<section class="card bilan"><h2>${S.play ? "Partie terminée" : "Série terminée"}</h2>${comp ? petSvg(comp, "pet-svg lg") : ""}
      <p class="big">${S.ok} / ${tot} bonnes réponses${tot ? ` (${p} %)` : ""}</p>${tot ? progressBlock({ ok: S.ok, ko: S.ko, todo: 0, total: tot }) : ""}
      ${S.xp ? `<p class="big">✨ +${S.xp} XP gagnés</p>` : ""}${S.play && ANIMAL_BY_ID[S.play] && tot ? `<p>${esc(ANIMAL_BY_ID[S.play].name)} s'est bien amusé avec toi !${S.playKib ? ` ${KIB} +1 croquette` : ""}</p>` : ""}${S.won && S.won.length ? `<div class="wonrow">${S.won.map(w => w.t === "acc" ? `<span title="${esc(ACC_BY[w.id].name)}">${CORPS.thumb(ACC_BY[w.id])}</span>` : w.t === "gear" ? `<span title="${esc(GEAR.byId[w.id].name)}">${gearThumb(w.id)}</span>` : w.t === "pet" ? `<span>${petSvg(ANIMAL_BY_ID[w.id], "thumb", { bare: true })}</span>` : "").join("")}</div>` : ""}
      <div class="actions"><a class="btn primary" href="${back}">Retour</a>${S.ko ? `<button data-act="redoKo">Refaire mes erreurs (${S.ko})</button>` : ""}${/Android/i.test(navigator.userAgent) ? widgetBtn().replace("btn primary", "btn") : ""}</div></section>`;
  }
  const q = BY_ID[S.ids[S.pos]], f = D.fiches[q.s], ans = S.answered;
  if (!S.opts) {
    if (q.m) { const k = Math.min(q.m.length, 2 + Math.floor(Math.random() * 4)); S.opts = shuffle([...shuffle(q.m.slice()).slice(0, k), ...shuffle(q.d.slice()).slice(0, Math.max(2, 7 - k))]); S.sel = []; }
    else S.opts = shuffle([q.a, ...shuffle(q.d.slice()).slice(0, 3)]);
    saveSession();
  }
  const opts = S.opts.map((o, i) => {
    let cls = "";
    if (q.m) {
      const on = S.sel.includes(i), g = q.m.includes(o);
      if (ans != null) cls = g ? "good" : on ? "bad" : "dim"; else if (on) cls = "sel";
      const mark = ans != null ? (g && on ? "✔" : g ? "!" : on ? "✘" : "") : on ? "✔" : "";
      return `<button class="opt multi ${cls}" data-act="toggle" data-i="${i}" role="checkbox" aria-checked="${on}" ${ans != null ? "disabled" : ""}><span class="k">${mark}</span><span>${esc(cap(o))}${ans != null && g && !on ? " <i>(oubliée)</i>" : ""}</span></button>`;
    }
    if (ans != null) cls = o === q.a ? "good" : i === ans ? "bad" : "dim";
    return `<button class="opt ${cls}" data-act="answer" data-i="${i}" ${ans != null ? "disabled" : ""}><span class="k">${"ABCD"[i]}</span><span>${esc(cap(o))}</span></button>`;
  }).join("");
  let after = "";
  if (ans != null) {
    const good = S.good, ev = S.ev || {}, pet = ANIMAL_BY_ID[ev.pet], rate = ANIMAL_BY_ID[ev.rate], gift = GIFT.byId[ev.gift];
    const gar = gift ? gift.cat === "decor" ? GIFT.sceneThumb(gift.v) : `<span class="uth">${persoSvg({ hair: gift.v, worn: [], crop: "tete", cls: "thumb" })}</span>` : "";
    const gcard = (id, why) => `<a class="unlock" href="#/corps"><span class="uth">${gearThumb(id)}</span><span><b>Pour ton compagnon : ${esc(GEAR.byId[id].name)} !</b><span class="small">${why}</span></span></a>`;
    after = `<div class="verdict ${good ? "ok" : "ko"}">${good ? "✔ Bonne réponse" : "✘ Mauvaise réponse"}${S.gain ? `<span class="xp">+${S.gain} XP</span>` : ""}${PET.run >= 3 ? `<span class="streak">🔥 ${PET.run} d'affilée</span>` : ""}</div>
      ${(ev.fresh || []).map(id => ACC_BY[id]).map(a => `<a class="unlock" href="#/zone/${a.z}"><span class="uth">${CORPS.thumb(a, { look: BODY.look })}</span><span><b>Accessoire : ${esc(a.name)} !</b><span class="small">${esc(ZONES[a.z])} · ${zstat(a.z).p} % réussis · Voir ›</span></span></a>`).join("")}
      ${pet ? `<a class="unlock" href="#/menagerie">${petSvg(pet, "pet-svg mini", { bare: true })}<span><b>Nouvel animal : ${esc(pet.name)} !</b><span class="small">${esc(pet.species)} · ${PET.got.length}/${ANIMALS.length}</span></span></a>` : ""}
      ${rate ? `<a class="unlock" href="#/menagerie">${petSvg(rate, "pet-svg mini", { bare: true })}<span><b>Surprise : ${esc(rate.name)} !</b><span class="small">Un animal un peu raté, mais plein de charme</span></span></a>` : ""}
      ${ev.gear10 ? gcard(ev.gear10, "10 bonnes réponses d'affilée") : ""}${(ev.gearLv || []).map(id => gcard(id, "Cadeau de niveau")).join("")}
      ${ev.kibble ? `<a class="unlock" href="#/corps">${KIB}<span><b>+1 croquette !</b><span class="small">À donner à ton compagnon</span></span></a>` : ""}
      ${gift ? `<a class="unlock" href="#/corps">${gar}<span><b>Cadeau surprise : ${esc(gift.name)} !</b><span class="small">${esc(GIFT.CATS[gift.cat])}</span></span></a>` : ""}
      ${S.lvUp ? `<a class="unlock" href="#/corps"><span class="lvbadge">${S.lvUp}</span><span><b>Niveau ${S.lvUp} !</b><span class="small">${esc(title(S.lvUp))} · +${KIB_LEVEL} croquettes</span></span></a>` : ""}
      ${good ? "" : `<div class="expl"><b>Réponse attendue :</b> ${esc(cap(q.m ? S.opts.filter(o => q.m.includes(o)).join(" ; ") : q.a))}</div>`}
      ${q.m && q.m.length > S.opts.filter(o => q.m.includes(o)).length ? `<div class="expl"><b>Liste complète du cours :</b> ${esc(q.a)}</div>` : ""}
      ${q.x ? `<div class="expl">${esc(q.x)}</div>` : ""}<div class="small src">📄 Source : ${esc(srcText(q.src))}</div>
      ${f ? `<details><summary>Fiche complète : ${esc(cap(q.s))}</summary>${trajets(q.s)}${ficheList(f)}${palpaBlocks(f)}${f.imgs && f.imgs.length ? `<details><summary>📑 Photos du cours (${f.imgs.length})</summary><div class="pics big">${imgTags(f.imgs)}</div></details>` : ""}</details>` : ""}
      <div class="actions sticky"><button class="primary grow" data-act="next" id="nextBtn">${S.pos + 1 < S.ids.length ? "Question suivante →" : "Voir le bilan"}</button></div>`;
  }
  const done = S.ok + S.ko, n = S.ids.length;
  return `<div class="qbar"><button class="quit" data-act="stop" aria-label="Quitter la série">✕ Quitter</button>
      <div class="qprog" role="img" aria-label="Question ${S.pos + 1} sur ${n}"><div class="g" style="width:${pct(S.ok, n)}%"></div><div class="r" style="width:${pct(S.ko, n)}%"></div></div><span class="small qn">${S.pos + 1} / ${n}</span></div>
    <div class="qmeta small"><span class="qlab">${S.play && ANIMAL_BY_ID[S.play] ? `<span class="playpet ${ans != null && S.good ? "happy" : ""}">${petSvg(ANIMAL_BY_ID[S.play], "pet-svg", ans != null && S.good ? { mood: "happy" } : {})}</span>` : ""}${esc(S.label)}</span><span><b class="cok">✔ ${S.ok}</b> &nbsp;<b class="cko">✘ ${S.ko}</b></span></div>
    <section class="card qcard"><div class="qtop"><span class="tag">${CAT_LABEL[q.c]}${norm(q.a) === norm(q.s) && ans == null ? "" : " · " + esc(cap(q.s))}</span><button class="flag ${FLAGS[q.id] ? "on" : ""}" data-act="flag">🚩 ${FLAGS[q.id] ? "Signalée" : "Signaler"}</button></div>
      <div class="qtext">${esc(q.q)}</div>${q.img ? `<div class="pics">${imgTags(q.img)}</div>` : ""}
      ${q.m ? `<div class="small multi-hint">Plusieurs bonnes réponses : coche-les toutes, puis valide.</div>` : ""}
      <div class="opts">${opts}</div>
      ${q.m && ans == null ? `<div class="actions sticky"><button class="primary grow" data-act="valid" id="nextBtn" ${S.sel.length ? "" : "disabled"}>Valider (${S.sel.length})</button></div>` : ""}${after}</section>`;
}
function answer(i) {
  const S = SESSION; if (!S || S.answered != null) return;
  const q = BY_ID[S.ids[S.pos]]; S.answered = i;
  const good = S.good = q.m ? S.opts.every((o, j) => q.m.includes(o) === S.sel.includes(j)) : S.opts[i] === q.a;
  const lv0 = level(xp()), again = !!PROG[q.id]?.r, p = PROG[q.id] || { n: 0, ok: 0 };
  if (!p.n) p.f = good ? 1 : 0; p.n = (p.n || 0) + 1; p.ok = (p.ok || 0) + (good ? 1 : 0); p.r = good ? 1 : 0; p.t = Date.now(); PROG[q.id] = p; save(K_PROG, PROG); markSeen();
  if (good && again) { WARD.spent = (WARD.spent || 0) + 5; save(K_WARD, WARD); } // question déjà maîtrisée : 5 XP à dépenser au lieu de 10
  S.ev = good ? goodAnswer() : badAnswer(); S.ev.fresh = syncUnlocks().map(a => a.id);
  S.say = ""; if (good && PET.run % 10 === 0) S.say = S.ev.gear10 ? `Bravo ! ${PET.run} d'affilée, et regarde ce que j'ai gagné !` : `Bravo ! ${PET.run} d'affilée !`; else if (good && PET.run % 5 === 0) S.say = "Bravo !"; else if (!good && PET.bad > 7) S.say = COURAGE[PET.bad % COURAGE.length];
  S.gain = (good ? 10 : 0) + S.ev.fresh.length * 25; S.xp = (S.xp || 0) + S.gain;
  const lv1 = level(xp()); S.lvUp = lv1 > lv0 ? lv1 : 0; S.ev.gearLv = syncLevel();
  S.won ||= []; S.ev.fresh.forEach(id => S.won.push({ t: "acc", id })); for (const id of [S.ev.pet, S.ev.rate]) if (id) S.won.push({ t: "pet", id }); for (const id of [S.ev.gear10, ...S.ev.gearLv]) if (id) S.won.push({ t: "gear", id });
  if (good && S.play && ANIMAL_BY_ID[S.play]) { const c = petCare(S.play); c.happiness = Math.min(100, (c.happiness || 0) + 2); save(K_PET, PET); }
  if (good) S.ok++; else { S.ko++; (S.wrong ||= []).push(q.id); }
  saveSession(); render(); petSays(S.say);
}

// ---------- Mon corps d'anat ----------
let ZOPEN = null, TAB2 = "coiffure";
function zonePanel(z) {
  const s = zstat(z), left = s.total - s.ok, got = gotIn(z), n = got.length;
  const nextMiss = Math.max(1, Math.ceil((n + 1) * s.total / STEPS - 1e-9) - s.ok);
  const cards = got.map(a => `<button class="acc ${isEq(a) ? "on" : ""}" data-act="equip" data-id="${a.id}" aria-pressed="${isEq(a)}"><span class="ath">${CORPS.thumb(a, { look: BODY.look, hair: eqv("coiffure") || "long" })}</span><b>${esc(a.name)}</b><span class="st">${isEq(a) ? "✔ Porté" : "Mettre"}</span></button>`).join("")
    + Array.from({ length: STEPS - n }, (_, i) => `<div class="acc lock ${i ? "" : "next"}"><span class="ath">${LOCK}</span><b>${(n + i + 1) * 5} %</b><span class="st">${i ? "Surprise" : `encore ${nextMiss}`}</span></div>`).join("");
  const pools = [["ko", s.ko], ["todo", s.todo], ["ok", s.ok]];
  return `<div class="zpanel"><div class="ztop"><div class="zprev">${persoSvg({ view: z === "dos" ? "b" : "f", crop: z, cls: "thumb", tint: BODY.tint, col: zcol })}</div>
    <div class="zinfo"><p class="big">${s.ok} QCM réussis sur ${s.total} (${s.p} %)</p>${progressBlock(s)}
      <button class="primary" data-act="zoneQuiz" data-z="${z}" ${left ? "" : "disabled"}>${left ? `M'interroger sur cette zone (${left} à réussir)` : "Zone maîtrisée à 100 % 👑"}</button>
      <div class="chips">${pools.map(([k, c]) => `<button data-act="zonePool" data-z="${z}" data-pool="${k}" ${c ? "" : "disabled"}>${k === "ko" ? "Échecs" : k === "todo" ? "Pas encore" : "Déjà eu bon"} (${c})</button>`).join("")}</div></div></div>
    <div class="accttl"><b>Accessoires : ${n}/${STEPS}</b><span class="small">un au hasard tous les 5 %${n < STEPS ? ` · prochain dans ${plural(nextMiss, "bonne réponse", "bonnes réponses")}` : ""}</span></div>
    <div class="accgrid">${cards}</div></div>`;
}
const LOCK = `<svg viewBox="0 0 60 60" class="lockico" aria-hidden="true"><path d="M20 28v-8a10 10 0 0 1 20 0v8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><rect x="13" y="27" width="34" height="26" rx="8" fill="currentColor"/><circle cx="30" cy="38" r="4" fill="var(--card)"/><path d="M30 40v6" stroke="var(--card)" stroke-width="4" stroke-linecap="round"/></svg>`;
function giftPanel() {
  const cats = Object.entries(GIFT.CATS), list = GIFT.REWARDS.filter(r => r.cat === TAB2 && DAILY.got.includes(r.id)), cur = DAILY.equipped[TAB2];
  const prev = r => r.cat === "decor" ? GIFT.sceneThumb(r.v) : persoSvg({ hair: r.v, worn: [], crop: "tete", cls: "thumb" });
  return `<section class="card"><h2>Coiffures et décors</h2><p class="small">Un offert au hasard chaque jour dès 5 bonnes réponses, ou à acheter tout de suite. ${DAILY.got.length}/${GIFT.REWARDS.length} obtenus · 💎 ${wallet().toLocaleString("fr")} XP à dépenser</p>
    <div class="chips">${cats.map(([k, l]) => `<button data-act="gtab" data-k="${k}" class="${TAB2 === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="accgrid gifts"><button class="acc ${cur ? "" : "on"}" data-act="gift" data-id=""><span class="ath">${TAB2 === "coiffure" ? persoSvg({ hair: "long", worn: [], crop: "tete", cls: "thumb" }) : GIFT.sceneThumb("none")}</span><b>${TAB2 === "coiffure" ? "Cheveux longs" : "Décor simple"}</b><span class="st">${cur ? "Choisir" : "✔ Choisi"}</span></button>
    ${list.map(r => `<button class="acc ${cur === r.id ? "on" : ""}" data-act="gift" data-id="${r.id}"><span class="ath">${prev(r)}</span><b>${esc(r.name)}</b><span class="st">${cur === r.id ? "✔ Choisi" : "Choisir"}</span></button>`).join("")}
    ${GIFT.REWARDS.filter(r => r.cat === TAB2 && !DAILY.got.includes(r.id)).map(r => `<button class="acc" data-act="giftBuy" data-id="${r.id}"><span class="ath">${prev(r)}</span><b>${esc(r.name)}</b><span class="st ${wallet() < r.price ? "poor" : ""}">${r.price} XP</span></button>`).join("")}</div></section>`;
}
// ---------- Garde-robe : boutique et essayage ----------
let WTAB = "top";
const itemOn = i => FABCATS.includes(i.cat) ? WARD.fab[i.cat] === i.id : WARD.eq[i.s] === i.id;
function useItem(i, on = !itemOn(i)) { if (FABCATS.includes(i.cat)) { if (on) WARD.fab[i.cat] = i.id; else delete WARD.fab[i.cat]; save(K_WARD, WARD); } else wear(i, on); }
function tryOn(i, o = {}) { // le personnage portant cet article
  const fab = { ...WARD.fab }, base = { look: BODY.look, hair: eqv("coiffure") || "long", crop: "thorax", vb: SHOP.vb(i), cls: "thumb", label: i.name, worn: [], ...o };
  if (FABCATS.includes(i.cat)) fab[i.cat] = i.id; else base.worn = [i]; return CORPS.svg({ ...base, ...fabOpts(fab) });
}
function shopPanel() {
  const L = level(xp()), W = wallet(), list = SHOP.items.filter(i => i.cat === WTAB), own = list.filter(i => WARD.got.includes(i.id)).length, free = FABCATS.includes(WTAB);
  const card = i => { const got = WARD.got.includes(i.id), on = got && itemOn(i), lock = !got && L < i.lvl; return `<button class="acc ${on ? "on" : ""} ${lock ? "tooLow" : ""}" data-act="wItem" data-id="${i.id}" ${lock ? "disabled" : ""}><span class="ath">${tryOn(i)}</span><b>${esc(i.name)}</b><span class="st ${!got && !lock && W < i.price ? "poor" : ""}">${on ? "✔ Porté" : got ? "Mettre" : lock ? `Niveau ${i.lvl}` : `${i.price} XP`}</span></button>`; };
  return `<section class="card" id="shop"><h2>Ma garde-robe</h2><p class="wal">💎 <b>${W.toLocaleString("fr")} XP</b> à dépenser</p><p class="small">Une bonne réponse rapporte 10 XP à dépenser (5 si la question était déjà réussie), un accessoire 25. Acheter ne fait jamais baisser ton niveau. ${WARD.got.length}/${SHOP.items.length} articles.</p>
    <div class="chips">${Object.entries(SHOP.CATS).map(([k, [l]]) => `<button data-act="wTab" data-k="${k}" class="${WTAB === k ? "on" : ""}">${l}</button>`).join("")}</div><p class="small">${own}/${list.length} dans cette catégorie</p>
    <div class="accgrid">${free ? `<button class="acc ${WARD.fab[WTAB] ? "" : "on"}" data-act="wFree"><span class="ath">${CORPS.svg({ look: BODY.look, hair: eqv("coiffure") || "long", crop: "thorax", vb: SHOP.vb(list[0]), cls: "thumb", worn: [], ...fabOpts({ ...WARD.fab, [WTAB]: null }) })}</span><b>${WTAB[0] === "d" ? "Sans dessin" : "Couleur de base"}</b><span class="st">${WARD.fab[WTAB] ? "Mettre" : "✔ Porté"}</span></button>` : ""}${list.slice().sort((a, b) => WARD.got.includes(b.id) - WARD.got.includes(a.id) || a.lvl - b.lvl || a.price - b.price).map(card).join("")}</div></section>`;
}
function buyModal(i) {
  const W = wallet(), can = W >= i.price, miss = i.price - W;
  const wornTry = FABCATS.includes(i.cat) ? worn().filter(w => !(i.cat.endsWith("top") ? ["haut", "robe", "gilet", "broche"] : ["bas", "robe", "ceinture-b"]).includes(w.s)) : [...worn().filter(w => !clash(i.s).includes(w.s) && !(i.cat === "robe" && w.s === "gilet")), i];
  modal(`<h2>${esc(i.name)}</h2><div class="tryon">${CORPS.svg({ look: BODY.look, hair: eqv("coiffure") || "long", worn: wornTry, vb: "40 -62 320 700", cls: "thumb", ...fabOpts(FABCATS.includes(i.cat) ? { ...WARD.fab, [i.cat]: i.id } : WARD.fab) })}</div><p class="big">${i.price} XP</p><p class="small">${can ? `Il te restera ${(W - i.price).toLocaleString("fr")} XP à dépenser. Ton niveau ne change pas.` : `Il te manque ${miss.toLocaleString("fr")} XP, soit environ ${plural(Math.ceil(miss / 10), "bonne réponse", "bonnes réponses")}.`}</p><div class="actions center">${can ? `<button class="primary" data-act="wBuy" data-id="${i.id}">Acheter</button>` : ""}<button data-act="closeM">${can ? "Pas maintenant" : "Fermer"}</button></div>`);
}
// ---------- Accessoires du compagnon ----------
let GTAB = "tete";
function gearPanel() {
  const n = s => PET.gear.got.filter(id => GEAR.byId[id].s === s).length, t = s => GEAR.list.filter(g => g.s === s).length;
  const list = PET.gear.got.map(id => GEAR.byId[id]).filter(g => g.s === GTAB), cur = PET.gear.eq[GTAB], L = level(xp());
  return `<section class="card" id="gear"><h2>Accessoires du compagnon</h2><p class="small">${PET.gear.got.length}/${GEAR.list.length} trouvés. Un à chaque niveau (prochain au niveau ${L + 1}) et un toutes les 10 bonnes réponses d'affilée (${PET.run % 10}/10).</p>
    <div class="chips">${Object.entries(GEAR.SLOTS).map(([k, l]) => `<button data-act="gearTab" data-k="${k}" class="${GTAB === k ? "on" : ""}">${l} <span class="small">${n(k)}/${t(k)}</span></button>`).join("")}</div>
    <div class="accgrid">${list.map(g => `<button class="acc ${cur === g.id ? "on" : ""}" data-act="gearEq" data-id="${g.id}" aria-pressed="${cur === g.id}"><span class="ath">${gearThumb(g.id)}</span><b>${esc(g.name)}</b><span class="st">${cur === g.id ? "✔ Porté" : "Mettre"}</span></button>`).join("")}
    ${Array.from({ length: Math.min(6, t(GTAB) - list.length) }, () => `<div class="acc lock"><span class="ath">${LOCK}</span><b>Surprise</b></div>`).join("")}</div>
    ${gearOn().length ? `<div class="actions"><button class="sm" data-act="gearOff">Tout retirer</button><button class="sm" data-act="gearRnd">Tenue au hasard</button></div>` : PET.gear.got.length ? `<div class="actions"><button class="sm" data-act="gearRnd">Tenue au hasard</button></div>` : ""}</section>`;
}
// ---------- Galerie de tableaux ----------
let GALOPEN = false;
function galleryPanel() {
  const all = Object.keys(GIFT.TAB).length;
  return `<details class="card gal" id="gal" ${GALOPEN ? "open" : ""}><summary>Mes tableaux (${TAB.got.length}/${all})</summary><p class="small">Un nouveau tableau chaque jour où tu ouvres l'application. Touche celui que tu veux exposer.</p>
    <div class="galgrid">${TAB.got.slice().reverse().map(id => GIFT.TAB[id]).map(a => `<button class="galitem ${TAB.cur === a.id ? "on" : ""}" data-act="expose" data-id="${a.id}">${GIFT.painting(a.id, 104)}${artCap(a)}${TAB.cur === a.id ? `<span class="st">✔ Exposé</span>` : ""}</button>`).join("")}</div>
    ${TAB.got.length ? `<details><summary class="small">Crédits des images</summary><ul class="facts">${TAB.got.map(id => GIFT.TAB[id]).map(a => `<li><b>${esc(a.name)}</b>${artCredit(a)}</li>`).join("")}</ul></details>` : ""}</details>`;
}
let MOOD = null;
function viewCorps() {
  syncUnlocks(); syncDaily();
  const v = BODY.view === "b" ? "b" : "f", comp = ANIMAL_BY_ID[PET.companion], c = comp ? petCare(comp.id) : null, art = GIFT.TAB[TAB.cur];
  const fed = c ? (c.fedDays || 0) % FEED_FOR_BABY : 0, full = c && (c.babies || 0) >= MAX_BABIES, stg = c ? stageOf(c.fedDays || 0) : 0;
  const look = (k, l) => `<div class="lookrow"><span>${l}</span>${CORPS.LOOKS[k].map(x => `<button class="sw ${BODY.look[k] === x ? "on" : ""}" style="background:${x}" data-act="look" data-k="${k}" data-v="${x}" aria-label="${l} ${x}"></button>`).join("")}</div>`;
  return `${resumeBanner()}<div class="duo"><section class="card serie"><span>Série quotidienne</span><b>🔥 ${DAILY.streak || 0} ${DAILY.streak > 1 ? "JOURS" : "JOUR"}</b></section>
    <section class="cadre">${art ? `<button class="nav" data-act="artNav" data-d="-1" aria-label="Tableau précédent" ${TAB.got.length > 1 ? "" : "disabled"}>‹</button><button class="cadrein" data-act="galOpen" aria-label="Changer de tableau"><img class="artimg" data-art="${art.id}" alt="${esc(art.name)}"><span><b>${esc(art.name)}</b><span class="small">${esc(art.by)}</span></span></button><button class="nav" data-act="artNav" data-d="1" aria-label="Tableau suivant" ${TAB.got.length > 1 ? "" : "disabled"}>›</button>` : `<span class="small">Ton premier tableau arrive demain</span>`}</section></div>
  <section class="card"><div class="lvrow">${lvBlock()}</div>${dailyStrip()}</section>
  <section class="card stagecard"><div class="subtabs">${[["f", "Face"], ["b", "Dos"]].map(([k, l]) => `<button data-act="bview" data-v="${k}" class="${v === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="stage">${persoSvg({ view: v, behind: GIFT.scene(eqv("decor") || "none"), tint: BODY.tint, col: zcol, click: true, names: ZONES, sel: ZOPEN, vb: "-40 -62 480 716" })}
      ${art ? `<div class="hang">${GIFT.painting(art.id, 74)}</div>` : ""}
      ${comp ? `<div class="stagepet">${petSvg(comp, "pet-svg", MOOD ? { mood: MOOD } : {})}${babiesSvg(comp.id)}</div>` : ""}</div>
    <div class="actions center"><button class="sm" data-act="tint">${BODY.tint ? "Masquer les couleurs" : "Voir les couleurs"}</button><button class="sm" data-act="rnd" ${BODY.got.length + WARD.got.length ? "" : "disabled"}>Tenue au hasard</button><button class="sm" data-act="off" ${worn().length ? "" : "disabled"}>Tout retirer</button></div>
    <div class="legend center"><span><i style="background:${BODY.look.skin}"></i>à travailler</span><span><i style="background:hsl(262 78% 74%)"></i>début</span><span><i style="background:hsl(201 78% 67%)"></i>moitié</span><span><i style="background:hsl(140 78% 60%)"></i>presque</span><span><i style="background:#fbc93d"></i>100 %</span></div>
    <p class="small center">Touche une zone pour voir ta progression et l'habiller · ${BODY.got.length}/${ACC.length} accessoires</p></section>
  <section class="card"><h2>Mon compagnon d'étude</h2>${comp ? `<div class="petcard"><div class="petbig">${petSvg(comp, "pet-svg lg", MOOD ? { mood: MOOD } : {})}${babiesSvg(comp.id, "pet-svg baby")}</div><div class="petinfo"><b>${esc(comp.name)}</b><span class="small">${esc(comp.species)}${c.babies ? ` · ${plural(c.babies, "bébé", "bébés")}` : ""}</span>
      <span class="joyrow">${FACE(c.happiness || 0)}<span class="xpbar joy"><i style="width:${c.happiness || 0}%"></i></span></span><span class="small">Bonheur : ${c.happiness || 0} %</span>
      <span class="stages" aria-label="Taille : ${STAGES[stg][1]}">${STAGES.map((s, k) => `<i class="${k <= stg ? "on" : ""}"></i>`).join("")}</span><span class="small">Taille : <b>${STAGES[stg][1]}</b>${stg < STAGES.length - 1 ? ` · ${plural(STAGES[stg + 1][0] - (c.fedDays || 0), "croquette")} avant de devenir ${STAGES[stg + 1][1]}` : " · il a fini de grandir !"}</span>
      <div class="kibrow" aria-label="${fed} croquettes sur ${FEED_FOR_BABY}">${full ? `<span class="small">Famille au complet ! 💕</span>` : Array.from({ length: FEED_FOR_BABY }, (_, i) => `<span class="${i < fed ? "" : "off"}">${KIB}</span>`).join("") + `<span class="small">${FEED_FOR_BABY - fed} avant un bébé</span>`}</div>
      <div class="petacts"><button data-act="feedPet" title="Donner une croquette">${ICO.bowl}<span>Nourrir (${DAILY.kibbles || 0})</span></button><button data-act="playPet" title="Jouer">${ICO.play}<span>Jouer (${replayable().length})</span></button><button data-act="sleepPet" title="Dormir">${ICO.bed}<span>${MOOD === "sleep" ? "Réveiller" : "Dormir"}</span></button><a href="#/menagerie" title="Changer de compagnon">${ICO.swap}<span>Changer</span></a></div></div></div>` : `<p class="small">${PET.got.length ? "Tu n'as pas encore choisi de compagnon." : "Tu gagneras ton premier animal en répondant aux QCM."}</p><a class="btn primary" href="#/menagerie">Ouvrir la ménagerie</a>`}</section>
  <section class="card"><h2>Progression détaillée des zones</h2><div class="zones">${Object.keys(ZONES).map(z => { const s = zstat(z), open = ZOPEN === z; return `<div class="zitem ${open ? "open" : ""}" id="z-${z}"><button class="zhead" data-act="zone" data-z="${z}" data-from="list" aria-expanded="${open}"><span class="zn">${esc(ZONES[z])}</span><span class="zbar"><i style="width:${s.m * 100}%;background:${s.m >= 1 ? "var(--gold)" : zcol(z) || "transparent"}"></i></span><span class="zp">${s.p} %</span><span class="small zc">${gotIn(z).length}/20</span><span class="chev" aria-hidden="true">▾</span></button>${open ? zonePanel(z) : ""}</div>`; }).join("")}</div></section>
  ${shopPanel()}${gearPanel()}${galleryPanel()}${giftPanel()}
  <section class="card"><h2>Mon personnage</h2>${look("skin", "Peau")}${look("hair", "Cheveux")}${look("eyes", "Yeux")}${look("base", "Couleur de base")}</section>`;
}

const FACE = h => `<svg viewBox="0 0 40 40" class="face" aria-hidden="true"><path d="M6 18 4 4l12 6h8l12-6-2 14a15 15 0 1 1-28 0z" fill="#8fd6b0" stroke="#2f7a56" stroke-width="2.4" stroke-linejoin="round"/><circle cx="14" cy="22" r="2.200" fill="#1f4a38"/><circle cx="26" cy="22" r="2.200" fill="#1f4a38"/><path d="${h >= 40 ? "M15 28q5 5 10 0" : h >= 15 ? "M15 29h10" : "M15 31q5-4 10 0"}" fill="none" stroke="#1f4a38" stroke-width="2.400" stroke-linecap="round"/></svg>`;
const ICO = { bowl: `<svg viewBox="0 0 32 32"><path d="M9 7q-2-3 0-5M16 7q-2-3 0-5M23 7q-2-3 0-5" stroke="#c98a4c"/><ellipse cx="16" cy="15" rx="10" ry="4" fill="#b5743c" stroke="#6b3f1a"/><path d="M4 15h24l-3 11q-.5 2-3 2H10q-2.500 0-3-2z" fill="#ef7f6b" stroke="#8f3524"/></svg>`, play: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#5fc4a0" stroke="#1f6b52"/><path d="M13 10.500v11l9-5.500z" fill="#fff" stroke="#fff"/></svg>`, bed: `<svg viewBox="0 0 32 32"><path d="M3 8v19M3 22h26v5M29 22v-3q0-4-5-4H11v7" fill="#9fc4f0" stroke="#2f5a94"/><circle cx="7.500" cy="17" r="2.600" fill="#ffd9a5" stroke="#2f5a94"/><path d="M19 4h5l-5 6h5" stroke="#6f7fd0"/></svg>`, swap: `<svg viewBox="0 0 32 32"><path d="M6 12h18l-5-6M26 20H8l5 6" stroke="#7a5cd6"/></svg>` };
// ---------- Ménagerie ----------
let MF = { sp: "", q: "", f: "all", sort: "recent", n: 60 };
const ownedIds = () => [...PET.got, ...PET.rates];
function menagerieList() {
  const qn = norm(MF.q), own = ownedIds(), idx = new Map(own.map((id, i) => [id, i])), nb = a => (PET.care[a.id] || {}).babies || 0, hap = a => (PET.care[a.id] || {}).happiness || 0;
  const L = own.map(id => ANIMAL_BY_ID[id]).filter(a => a && (!MF.sp || a.species === MF.sp) && (!qn || norm(a.name).includes(qn)) && (MF.f === "all" || MF.f === "ok" && !a.rate || MF.f === "rate" && a.rate || MF.f === "fav" && PET.fav[a.id] || MF.f === "baby" && nb(a)));
  const S = { recent: (a, b) => (PET.when[b.id] || 0) - (PET.when[a.id] || 0) || idx.get(b.id) - idx.get(a.id), old: (a, b) => (PET.when[a.id] || 0) - (PET.when[b.id] || 0) || idx.get(a.id) - idx.get(b.id), name: (a, b) => a.name.localeCompare(b.name, "fr"), species: (a, b) => a.species.localeCompare(b.species, "fr") || a.name.localeCompare(b.name, "fr"), joy: (a, b) => hap(b) - hap(a) || nb(b) - nb(a), fam: (a, b) => nb(b) - nb(a) || a.name.localeCompare(b.name, "fr") };
  L.sort((a, b) => (b.id === PET.companion) - (a.id === PET.companion) || S[MF.sort](a, b)); return L;
}
function menagerieCards() {
  const L = menagerieList();
  return (L.slice(0, MF.n).map(a => { const on = PET.companion === a.id, nb = (PET.care[a.id] || {}).babies || 0;
    return `<div class="mcard ${on ? "comp" : ""}"><button class="fav ${PET.fav[a.id] ? "on" : ""}" data-act="fav" data-id="${a.id}" aria-label="Favori" aria-pressed="${!!PET.fav[a.id]}">${PET.fav[a.id] ? "♥" : "♡"}</button>${a.rate ? `<span class="rtag">raté</span>` : ""}<div class="top">${petSvg(a)}${babiesSvg(a.id)}</div><b>${esc(a.name)}</b><span class="small">${esc(a.species)}${nb ? ` · ${plural(nb, "bébé", "bébés")}` : ""}</span><button class="sm ${on ? "primary" : ""}" data-act="setComp" data-id="${a.id}">${on ? "⭐ Compagnon" : "Choisir"}</button></div>`; }).join("") || `<p class="small">Aucun animal ici pour l'instant.</p>`) + (L.length > MF.n ? `<button class="more" data-act="mMore">Voir plus (${L.length - MF.n})</button>` : "");
}
function viewMenagerie() {
  syncDaily(); const n = PET.got.length, by = {}; ANIMALS.forEach(a => { (by[a.species] ||= [0, 0])[1]++; if (PET.got.includes(a.id)) by[a.species][0]++; });
  const own = ownedIds(), spOwn = new Set(own.map(id => ANIMAL_BY_ID[id].species)), babies = Object.values(PET.care).reduce((t, c) => t + (c.babies || 0), 0), left = Math.max(1, PET.targetGood - PET.goodSincePet);
  if (!own.length) return `<section class="card empty"><h2>Ma ménagerie</h2><p>${ANIMALS.length} animaux t'attendent !</p><p class="small">Ton premier arrive dans ${plural(left, "bonne réponse", "bonnes réponses")}. Tu peux en gagner jusqu'à ${MAX_DAY} par jour.</p><a class="btn primary" href="#/g">Commencer une série</a></section>`;
  const F = [["all", `Tous (${own.length})`], ...(PET.rates.length ? [["ok", "Classiques"], ["rate", "Ratés"]] : []), ["fav", `Favoris (${Object.values(PET.fav).filter(Boolean).length})`], ["baby", "Avec bébés"]];
  const SO = [["recent", "Plus récents"], ["old", "Plus anciens"], ["name", "Nom (A à Z)"], ["species", "Espèce"], ["joy", "Bonheur"], ["fam", "Nombre de bébés"]];
  return `<section class="card"><h2>Ma ménagerie</h2><p class="big">${n} / ${ANIMALS.length} animaux${babies ? ` · ${plural(babies, "bébé", "bébés")}` : ""}</p><div class="xpbar"><i style="width:${pct(n, ANIMALS.length)}%"></i></div>
    <p class="small">${PET.dayCount >= MAX_DAY ? `${MAX_DAY} animaux gagnés aujourd'hui : la suite demain !` : `Prochain animal dans ${plural(left, "bonne réponse", "bonnes réponses")} (${PET.dayCount}/${MAX_DAY} aujourd'hui).`}</p>
    <div class="chips">${F.map(([k, l]) => `<button data-act="mF" data-k="${k}" class="${MF.f === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="mfilter"><input type="search" id="msearch" placeholder="Rechercher un animal…" value="${esc(MF.q)}"><select id="msp" aria-label="Espèce"><option value="">Toutes les espèces</option>${Object.entries(by).map(([s, [g, t]]) => `<option value="${esc(s)}" ${MF.sp === s ? "selected" : ""} ${spOwn.has(s) ? "" : "disabled"}>${esc(s)} (${g}/${t})</option>`).join("")}</select><select id="msort" aria-label="Trier par">${SO.map(([k, l]) => `<option value="${k}" ${MF.sort === k ? "selected" : ""}>Tri : ${l}</option>`).join("")}</select></div></section>
  <div class="mgrid" id="mgrid">${menagerieCards()}</div>`;
}

// ======================== Routeur ========================
function route() { return (location.hash || "#/g").replace(/^#\/?/, "").split("/").map(x => { try { return decodeURIComponent(x); } catch { return x; } }); }
let LAST = "";
function render() {
  let [p0, p1] = route(); let html, title = "Révisions anat", tab = null, scrollTo = null;
  if (p0 === "zone") { ZOPEN = ZONES[p1] ? p1 : null; if (ZOPEN) { if (ZOPEN === "dos") BODY.view = "b"; scrollTo = "z-" + ZOPEN; } history.replaceState(null, "", "#/corps"); p0 = "corps"; }
  const y = window.scrollY, same = LAST === location.hash;
  try {
    if (!QS.length) html = `<div class="card">Les questions n'ont pas pu être chargées (fichier questions.js manquant).</div>`;
    else if (TABS.some(t => t.id === p0)) { tab = p0; html = viewTab(p0); }
    else if (p0 === "quiz") { title = "QCM"; html = viewQuiz(); }
    else if (p0 === "fiches") { title = "Fiches"; html = viewFiches(p1 || ""); }
    else if (p0 === "fiche") { title = "Fiche"; html = viewFiche(p1); }
    else if (p0 === "rev") { tab = p1 || "g"; title = "Révision"; html = viewRev(p1 || "g", route()[2] || ""); }
    else if (p0 === "vert") { title = "Vertèbre " + p1; html = viewVert(p1); }
    else if (p0 === "nx") { const r = route(); title = "Nerf"; html = viewNx(p1, r[2], r[3]); }
    else if (p0 === "corps") { title = "Mon corps d'anat"; html = viewCorps(); }
    else if (p0 === "menagerie") { title = "Ma ménagerie"; html = viewMenagerie(); }
    else if (p0 === "sync") { MSG = importWidget(p1 || ""); history.replaceState(null, "", "#/widget"); title = "Widget"; html = viewWidget(); }
    else if (p0 === "widget") { title = "Widget"; html = viewWidget(); }
    else if (p0 === "reglages") { title = "Réglages"; html = viewSettings(); }
    else { tab = p0 = "g"; html = viewTab("g"); }
  } catch (e) { console.error(e); html = `<div class="card">Erreur : ${esc(e.message)} <a href="#/g">Accueil</a></div>`; }
  renderTabs(tab, p0 === "rev" ? "rev/" : "");
  $("#app").innerHTML = html; $("#title").textContent = title; document.body.classList.toggle("inquiz", p0 === "quiz" && !!SESSION && SESSION.pos < SESSION.ids.length);
  const nav = TABS.some(t => t.id === p0) || p0 === "quiz" ? "g" : ["rev", "fiche", "fiches", "vert", "nx"].includes(p0) ? "fiches" : p0 === "widget" ? "reglages" : p0;
  document.querySelectorAll(".bottom-nav a").forEach(a => a.classList.toggle("active", a.dataset.n === nav));
  if (p0 === "reglages") offlineInfo();
  hydrateImgs(); hydrateArts(); LAST = location.hash;
  if (scrollTo) document.getElementById(scrollTo)?.scrollIntoView({ block: "start" }); else window.scrollTo(0, same ? y : 0);
  if (p0 === "quiz") { const n = document.getElementById("nextBtn"); if (n && SESSION && SESSION.answered != null) n.focus({ preventScroll: true }); }
}

async function offlineInfo() { // état réel du stockage hors ligne
  const el = document.getElementById("offst"); if (!el) return;
  try {
    const packs = [...new Set([...Object.values(D.imgs || {}), ...Object.values(GIFT.TAB).map(a => a.pack)])], c = await caches.open("jadjeudanat-v3"), has = new Set((await c.keys()).map(r => new URL(r.url).pathname.split("/").pop()));
    const core = ["app.js", "questions.js", "style.css"].every(f => has.has(f)), n = packs.filter(p => has.has(p + ".js")).length;
    el.textContent = !core ? "Application pas encore enregistrée : rouvre-la une fois avec internet." : n === packs.length ? "✔ Tout est disponible hors ligne." : `✔ Application disponible hors ligne · photos : ${n}/${packs.length} paquets téléchargés.`;
  } catch { el.textContent = "Hors ligne indisponible dans ce navigateur."; }
}
// ======================== Actions ========================
const zoneStart = (z, l) => { l = shuffle(l.map(q => q.id)); if (SET.len < 100) l = l.slice(0, SET.len); startSession("corps", "todo", l, "Zone : " + ZONES[z]); };
const ACT = {
  zone: el => { const z = el.dataset.z; ZOPEN = ZOPEN === z && el.dataset.from ? null : z; render(); if (ZOPEN) document.getElementById("z-" + z)?.scrollIntoView({ behavior: "smooth", block: "start" }); },
  bview: el => { BODY.view = el.dataset.v; save(K_BODY, BODY); render(); },
  equip: el => { const a = ACC_BY[el.dataset.id]; if (a && has(a)) { wear(a, !isEq(a)); save(K_BODY, BODY); render(); } },
  tint: () => { BODY.tint = !BODY.tint; save(K_BODY, BODY); render(); },
  off: () => { BODY.eq = {}; WARD.eq = {}; save(K_WARD, WARD); save(K_BODY, BODY); render(); },
  rnd: () => { BODY.eq = {}; WARD.eq = {}; const seen = new Set(), pool = [...BODY.got.map(id => ACC_BY[id]), ...WARD.got.map(id => SHOP.byId[id]).filter(i => i.s)]; for (const a of shuffle(pool)) if (!clash(a.s).some(s => seen.has(s)) && Math.random() < .62) { seen.add(a.s); wear(a, true); } save(K_BODY, BODY); render(); },
  wTab: el => { WTAB = el.dataset.k; render(); },
  wItem: el => { const i = SHOP.byId[el.dataset.id]; if (!i) return; if (!WARD.got.includes(i.id)) return buyModal(i); useItem(i); render(); },
  wFree: () => { delete WARD.fab[WTAB]; save(K_WARD, WARD); render(); },
  wBuy: el => { const i = SHOP.byId[el.dataset.id]; if (!i || WARD.got.includes(i.id) || wallet() < i.price || level(xp()) < i.lvl) return; WARD.spent = (WARD.spent || 0) + i.price; WARD.got.push(i.id); useItem(i, true); document.querySelector(".modal")?.remove(); render(); toast(`${esc(i.name)} : c'est à toi !`, "ok"); },
  look: el => { BODY.look[el.dataset.k] = el.dataset.v; save(K_BODY, BODY); render(); },
  gtab: el => { TAB2 = el.dataset.k; render(); },
  gift: el => { DAILY.equipped[TAB2] = el.dataset.id || null; save(K_DAILY, DAILY); render(); },
  gearTab: el => { GTAB = el.dataset.k; render(); },
  gearEq: el => { const g = GEAR.byId[el.dataset.id]; if (!g || !PET.gear.got.includes(g.id)) return; if (PET.gear.eq[g.s] === g.id) delete PET.gear.eq[g.s]; else PET.gear.eq[g.s] = g.id; save(K_PET, PET); render(); },
  gearOff: () => { PET.gear.eq = {}; save(K_PET, PET); render(); },
  gearRnd: () => { PET.gear.eq = {}; for (const g of shuffle(PET.gear.got.map(id => GEAR.byId[id]))) if (!PET.gear.eq[g.s] && Math.random() < .75) PET.gear.eq[g.s] = g.id; save(K_PET, PET); render(); },
  playPet: () => {
    if (!ANIMAL_BY_ID[PET.companion]) return; const list = replayable(); if (list.length) return startPlay(list);
    const ko = QS.filter(q => status(q) === "ko");
    modal(`<h2>Rien à rejouer pour l'instant</h2>${petSvg(ANIMAL_BY_ID[PET.companion], "pet-svg lg")}<p>Ce jeu reprend les questions que tu as réussies, mais pas du premier coup.</p><p class="small">${ko.length ? "Tu peux jouer avec tes échecs : une fois réussis, ils arriveront ici." : "Réponds à quelques séries, puis reviens jouer !"}</p><div class="actions center">${ko.length ? `<button class="primary" data-act="playKo">Jouer avec mes échecs (${ko.length})</button>` : ""}<button data-act="closeM">Fermer</button></div>`);
  },
  playKo: () => startPlay(QS.filter(q => status(q) === "ko")),
  sleepPet: () => { const id = PET.companion; if (!id) return; MOOD = MOOD === "sleep" ? null : "sleep"; const c = petCare(id), tk = todayKey(), first = MOOD && c.lastSleep !== tk; if (first) { c.lastSleep = tk; c.happiness = Math.min(100, (c.happiness || 0) + 5); save(K_PET, PET); } render(); toast(MOOD ? (first ? "Bonne sieste ! Bonheur +5 %" : "Chut, il dort…") : "Bien reposé !", "ok"); },
  artNav: el => { const i = TAB.got.indexOf(TAB.cur), n = TAB.got.length; if (!n) return; TAB.cur = TAB.got[(i + Number(el.dataset.d) + n) % n]; save(K_TAB, TAB); render(); },
  galOpen: () => { GALOPEN = true; render(); document.getElementById("gal")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
  expose: el => { if (TAB.got.includes(el.dataset.id)) { TAB.cur = el.dataset.id; save(K_TAB, TAB); } document.querySelector(".modal")?.remove(); render(); toast("Tableau exposé !", "ok"); },
  closeM: () => document.querySelector(".modal")?.remove(),
  fav: el => { const id = el.dataset.id; if (PET.fav[id]) delete PET.fav[id]; else PET.fav[id] = 1; save(K_PET, PET); document.getElementById("mgrid").innerHTML = menagerieCards(); },
  mF: el => { MF.f = el.dataset.k; MF.n = 60; render(); },
  mMore: () => { MF.n += 60; document.getElementById("mgrid").innerHTML = menagerieCards(); },
  giftBuy: el => { const r = GIFT.byId[el.dataset.id]; if (!r || DAILY.got.includes(r.id)) return; const W = wallet(), can = W >= r.price;
    modal(`<h2>${esc(r.name)}</h2><div class="tryon">${persoSvg({ vb: r.cat === "decor" ? "-40 -62 480 716" : "60 -70 280 330", cls: "thumb", ...(r.cat === "decor" ? { behind: GIFT.scene(r.v) } : { hair: r.v }) })}</div><p class="big">${r.price} XP</p><p class="small">${can ? `Il te restera ${(W - r.price).toLocaleString("fr")} XP à dépenser. Ton niveau ne change pas.` : `Il te manque ${(r.price - W).toLocaleString("fr")} XP, soit environ ${plural(Math.ceil((r.price - W) / 10), "bonne réponse", "bonnes réponses")}.`}</p><div class="actions center">${can ? `<button class="primary" data-act="giftPay" data-id="${r.id}">Acheter</button>` : ""}<button data-act="closeM">${can ? "Pas maintenant" : "Fermer"}</button></div>`); },
  giftPay: el => { const r = GIFT.byId[el.dataset.id]; if (!r || DAILY.got.includes(r.id) || wallet() < r.price) return; WARD.spent = (WARD.spent || 0) + r.price; save(K_WARD, WARD); DAILY.got.push(r.id); DAILY.equipped[r.cat] = r.id; save(K_DAILY, DAILY); document.querySelector(".modal")?.remove(); render(); toast(`${esc(r.name)} : c'est à toi !`, "ok"); },
  feedPet: () => { const r = feed(); render(); if (r.ok) { document.querySelectorAll(".petbig .pet-svg,.stagepet .pet-svg").forEach(s => s.classList.add("happy")); } if (r.grew) document.querySelectorAll(".petbig .pet-svg.lg,.stagepet .pet-svg:not(.baby)").forEach(s => s.classList.add("grow")); toast(esc(r.msg), r.baby ? "baby" : r.ok ? "ok" : ""); },
  setComp: el => { PET.companion = el.dataset.id; save(K_PET, PET); render(); toast(`${esc(ANIMAL_BY_ID[el.dataset.id].name)} t'accompagne !`, "ok"); },
  zoneQuiz: el => { const z = el.dataset.z; let l = (ZQ[z] || []).filter(q => status(q) !== "ok"); if (!l.length) l = ZQ[z] || []; zoneStart(z, l); },
  zonePool: el => zoneStart(el.dataset.z, (ZQ[el.dataset.z] || []).filter(q => status(q) === el.dataset.pool)),
  start: el => startSession(el.dataset.tab, el.dataset.pool),
  reg: el => { SET.reg = el.dataset.reg; save(K_SET, SET); render(); },
  answer: el => answer(Number(el.dataset.i)),
  toggle: el => { const S = SESSION, i = Number(el.dataset.i); if (!S || S.answered != null) return; S.sel = S.sel.includes(i) ? S.sel.filter(x => x !== i) : [...S.sel, i]; saveSession(); render(); },
  valid: () => { if (SESSION && SESSION.sel && SESSION.sel.length) answer(0); },
  dlImgs: async el => {
    const packs = [...new Set([...Object.values(D.imgs || {}), ...Object.values(GIFT.TAB).map(a => a.pack)])]; let ok = 0; el.disabled = true;
    for (const p of packs) { try { const r = await fetch(p + ".js"); if (r.ok) { await r.blob(); ok++; } } catch {} el.textContent = `Téléchargement… ${ok} / ${packs.length}`; }
    el.textContent = ok === packs.length ? "✔ Tout est disponible hors ligne" : `${packs.length - ok} fichier(s) manquant(s) : vérifie les images-XX.js et tableaux-XX.js sur GitHub`; el.disabled = false; offlineInfo();
  },
  next: () => { const S = SESSION; if (!S || S.answered == null) return; document.querySelectorAll(".petpop").forEach(x => x.remove()); Object.assign(S, { pos: S.pos + 1, answered: null, opts: null, sel: null, ev: null, say: "", lvUp: 0, gain: 0 }); if (S.pos >= S.ids.length) endPlay(S); saveSession(); render(); window.scrollTo(0, 0); },
  stop: () => { // quitter en cours de route : ce qui est répondu est gardé
    const S = SESSION; if (!S) return; const n = S.pos + (S.answered != null ? 1 : 0), back = "#/" + (S.tab || "g");
    if (!n) { SESSION = null; saveSession(); location.hash = back; return; }
    S.ids = S.ids.slice(0, n); S.pos = n; endPlay(S); saveSession(); render(); window.scrollTo(0, 0);
  },
  redoKo: () => startSession(SESSION.tab, "ko", shuffle(SESSION.wrong.slice()), "Erreurs de la série"),
  flag: () => { const id = SESSION.ids[SESSION.pos]; if (FLAGS[id]) delete FLAGS[id]; else FLAGS[id] = Date.now(); save(K_FLAG, FLAGS); render(); toast(FLAGS[id] ? "Question signalée : retrouve-la dans Réglages." : "Signalement retiré."); },
  ficheQuiz: el => { const f = D.fiches[el.dataset.name]; startSession(f && TABS.some(t => t.cat === f.cat) ? f.cat : "g", "todo", shuffle((QBY[el.dataset.name] || []).map(q => q.id)), el.dataset.name); },
  fixQ: el => {
    const q = BY_ID[el.dataset.id]; const nq = prompt("Question :", q.q); if (nq === null || !nq.trim()) return;
    const na = prompt(q.m ? "Bonnes réponses (séparées par « ; » avec un espace de chaque côté) :" : "Bonne réponse :", q.a); if (na === null || !na.trim()) return;
    OVR[q.id] = { q: nq.trim(), a: na.trim() }; save(K_OVR, OVR); applyOvr();
    if (confirm("Correction enregistrée. Retirer le signalement ?")) { delete FLAGS[q.id]; save(K_FLAG, FLAGS); } render();
  },
  flagQuiz: () => startSession(null, "todo", Object.keys(FLAGS).filter(id => BY_ID[id]), "Questions signalées"),
  copyFlags: async () => { const txt = Object.keys(FLAGS).map(id => BY_ID[id]).filter(Boolean).map(q => `- [${q.id}] ${q.q} → ${q.a}`).join("\n"); try { await navigator.clipboard.writeText(txt); MSG = "Liste copiée : tu peux la coller dans un message."; } catch { MSG = "Copie impossible sur ce navigateur."; } render(); },
  export: () => {
    const data = { app: "revisions-anat", version: 2, exportedAt: new Date().toISOString(), progress: PROG, flags: FLAGS, corrections: OVR, body: BODY, pet: PET, daily: DAILY, tableaux: TAB, garderobe: WARD, settings: SET };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })); a.download = `revisions-anat-progression-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); MSG = "Fichier enregistré dans tes Téléchargements."; render();
  },
  import: () => document.getElementById("importFile").click(),
  reset: () => { if (!confirm("Effacer toute ta progression de QCM et tes accessoires ? C'est définitif (sauf si tu as un export). Tes animaux sont gardés.")) return; PROG = {}; save(K_PROG, PROG); markSeen(); BODY.got = []; BODY.eq = {}; save(K_BODY, BODY); PET.gear.lv = 1; PET.kibLv = 1; PET.run = PET.bad = 0; WARD.spent = 0; save(K_WARD, WARD); save(K_PET, PET); SESSION = null; saveSession(); MSG = "Progression effacée."; render(); }
};
document.addEventListener("click", e => {
  if (e.target.matches("img.pic[src]")) { const z = document.createElement("div"); z.id = "zoom"; z.innerHTML = `<img src="${e.target.src}" alt="">`; z.onclick = () => z.remove(); document.body.appendChild(z); return; }
  const el = e.target.closest("[data-act]"); if (!el || !ACT[el.dataset.act] || el.disabled) return;
  e.preventDefault(); ACT[el.dataset.act](el);
});
document.addEventListener("input", e => {
  if (e.target.dataset.set === "len") { SET.len = Number(e.target.value); save(K_SET, SET); const o = document.getElementById("lenOut"); if (o) o.textContent = SET.len >= 100 ? "Tous" : SET.len; }
  else if (e.target.id === "search") {
    const v = e.target.value, pos = e.target.selectionStart, tb = e.target.dataset.tab;
    history.replaceState(null, "", (tb ? "#/rev/" + tb + "/" : "#/fiches/") + encodeURIComponent(v)); LAST = location.hash;
    $("#app").innerHTML = tb ? viewRev(tb, v) : viewFiches(v); const s = document.getElementById("search"); s.focus(); try { s.setSelectionRange(pos, pos); } catch {}
  } else if (e.target.id === "msearch") { MF.q = e.target.value; MF.n = 60; document.getElementById("mgrid").innerHTML = menagerieCards(); }
});
document.addEventListener("change", async e => {
  if (e.target.id === "msp" || e.target.id === "msort") { MF[e.target.id === "msp" ? "sp" : "sort"] = e.target.value; MF.n = 60; document.getElementById("mgrid").innerHTML = menagerieCards(); return; }
  if (e.target.id !== "importFile") return;
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || data.app !== "revisions-anat" || !data.progress || typeof data.progress !== "object") throw new Error("ce n'est pas un export de Révisions anat");
    if (!confirm("Remplacer ta progression actuelle par celle de ce fichier ?")) return;
    save(K_PROG, data.progress); save(K_FLAG, data.flags || {}); save(K_OVR, data.corrections || {});
    if (data.body) save(K_BODY, data.body); if (data.pet) save(K_PET, data.pet); if (data.daily) save(K_DAILY, data.daily); if (data.tableaux) save(K_TAB, data.tableaux); if (data.garderobe) save(K_WARD, data.garderobe); if (data.settings) save(K_SET, data.settings);
    save(K_SESS, null); save(K_SEEN, null); location.reload(); return;
  } catch (err) { MSG = "Import impossible : " + err.message; }
  render();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.getElementById("zoom")?.remove();
  if (route()[0] !== "quiz" || !SESSION || SESSION.pos >= SESSION.ids.length || /INPUT|SELECT|SUMMARY/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return;
  const cur = BY_ID[SESSION.ids[SESSION.pos]];
  if (cur && cur.m && SESSION.answered == null && SESSION.opts) {
    const n = Number(e.key) - 1;
    if (n >= 0 && n < SESSION.opts.length) ACT.toggle({ dataset: { i: n } }); else if (e.key === "Enter") { e.preventDefault(); ACT.valid(); }
    return;
  }
  const k = e.key.toUpperCase(), i = k.length === 1 ? ("ABCD".indexOf(k) >= 0 ? "ABCD".indexOf(k) : "1234".indexOf(e.key)) : -1;
  if (i >= 0 && SESSION.answered == null && SESSION.opts && i < SESSION.opts.length) answer(i);
  else if ((e.key === "Enter" || e.key === " ") && SESSION.answered != null && e.target.tagName !== "BUTTON" && e.target.tagName !== "A") { e.preventDefault(); ACT.next(); }
});
// reprise de la série laissée en cours, même après fermeture de l'application
{ const s = load(K_SESS, null); if (s && Array.isArray(s.ids) && s.ids.every(id => BY_ID[id]) && s.pos < s.ids.length) SESSION = s; }
window.addEventListener("hashchange", render);
document.addEventListener("toggle", e => { if (e.target.id === "gal") GALOPEN = e.target.open; if (e.target.open) { hydrateImgs(); hydrateArts(); } }, true);
if (WARD.spent === null) WARD.spent = Math.max(0, xp() - START_XP); save(K_WARD, WARD);
SEEN = load(K_SEEN, null); if (!Array.isArray(SEEN)) markSeen();
const retro = syncLevel(); save(K_DAILY, DAILY); save(K_TAB, TAB);
const away = /^#\/sync\//.test(location.hash) ? { n: 0 } : catchUp();
const awayMsg = r => `📲 ${plural(r.n, "réponse")} ${r.n > 1 ? "prises" : "prise"} en compte. ${esc(r.won)}`;
render();
if (away.n) toast(awayMsg(away), "ok");
window.addEventListener("storage", e => { if (e.key !== K_PROG || !e.newValue) return; PROG = load(K_PROG, {}); const w = catchUp(); if (route()[0] !== "quiz") render(); if (w.n) toast(awayMsg(w), "ok"); });
showDaily(); document.addEventListener("visibilitychange", () => { if (!document.hidden) showDaily(); });
if (retro.length) toast(`🎁 ${plural(retro.length, "accessoire")} pour ton compagnon, pour tes niveaux déjà atteints !`, "ok");
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch {}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
