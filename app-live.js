// NeonNav – Live-Daten: Wetter, Tankstellen, Blitzer/Gefahren, Tempolimit
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   WETTER (Open-Meteo, kostenlos, ohne Schlüssel)
   ================================================================= */
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const wxCache = new Map();
let wxNowAt = 0, wxNowPos = null;
async function wxFetch(lat, lng) {
  const key = lat.toFixed(2) + ':' + lng.toFixed(2), c = wxCache.get(key);
  if (c && Date.now() - c.at < 30 * 60000) return c.data;
  const r = await fetch(`${OPEN_METEO}?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code,is_day,precipitation,wind_gusts_10m` +
    '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_gusts_10m,is_day&forecast_days=2&timezone=auto');
  const j = await r.json();
  if (!j.hourly) throw new Error(L('Kein Wetter'));
  wxCache.set(key, { at: Date.now(), data: j });
  return j;
}
// Vorhersage für einen Zeitpunkt (nächste volle Stunde). Zeiten sind Ortszeit des Ortes → über utc_offset umrechnen.
function wxAt(j, date) {
  const h = j.hourly, off = (j.utc_offset_seconds || 0) * 1000, t = date.getTime();
  let bi = 0, bd = Infinity;
  h.time.forEach((s, i) => { const d = Math.abs(Date.parse(s + 'Z') - off - t); if (d < bd) { bd = d; bi = i; } });
  return { temp: h.temperature_2m[bi], code: h.weather_code[bi], pp: h.precipitation_probability[bi], precip: h.precipitation[bi], gust: h.wind_gusts_10m[bi], day: h.is_day[bi] !== 0 };
}
function wxDesc(code, day = true) {
  if (code === 0) return day ? ['☀️', L('Sonnig')] : ['🌙', L('Klar')];
  if (code <= 2) return day ? ['🌤️', L('Leicht bewölkt')] : ['☁️', L('Leicht bewölkt')];
  if (code === 3) return ['☁️', L('Bewölkt')];
  if (code === 45 || code === 48) return ['🌫️', L('Nebel')];
  if (code >= 51 && code <= 57) return ['🌦️', code >= 56 ? L('Gefrierender Niesel') : L('Nieselregen')];
  if (code >= 61 && code <= 67) return ['🌧️', code >= 66 ? L('Gefrierender Regen') : code === 65 ? L('Starker Regen') : L('Regen')];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['🌨️', L('Schnee')];
  if (code >= 80 && code <= 82) return ['🌦️', code === 82 ? L('Heftige Schauer') : L('Schauer')];
  if (code >= 95) return ['⛈️', L('Gewitter')];
  return ['🌡️', L('Wetter')];
}
function wxWarn(w) {
  if (!w) return null;
  if (w.code >= 95) return L('Gewitter');
  if ([56, 57, 66, 67].includes(w.code)) return L('Glatteis durch gefrierenden Regen');
  if ((w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86) return L('Schnee – Glättegefahr');
  if (w.temp <= 1 && (w.precip > 0 || w.code === 48 || w.pp >= 60)) return L('Glättegefahr');
  if (w.gust >= 60) return L('Sturmböen bis {n} km/h', { n: Math.round(w.gust) });
  if (w.precip >= 4 || w.code === 65 || w.code === 82) return L('Starkregen');
  if (w.code === 45 || w.code === 48) return L('Nebel – Sicht eingeschränkt');
  return null;
}
const wxLine = w => { const [i, t] = wxDesc(w.code, w.day); return `${i} ${Math.round(w.temp)} °C · ${t}${w.pp >= 30 ? ` · ${L('{n} % Regen', { n: w.pp })}` : ''}`; };

async function updateWxNow(force) {
  if (!S.pos) return;
  if (!force && Date.now() - wxNowAt < 30 * 60000 && wxNowPos && haversine(wxNowPos.lat, wxNowPos.lng, S.pos.lat, S.pos.lng) < 5000) return;
  wxNowAt = Date.now(); wxNowPos = { lat: S.pos.lat, lng: S.pos.lng };
  try {
    const j = await wxFetch(S.pos.lat, S.pos.lng), c = j.current;
    const [icon, text] = wxDesc(c.weather_code, c.is_day !== 0);
    S.wxNow = { icon, text, temp: c.temperature_2m, warn: wxWarn({ temp: c.temperature_2m, code: c.weather_code, pp: 0, precip: c.precipitation, gust: c.wind_gusts_10m }) };
    $('wxNow').textContent = `${icon} ${Math.round(c.temperature_2m)}°`;
    $('wxNow').title = text;
  } catch (e) { wxNowAt = Date.now() - 25 * 60000; } // in 5 min erneut versuchen
}

// Wetter unterwegs (Mitte der Fahrt) und am Ziel zur Ankunftszeit
async function routeWeather(N) {
  S.routeWx = null;
  try {
    const mid = pointAlong(N, N.total / 2), end = N.coords[N.coords.length - 1];
    const tMid = new Date(Date.now() + N.duration * 500), tEnd = new Date(Date.now() + N.duration * 1000);
    const [jm, je] = await Promise.all([N.total > 20000 ? wxFetch(mid.lat, mid.lng) : null, wxFetch(end[1], end[0])]);
    const dest = wxAt(je, tEnd), midW = jm ? wxAt(jm, tMid) : null;
    S.routeWx = { dest, mid: midW, at: tEnd, warn: wxWarn(midW) || wxWarn(dest) };
    renderRouteExtras();
  } catch (e) {}
}

/* =================================================================
   GÜNSTIGE TANKSTELLEN (Tankerkönig)
   ================================================================= */
let fuelMarkers = [], fuelOnRoute = [], fuelAnnounced = false;
const fuelType = () => (!isFree(vehicle) && ['e5', 'e10', 'diesel'].includes(vehicle.fuel)) ? vehicle.fuel : null;
const fmtPrice = p => p.toFixed(3).replace('.', DEC);
const fuelName = s => s.brand || s.name || L('Tankstelle');

async function tkStations(lat, lng, rad) {
  const ft = fuelType();
  if (!tkKey || !ft) return [];
  const url = `${TANKERKOENIG}?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&rad=${rad}&sort=price&type=${ft}&apikey=${encodeURIComponent(tkKey)}`;
  const j = await (await fetch(url)).json();
  if (!j.ok) throw new Error(j.message || L('Tankerkönig-Fehler'));
  return (j.stations || []).filter(s => s.isOpen && typeof s.price === 'number' && s.price > 0);
}
function clearFuelStations() { fuelMarkers.forEach(m => m.remove()); fuelMarkers = []; fuelOnRoute = []; S.routeFuel = null; }
function showFuelMarkers(list) {
  fuelMarkers.forEach(m => m.remove()); fuelMarkers = [];
  const best = list.length ? Math.min(...list.map(s => s.price)) : 0;
  list.forEach(s => {
    const el = document.createElement('div');
    el.className = 'fuel-mk' + (s.price === best ? ' best' : s.price - best > 0.05 ? ' meh' : '');
    el.textContent = fmtPrice(s.price);
    el.addEventListener('click', ev => { ev.stopPropagation(); fuelPopup(s); });
    fuelMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lng, s.lat]).addTo(map));
  });
}
function fuelPopup(s) {
  const addr = [[s.street, s.houseNumber].filter(Boolean).join(' '), s.place].filter(Boolean).join(', ');
  const div = document.createElement('div');
  div.innerHTML = `<div class="font-bold">⛽ ${esc(fuelName(s))}</div><div class="text-xs text-slate-400">${esc(addr)}</div>
    <div class="mt-1 font-game text-lg font-black text-lime-300">${fmtPrice(s.price)} € <span class="text-xs text-slate-400 font-sans font-normal">${esc(FUELS[vehicle.fuel] || '')}</span></div>
    <div class="text-[10px] text-slate-500">${L('Quelle')}: Tankerkönig (MTS-K)</div>`;
  const pop = new maplibregl.Popup({ offset: 22 }).setLngLat([s.lng, s.lat]).setDOMContent(div).addTo(map);
  if (S.mode === 'nav' || S.mode === 'free') return;
  const b = document.createElement('button');
  b.className = 'mt-2 w-full px-3 py-2 rounded-lg font-game font-bold text-black text-sm';
  b.style.background = 'linear-gradient(90deg,#a3ff12,#5effc4)';
  b.textContent = L('HIERHIN ▶');
  b.onclick = () => { pop.remove(); setDestination({ name: `⛽ ${fuelName(s)}`, sub: addr, lat: s.lat, lng: s.lng }); };
  div.appendChild(b);
}
// Stationen höchstens 700 m neben der Route, sortiert nach Preis
function snapFuelTo(N, list) {
  return list.map(s => { const sn = snapToRoute(N, s.lat, s.lng, true); return sn && sn.dist <= 700 ? Object.assign({}, s, { along: sn.along }) : null; })
    .filter(Boolean).sort((a, b) => a.price - b.price);
}
async function routeFuel(N) {
  S.routeFuel = null; fuelOnRoute = [];
  if (!fuelType()) return;
  if (!tkKey) { S.routeFuel = { hint: true }; renderRouteExtras(); return; }
  try {
    const km = N.total / 1000;
    const pts = km <= 40 ? [[0.5, Math.min(25, Math.ceil(km / 2) + 3)]] : [[0.2, 15], [0.5, 15], [0.8, 15]];
    const seen = new Map();
    for (const [f, rad] of pts) {
      const p = pointAlong(N, N.total * f);
      (await tkStations(p.lat, p.lng, rad)).forEach(s => seen.set(s.id, s));
    }
    const on = snapFuelTo(N, [...seen.values()]);
    if (S.mode !== 'preview' && S.mode !== 'nav') return;
    if (!on.length) { S.routeFuel = { none: true }; renderRouteExtras(); return; }
    const avg = on.reduce((a, s) => a + s.price, 0) / on.length;
    S.routeFuel = { best: on[0], save: Math.round((avg - on[0].price) * 100), all: on };
    fuelOnRoute = on;
    showFuelMarkers(on.slice(0, 10));
    renderRouteExtras();
  } catch (e) { S.routeFuel = { err: e.message }; renderRouteExtras(); }
}
async function nearbyFuel() {
  if (!S.pos) { toast(L('Kein Standort – GPS erlauben')); return; }
  if (!tkKey) { toast(L('Bitte Tankerkönig-Schlüssel in der Garage eintragen')); openGarage(); return; }
  toast('⛽ ' + L('Suche günstige Tankstellen…'));
  try {
    const list = (await tkStations(S.pos.lat, S.pos.lng, 5)).slice(0, 10);
    if (!list.length) { toast(L('Keine geöffnete Tankstelle im Umkreis von 5 km')); return; }
    showFuelMarkers(list);
    const b = list[0];
    toast(`⛽ ${L('Am günstigsten')}: ${fuelName(b)} · ${fmtPrice(b.price)} € · ${fmtDist((b.dist || 0) * 1000)}`);
    if (S.follow) { S.follow = false; $('recenterBtn').classList.add('active-ring'); }
    fitCoords(list.map(s => [s.lng, s.lat]).concat([[S.pos.lng, S.pos.lat]]));
  } catch (e) { toast(L('Tankstellen nicht geladen: {e}', { e: e.message })); }
}
// Während der Navigation einmal auf die günstigste Tankstelle voraus hinweisen
function checkFuelAhead(N) {
  if (fuelAnnounced || !fuelOnRoute.length) return;
  const best = fuelOnRoute.find(s => s.along > N.along);
  if (!best || best !== fuelOnRoute[0]) return;
  const d = best.along - N.along;
  if (d < 2500) {
    fuelAnnounced = true;
    speak(L('In {d} günstig tanken bei {name}: {e} Euro {c}.', { d: speechDist(d), name: fuelName(best), e: Math.floor(best.price), c: Math.round(best.price % 1 * 100) }));
    toast(`⛽ ${L('In {d}', { d: fmtDist(d) })}: ${fuelName(best)} ${fmtPrice(best.price)} €`);
  }
}

