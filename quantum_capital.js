const CAP_KEY = "IH_CAPITAL_CLEAN_V6";
const BANK_HOST_CHANNEL = new BroadcastChannel("INFINITYHUNT_CUANTUM_BANK_HOST");

const BANK_PORTAL_URL = "../INFINITYHUNT_CUANTUM_BANK/quantum_bank_ing.html";
let bankTabRef = null;

const WORLD_FX = {
  ES: { c: "EUR", s: "€", r: 1 }, GB: { c: "GBP", s: "£", r: 0.85 }, US: { c: "USD", s: "$", r: 1.05 },
  CH: { c: "CHF", s: "CHF", r: 0.93 }, IN: { c: "INR", s: "₹", r: 89.5 }, CA: { c: "CAD", s: "C$", r: 1.47 },
  DE: { c: "EUR", s: "€", r: 1 }, FR: { c: "EUR", s: "€", r: 1 }, JP: { c: "JPY", s: "¥", r: 162.8 },
  CN: { c: "CNY", s: "¥", r: 7.65 }, AE: { c: "AED", s: "AED", r: 3.87 }, AU: { c: "AUD", s: "A$", r: 1.62 },
  MX: { c: "MXN", s: "MX$", r: 21.4 }, BR: { c: "BRL", s: "R$", r: 6.10 }, SG: { c: "SGD", s: "S$", r: 1.41 },
  KR: { c: "KRW", s: "₩", r: 1475 }, HK: { c: "HKD", s: "HK$", r: 8.20 }, NL: { c: "EUR", s: "€", r: 1 }, IT: { c: "EUR", s: "€", r: 1 }
};
const REGION_NAMES = new Intl.DisplayNames(["es"], { type: "region" });
const ALL_WORLD_ISO = ["ES","GB","US","CH","IN","CA","DE","FR","IT","PT","JP","CN","KR","SG","HK","AE","SA","AU","NZ","MX","BR","AR","CO","CL","PE","UY","NL","BE","LU","IE","SE","NO","DK","FI","PL","AT","GR","TR","IL","ZA","EG","MA","NG","KE","TH","VN","ID","MY","PH","TW"];

function getWorldRule(iso) {
  const c = (iso || "ES").toUpperCase();
  let l = c; try { l = REGION_NAMES.of(c) || c; } catch {}
  const fx = WORLD_FX[c] || { c: "USD", s: "$", r: 1.05 };
  return { code: c, label: l, cur: fx.c, sym: fx.s, rate: fx.r, prefix: c };
}

let state = (() => { try { return JSON.parse(localStorage.getItem(CAP_KEY) || "null"); } catch { return null; } })() || {
  activeId: "u1", lang: "ES", audio: true, panic: false, yieldPool: 750000000, accAeat: 0, piggyCount: 0,
  dailyFlow: 18026945704, initialCap: 100000000000, investRunning: true,
  aeatIban: "ES88 2100 0418 4502 0005 0123", ledger: [],
  hgcn: ["[2026-11-23 13:00:00 CET] [BOOT] INFINITYHUNT_CUANTUM_CAPITAL Base 100.000.000.000M € · Motor 30 Hz Auditado."],
  users: [
    { id: "u1", name: "José Montes", nif: "70891234X", country: "ES", city: "Salamanca, Madrid", heir: "Sucesión Legal Directa", qid: "QID-∞-1026-70891234", iban: "ES23 2100 0418 45 4409 007020", aum: 6602349541563.56, earnedAcc: 0, transferredBank: 6601136697333 },
    { id: "u2", name: "Pedro Soros", nif: "51234890Z", country: "ES", city: "Castellana, Madrid", heir: "Fundación Soros", qid: "QID-∞-1026-492A0CB6", iban: "ES81 2100 0418 45 2227 492534", aum: 1500000000, earnedAcc: 0, transferredBank: 0 },
    { id: "u3", name: "Pablo Rodrigo", nif: "00452896F", country: "ES", city: "Calle Francisco Remiro 15 D, 28028 Madrid", heir: "Sucesión Familiar", qid: "QID-∞-1026-00452896", iban: "ES91 2100 0418 4502 0005 1332", aum: 1000000000, earnedAcc: 0, transferredBank: 0 }
  ]
};

