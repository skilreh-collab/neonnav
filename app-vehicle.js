// NeonNav – Audio & Sprache, XP/Level, Fahrzeug & Kosten, Garage
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   AUDIO, SPRACHE, VIBRATION
   ================================================================= */
let actx = null, muted = store.get(LS.mute, false), speechUnlocked = false, voiceDE = null;

function unlockAudio() {
  try {
    if (!actx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) {
        actx = new C();
        const b = actx.createBuffer(1, 1, 22050), s = actx.createBufferSource();
        s.buffer = b; s.connect(actx.destination); s.start(0);
      }
    }
    if (actx && actx.state === 'suspended') actx.resume();
    if (!speechUnlocked && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); speechUnlocked = true;
    }
  } catch (e) {}
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });

function tone(freq, dur, when = 0, vol = .85, type = 'square') {
  if (!actx || muted) return;
  const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + .01);
  g.gain.setValueAtTime(vol, t + dur - .03);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + .02);
}
function alarmSound(stage) { unlockAudio(); const n = stage === 2 ? 5 : 3; for (let i = 0; i < n; i++) tone(stage === 2 ? 1650 : 1200, .16, i * .24); }
function jingle() { unlockAudio(); [660, 880, 1100, 1320].forEach((f, i) => tone(f, .14, i * .11, .5, 'triangle')); }

// Stimme: weiblich/männlich. Browser liefern kein Geschlecht – daher Zuordnung über bekannte Stimmnamen
// (iOS/macOS, Windows/Edge, Android). Gibt es keine passende Stimme, wird die Tonhöhe angepasst.
let voicePref = store.get(LS.voice, 'female'), voiceMatched = false;
const VOICE_NAMES = {
  female: /(Samantha|Karen|Moira|Tessa|Serena|Kate|Allison|Ava|Zoe|Victoria|M[oó]nica|Paulina|Marisol|Am[eé]lie|Audrey|Aur[eé]lie|Alice|Federica|Paola|Yelda|Anna|Helena|Petra|Marlene|Vicki|Katja|Amala|Seraphina|Hedda|Elke|Leonie|Louisa|Tanja|Ingrid|Sandy|Shelley|Grandma|Google Deutsch|weiblich|female|de-de-x-(dea|deb|nfh)|#female)/i,
  male: /(Daniel|Arthur|Oliver|Aaron|Fred|Jorge|Diego|Juan|Thomas|Nicolas|Luca|Cem|Markus|Martin|Yannick|Viktor|Hans|Conrad|Killian|Florian|Stefan|Ralf|Jonas|Bernd|Eddy|Reed|Rocko|Grandpa|\bFlo\b|männlich|\bmale|de-de-x-(deg|deh)|#male)/i
};
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(LANG));
  // Höhere Qualität bevorzugen (Premium/Erweitert/Enhanced/Neural)
  const q = v => (/(premium)/i.test(v.name) ? 3 : /(erweitert|enhanced|neural|natural|online)/i.test(v.name) ? 2 : 0) + (v.lang.replace('_', '-').toLowerCase() === LOC.toLowerCase() ? 1 : 0);
  const sorted = vs.slice().sort((a, b) => q(b) - q(a));
  const other = voicePref === 'male' ? 'female' : 'male';
  const hit = sorted.find(v => VOICE_NAMES[voicePref].test(v.name) && !VOICE_NAMES[other].test(v.name));
  voiceMatched = !!hit;
  voiceDE = hit || sorted.find(v => !VOICE_NAMES[other].test(v.name)) || sorted[0] || null;
  if (!$('settingsModal').classList.contains('hidden')) renderPrefs();
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

function speak(text) {
  if (muted || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOC; if (voiceDE) u.voice = voiceDE; u.rate = 1.03;
    if (!voiceMatched) u.pitch = voicePref === 'male' ? 0.7 : 1.1;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function renderMute() { $('muteBtn').textContent = muted ? '🔇' : '🔊'; }

/* =================================================================
   XP / LEVEL
   ================================================================= */
let xp = store.get(LS.xp, 0);
const levelOf = x => Math.floor(Math.sqrt(x / 40)) + 1;
const xpFor = l => 40 * (l - 1) ** 2;
function renderXP() {
  const l = levelOf(xp), a = xpFor(l), b = xpFor(l + 1);
  $('lvl').textContent = l;
  $('xpText').textContent = `${Math.floor(xp)} XP`;
  $('xpBar').style.width = `${clamp((xp - a) / (b - a) * 100, 0, 100)}%`;
  $('rank').textContent = RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 2))];
}
function addXP(n) {
  const before = levelOf(xp);
  xp += n;
  store.set(LS.xp, xp);
  renderXP();
  const after = levelOf(xp);
  if (after > before) {
    setTimeout(() => { toast(`⭐ ${L('LEVEL UP!')} Level ${after} – ${$('rank').textContent}`); jingle(); vibrate([60, 40, 60, 40, 140]); }, 400);
  }
}