// Zusatzinfos in der Routenvorschau: Wetter + Tankstelle
function renderRouteExtras() {
  const box = $('routeExtras'), rows = [], w = S.routeWx, f = S.routeFuel;
  if (S.mode !== 'preview') { box.classList.add('hidden'); return; }
  if (w) {
    rows.push(`<div class="rounded-xl bg-black/30 border border-slate-700 px-3 py-2 text-sm">${wxLine(w.dest)}<span class="text-slate-400"> · ${L('am Ziel um {t}', { t: timeStr(w.at) })}</span></div>`);
    if (w.warn) rows.push(`<div class="rounded-xl bg-amber-500/15 border border-amber-400/50 px-3 py-2 text-sm font-semibold text-amber-200">⚠️ ${esc(w.warn)} ${w.mid && wxWarn(w.mid) ? L('unterwegs') : L('am Ziel')}</div>`);
  }
  if (f && f.best) rows.push(`<button id="fuelBest" class="w-full text-left rounded-xl bg-lime-400/10 border border-lime-400/40 px-3 py-2 text-sm">⛽ ${L('Günstigste an der Route')}: <b>${esc(fuelName(f.best))}</b>
      <b class="font-game text-lime-300">${fmtPrice(f.best.price)} €</b>${f.save >= 2 ? ` <span class="text-lime-200">(−${f.save} ct)</span>` : ''}<span class="text-slate-400"> · ${L('nach {d}', { d: fmtDist(f.best.along) })}</span></button>`);
  else if (f && f.hint) rows.push(`<div class="text-[11px] text-slate-500 px-1">⛽ ${L('Tipp: Tankerkönig-Schlüssel in der Garage eintragen, dann zeige ich günstige Tankstellen an der Route.')}</div>`);
  else if (f && f.none) rows.push(`<div class="text-[11px] text-slate-500 px-1">⛽ ${L('Keine geöffnete Tankstelle direkt an der Route.')}</div>`);
  box.innerHTML = rows.join('');
  box.classList.toggle('hidden', !rows.length);
  if ($('fuelBest')) $('fuelBest').onclick = () => fuelPopup(f.best);
  layout();
}