const $ = id => document.getElementById(id);
function saveDb() { try { localStorage.setItem(CAP_KEY, JSON.stringify(state)); } catch {} }
function getUser() { return state.users.find(u => u.id === state.activeId) || state.users.at(0); }
function fmtEur(n) { return Number(n || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function fmtLocal(eur, rule) { return rule.cur === "EUR" ? "" : ` (${(Number(eur || 0) * rule.rate).toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${rule.sym})`; }

function parseSmartAmt(raw) {
  let s = String(raw || "").trim().toUpperCase().replace(/[€£$₹]/g, "").replace(/\s+/g, "");
  if (!s) return 0;
  let m = 1; if (s.endsWith("M")) { m = 1000000; s = s.slice(0, -1); }
  s = s.replace(/\./g, "").replace(/,/g, ".");
  return +(Math.abs(Number(s) || 0) * m).toFixed(2);
}

function playTone(f, d) {
  if (!state.audio) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext, c = new C(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = f; g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d);
  } catch {}
}

function showGoldToast(msg) {
  let t = $("ih-gold-toast");
  if (!t) {
    t = document.createElement("div"); t.id = "ih-gold-toast";
    t.style.cssText = "position:fixed;top:16px;right:16px;z-index:10000;background:#002d72;color:#fff;border:2px solid #d4af37;padding:10px 15px;border-radius:10px;font-weight:800;font-size:0.82rem;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity 0.3s;";
    document.body.appendChild(t);
  }
  t.innerHTML = msg; t.style.opacity = "1"; clearTimeout(t._tm); t._tm = setTimeout(() => { t.style.opacity = "0"; }, 3000);
}

function addHgcn(tag, msg) { state.hgcn.unshift(`[2026-11-23 ${new Date().toLocaleTimeString("es-ES")} CET] [${tag}] ${msg}`); if (state.hgcn.length > 60) state.hgcn.pop(); saveDb(); }
function addEntry(d, h, desc, amt) { const a = +Number(amt).toFixed(2); if (a <= 0) return; const n = state.ledger.length + 1, dt = new Date().toISOString().slice(0, 10); state.ledger.push({ id: n, date: dt, acc: d, desc, debe: a, haber: 0 }, { id: n + 1, date: dt, acc: h, desc, debe: 0, haber: a }); addHgcn("PGC", `${desc} · ${fmtEur(a)}`); }

window.addInitialCapital250 = function () {
  if (state.panic) return;
  state.initialCap = Math.max(100000000000, Number(state.initialCap) || 100000000000) + 250;
  state.investRunning = true;
  if ($("btn-hero-invest")) $("btn-hero-invest").innerText = "⏸ Parar para Retirar";
  addEntry(`250 Capital Inicial (${getUser().name})`, "572 Tesorería Fondos", "Aportación +250M € sobre Base 100.000.000.000M €", 250000000);
  saveDb(); renderAll(); playTone(880, 0.12); showGoldToast("✅ +250M € añadidos · Motor activo");
};

window.toggleHeroInvestStream = function () {
  state.investRunning = !state.investRunning;
  const btn = $("btn-hero-invest");
  if (btn) btn.innerText = state.investRunning ? "⏸ Parar para Retirar" : "▶ Reanudar Cotización";
  showGoldToast(state.investRunning ? "▶️ Operativa continua reanudada" : `⏸ Detenido en ${Number(state.initialCap).toLocaleString("es-ES")}M € · Listo para retirar`);
};

window.toggleGlobalKillSwitch = function () {
  state.panic = !state.panic;
  if ($("btn-panic")) $("btn-panic").innerText = state.panic ? "🟢 UNFREEZE" : "🛑 FREEZE ALL";
  if ($("btn-kill-switch-home")) $("btn-kill-switch-home").innerText = state.panic ? "🟢 REANUDAR SISTEMA" : "🛑 KILL SWITCH · PARADA EMERGENCIA";
  if ($("btn-kill-switch")) $("btn-kill-switch").innerText = state.panic ? "🟢 REANUDAR OPERATIVA" : "🛑 KILL SWITCH · PARADA EMERGENCIA";
  document.querySelectorAll(".box-buy-blink,.box-sell-blink").forEach(el => { el.style.animationPlayState = state.panic ? "paused" : "running"; });
  addHgcn("SEGURIDAD", state.panic ? "PARADA DE EMERGENCIA ACTIVADA" : "Operativa cuántica reanudada");
  renderAll(); showGoldToast(state.panic ? "🛑 PARADA DE EMERGENCIA ACTIVA" : "🟢 MOTOR CUÁNTICO REANUDADO");
};
function executeYield() {
  if (state.panic || state.yieldPool <= 0) return;
  state.investRunning = false; if ($("btn-hero-invest")) $("btn-hero-invest").innerText = "▶ Reanudar Cotización";
  const u = getUser(), tax = +(state.yieldPool * 0.25).toFixed(2), net = +(state.yieldPool - tax).toFixed(2);
  u.earnedAcc += net; u.aum += net; state.accAeat += tax; state.yieldPool = 0;
  addEntry(`572 Tesorería Fondos (${u.name})`, "769 Plusvalías Cuánticas", "Rendimiento Neto 75% Partícipe", net);
  addEntry("572 Reserva Fiscal AEAT", "4751 Hacienda Pública", "Retención Fiscal 25%", tax);
  playTone(880, 0.14); renderAll(); showGoldToast(`💸 Ingreso ejecutado: ${fmtEur(net)} (75% Neto) + ${fmtEur(tax)} (25% AEAT)`);
}

function sendPayloadToQuantumBank(grossAmt, conceptText, customName) {
  const gross = parseSmartAmt(grossAmt); if (!gross || state.panic) return;
  state.investRunning = false; if ($("btn-hero-invest")) $("btn-hero-invest").innerText = "▶ Reanudar Cotización";
  if ($("custom-withdraw-inp")) $("custom-withdraw-inp").value = String(grossAmt);
  if ($("bridge-custom-amt")) $("bridge-custom-amt").value = String(grossAmt);
  const targetName = (customName || $("bridge-holder-name")?.value || getUser().name).trim();
  let u = state.users.find(x => x.name.toLowerCase() === targetName.toLowerCase()) || createOrSelectHolderByName(targetName, "", "ES");
  state.activeId = u.id; const net75 = +(gross * 0.75).toFixed(2), tax25 = +(gross * 0.25).toFixed(2);
  const payload = { txId: "IH-CAP-" + Date.now(), timestamp: new Date().toISOString(), origin: "INFINITYHUNT_CUANTUM_CAPITAL", destinationBank: "INFINITYHUNT_CUANTUM_BANK", holderName: u.name, dni: u.nif, iban: u.iban, gross, concept: conceptText || `Retirada de Capital · ${u.name}` };
  BANK_HOST_CHANNEL.postMessage(payload); localStorage.setItem("CPUUI_TO_INFINITYHUNT_TX", JSON.stringify(payload));
  if (bankTabRef && !bankTabRef.closed) bankTabRef.postMessage(payload, "*");
  u.earnedAcc += net75; state.accAeat += tax25; u.transferredBank += net75;
  addEntry(`572.1 INFINITYHUNT_CUANTUM_BANK (${u.name})`, "763 Rendimientos Cuánticos", `Abono Neto 75% [${u.iban}]`, net75);
  addEntry("4751 Agencia Tributaria (AEAT)", "763 Retención Fiscal 25%", `Retención 25% (${u.nif})`, tax25);
  saveDb(); renderAll(); playTone(920, 0.16);
  showGoldToast(`🚀 Enviado al Banco: <strong>${fmtEur(net75)}</strong> (75% ${u.name}) + <strong>${fmtEur(tax25)}</strong> (25% AEAT)`);
}

window.withdrawToQuantumBank = raw => sendPayloadToQuantumBank(raw, `Retirada 1 Clic · ${getUser().name}`);
function transferAccumulatedToBank() {
  const u = getUser(), tot = +(u.earnedAcc + state.accAeat).toFixed(2);
  if (tot <= 0) { showGoldToast("⚠️ Pulsa primero 💸 Ejecutar Ingreso (75% / 25%) o usa los botones de retirada."); return; }
  u.earnedAcc = 0; state.accAeat = 0; sendPayloadToQuantumBank(tot, `Liquidación Fondos · ${u.name}`, u.name);
}

function createOrSelectHolderByName(rawName, rawNif, isoCode, rawCity, rawHeir) {
  const cleanName = (rawName || "Partícipe Cuántico").trim();
  const existing = state.users.find(x => x.name.toLowerCase() === cleanName.toLowerCase() || (rawNif && x.nif === rawNif.toUpperCase()));
  if (existing) { state.activeId = existing.id; return existing; }
  const rule = getWorldRule(isoCode || "ES");
  let h = 0; for (let i = 0; i < (cleanName + (rawNif || "")).length; i++) h = (h * 131 + (cleanName + (rawNif || "")).charCodeAt(i)) % 9000000000;
  const num = String(1000000000 + h).padStart(10, "0"), dc = String(11 + (h % 88));
  const nif = (rawNif || `ID-${num.slice(0, 8)}`).trim().toUpperCase(), iban = `${rule.prefix}${dc} 2100 0418 45 ${num.slice(0, 4)} ${num.slice(4)}`, qid = `QID-∞-1026-${Math.abs(h).toString(16).toUpperCase().slice(0, 8)}`;
  const u = { id: "PRT-" + Date.now(), name: cleanName, nif, country: rule.code, city: (rawCity || rule.label).trim(), heir: (rawHeir || "Sucesión Legal Directa").trim(), qid, iban, aum: 1000000000, earnedAcc: 0, transferredBank: 0 };
  state.users.push(u); state.activeId = u.id;
  addEntry(`250 Fondos Cuánticos (${cleanName})`, "100 Patrimonio Partícipes", `Alta Infinita (${rule.label} · ${rule.cur}) · IBAN ${iban}`, 1000000000);
  addHgcn("ALTA-INFINITA", `${cleanName} (${nif} · ${rule.label}) → ${qid} · IBAN ${iban}`); saveDb(); renderAll(); showGoldToast(`✅ Alta Infinita: <strong>${u.name}</strong> (${rule.label}) · IBAN ${u.iban}`); return u;
}

window.fastInfiniteRegister = () => { const c = $("fast-country")?.value || "ES", n = ($("fast-name")?.value || "").trim(), d = ($("fast-dni")?.value || "").trim(); if (!n) return; const u = createOrSelectHolderByName(n, d, c); $("fast-name").value = ""; $("fast-dni").value = ""; if ($("semantic-reply-box")) $("semantic-reply-box").innerText = `⚡ Alta Infinita: ${u.name} (${u.nif}) · ${u.qid} · IBAN ${u.iban}`; };
const DICT = { ES: ["🌍 1. Posición Global Fondos & σ_ij", "📊 2. Catálogo 20 Plazas Mundiales", "⚡ 3. Operador Superposición & Riesgo", "👤 4. Partícipes Globales, KYC & Sucesión", "📒 5. Libro Mayor PGC & Fiscal AEAT", "📄 6. Suite Ofimática & Folletos DFI", "🧪 7. Stress Test & Fondos ESG", "⚖️ 8. Gobierno CNMV/SEC & Marca Blanca"], EN: ["🌍 1. Global Funds Position & σ_ij", "📊 2. Top 20 Global Markets Catalog", "⚡ 3. Superposition Operator & Risk", "👤 4. Global Holders, KYC & Succession", "📒 5. General Ledger PGC & AEAT Tax", "📄 6. Office Suite & KIID Reports", "🧪 7. Stress Test & ESG Funds", "⚖️ 8. Governance CNMV/SEC & White Label"] };
function applyLang(l) { state.lang = l; document.querySelectorAll(".nav-tabs .tab-btn").forEach((b, i) => { if (DICT[l].at(i)) b.innerText = DICT[l].at(i); }); addHgcn("IDIOMA", `Idioma activo: ${l}`); showGoldToast(l === "ES" ? "🇪🇸 Idioma: Español" : "🇬🇧 Language: English"); }
function runSemanticUniversal() { const raw = ($("copilot-inp")?.value || "").trim(), out = $("semantic-reply-box"); if (!raw) return; const low = raw.toLowerCase(); if (low.includes("no entiendo inglés") || low.includes("español")) { applyLang("ES"); if (out) out.innerText = "🇪🇸 Idioma cambiado a Español."; return; } if (low.includes("inglés") || low.includes("english")) { applyLang("EN"); if (out) out.innerText = "🇬🇧 Language switched to English."; return; } const idM = raw.match(/(?:dni|nif|pasaporte|id|pan|aadhaar)[:\s-]*([A-Za-z0-9-]{4,16})/i), nmM = raw.replace(/,?\s*(?:dni|nif|pasaporte|id|pan|aadhaar).*/i, "").match(/(?:crear\s+cuenta\s+de|cuenta\s+de|alta\s+a|titular)\s+(.+)/i); if (nmM || idM) { const u = createOrSelectHolderByName(nmM ? nmM.at(1) : raw, idM ? idM.at(1) : "", "ES"); if (out) out.innerText = `✅ Cuenta creada: ${u.name} (${u.nif}) · IBAN ${u.iban}`; } }
function execTaxFreeSwitch() { const amt = parseSmartAmt($("sw-amt")?.value); if (amt && !state.panic) { addEntry(`250 ${$("sw-dst")?.value || "NASDAQ 100"}`, `250 ${$("sw-src")?.value || "IBEX 35"}`, "Traspaso sin Peaje Fiscal", amt); saveDb(); renderAll(); showGoldToast(`🔄 Traspaso sin peaje fiscal ejecutado: ${fmtEur(amt)}`); } }
function downloadExcel() { const csv = "\uFEFFAsiento;Fecha;Cuenta PGC;Concepto;Debe EUR;Haber EUR\n" + state.ledger.map(r => `${r.id};${r.date};"${r.acc}";"${r.desc}";${r.debe};${r.haber}`).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); a.download = `IH_Capital_PGC_${Date.now()}.csv`; a.click(); }
function downloadWord(title, custom) { const u = getUser(), body = custom ? custom.replace(/\{\{TITULAR\}\}/g, u.name).replace(/\{\{NIF\}\}/g, u.nif).replace(/\{\{IBAN_IH\}\}/g, u.iban).replace(/\{\{AUM\}\}/g, fmtEur(u.aum)) : `Partícipe: ${u.name} (${u.nif}) · IBAN: ${u.iban} · AUM: ${fmtEur(u.aum)}`; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`<html><body><h1>INFINITYHUNT_CUANTUM_CAPITAL</h1><h3>${title}</h3><p>${body}</p></body></html>`], { type: "application/msword" })); a.download = `IH_Capital_${title}.doc`; a.click(); }
window.exportCapitalVault = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" })); a.download = `IH_Capital_Boveda_${Date.now()}.json`; a.click(); };
const TOP20_WORLD_INDICES = [
  { name: "IBEX 35 (ESP)", emp: "35 emp.", base: 11659.20, pts: 11659.20, chg: 0.42, reg: "EU", ch: "BME Madrid" }, { name: "S&P 500 (USA)", emp: "30 emp.", base: 5969.34, pts: 5969.34, chg: 0.18, reg: "US", ch: "NYSE / S&P 500" },
  { name: "NASDAQ 100", emp: "30 emp.", base: 20776.23, pts: 20776.23, chg: 0.25, reg: "US", ch: "NASDAQ 100" }, { name: "Dow Jones", emp: "30 emp.", base: 44296.51, pts: 44296.51, chg: 0.12, reg: "US", ch: "NYSE / Dow Jones" },
  { name: "FTSE 100 (UK)", emp: "25 emp.", base: 8262.08, pts: 8262.08, chg: 0.31, reg: "EU", ch: "LSE Londres" }, { name: "DAX 40 (ALE)", emp: "25 emp.", base: 19322.59, pts: 19322.59, chg: 0.54, reg: "EU", ch: "XETRA Fráncfort" },
  { name: "CAC 40 (FRA)", emp: "25 emp.", base: 7255.01, pts: 7255.01, chg: 0.28, reg: "EU", ch: "Euronext París" }, { name: "EuroStoxx 50", emp: "25 emp.", base: 4789.08, pts: 4789.08, chg: 0.47, reg: "EU", ch: "XETRA Fráncfort" },
  { name: "Nikkei 225", emp: "20 emp.", base: 38283.85, pts: 38283.85, chg: 0.65, reg: "AS", ch: "TSE Tokio" }, { name: "TOPIX (JAP)", emp: "15 emp.", base: 2696.53, pts: 2696.53, chg: 0.48, reg: "AS", ch: "TSE Tokio" },
  { name: "Hang Seng", emp: "15 emp.", base: 19229.97, pts: 19229.97, chg: -0.32, reg: "AS", ch: "HKEX Hong Kong" }, { name: "CSI 300 (CHN)", emp: "15 emp.", base: 3865.70, pts: 3865.70, chg: -0.19, reg: "AS", ch: "HKEX Hong Kong" },
  { name: "STI (SINGAPUR)", emp: "15 emp.", base: 3746.02, pts: 3746.02, chg: 0.21, reg: "AS", ch: "ALL" }, { name: "KOSPI (COR)", emp: "15 emp.", base: 2501.24, pts: 2501.24, chg: 0.37, reg: "AS", ch: "KRX Seúl" },
  { name: "Nifty 50 (IND)", emp: "15 emp.", base: 23907.25, pts: 23907.25, chg: 0.61, reg: "EU", ch: "NSE Bombay" }, { name: "ASX 200 (AUS)", emp: "15 emp.", base: 8393.80, pts: 8393.80, chg: 0.29, reg: "AS", ch: "ALL" },
  { name: "S&P/TSX (CAN)", emp: "15 emp.", base: 25444.28, pts: 25444.28, chg: 0.14, reg: "US", ch: "ALL" }, { name: "Bovespa (BRA)", emp: "15 emp.", base: 129125.51, pts: 129125.51, chg: 0.22, reg: "US", ch: "ALL" },
  { name: "SMI (SUI)", emp: "15 emp.", base: 11716.40, pts: 11716.40, chg: 0.35, reg: "EU", ch: "SIX Zúrich" }, { name: "AEX (NED)", emp: "15 emp.", base: 879.12, pts: 879.12, chg: 0.44, reg: "EU", ch: "Euronext París" }
];