/* =================================================================
   FAHRZEUG, VERBRAUCH & KOSTEN
   ================================================================= */
const KINDS = [
  { id: 'car',   icon: '🚗', label: L('Auto') },
  { id: 'moto',  icon: '🏍️', label: L('Motorrad') },
  { id: 'ebike', icon: '⚡', label: L('E-Bike') },
  { id: 'scooter', icon: '🛴', label: L('E-Roller') },
  { id: 'bike',  icon: '🚲', label: L('Fahrrad') },
  { id: 'foot',  icon: '🚶', label: L('Zu Fuß') }
];
const FUELS = { e5: 'Super E5', e10: 'Super E10', diesel: 'Diesel', electric: L('Elektro') };
// Richtwerte (Herstellerangaben, gerundet) – L/100 km bzw. kWh/100 km
const PRESETS = {
  'car:benzin': [['VW Golf 1.5 TSI', 5.6], ['VW Polo 1.0 TSI', 5.3], ['Opel Corsa 1.2', 5.4], ['Skoda Octavia 1.5 TSI', 5.7], ['Ford Puma 1.0 EcoBoost', 5.6],
                 ['Toyota Yaris Hybrid', 4.0], ['Toyota Corolla Hybrid', 4.5], ['Fiat 500 Hybrid', 5.3], ['Seat Leon 1.5 TSI', 5.7], ['BMW 320i', 6.4],
                 ['Mercedes C 200', 6.8], ['Audi A4 40 TFSI', 6.6], ['VW Tiguan 1.5 TSI', 7.0], ['Dacia Sandero TCe 90', 5.4], ['Porsche 911 Carrera', 10.5]],
  'car:diesel': [['VW Golf 2.0 TDI', 4.6], ['Skoda Octavia 2.0 TDI', 4.7], ['VW Passat 2.0 TDI', 5.0], ['BMW 320d', 5.0], ['Mercedes C 220 d', 5.1],
                 ['Audi A4 35 TDI', 4.9], ['Audi A6 40 TDI', 5.6], ['BMW X3 20d', 6.0], ['VW Tiguan 2.0 TDI', 5.9], ['VW Transporter T6.1 TDI', 8.0]],
  'car:electric': [['Tesla Model 3', 14.5], ['Tesla Model Y', 16.0], ['VW ID.3', 16.5], ['VW ID.4', 18.0], ['Skoda Enyaq', 17.5], ['Hyundai Kona Elektro', 15.5],
                   ['Kia EV6', 18.0], ['BMW i4', 17.0], ['Renault Zoe', 17.5], ['Fiat 500e', 14.5], ['Mercedes EQA', 17.5], ['BYD Atto 3', 16.5]],
  'moto:benzin': [['Vespa / Roller 125', 2.5], ['Yamaha MT-07', 4.3], ['Honda CB500', 3.6], ['KTM 390 Duke', 3.4], ['BMW R 1250 GS', 4.8], ['Harley-Davidson Softail', 5.6]],
  'moto:electric': [['E-Roller (45 km/h)', 4.0], ['Zero SR/F', 9.0]],
  // E-Bikes & E-Roller: [Modell, kWh/100 km, Akku in Wh] – Verbrauch im mittleren Unterstützungsmodus
  // Fatbike: breite Reifen rollen schwerer – mehr Verbrauch als ein normales E-Bike
  'ebike:electric': [['E-Fatbike W66 (625 Wh)', 1.4, 625], ['Pedelec / E-Bike (500 Wh)', 1.0, 500], ['Pedelec / E-Bike (625 Wh)', 1.0, 625], ['Pedelec / E-Bike (750 Wh)', 1.05, 750],
                     ['City-E-Bike (400 Wh)', 0.9, 400], ['E-Mountainbike (625 Wh)', 1.3, 625], ['E-Mountainbike (750 Wh)', 1.35, 750],
                     ['Lasten-E-Bike (545 Wh)', 1.4, 545], ['S-Pedelec (45 km/h, 625 Wh)', 2.0, 625]],
  'scooter:electric': [['Xiaomi Electric Scooter 4 Pro', 1.6, 446], ['Xiaomi Electric Scooter 4', 1.5, 275], ['Segway Ninebot Max G30D', 1.5, 551],
                       ['Segway Ninebot Max G2 D', 1.5, 551], ['Segway Ninebot F2 Plus D', 1.4, 477], ['NIU KQi3 Pro', 1.4, 365],
                       ['VMAX VX2 Pro', 1.5, 556], ['E-Roller allgemein', 1.5, 400]]
};
const DEFAULT_PRICES = { e5: 1.85, e10: 1.79, diesel: 1.72, kwh: 0.36, updated: 0, source: 'default' };
const CO2 = { e5: 2.37, e10: 2.30, diesel: 2.65, electric: 0.38 }; // kg CO₂ pro L bzw. kWh (Strommix grob)