/* =================================================================
   GEFAHRENSTELLEN / BLITZER
   ================================================================= */
let hazards = store.get(LS.haz, []);
const hazMarkers = new Map(), alertStage = new Map();
const allHaz = () => hazards;
const hazLabel = h => h.type === 'gefahr' ? L('Gefahrenstelle') : L('Blitzer');

function renderHazards() {
  hazMarkers.forEach(m => m.remove());
  hazMarkers.clear();
  pulsingHaz = null;
  for (const h of allHaz()) {
    const el = document.createElement('div');
    el.className = 'haz-mk' + (h.type === 'gefahr' ? ' haz-g' : '');
    el.innerHTML = `<span>${h.type === 'gefahr' ? '⚠️' : '📸'}</span>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); hazPopup(h); });
    hazMarkers.set(h.id, new maplibregl.Marker({ element: el }).setLngLat([h.lng, h.lat]).addTo(map));
  }
  if (S.nav) computeRouteHazards(S.nav);
}
function hazPopup(h) {
  const div = document.createElement('div');
  div.innerHTML = `<div class="font-bold">${h.type === 'gefahr' ? '⚠️' : '📸'} ${hazLabel(h)}</div>
    <div class="text-xs text-slate-400">${new Date(h.created).toLocaleString(LOC)}</div>`;
  const b = document.createElement('button');
  b.textContent = L('Entfernen');
  b.className = 'mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-sm';
  const pop = new maplibregl.Popup({ offset: 22 }).setLngLat([h.lng, h.lat]).setDOMContent(div).addTo(map);
  b.onclick = () => { removeHazard(h.id); pop.remove(); };
  div.appendChild(b);
}
function removeHazard(id) {
  hazards = hazards.filter(h => h.id !== id);
  store.set(LS.haz, hazards);
  alertStage.delete(id);
  renderHazards();
  checkHazards();
  toast(L('Meldung entfernt'));
}
function report(type) {
  unlockAudio();
  if (!S.pos || Date.now() - S.lastFixAt > 30000) { toast(L('Kein aktueller Standort – bitte GPS erlauben')); return; }
  if (allHaz().some(h => haversine(S.pos.lat, S.pos.lng, h.lat, h.lng) < 60)) { toast(L('Hier ist bereits eine Meldung gespeichert')); return; }
  const h = { id: 'h' + Date.now().toString(36), type, lat: r5(S.pos.lat), lng: r5(S.pos.lng), created: Date.now() };
  hazards.push(h);
  if (!store.set(LS.haz, hazards)) toast(L('Speichern fehlgeschlagen'));
  alertStage.set(h.id, 2);
  renderHazards();
  tone(880, .1, 0, .6, 'triangle'); vibrate(80);
  toast(`${type === 'gefahr' ? '⚠️ ' + L('Gefahr gemeldet') : '📸 ' + L('Blitzer gemeldet')} · +25 XP`);
  addXP(25);
  bumpStat('reports');
  checkAchievements();
}

/* ---------- Echte Blitzer aus OpenStreetMap (Overpass API) ---------- */
const osmCams = new Map(); // osmId -> {id,type:'osm',lat,lng,maxspeed}
let osmEnabled = store.get(LS.osm, true);
let osmArea = null, osmAreaAt = 0, osmLoading = false, osmCamsTimer = 0;
(store.get(LS.cams, []) || []).forEach(a => osmCams.set(a[0], { id: 'osm-' + a[0], type: 'osm', lat: a[1], lng: a[2], maxspeed: a[3] || null }));

// Overpass-Server sind oft überlastet: nacheinander probieren (zuletzt erfolgreicher zuerst), jeder mit Zeitlimit
let overpassFirst = 0;
async function overpass(query, ms = 25000) {
  let lastErr;
  for (let k = 0; k < OVERPASS.length; k++) {
    const i = (overpassFirst + k) % OVERPASS.length, ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(OVERPASS[i], { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (r.ok) { const j = await r.json(); overpassFirst = i; return j; }
      lastErr = new Error('HTTP ' + r.status);
    } catch (e) { lastErr = e; } finally { clearTimeout(timer); }
  }
  throw lastErr || new Error(L('Overpass nicht erreichbar'));
}
function mergeCams(json) {
  let added = 0;
  for (const el of (json && json.elements) || []) {
    if (el.type !== 'node' || el.lat == null) continue;
    if (!osmCams.has(el.id)) added++;
    const ms = el.tags && parseInt(el.tags.maxspeed, 10);
    osmCams.set(el.id, { id: 'osm-' + el.id, type: 'osm', lat: el.lat, lng: el.lon, maxspeed: ms > 0 ? ms : null });
  }
  // Cache begrenzen und speichern (für Offline-Nutzung)
  let arr = [...osmCams.entries()].map(([id, c]) => [id, r5(c.lat), r5(c.lng), c.maxspeed || 0]);
  if (arr.length > 8000) arr = arr.slice(arr.length - 8000);
  store.set(LS.cams, arr);
  renderCams();
  if (S.nav) computeRouteHazards(S.nav);
  return added;
}
function renderCams() {
  setSrc('cams', { type: 'FeatureCollection', features: osmEnabled ? [...osmCams.values()].map(c => ({
    type: 'Feature', properties: { maxspeed: c.maxspeed || '' }, geometry: { type: 'Point', coordinates: [c.lng, c.lat] } })) : [] });
  const info = $('osmInfo');
  if (info) info.textContent = L('{n} Blitzer gespeichert (auch offline verfügbar)', { n: osmCams.size });
}
async function loadCamsArea(lat, lng) {
  if (!osmEnabled || osmLoading) return;
  osmLoading = true; osmArea = { lat, lng }; osmAreaAt = Date.now();
  try {
    const j = await overpass(`[out:json][timeout:25];node["highway"="speed_camera"](around:15000,${lat.toFixed(5)},${lng.toFixed(5)});out body;`);
    const n = mergeCams(j);
    if (n > 0) toast('📸 ' + L('{n} Blitzer in der Umgebung geladen', { n }));
  } catch (e) { /* offline – Cache wird weiter genutzt */ }
  finally { osmLoading = false; }
}
function maybeLoadCamsArea() {
  if (!osmEnabled || !S.pos) return;
  const moved = !osmArea || haversine(osmArea.lat, osmArea.lng, S.pos.lat, S.pos.lng) > 7000;
  if (moved && Date.now() - osmAreaAt > 60000) loadCamsArea(S.pos.lat, S.pos.lng);
}
async function loadCamsAlongRoutes(navs) {
  if (!osmEnabled || !navs.length) return 0;
  const perRoute = Math.max(100, Math.floor(1400 / navs.length));
  const parts = navs.map(N => {
    const spacing = Math.max(250, N.total / perRoute), pts = [];
    for (let s = 0; s <= N.total; s += spacing) { const p = pointAlong(N, s); pts.push(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`); }
    const e = N.coords[N.coords.length - 1]; pts.push(`${e[1].toFixed(5)},${e[0].toFixed(5)}`);
    return `node["highway"="speed_camera"](around:120,${pts.join(',')});`;
  });
  try { return mergeCams(await overpass(`[out:json][timeout:40];(${parts.join('')});out body;`)); } catch (e) { return 0; }
}
function nearbyCams(lat, lng, radiusDeg) {
  const out = [];
  if (!osmEnabled) return out;
  for (const c of osmCams.values()) if (Math.abs(c.lat - lat) < radiusDeg && Math.abs(c.lng - lng) < radiusDeg * 1.6) out.push(c);
  return out;
}
const allWarn = (lat, lng) => allHaz().concat(nearbyCams(lat, lng, .012));