const TOP20_FUNDS = [
  { n: "Madrid · IBEX 35 Quantum Alpha", b: 148.92, p: 148.92, c: "€", v: 0.42, reg: "EU" }, { n: "New York · S&P 500 Superposition", b: 228.40, p: 228.40, c: "$", v: 0.18, reg: "US" },
  { n: "NASDAQ 100 · AI & Quantum Tech", b: 312.10, p: 312.10, c: "$", v: 0.25, reg: "US" }, { n: "Fráncfort · DAX 40 Precision", b: 184.50, p: 184.50, c: "€", v: 0.54, reg: "EU" },
  { n: "Londres · FTSE 100 Sterling", b: 132.15, p: 132.15, c: "£", v: 0.31, reg: "EU" }, { n: "París · CAC 40 Luxury & Energy", b: 161.80, p: 161.80, c: "€", v: 0.28, reg: "EU" },
  { n: "Zúrich · SMI Helvetia Gold", b: 215.90, p: 215.90, c: "CHF", v: 0.35, reg: "EU" }, { n: "Tokio · Nikkei 225 Robotics", b: 41200, p: 41200, c: "¥", v: 0.65, reg: "AS" },
  { n: "Hong Kong · Hang Seng Asia", b: 109.40, p: 109.40, c: "HK$", v: -0.32, reg: "AS" }, { n: "Shanghái · SSE Composite", b: 124.60, p: 124.60, c: "¥", v: -0.19, reg: "AS" },
  { n: "Seúl · KOSPI Semiconductors", b: 156.20, p: 156.20, c: "₩", v: 0.37, reg: "AS" }, { n: "Singapur · STI ASEAN Hub", b: 139.80, p: 139.80, c: "S$", v: 0.21, reg: "AS" },
  { n: "Sídney · ASX 200 Lithium & Ore", b: 142.10, p: 142.10, c: "A$", v: 0.29, reg: "AS" }, { n: "Bombay · SENSEX India Growth", b: 188.50, p: 188.50, c: "₹", v: 0.61, reg: "EU" },
  { n: "Toronto · TSX Natural Resources", b: 151.40, p: 151.40, c: "C$", v: 0.14, reg: "US" }, { n: "São Paulo · Ibovespa LatAm", b: 119.30, p: 119.30, c: "R$", v: 0.22, reg: "US" },
  { n: "México · IPC Sovereign Alpha", b: 127.80, p: 127.80, c: "MX$", v: 0.16, reg: "US" }, { n: "Milán · FTSE MIB & Euro Stoxx 50", b: 144.30, p: 144.30, c: "€", v: 0.47, reg: "EU" },
  { n: "Oro LBMA XAU & Plata XAG Fund", b: 2712.40, p: 2712.40, c: "$", v: 0.38, reg: "245" }, { n: "Cripto Inst. BTCEUR 24/7 [🟢 LIVE]", b: 55292.00, p: 55292.00, c: "€", v: 1.45, reg: "247" }
];