let vehicle = store.get(LS.vehicle, { kind: 'car', fuel: 'e5', model: 'VW Golf 1.5 TSI', cons: 5.6 });
let prices = Object.assign({}, DEFAULT_PRICES, store.get(LS.prices, {}));
let tkKey = store.get(LS.tk, '');

const kindInfo = k => KINDS.find(x => x.id === k) || KINDS[0];
const isFree = v => v.kind === 'bike' || v.kind === 'foot';
// E-Roller fahren auf Radwegen – also Fahrrad-Routing
const profileOf = v => (v.kind === 'bike' || v.kind === 'ebike' || v.kind === 'scooter') ? 'bike' : v.kind === 'foot' ? 'foot' : 'car';
const isLightEV = v => (v.kind === 'ebike' || v.kind === 'scooter') && +v.batt > 0;
const canExplore = v => v.kind === 'bike' || v.kind === 'ebike' || v.kind === 'scooter';
// Reichweite in km mit dem angegebenen Ladestand; 10 % Puffer für Steigungen, Wind und Kälte
function rangeKm(v = vehicle, charge = v.charge != null ? v.charge : 100) {
  if (!isLightEV(v) || !(+v.cons > 0)) return null;
  const whPerKm = +v.cons * 10;
  return Math.max(0, (+v.batt * clamp(charge, 0, 100) / 100) * .9 / whPerKm);
}
// Akkuverbrauch einer Strecke in Prozent
function chargeUsed(m, v = vehicle) {
  if (!isLightEV(v)) return 0;
  return (m / 1000) * (+v.cons * 10) / +v.batt * 100;
}
const fmtKm = km => km < 10 ? km.toFixed(1).replace('.', DEC) : String(Math.round(km));
const fmtEur = e => e.toLocaleString(LOC, { style: 'currency', currency: 'EUR' });
const presetKey = (kind, fuel) => `${kind}:${fuel === 'electric' ? 'electric' : (fuel === 'diesel' ? 'diesel' : 'benzin')}`;
// Zahlen deutsch anzeigen (Komma) und tolerant einlesen (Komma oder Punkt)
const fmtDec = v => (v == null || v === '' ? '' : String(v).replace('.', DEC));
const parseDec = s => parseFloat(String(s).trim().replace(',', '.'));