function checkHazards() {
  if (!S.pos) return;
  const driving = S.mode === 'nav' || S.mode === 'free';
  if (!driving) { hideAlarm(); return; }
  let best = null, bd = Infinity;
  for (const h of allWarn(S.pos.lat, S.pos.lng)) {
    const d = haversine(S.pos.lat, S.pos.lng, h.lat, h.lng);
    if (d > REARM_R) alertStage.delete(h.id);
    // während der Navigation: Meldungen, die bereits hinter uns liegen, ignorieren
    if (S.nav && S.nav.routeHaz) {
      const rh = S.nav.routeHaz.find(x => x.h.id === h.id);
      if (rh && rh.along < S.nav.along - 15) continue;
      if (!rh && h.type === 'osm' && d > 60) continue; // OSM-Blitzer abseits der Route nicht melden
    }
    if (d < bd) { bd = d; best = h; }
  }
  if (best && bd <= ALERT_R) {
    const over = best.maxspeed && S.speed > best.maxspeed + 3;
    showAlarm(best, bd, over);
    const stage = bd <= CLOSE_R ? 2 : 1, prev = alertStage.get(best.id) || 0;
    if (stage > prev) {
      alertStage.set(best.id, stage);
      alarmSound(stage);
      vibrate(stage === 2 ? [200, 100, 200, 100, 200] : [300, 150, 300]);
      const lim = best.maxspeed ? ', ' + L('Tempolimit {n}', { n: best.maxspeed }) : '';
      if (stage === 1) setTimeout(() => speak(L('Achtung, {what} in {d}', { what: hazLabel(best), d: speechDist(bd) }) + lim), 900);
      else if (over) setTimeout(() => speak(L('Zu schnell! Limit {n}', { n: best.maxspeed })), 1300);
    }
  } else hideAlarm();
  updateNextHazard();
}
// Nur der Marker der aktuellen Warnung pulsiert (eigene Meldungen; OSM-Blitzer haben keinen eigenen Marker)
let pulsingHaz = null;
function setHazPulse(id) {
  if (pulsingHaz === id) return;
  const old = pulsingHaz != null && hazMarkers.get(pulsingHaz);
  if (old) old.getElement().classList.remove('near');
  pulsingHaz = id;
  const m = id != null && hazMarkers.get(id);
  if (m) m.getElement().classList.add('near');
}
function showAlarm(h, d, over) {
  setHazPulse(h.id);
  $('alarmIcon').textContent = h.type === 'gefahr' ? '⚠️' : '📸';
  $('alarmTitle').textContent = h.type === 'gefahr' ? L('GEFAHRENSTELLE') : L('BLITZER');
  $('alarmDist').textContent = Math.round(d);
  $('alarmSub').textContent = over ? `⚠️ ${L('ZU SCHNELL')} – ${Math.round(S.speed)} km/h` : (h.type === 'osm' ? L('Fester Blitzer') + ' · OpenStreetMap' : L('Eigene Meldung'));
  $('alarmLimit').textContent = h.maxspeed || '';
  $('alarmLimit').classList.toggle('hidden', !h.maxspeed);
  $('alarm').classList.remove('hidden');
  $('driveCard').classList.add('sheet-alarm');
  $('gSpeed').style.color = '#ff4d6d';
}
function hideAlarm() {
  setHazPulse(null);
  $('alarm').classList.add('hidden');
  $('driveCard').classList.remove('sheet-alarm');
  $('gSpeed').style.color = '';
}