function getMarketSessionInfo(reg) {
  const now = new Date(), day = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
  if (reg === "247") return { open: true, lbl: "🟢 ABIERTO 24/7", col: "#059669" };
  if (day === 0 || day === 6) return { open: false, lbl: "🔴 CIERRE FIN DE SEMANA · MOO", col: "#b45309" };
  if (reg === "245") return { open: true, lbl: "🟢 ABIERTO 24/5", col: "#059669" };
  if (reg === "EU") return (hr >= 9 && hr < 17.6) ? { open: true, lbl: "🟢 SESIÓN ABIERTA", col: "#059669" } : { open: false, lbl: "🔴 CIERRE OFICIAL · MOO", col: "#b45309" };
  if (reg === "US") return (hr >= 15.5 && hr < 22) ? { open: true, lbl: "🟢 SESIÓN ABIERTA", col: "#059669" } : (hr >= 10 && hr < 15.5 ? { open: true, lbl: "🟡 PRE-MARKET", col: "#d97706" } : { open: false, lbl: "🔴 CIERRE OFICIAL · MOO", col: "#b45309" });
  return (hr >= 1 && hr < 9.5) ? { open: true, lbl: "🟢 SESIÓN ABIERTA", col: "#059669" } : { open: false, lbl: "🔵 FUTUROS ASIA · MOO", col: "#0284c7" };
}