// Auto-Datenbank aus cars.js: { Marke: { benzin: [[Modell, Verbrauch]], diesel: [...], electric: [...] } }
const CARS = (() => {
  const db = {}, cats = { b: 'benzin', d: 'diesel', e: 'electric' };
  const cmp = (a, b) => a[0].localeCompare(b[0], 'de', { numeric: true, sensitivity: 'base' });
  Object.entries(window.NN_CARS || {}).forEach(([brand, groups]) => {
    db[brand] = {};
    Object.entries(groups).forEach(([k, s]) => {
      db[brand][cats[k]] = s.split('|').map(e => {
        const i = e.lastIndexOf(':');
        return [e.slice(0, i).trim(), parseFloat(e.slice(i + 1))];
      }).filter(([n, c]) => n && c > 0).sort(cmp);
    });
  });
  return db;
})();
const fuelCat = fuel => presetKey('car', fuel).split(':')[1];
const brandsFor = fuel => Object.keys(CARS).filter(b => (CARS[b][fuelCat(fuel)] || []).length).sort((a, b) => a.localeCompare(b, 'de'));
// Modellliste für Fahrzeugtyp/Antrieb (bei Autos je Marke), Namen inkl. Marke
function modelList(kind, fuel, brand) {
  if (kind !== 'car') return PRESETS[presetKey(kind, fuel)] || [];
  return ((CARS[brand] || {})[fuelCat(fuel)] || []).map(([n, c]) => [`${brand} ${n}`, c]);
}
// Marke zu einem gespeicherten Modellnamen finden (auch für ältere Einträge)
function brandOf(model, fuel) {
  const brands = brandsFor(fuel);
  return brands.find(b => modelList('car', fuel, b).some(([n]) => n === model))
    || brands.find(b => String(model || '').startsWith(b + ' ')) || null;
}

function speedFactor(kind, avg) {
  if (kind !== 'car' && kind !== 'moto') return 1;
  if (avg > 120) return 1.3; if (avg > 100) return 1.15; if (avg < 25) return 1.15;
  return 1;
}
// Kosten für eine Strecke (m) bei Ø-Geschwindigkeit (km/h)
function costFor(m, avgKmh, v = vehicle) {
  const km = m / 1000;
  if (v.kind === 'bike') return { eur: 0, co2: 0, text: '0 €', extra: `🔥 ~${Math.round(km * 25)} kcal` };
  if (v.kind === 'foot') return { eur: 0, co2: 0, text: '0 €', extra: `🔥 ~${Math.round(km * 55)} kcal` };
  const elec = v.fuel === 'electric';
  const amount = km * (+v.cons || 0) / 100 * speedFactor(v.kind, avgKmh || 50);
  const price = elec ? prices.kwh : prices[v.fuel];
  const eur = amount * (+price || 0), unit = elec ? 'kWh' : 'L';
  const co2 = amount * (CO2[v.fuel] || 2.37);
  return { eur, co2, text: fmtEur(eur), extra: `${amount.toFixed(amount < 10 ? 1 : 0).replace('.', DEC)} ${unit} · ${co2.toFixed(co2 < 10 ? 1 : 0).replace('.', DEC)} kg CO₂` };
}
function vehicleLabel(v = vehicle) {
  if (isFree(v)) return `${kindInfo(v.kind).icon} ${kindInfo(v.kind).label}`;
  return `${kindInfo(v.kind).icon} ${v.model || kindInfo(v.kind).label}`;
}
function renderVehicleBtn() { $('garageBtn').textContent = kindInfo(vehicle.kind).icon; }

/* --- Garage-Dialog --- */
let draft = null;
function openGarage() {
  draft = Object.assign({}, vehicle);
  if (draft.kind === 'car' && !draft.brand) draft.brand = brandOf(draft.model, draft.fuel) || 'VW';
  $('pE5').value = fmtDec(prices.e5); $('pE10').value = fmtDec(prices.e10); $('pDiesel').value = fmtDec(prices.diesel); $('pKwh').value = fmtDec(prices.kwh);
  $('tkKey').value = tkKey;
  renderPriceStamp(); renderGarage();
  $('garageModal').classList.remove('hidden');
}