/* =================================================================
   TEMPOLIMIT (OpenStreetMap „maxspeed“)
   ================================================================= */
const limitWays = new Map();   // OSM-Way-ID → { lim: {v}|{none}, pts: [[lng,lat]…], b: [minLng,minLat,maxLng,maxLat] }
let limitArea = null, limitAreaAt = 0, limitLoading = false;
let limitCand = null, limitCandN = 0, limitMiss = 0, limitOverAt = 0, limitLastT = 0;
const LIMIT_ROADS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|road|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

function parseMaxspeed(s) {
  s = String(s || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'none' || s === 'de:motorway') return { none: true };
  if (s === 'walk' || /:(walk|living_street)$/.test(s)) return { v: 7 };
  if (/:urban$/.test(s)) return { v: 50 };
  if (/:rural$/.test(s)) return { v: 100 };
  if (/:(zone30|zone:30|bicycle_road)$/.test(s)) return { v: 30 };
  if (/:zone20$|:zone:20$/.test(s)) return { v: 20 };
  const m = s.match(/^(\d+)\s*(mph)?/);
  return m ? { v: m[2] ? Math.round(+m[1] * 1.609) : +m[1] } : null; // „signals“, „variable“ → unbekannt
}
function mergeLimits(j) {
  if (limitWays.size > 8000) limitWays.clear();
  for (const e of (j && j.elements) || []) {
    if (e.type !== 'way' || !e.geometry || e.geometry.length < 2) continue;
    const lim = parseMaxspeed(e.tags && e.tags.maxspeed);
    if (!lim) continue;
    const pts = e.geometry.map(g => [g.lon, g.lat]);
    const b = pts.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [180, 90, -180, -90]);
    limitWays.set(e.id, { lim, pts, b });
  }
}
async function loadLimitsArea(lat, lng) {
  if (limitLoading) return;
  limitLoading = true; limitArea = { lat, lng }; limitAreaAt = Date.now();
  try {
    mergeLimits(await overpass(`[out:json][timeout:20];way(around:1000,${lat.toFixed(5)},${lng.toFixed(5)})[highway~"^(${LIMIT_ROADS})$"][maxspeed];out tags geom;`, 15000));
  } catch (e) { limitAreaAt = Date.now() - 30000; } finally { limitLoading = false; }
}
// Entlang der Route: Overpass „around“ mit Polylinie, Stützpunkte alle ≥ 200 m
async function loadLimitsAlongRoute(N) {
  const step = Math.max(200, N.total / 1500), pts = [];
  for (let s = 0; s <= N.total; s += step) { const p = pointAlong(N, s); pts.push(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`); }
  try { mergeLimits(await overpass(`[out:json][timeout:40];way(around:25,${pts.join(',')})[highway~"^(${LIMIT_ROADS})$"][maxspeed];out tags geom;`, 45000)); } catch (e) {}
}
function limitAt(lat, lng, hdg) {
  const kx = 111320 * Math.cos(lat * toR), ky = 110540, padLat = 0.0003, padLng = 0.0005;
  let best = null, bestScore = Infinity;
  for (const w of limitWays.values()) {
    if (lat < w.b[1] - padLat || lat > w.b[3] + padLat || lng < w.b[0] - padLng || lng > w.b[2] + padLng) continue;
    for (let i = 0; i < w.pts.length - 1; i++) {
      const a = w.pts[i], c = w.pts[i + 1];
      const ax = (a[0] - lng) * kx, ay = (a[1] - lat) * ky, bx = (c[0] - lng) * kx, by = (c[1] - lat) * ky;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
      const t = L2 ? clamp(-(ax * dx + ay * dy) / L2, 0, 1) : 0;
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d > 25) continue;
      // Straßen quer zur Fahrtrichtung (Kreuzungen) abwerten
      let diff = Math.abs(((bearingTo(a[1], a[0], c[1], c[0]) - hdg) % 180 + 180) % 180);
      diff = Math.min(diff, 180 - diff);
      const score = d + (diff > 40 ? 20 : 0);
      if (score < bestScore) { bestScore = score; best = w.lim; }
    }
  }
  return best;
}
function updateLimit(f, kmh, hdg) {
  const driving = S.mode === 'nav' || S.mode === 'free';
  const dt = limitLastT ? clamp((f.t - limitLastT) / 1000, 0, 5) : 0;
  limitLastT = f.t;
  if (!driving) { if (S.limit) { S.limit = null; renderLimit(false); } return; }
  if (!limitArea || (haversine(limitArea.lat, limitArea.lng, f.lat, f.lng) > 700 && Date.now() - limitAreaAt > 45000)) loadLimitsArea(f.lat, f.lng);
  const lim = limitAt(f.lat, f.lng, hdg);
  // Wechsel erst nach zwei gleichen Treffern (kein Flackern an Kreuzungen); nach 4 Fehlschlägen ausblenden
  if (lim) {
    limitMiss = 0;
    const same = c => c && (c.none ? lim.none : c.v === lim.v);
    if (same(S.limit)) limitCandN = 0;
    else if (same(limitCand)) { if (++limitCandN >= 2) { S.limit = lim; limitCand = null; limitCandN = 0; } }
    else { limitCand = lim; limitCandN = 1; if (!S.limit) S.limit = lim; }
  } else if (++limitMiss >= 4) S.limit = null;
  const v = S.limit && S.limit.v, tol = v ? (v <= 100 ? 5 : Math.round(v * 0.05)) : 0;
  const over = !!(v && kmh > v + tol);
  if (S.trip && S.limit) { S.trip.limSec = (S.trip.limSec || 0) + dt; if (over) S.trip.overSec = (S.trip.overSec || 0) + dt; }
  if (over && Date.now() - limitOverAt > 30000) { limitOverAt = Date.now(); tone(880, .12, 0, .5, 'triangle'); tone(660, .18, .14, .5, 'triangle'); vibrate([60, 40, 60]); }
  if (!over) limitOverAt = Math.min(limitOverAt, Date.now() - 20000); // nach Abbremsen bald wieder warnen
  renderLimit(over);
}
function renderLimit(over) {
  const el = $('limitSign'), L = S.limit;
  el.classList.toggle('hidden', !L);
  $('gauge').classList.toggle('over', !!over);
  if (!L) return;
  el.classList.toggle('over', !!over);
  el.textContent = L.none ? '∞' : L.v;
  el.style.borderColor = L.none ? '#64748b' : '';
  el.style.fontSize = !L.none && L.v >= 100 ? '14px' : '';
}