window.openChamberFromPanorama = function (chName, idxLabel) { const sel = $("world-chamber-select"); if (sel) { sel.value = chName; onChamberSelectChange(); sel.scrollIntoView({ behavior: "smooth", block: "center" }); } showGoldToast(`🏛️ Plaza abierta: <strong>${idxLabel}</strong> (${chName})`); };
function renderTop20Indices() { const strip = $("top20-indices-strip"), tb = $("panorama-20-tbody"); if (strip) strip.innerHTML = TOP20_WORLD_INDICES.map((x, idx) => { const st = getMarketSessionInfo(x.reg); return `<div class="idx-tile" onclick="toggleTop20Panorama()"><div style="font-size:0.72rem;font-weight:800;color:#002d72;">${x.name}</div><div id="idx-pts-${idx}" style="font-size:0.88rem;font-weight:900;color:#0f172a;">${x.pts.toLocaleString("es-ES",{minimumFractionDigits:2})} PTS</div><small id="idx-chg-${idx}" style="color:${st.col};font-weight:800;">${x.chg>=0?"+":""}${x.chg.toFixed(2)}% · ${st.lbl}</small></div>`; }).join(""); if (tb) tb.innerHTML = TOP20_WORLD_INDICES.map((x, idx) => { const st = getMarketSessionInfo(x.reg); return `<tr><td><strong>${x.name}</strong></td><td>${x.emp}</td><td><strong id="pan-pts-${idx}">${x.pts.toLocaleString("es-ES",{minimumFractionDigits:2})} PTS</strong></td><td id="pan-chg-${idx}" style="color:${st.col};font-weight:800;">${x.chg>=0?"+":""}${x.chg.toFixed(2)}% (${st.lbl})</td><td><button type="button" class="btn btn-q" style="padding:2px 8px;" onclick="openChamberFromPanorama('${x.ch}','${x.name}')">Abrir</button></td></tr>`; }).join(""); }
function renderTop20Markets(q) { const tb = $("funds-tbody"); if (!tb) return; const low = (q || "").trim().toLowerCase(); tb.innerHTML = TOP20_FUNDS.map((f, idx) => ({ f, idx })).filter(x => !low || x.f.n.toLowerCase().includes(low)).map(({ f, idx }) => { const st = getMarketSessionInfo(f.reg), pxTxt = f.p.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + f.c; return `<tr><td><strong>${f.n}</strong> <small id="fund-st-${idx}" style="color:${st.col};font-weight:800;">[${st.lbl}]</small></td><td><strong id="fund-px-${idx}">${pxTxt}</strong></td><td id="fund-var-${idx}" style="color:${f.v>=0?"#059669":"#dc2626"};font-weight:800;">${f.v>=0?"+":""}${f.v.toFixed(2)}%</td><td><button type="button" class="btn btn-q" onclick="getUser().aum+=10000000;addEntry('250 ${f.n}','572 Tesorería','Suscripción 10M€',10000000);saveDb();renderAll();showGoldToast('✅ Suscripción 10,00 M€ ejecutada');">Suscribir 10M€</button></td><td><button type="button" class="btn" onclick="getUser().aum-=10000000;addEntry('572 Tesorería','250 ${f.n}','Reembolso 10M€',10000000);saveDb();renderAll();showGoldToast('💸 Reembolso 10,00 M€ ejecutado');">Reembolsar 10M€</button></td></tr>`; }).join(""); }
window.toggleTop20Panorama = () => { const b = $("top20-panorama-box"); if (b) { b.style.display = (b.style.display === "none" || !b.style.display) ? "block" : "none"; playTone(760, 0.09); } };
window.refreshRealMarketsFeed = async () => { await syncRealLiveQuotes(); renderTop20Indices(); addHgcn("API-SYNC", "Sesiones mundiales, fondos e índices sincronizados en vivo"); renderAll(); playTone(880, 0.14); showGoldToast("🔄 Todos los mercados, fondos y Cripto EUR actualizados"); };
window.connectExternalFixGateway = () => { if ($("fix-status-lbl")) $("fix-status-lbl").innerText = `⏳ PENDING · Esperando credenciales (${$("fix-endpoint-inp")?.value})`; showGoldToast("⏳ Pasarela FIX 4.4 en estado PENDING"); };
window.recalcSigmaModelLive = () => { const p1 = parseFloat(String($("mod-param-1")?.value || "1.5").replace(",", ".")) || 1.5, p2 = parseFloat(String($("mod-param-2")?.value || "0.02").replace(",", ".")) || 0.02; if ($("sigma-model-val")) $("sigma-model-val").innerText = (p1 === 1.5 && p2 === 0.02) ? "1.6625" : (p1 * 1.115 - p2 * 0.5).toFixed(4); };
window.fixForwardFxHedge = () => { addEntry(`250 Forward FX (${$("fx-pair-sel")?.value})`, "572 Tesorería Divisas", `Cobertura ${$("fx-days-sel")?.value}`, 25000000); saveDb(); renderAll(); showGoldToast(`💱 Cobertura Forward FX fijada: ${$("fx-pair-sel")?.value}`); };
window.createInvestmentPiggyBank = () => { state.piggyCount = (state.piggyCount || 0) + 1; getUser().aum += 10000000; addEntry(`250 Hucha Inversión #${state.piggyCount}`, "572 Tesorería Fondos", `Nueva Hucha #${state.piggyCount} (+10 M€)`, 10000000); saveDb(); renderAll(); showGoldToast(`🐷 Hucha #${state.piggyCount} creada (+10,00 M€)`); };
window.exportHgcnLogTxt = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([state.hgcn.join("\n")], { type: "text/plain" })); a.download = `IH_Capital_Caja_Negra_${Date.now()}.txt`; a.click(); };
let activeCat = "ALL", ALL_252_ASSETS = [];
const CRYPTO_20 = [{s:"BTC",p:55292.00,g:1.45,bn:"BTCEUR"},{s:"ETH",p:1882.50,g:1.18,bn:"ETHEUR"},{s:"SOL",p:131.10,g:2.15,bn:"SOLEUR"},{s:"XRP",p:0.83,g:1.90,bn:"XRPEUR"},{s:"BNB",p:457.80,g:0.95,bn:"BNBEUR"},{s:"ADA",p:0.51,g:1.40,bn:"ADAEUR"},{s:"AVAX",p:23.35,g:1.65,bn:"AVAXEUR"},{s:"DOGE",p:0.17,g:2.10,bn:"DOGEEUR"},{s:"TRX",p:0.16,g:0.65,bn:"TRXEUR"},{s:"LINK",p:11.20,g:1.32,bn:"LINKEUR"},{s:"DOT",p:4.41,g:0.88,bn:"DOTEUR"},{s:"TON",p:3.91,g:1.05},{s:"POL",p:0.32,g:0.75},{s:"SHIB",p:0.000015,g:1.45},{s:"LTC",p:70.40,g:0.92,bn:"LTCEUR"},{s:"BCH",p:324.50,g:1.10,bn:"BCHEUR"},{s:"NEAR",p:3.75,g:1.50,bn:"NEAREUR"},{s:"UNI",p:7.02,g:1.20,bn:"UNIEUR"},{s:"EURC",p:1.00,g:0.00},{s:"USDT",p:0.95,g:0.00}];
const MINERALS_20 = [{s:"XAU Oro",m:"COMEX / LBMA",p:2712.40,g:0.38},{s:"XAG Plata",m:"COMEX / LBMA",p:31.85,g:0.52},{s:"XPT Platino",m:"COMEX / LME",p:968.50,g:0.21},{s:"XPD Paladio",m:"COMEX / LME",p:1018.20,g:-0.34},{s:"HG Cobre",m:"COMEX / LME",p:4.18,g:0.44},{s:"LTH Litio",m:"COMEX / LME",p:10850.00,g:0.62},{s:"COB Cobalto",m:"COMEX / LME",p:24300.00,g:0.18},{s:"ALI Aluminio",m:"COMEX / LME",p:2624.00,g:0.29},{s:"ZNC Zinc",m:"COMEX / LME",p:2995.00,g:-0.15},{s:"SN Estaño",m:"COMEX / LME",p:29150.00,g:0.41},{s:"FE Hierro",m:"COMEX / LME",p:102.40,g:0.33},{s:"U3O8 Uranio",m:"COMEX / LME",p:79.80,g:0.85},{s:"TI Titanio",m:"COMEX / LME",p:6150.00,g:0.24},{s:"RHO Rodio",m:"COMEX / LME",p:4675.00,g:-0.28},{s:"GRP Grafito",m:"COMEX / LME",p:930.00,g:0.19},{s:"ND Neodimio",m:"COMEX / LME",p:58400.00,g:0.47},{s:"MN Manganeso",m:"COMEX / LME",p:4.35,g:0.12},{s:"SI Silicio",m:"COMEX / LME",p:1880.00,g:0.31},{s:"COAL Carbón",m:"ICE / NYMEX",p:141.20,g:-0.22},{s:"NAT.GAS",m:"NYMEX",p:3.12,g:0.64}];
const FOREX_12 = [{s:"EUR/USD",p:1.0542,g:0.14},{s:"GBP/USD",p:1.2618,g:0.22},{s:"AUD/USD",p:0.6512,g:-0.18},{s:"NZD/USD",p:0.5865,g:0.11},{s:"EUR/JPY",p:162.85,g:0.35},{s:"GBP/JPY",p:194.90,g:0.28},{s:"EUR/CHF",p:0.9348,g:0.09},{s:"USD/JPY",p:154.48,g:0.21},{s:"EUR/GBP",p:0.8354,g:-0.08},{s:"USD/CHF",p:0.8867,g:0.12},{s:"USD/MXN",p:20.38,g:-0.25},{s:"USD/CNH",p:7.25,g:0.07}];
const EQUITY_20 = [{s:"ITX Inditex",m:"BME Madrid",p:53.10,g:0.64,reg:"EU"},{s:"IBE Iberdrola",m:"BME Madrid",p:13.92,g:0.48,reg:"EU"},{s:"SAN Santander",m:"BME Madrid",p:4.58,g:0.82,reg:"EU"},{s:"BBVA",m:"BME Madrid",p:9.36,g:0.71,reg:"EU"},{s:"SAP SE",m:"XETRA Fráncfort",p:223.40,g:0.55,reg:"EU"},{s:"MC.PA LVMH",m:"Euronext París",p:602.50,g:0.39,reg:"EU"},{s:"AZN.L AstraZeneca",m:"LSE Londres",p:102.40,g:0.28,reg:"EU"},{s:"ROG.SW Roche",m:"SIX Zúrich",p:258.60,g:0.34,reg:"EU"},{s:"TSLA Tesla",m:"NASDAQ 100",p:345.82,g:0.45,reg:"US"},{s:"NVDA NVIDIA",m:"NASDAQ 100",p:141.95,g:0.62,reg:"US"},{s:"AAPL Apple",m:"NASDAQ 100",p:229.87,g:0.21,reg:"US"},{s:"MSFT Microsoft",m:"NYSE / S&P 500",p:417.00,g:0.19,reg:"US"},{s:"GOOGL Alphabet",m:"NASDAQ 100",p:166.57,g:0.31,reg:"US"},{s:"AMZN Amazon",m:"NASDAQ 100",p:197.12,g:0.27,reg:"US"},{s:"INTC Intel",m:"NASDAQ 100",p:24.50,g:-0.35,reg:"US"},{s:"BA Boeing",m:"NYSE / Dow Jones",p:149.30,g:-0.18,reg:"US"},{s:"7203.T Toyota",m:"TSE Tokio",p:2685.00,g:0.65,reg:"AS"},{s:"0700.HK Tencent",m:"HKEX Hong Kong",p:408.20,g:-0.32,reg:"AS"},{s:"005930 Samsung",m:"KRX Seúl",p:56200.00,g:0.37,reg:"AS"},{s:"RELIANCE",m:"NSE Bombay",p:1265.40,g:0.61,reg:"EU"}];