/* --- Einstellungen-Dialog (Änderungen gelten sofort) --- */
function openSettings() {
  $('osmToggle').checked = osmEnabled;
  $('poiToggle').checked = poisEnabled;
  renderCams(); renderPrefs();
  $('settingsModal').classList.remove('hidden');
}
function closeSettings() { $('settingsModal').classList.add('hidden'); }
function setOsmEnabled(on) {
  if (on === osmEnabled) return;
  osmEnabled = on; store.set(LS.osm, osmEnabled); renderCams();
  if (osmEnabled) { osmArea = null; osmAreaAt = 0; maybeLoadCamsArea(); }
}
function renderPrefs() {
  const tab = (on, html) => `class="h-12 rounded-xl text-xs font-bold border ${on ? 'border-cyan-300 bg-cyan-400/15 text-white' : 'border-slate-700 bg-slate-900 text-slate-400'}">${html}`;
  const themes = [['auto', '🌗 ' + L('Automatik')], ['day', '☀️ ' + L('Hell')], ['night', '🌙 ' + L('Dunkel')]];
  $('themeTabs').innerHTML = themes.map(([k, l]) => `<button data-t="${k}" ${tab(themePref === k, l)}</button>`).join('');
  $('themeTabs').querySelectorAll('button').forEach(b => b.onclick = () => { themePref = b.dataset.t; store.set(LS.theme, themePref); applyTheme(); renderPrefs(); });
  const p = S.pos || DEFAULT_POS, st = sunTimes(new Date(), p.lat, p.lng);
  $('themeInfo').textContent = themePref !== 'auto' ? L('Feste Ansicht – unabhängig von der Uhrzeit.')
    : st.polar ? L('Automatisch nach Sonnenstand.')
    : L('Automatisch: hell ab Sonnenaufgang ({a}), dunkel ab Sonnenuntergang ({b}).', { a: timeStr(st.rise), b: timeStr(st.set) });
  // Sprache: Wechsel lädt die App neu (alle Texte, Ansagen und Formate)
  $('langTabs').innerHTML = Object.entries(I18N.langs).map(([k, l]) => `<button data-l="${k}" ${tab(LANG === k, `${l.flag} ${esc(l.name)}`)}</button>`).join('');
  $('langTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.l === LANG) return;
    if (S.mode === 'nav' || S.mode === 'free') { toast(L('Während der Fahrt nicht möglich')); return; }
    store.set(LS.lang, b.dataset.l);
    location.reload();
  });
  const voices = [['female', '👩 ' + L('Weiblich')], ['male', '👨 ' + L('Männlich')]];
  $('voiceTabs').innerHTML = voices.map(([k, l]) => `<button data-v="${k}" ${tab(voicePref === k, l)}</button>`).join('');
  $('voiceTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    voicePref = b.dataset.v; store.set(LS.voice, voicePref);
    if ('speechSynthesis' in window) pickVoice();
    renderPrefs(); testVoice();
  });
  const name = voiceDE ? voiceDE.name : L('Systemstimme');
  $('voiceInfo').innerHTML = voiceMatched ? `${L('Stimme')}: ${esc(name)}`
    : L('Keine passende {g} Stimme installiert – {name} mit angepasster Tonhöhe.', { g: L(voicePref === 'male' ? 'männliche' : 'weibliche'), name: esc(name) })
      + '<br>' + L('Tipp iPhone: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → {lang}', { lang: LINFO.name });
}
function testVoice() {
  unlockAudio();
  if (muted) { toast(L('Ton ist aus – erst 🔊 einschalten')); return; }
  speak(L('In 300 Metern rechts abbiegen.'));
}
function closeGarage() { $('garageModal').classList.add('hidden'); }
function renderPriceStamp() {
  $('priceStamp').textContent = prices.source === 'tankerkoenig' && prices.updated
    ? `Live · ${timeStr(new Date(prices.updated))} · ${L('{n} Tankstellen', { n: prices.stations || '?' })}`
    : prices.source === 'manual' ? L('Eigene Werte') : L('Standardwerte – bitte anpassen');
}
function renderGarage() {
  const tabBtn = (on, html) => `class="h-14 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border ${on ? 'border-cyan-300 bg-cyan-400/15 text-white' : 'border-slate-700 bg-slate-900 text-slate-400'}">${html}`;
  $('kindTabs').innerHTML = KINDS.map(k => `<button data-k="${k.id}" ${tabBtn(draft.kind === k.id, `<span class="text-lg">${k.icon}</span>${k.label}`)}</button>`).join('');
  $('kindTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
    draft.kind = b.dataset.k;
    if (draft.kind === 'ebike' || draft.kind === 'scooter') draft.fuel = 'electric';
    if (draft.kind === 'moto' && !['e5', 'e10', 'electric'].includes(draft.fuel)) draft.fuel = 'e5';
    if (draft.kind === 'car' && !draft.fuel) draft.fuel = 'e5';
    pickFirstPreset(); renderGarage();
  });
  const fuels = draft.kind === 'car' ? ['e5', 'e10', 'diesel', 'electric'] : draft.kind === 'moto' ? ['e5', 'e10', 'electric'] : [];
  $('fuelWrap').classList.toggle('hidden', !fuels.length);
  $('fuelTabs').style.gridTemplateColumns = `repeat(${Math.max(fuels.length, 1)},minmax(0,1fr))`;
  $('fuelTabs').innerHTML = fuels.map(f => `<button data-f="${f}" ${tabBtn(draft.fuel === f, FUELS[f])}</button>`).join('');
  $('fuelTabs').querySelectorAll('button').forEach(b => b.onclick = () => { draft.fuel = b.dataset.f; pickFirstPreset(); renderGarage(); });

  const free = isFree(draft);
  $('modelWrap').classList.toggle('hidden', free);
  $('noCostInfo').classList.toggle('hidden', !free);
  const isCar = draft.kind === 'car';
  $('brandWrap').classList.toggle('hidden', free || !isCar);
  if (!free) {
    if (isCar) {
      const brands = brandsFor(draft.fuel);
      if (!brands.includes(draft.brand)) draft.brand = brands[0];
      $('brandSel').innerHTML = brands.map(b => `<option value="${esc(b)}" ${draft.brand === b ? 'selected' : ''}>${esc(b)} (${modelList('car', draft.fuel, b).length})</option>`).join('');
    }
    const list = modelList(draft.kind, draft.fuel, draft.brand);
    // Bei Autos steht die Marke schon oben – im Modellmenü nur Modell + Motor zeigen
    const short = n => isCar && n.startsWith(draft.brand + ' ') ? n.slice(draft.brand.length + 1) : n;
    $('modelSel').innerHTML = list.map(([n, c]) => `<option value="${esc(n)}" ${draft.model === n ? 'selected' : ''}>${esc(short(n))} · ${fmtDec(c)}</option>`).join('')
      + `<option value="__custom" ${list.some(([n]) => n === draft.model) ? '' : 'selected'}>✏️ ${L('Eigenes Fahrzeug')}</option>`;
    $('consInput').value = fmtDec(draft.cons);
    $('consUnit').textContent = draft.fuel === 'electric' ? 'kWh / 100 km' : 'L / 100 km';
  }
  // Akku & Reichweite nur bei E-Bike und E-Roller
  const light = draft.kind === 'ebike' || draft.kind === 'scooter';
  $('battWrap').classList.toggle('hidden', !light);
  if (light) {
    if (!(+draft.batt > 0)) draft.batt = 500;
    if (draft.charge == null) draft.charge = 100;
    $('battInput').value = Math.round(draft.batt);
    $('chargeInput').value = Math.round(draft.charge);
    renderRangeInfo();
  }
}
// Reichweite live anzeigen, während Akku, Ladestand oder Verbrauch geändert werden
function renderRangeInfo() {
  const d = Object.assign({}, draft, { batt: parseDec($('battInput').value), cons: parseDec($('consInput').value), charge: parseDec($('chargeInput').value) });
  $('chargeVal').textContent = `${Math.round(clamp(d.charge || 0, 0, 100))} %`;
  const km = rangeKm(d), full = rangeKm(d, 100);
  $('rangeInfo').innerHTML = km == null ? L('Akku und Verbrauch eingeben')
    : `🔋 ${L('Reichweite jetzt')}: <b class="text-lime-300 font-game">~${fmtKm(km)} km</b> · ${L('voll geladen')} ~${fmtKm(full)} km`;
}
function pickFirstPreset() {
  if (isFree(draft)) { draft.model = ''; draft.cons = 0; return; }
  if (draft.kind === 'car') {
    const brands = brandsFor(draft.fuel);
    if (!brands.includes(draft.brand)) draft.brand = brands.includes('VW') ? 'VW' : brands[0];
  }
  const list = modelList(draft.kind, draft.fuel, draft.brand);
  if (list.length) { draft.model = list[0][0]; draft.cons = list[0][1]; if (list[0][2]) draft.batt = list[0][2]; }
}
function saveGarage() {
  if (!isFree(draft)) {
    const c = parseDec($('consInput').value);
    if (!(c > 0 && c < 60)) { toast(L('Bitte einen gültigen Verbrauch eingeben')); return; }
    draft.cons = c;
    if (draft.kind === 'ebike' || draft.kind === 'scooter') {
      const b = parseDec($('battInput').value), ch = parseDec($('chargeInput').value);
      if (!(b >= 50 && b <= 5000)) { toast(L('Bitte eine gültige Akkugröße in Wh eingeben')); return; }
      draft.batt = b; draft.charge = clamp(isNaN(ch) ? 100 : ch, 0, 100);
    }
    if ($('modelSel').value === '__custom') draft.model = draft.model && !modelList(draft.kind, draft.fuel, draft.brand).some(([n]) => n === draft.model) ? draft.model : L('Eigenes Fahrzeug');
  }
  const prevProfile = profileOf(vehicle);
  vehicle = draft; store.set(LS.vehicle, vehicle);
  const num = id => { const v = parseDec($(id).value); return v > 0 && v < 10 ? v : null; };
  const np = { e5: num('pE5'), e10: num('pE10'), diesel: num('pDiesel'), kwh: num('pKwh') };
  const changed = ['e5', 'e10', 'diesel', 'kwh'].some(k => np[k] != null && Math.abs(np[k] - prices[k]) > 1e-9);
  ['e5', 'e10', 'diesel', 'kwh'].forEach(k => { if (np[k] != null) prices[k] = np[k]; });
  if (changed) prices.source = 'manual';
  store.set(LS.prices, prices);
  tkKey = $('tkKey').value.trim(); store.set(LS.tk, tkKey);
  renderVehicleBtn(); renderExploreBtn(); closeGarage();
  toast(`${vehicleLabel()} gespeichert`);
  // Vorschau neu berechnen, wenn sich das Routing-Profil geändert hat
  if (S.mode === 'preview' && S.dest) { if (profileOf(vehicle) !== prevProfile) setDestination(S.dest); else drawPreview(false); }
}