(function build252Assets() {
  CRYPTO_20.forEach(x => ALL_252_ASSETS.push({ sym: x.s, cat: "CRYPTO", chamber: "CRYPTO 24/7", baseP: x.p, p: x.p, chg: x.g, bn: x.bn || "", reg: "247" }));
  MINERALS_20.forEach(x => ALL_252_ASSETS.push({ sym: x.s, cat: "MINERALS", chamber: x.m, baseP: x.p, p: x.p, chg: x.g, reg: "245" }));
  FOREX_12.forEach(x => ALL_252_ASSETS.push({ sym: x.s, cat: "FOREX", chamber: "FOREX GLOBAL", baseP: x.p, p: x.p, chg: x.g, reg: "245" }));
  for (let i = 0; i < 200; i++) {
    const b = EQUITY_20.at(i % EQUITY_20.length);
    const px = i < 20 ? b.p : +(b.p * (0.92 + (i % 7) * 0.03)).toFixed(2);
    ALL_252_ASSETS.push({ sym: i < 20 ? b.s : `${b.s.split(" ").at(0)}·${i+1}`, cat: "EQUITY", chamber: b.m, baseP: px, p: px, chg: b.g, reg: b.reg });
  }
})();

async function syncRealLiveQuotes() {
  try {
    const r = await fetch("https://binance.com");
    if (r.ok) { const arr = await r.json(), map = Object.fromEntries(arr.map(x => [x.symbol, parseFloat(x.price)])); ALL_252_ASSETS.forEach(a => { if (a.bn && map[a.bn]) { a.baseP = map[a.bn]; a.p = map[a.bn]; } }); }
  } catch {}
  try {
    const f = await fetch("https://frankfurter.app");
    if (f.ok) { const d = await f.json(), e = ALL_252_ASSETS.find(x => x.sym === "EUR/USD"); if (e && d.rates?.USD) { e.baseP = d.rates.USD; e.p = d.rates.USD; } }
  } catch {}
  updateAllLiveCellsFast(); onChamberSelectChange();
}

function updateAllLiveCellsFast() {
  document.querySelectorAll("[data-px]").forEach(el => { const a = ALL_252_ASSETS.find(x => x.sym === el.getAttribute("data-px")); if (a) el.innerText = a.p; });
  document.querySelectorAll("[data-chg]").forEach(el => { const a = ALL_252_ASSETS.find(x => x.sym === el.getAttribute("data-chg")); if (a) { el.style.color = a.chg >= 0 ? "#059669" : "#dc2626"; el.innerText = (a.chg >= 0 ? "+" : "") + a.chg + "%"; } });
  document.querySelectorAll("[data-st]").forEach(el => { const a = ALL_252_ASSETS.find(x => x.sym === el.getAttribute("data-st")); if (a) { const st = getMarketSessionInfo(a.reg); el.style.color = st.col; el.innerText = st.lbl; } });
  TOP20_WORLD_INDICES.forEach((x, idx) => { const st = getMarketSessionInfo(x.reg); if ($("idx-pts-" + idx)) $("idx-pts-" + idx).innerText = x.pts.toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " PTS"; if ($("pan-pts-" + idx)) $("pan-pts-" + idx).innerText = x.pts.toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " PTS"; if ($("idx-chg-" + idx)) { $("idx-chg-" + idx).style.color = st.col; $("idx-chg-" + idx).innerText = `${x.chg >= 0 ? "+" : ""}${x.chg.toFixed(2)}% · ${st.lbl}`; } if ($("pan-chg-" + idx)) { $("pan-chg-" + idx).style.color = st.col; $("pan-chg-" + idx).innerText = `${x.chg >= 0 ? "+" : ""}${x.chg.toFixed(2)}% (${st.lbl})`; } });
}
window.setGlobalCategoryFilter = function (cat, btn) {
  activeCat = cat || "ALL";
  document.querySelectorAll("#cat-filter-bar button").forEach(b => b.className = "btn");
  if (btn) btn.className = "btn btn-o";
  renderDualWindows();
  const names = { ALL: "Todos (252)", CRYPTO: "Criptomonedas 24/7 (20)", EQUITY: "Renta Variable (200)", MINERALS: "Minerales (20)", FOREX: "Divisas Forex (12)" };
  showGoldToast(`📊 Filtro activo: <strong>${names[activeCat] || activeCat}</strong>`);
};

function renderDualWindows() {
  const list = ALL_252_ASSETS.filter(a => activeCat === "ALL" || a.cat === activeCat);
  const buys = list.filter((a, i) => a.chg > 0 || (a.chg === 0 && i % 3 !== 2));
  const sells = list.filter((a, i) => a.chg < 0 || (a.chg === 0 && i % 3 === 2));
  if ($("buy-col-cnt")) $("buy-col-cnt").innerText = `${buys.length} órdenes activas`;
  if ($("sell-col-cnt")) $("sell-col-cnt").innerText = `${sells.length} coberturas`;
  const mkRow = (a, isBuy) => {
    const sh = Math.max(1, Math.round(75000 / a.p)), st = getMarketSessionInfo(a.reg);
    return `<tr><td><strong>${a.sym}</strong><br><small style="color:#64748b;">${a.chamber} · <span data-st="${a.sym}" style="color:${st.col};font-weight:800;">${st.lbl}</span></small></td><td><strong data-px="${a.sym}">${a.p}</strong></td><td data-chg="${a.sym}" style="color:${a.chg>=0?"#059669":"#dc2626"};font-weight:800;">${a.chg>=0?"+":""}${a.chg}%</td><td><strong>${sh.toLocaleString("es-ES")} uds.</strong></td><td><button type="button" class="btn ${isBuy?"btn-q":"btn-d"}" style="padding:2px 7px;font-size:0.72rem;" onclick="execDualMarketOrder('${isBuy?"BUY":"SELL"}','${a.sym}','${a.chamber}',${a.p},${sh})">${isBuy?"🟢 BUY":"🔴 SELL"}</button></td></tr>`;
  };
  if ($("dual-buy-tbody")) $("dual-buy-tbody").innerHTML = buys.slice(0, 60).map(a => mkRow(a, true)).join("");
  if ($("dual-sell-tbody")) $("dual-sell-tbody").innerHTML = sells.slice(0, 40).map(a => mkRow(a, false)).join("");
}

window.onChamberSelectChange = () => { const ch = $("world-chamber-select")?.value || "ALL", s = $("chamber-company-select"); if (!s) return; s.innerHTML = ALL_252_ASSETS.filter(a => ch === "ALL" || a.chamber === ch).map(a => { const st = getMarketSessionInfo(a.reg); return `<option value="${a.sym}">${a.sym} (${a.chamber}) · ${a.p} [${st.lbl}]</option>`; }).join(""); analyzeSelectedCompany(); };
window.analyzeSelectedCompany = () => { const sym = $("chamber-company-select")?.value, a = ALL_252_ASSETS.find(x => x.sym === sym) || ALL_252_ASSETS.at(0), box = $("quantum-advisor-box"); if (!box || !a) return; const sh = Math.max(1, Math.round(250000 / a.p)), st = getMarketSessionInfo(a.reg); box.innerHTML = `<strong>⚛️ DIAGNÓSTICO CUÁNTICO PARA ${a.sym} (${a.chamber}):</strong><br>• <strong>Cotización Oficial:</strong> <strong>${a.p}</strong> · Estado: <strong style="color:${st.col};">${st.lbl}</strong>.<br>• <strong>Orden Calculada (σ_ij = 1.6625):</strong> <strong>${sh.toLocaleString("es-ES")} acciones/uds.</strong> <button type="button" class="btn btn-q" style="margin-left:8px;padding:3px 10px;" onclick="execDualMarketOrder('BUY','${a.sym}','${a.chamber}',${a.p},${sh})">⚡ Ejecutar Orden</button>`; };
window.execDualMarketOrder = (side, sym, mkt, p, sh) => { const tot = +(p * sh).toFixed(2); getUser().aum += side === "BUY" ? tot : -tot; addEntry(`250 ${side} ${sh} ${sym}`, "572 Tesorería", `Orden ${side} ${sym} (${mkt})`, tot); saveDb(); renderAll(); showGoldToast(`${side === "BUY" ? "🟢" : "🔴"} Orden ${side}: ${sh} ${sym} (${fmtEur(tot)})`); };
window.claimWorldDividends = () => { state.investRunning = false; if ($("btn-hero-invest")) $("btn-hero-invest").innerText = "▶ Reanudar Cotización"; const div = 412890450; getUser().aum += div; getUser().earnedAcc += +(div * 0.75).toFixed(2); state.accAeat += +(div * 0.25).toFixed(2); addEntry("572 Dividendos Mundiales WFE", "769 Rendimientos Globales", "Abono Dividendos Mundiales (75%/25%)", div); saveDb(); renderAll(); showGoldToast(`💎 Dividendos abonados: ${fmtEur(div)}`); };

function wireAll() {
  document.querySelectorAll(".nav-tabs .tab-btn").forEach(b => b.onclick = () => { const t = b.getAttribute("data-tab"); document.querySelectorAll(".panel").forEach(p => p.classList.remove("active")); document.querySelectorAll(".nav-tabs .tab-btn").forEach(x => x.classList.remove("active")); if ($(t)) $(t).classList.add("active"); b.classList.add("active"); playTone(740, 0.08); });
  if ($("btn-es")) $("btn-es").onclick = () => applyLang("ES"); if ($("btn-en")) $("btn-en").onclick = () => applyLang("EN");
  if ($("btn-audio")) $("btn-audio").onclick = () => { state.audio = !state.audio; $("btn-audio").innerText = state.audio ? "🔊 Audio ON" : "🔇 Audio OFF"; };
  if ($("btn-refresh")) $("btn-refresh").onclick = () => { refreshRealMarketsFeed(); };
  if ($("btn-panic")) $("btn-panic").onclick = toggleGlobalKillSwitch; if ($("btn-liq-yield")) $("btn-liq-yield").onclick = executeYield;
  if ($("btn-new-cycle")) $("btn-new-cycle").onclick = () => { state.yieldPool = 100000000; state.initialCap = 100000000000; state.investRunning = true; if ($("btn-hero-invest")) $("btn-hero-invest").innerText = "⏸ Parar para Retirar"; saveDb(); renderAll(); showGoldToast("⚡ Nuevo ciclo sobre 100.000.000.000M €"); };
  if ($("btn-push-bank")) $("btn-push-bank").onclick = transferAccumulatedToBank; if ($("btn-copilot")) $("btn-copilot").onclick = runSemanticUniversal;
  if ($("copilot-inp")) $("copilot-inp").onkeydown = e => { if (e.key === "Enter") runSemanticUniversal(); };
  if ($("btn-reg-user")) $("btn-reg-user").onclick = () => { createOrSelectHolderByName($("kyc-name")?.value, $("kyc-nif")?.value, $("kyc-country")?.value, $("kyc-address")?.value, $("kyc-heir")?.value); $("kyc-name").value = ""; $("kyc-nif").value = ""; };
  if ($("btn-taxfree-switch")) $("btn-taxfree-switch").onclick = execTaxFreeSwitch; if ($("btn-settle-aeat")) $("btn-settle-aeat").onclick = transferAccumulatedToBank;
  if ($("btn-xls")) $("btn-xls").onclick = downloadExcel; if ($("btn-doc-dfi")) $("btn-doc-dfi").onclick = () => downloadWord("FOLLETO_DFI_MEMORIA", "");
  if ($("btn-doc-cert")) $("btn-doc-cert").onclick = () => downloadWord("CERTIFICADO_TRASPASO_BANCO", ""); if ($("btn-doc-custom")) $("btn-doc-custom").onclick = () => downloadWord("DOCUMENTO_OFICIAL", ($("office-editor") || {}).value || "");
  if ($("user-switcher")) $("user-switcher").onchange = function () { state.activeId = this.value; saveDb(); renderAll(); };
  if ($("markets-search-inp")) $("markets-search-inp").oninput = function () { renderTop20Markets(this.value); };
  if ($("btn-open-ih-bank")) $("btn-open-ih-bank").onclick = () => { bankTabRef = window.open(BANK_PORTAL_URL, "INFINITYHUNT_BANK_TAB"); };
  if ($("btn-send-custom")) $("btn-send-custom").onclick = () => sendPayloadToQuantumBank($("bridge-custom-amt")?.value, `Retirada Ejecutiva · ${$("bridge-holder-name")?.value}`, $("bridge-holder-name")?.value);
  if ($("bridge-holder-name")) $("bridge-holder-name").oninput = function () { const f = state.users.find(x => x.name.toLowerCase() === this.value.trim().toLowerCase()); if (f) { state.activeId = f.id; renderAll(); } };
}
function renderAll() {
  const worldOpts = ALL_WORLD_ISO.map(iso => ({ iso, name: getWorldRule(iso).label })).sort((a, b) => a.name.localeCompare(b.name, "es")).map(x => `<option value="${x.iso}">🌍 ${x.name} (${getWorldRule(x.iso).cur})</option>`).join("");
  document.querySelectorAll(".world-country-select").forEach(s => { if (!s.options.length) s.innerHTML = worldOpts; });
  const u = getUser(), rule = getWorldRule(u.country);
  if ($("user-switcher")) $("user-switcher").innerHTML = state.users.map(x => `<option value="${x.id}"${x.id === u.id ? " selected" : ""}>${x.name} (${x.nif}) · ${x.country}</option>`).join("");
  if ($("bridge-holder-name") && document.activeElement !== $("bridge-holder-name")) $("bridge-holder-name").value = u.name;
  if ($("hero-initial-cap")) $("hero-initial-cap").innerText = `${Math.floor(Number(state.initialCap || 100000000000)).toLocaleString("es-ES")}M €`;
  if ($("kpi-total")) $("kpi-total").innerText = fmtEur(u.aum) + fmtLocal(u.aum, rule);
  if ($("kpi-iban")) $("kpi-iban").innerText = `IBAN INFINITYHUNT_CUANTUM_BANK: ${u.iban} · Traspasado: ${fmtEur(u.transferredBank)}`;
  if ($("acc-holder-val")) $("acc-holder-val").innerText = `${fmtEur(u.earnedAcc)}${fmtLocal(u.earnedAcc, rule)} (${u.name})`;
  if ($("acc-aeat-val")) $("acc-aeat-val").innerText = fmtEur(state.accAeat);
  if ($("identified-holder-name")) $("identified-holder-name").innerText = `👤 ${u.name} (${u.nif} · ${rule.label})`;
  if ($("identified-holder-meta")) $("identified-holder-meta").innerText = `${u.qid} · ${u.iban}`;
  if ($("home-holder-details")) $("home-holder-details").innerHTML = `<strong>${u.name}</strong> · DNI/ID: <strong>${u.nif}</strong> · Domicilio: ${u.city}<br>IBAN INFINITYHUNT_CUANTUM_BANK: <strong style="color:#059669;">${u.iban}</strong> · Cuenta AEAT: <strong style="color:#dc2626;">${state.aeatIban}</strong> · Huchas Blindadas: <strong>${state.piggyCount || 0} (${fmtEur((state.piggyCount || 0) * 10000000)})</strong>`;
  if ($("holder-chips")) $("holder-chips").innerHTML = state.users.map(x => `<button type="button" class="tab-btn ${x.id === u.id ? "active" : ""}" onclick="state.activeId='${x.id}';saveDb();renderAll();">👤 ${x.name} (${fmtEur(x.earnedAcc)})</button>`).join("");
  if ($("users-registry")) $("users-registry").innerHTML = state.users.map(x => `<div style="padding:5px 0;border-bottom:1px solid #e2e8f0;">• <strong>${x.name}</strong> (${x.nif} · ${x.country}) · IBAN: <strong style="color:#059669;">${x.iban}</strong> · Sucesión: <em>${x.heir || "Legal Directa"}</em></div>`).join("");
  if ($("ledger-tbody")) $("ledger-tbody").innerHTML = state.ledger.slice().reverse().map(r => `<tr><td>#${r.id}</td><td>${r.date}</td><td><strong>${r.acc}</strong></td><td>${r.desc}</td><td style="color:#059669;">${fmtEur(r.debe)}</td><td style="color:#dc2626;">${fmtEur(r.haber)}</td></tr>`).join("") || "<tr><td colspan='6'>Sin asientos contables aún.</td></tr>";
  if ($("hgcn-stream")) $("hgcn-stream").innerHTML = state.hgcn.map(l => `<div>${l}</div>`).join("");
  if ($("hgcn-stream-home")) $("hgcn-stream-home").innerHTML = state.hgcn.map(l => `<div>${l}</div>`).join("");
}