/* --- Live-Spritpreise (Tankerkönig) --- */
let tkLast = 0;
async function loadFuelPrices(silent) {
  const key = (silent ? tkKey : $('tkKey').value.trim()) || tkKey;
  if (!key) { if (!silent) toast(L('Bitte zuerst deinen Tankerkönig-Schlüssel eintragen')); return false; }
  if (!S.pos) { if (!silent) toast(L('Kein Standort – GPS erlauben')); return false; }
  if (Date.now() - tkLast < 60000) { if (!silent) toast(L('Max. 1 Abfrage pro Minute – kurz warten')); return false; }
  tkLast = Date.now();
  try {
    const url = `${TANKERKOENIG}?lat=${S.pos.lat.toFixed(4)}&lng=${S.pos.lng.toFixed(4)}&rad=5&sort=dist&type=all&apikey=${encodeURIComponent(key)}`;
    const j = await (await fetch(url)).json();
    if (!j.ok) throw new Error(j.message || L('Fehler'));
    const st = (j.stations || []).filter(x => x.isOpen !== false).slice(0, 8);
    const avg = f => { const v = st.map(x => x[f]).filter(x => typeof x === 'number' && x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const got = { e5: avg('e5'), e10: avg('e10'), diesel: avg('diesel') };
    if (got.e5 == null && got.e10 == null && got.diesel == null) throw new Error(L('Keine Tankstellen im Umkreis'));
    ['e5', 'e10', 'diesel'].forEach(k => { if (got[k] != null) prices[k] = Math.round(got[k] * 1000) / 1000; });
    Object.assign(prices, { updated: Date.now(), source: 'tankerkoenig', stations: st.length });
    store.set(LS.prices, prices);
    if (!silent) {
      tkKey = key; store.set(LS.tk, tkKey);
      $('pE5').value = fmtDec(prices.e5); $('pE10').value = fmtDec(prices.e10); $('pDiesel').value = fmtDec(prices.diesel);
      renderPriceStamp();
      toast('⛽ ' + L('Live-Preise geladen (Ø {n} Tankstellen)', { n: st.length }));
    }
    return true;
  } catch (e) {
    if (!silent) toast(L('Preise nicht geladen: {e}', { e: e.message }));
    return false;
  }
}
function maybeRefreshPrices() {
  if (tkKey && !isFree(vehicle) && vehicle.fuel !== 'electric' && Date.now() - (prices.updated || 0) > 30 * 60000) loadFuelPrices(true);
}