let tickStep = 0;
function startCryptoTurboWebSocket() { try { const ws = new WebSocket("wss://://binance.com"); ws.onmessage = ev => { if (state.panic || !state.investRunning) return; const arr = JSON.parse(ev.data), map = Object.fromEntries(arr.map(x => [x.s, parseFloat(x.c)])); ALL_252_ASSETS.slice(0, 18).forEach(c => { if (c.bn && map[c.bn]) { c.baseP = map[c.bn]; c.p = map[c.bn]; } }); }; } catch {} }

document.addEventListener("DOMContentLoaded", () => {
  wireAll(); renderAll(); renderTop20Indices(); renderTop20Markets(""); renderDualWindows(); syncRealLiveQuotes(); startCryptoTurboWebSocket();
  const chSel = $("world-chamber-select"); if (chSel) { const chs = ["ALL", ...new Set(ALL_252_ASSETS.map(a => a.chamber))]; chSel.innerHTML = chs.map(c => `<option value="${c}">${c === "ALL" ? "🌐 Todas las Cámaras y Mercados del Mundo (252)" : "🏛️ " + c}</option>`).join(""); onChamberSelectChange(); }
  function quantumTurboLoop() {
    tickStep++;
    if (state.investRunning && !state.panic) {
      const cur = Math.max(100000000000, Number(state.initialCap) || 100000000000); state.initialCap = cur + Math.floor(380 + Math.random() * 1450);
      const inc = Math.floor(95000000 + Math.random() * 290000000); state.dailyFlow = (Number(state.dailyFlow) || 18026945704) + inc;
      if (state.yieldPool < 1000000000) state.yieldPool = Math.min(1000000000, state.yieldPool + Math.floor(inc * 0.35));
      if ($("hero-initial-cap")) $("hero-initial-cap").innerText = `${state.initialCap.toLocaleString("es-ES")}M €`;
      if ($("hero-daily-flow")) $("hero-daily-flow").innerText = Number(state.dailyFlow).toLocaleString("es-ES") + " €";
      if ($("billions-daily-live")) $("billions-daily-live").innerHTML = `${(10000000000000 + (state.dailyFlow % 999999999)).toLocaleString("es-ES",{minimumFractionDigits:2})} € <small style="font-size:0.78rem;color:#64748b;">(10 Billones € · Flujo proyectado en tiempo real)</small>`;
      if ($("hero-world-sweep")) $("hero-world-sweep").innerText = `🌐 SUPERPOSICIÓN 30 Hz: Europa [🟢 ABIERTA] · EE.UU. [🟡 PRE-MARKET / 15:30] · Cripto EUR [🟢 24/7] · 0,004 ms`;
      const crBuy = ALL_252_ASSETS.at(tickStep % 9), euSell = ALL_252_ASSETS.at(52 + (tickStep % 8));
      if ($("hero-buy-live")) $("hero-buy-live").innerText = `BUY ${crBuy.sym} @ ${crBuy.p} € [🟢 LIVE 30Hz] · 0.004 ms`;
      if ($("hero-sell-live")) $("hero-sell-live").innerText = `SELL ${euSell.sym} @ ${euSell.p} € [🟢 SESIÓN ABIERTA] · 0.004 ms`;
      if ($("q-yield-val")) $("q-yield-val").innerText = state.yieldPool >= 1000000000 ? "1.000,00 M€ (✅ CORTE LISTO)" : `${(state.yieldPool / 1e6).toFixed(2)} M€`;
      if (tickStep % 2 === 0) {
        TOP20_WORLD_INDICES.forEach(x => { const d = (Math.random() - 0.495) * 0.0022; x.pts = +(x.base * (1 + d)).toFixed(2); x.chg = +(((x.pts - x.base) / x.base) * 100).toFixed(2); });
        TOP20_FUNDS.forEach((f, idx) => { const d = (Math.random() - 0.495) * 0.0025; f.p = idx === 19 ? ALL_252_ASSETS.at(0).p : +(f.b * (1 + d)).toFixed(2); f.v = idx === 19 ? ALL_252_ASSETS.at(0).chg : +(((f.p - f.b) / f.b) * 100).toFixed(2); if ($("fund-px-" + idx)) $("fund-px-" + idx).innerText = f.p.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + f.c; if ($("fund-var-" + idx)) { $("fund-var-" + idx).style.color = f.v >= 0 ? "#059669" : "#dc2626"; $("fund-var-" + idx).innerText = (f.v >= 0 ? "+" : "") + f.v.toFixed(2) + "%"; } });
        ALL_252_ASSETS.forEach(a => { const d = (Math.random() - 0.495) * 0.0024; a.p = +(a.baseP * (1 + d)).toFixed(a.baseP < 1 ? 4 : 2); a.chg = +(((a.p - a.baseP) / a.baseP) * 100).toFixed(2); });
        updateAllLiveCellsFast();
      }
    }
    if (tickStep % 60 === 0) { const fmtT = tz => new Intl.DateTimeFormat("es-ES", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()); if ($("world-markets-clocks")) $("world-markets-clocks").innerText = `🇪🇸 Madrid: ${fmtT("Europe/Madrid")} [${getMarketSessionInfo("EU").lbl}] · 🇺🇸 NY: ${fmtT("America/New_York")} [${getMarketSessionInfo("US").lbl}] · 🇯🇵 Tokio: ${fmtT("Asia/Tokyo")} [${getMarketSessionInfo("AS").lbl}] · 🪙 Cripto EUR: [🟢 24/7]`; }
    requestAnimationFrame(quantumTurboLoop);
  }
  requestAnimationFrame(quantumTurboLoop);
});

const REVERSE_FROM_BANK = new BroadcastChannel("INFINITYHUNT_TO_CPUUI_PORTFOLIO");
function receiveOrderFromQuantumBank(ord) {
  if (!ord || !ord.orderId || localStorage.getItem("LAST_IH_BANK_ORD") === ord.orderId) return;
  localStorage.setItem("LAST_IH_BANK_ORD", ord.orderId);
  const amt = parseSmartAmt(ord.amountEur);
  if (!amt) return;
  const u = createOrSelectHolderByName(ord.holderName, ord.dni, "ES");
  u.aum = +(Number(u.aum || 0) + amt).toFixed(2);
  addEntry(`572 Recepción INFINITYHUNT_CUANTUM_BANK (${u.name})`, `250 Suscripción ${ord.asset}`, `Orden recibida desde Banco [${ord.orderId}]`, amt);
  addHgcn("BANK-TO-CAP", `Orden ${ord.orderId} · ${u.name} invierte ${fmtEur(amt)} en ${ord.asset}`);
  saveDb(); renderAll(); playTone(940, 0.16);
  showGoldToast(`🏦 Orden recibida del Banco: <strong>${u.name}</strong> invierte <strong>${fmtEur(amt)}</strong> en <strong>${ord.asset}</strong>`);
}
REVERSE_FROM_BANK.onmessage = e => receiveOrderFromQuantumBank(e.data);
window.addEventListener("storage", e => { if (e.key === "INFINITYHUNT_TO_CPUUI_ORDER" && e.newValue) try { receiveOrderFromQuantumBank(JSON.parse(e.newValue)); } catch {} });
