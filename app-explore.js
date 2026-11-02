// NeonNav – Erkunden-Modus: Radrouten aus OpenStreetMap, erkundete Kacheln, einer Route folgen
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   ERKUNDEN (Fahrrad, E-Bike, E-Roller)
   ================================================================= */
// Radrouten-Netze aus OpenStreetMap (network=*), Farben passend zum Neon-Look
const BIKE_NET = {
  icn: { label: L('EuroVelo / international'), color: '#ff2bd6' },
  ncn: { label: L('Radfernweg'), color: '#ff2bd6' },
  rcn: { label: L('Regionale Radroute'), color: '#a855f7' },
  lcn: { label: L('Lokale Radroute'), color: '#00e5ff' },
  mtb: { label: L('Mountainbike-Strecke'), color: '#a3ff12' }
};
const bikeRoutes = new Map(); // OSM-Relation-ID → { id, name, ref, net, km, kmHere, from, to, lines }
let bikeArea = null, bikeLoading = false, cellsAt = 0, lastNewCells = 0;
S.exploring = false; S.followRoute = null; S.newCells = 0;

const lineLen = pts => pts.reduce((a, p, i) => i ? a + haversine(pts[i - 1][1], pts[i - 1][0], p[1], p[0]) : 0, 0);
function bikeRoutesFC() {
  return { type: 'FeatureCollection', features: [...bikeRoutes.values()].map(r => ({ type: 'Feature',
    properties: { id: r.id, color: BIKE_NET[r.net].color }, geometry: { type: 'MultiLineString', coordinates: r.lines } })) };
}

// Radrouten im Umkreis von ~6 km laden (Overpass); erst nach ~3 km Weiterfahrt neu
async function loadBikeRoutes(force) {
  if (!S.pos || bikeLoading) return;
  if (!force && bikeArea && haversine(bikeArea.lat, bikeArea.lng, S.pos.lat, S.pos.lng) < 3000) return;
  bikeLoading = true;
  const c = { lat: S.pos.lat, lng: S.pos.lng }, dLat = .055, dLng = .055 / Math.cos(c.lat * toR);
  const bb = [c.lat - dLat, c.lng - dLng, c.lat + dLat, c.lng + dLng].map(v => v.toFixed(4)).join(',');
  try {
    // „geom(bbox)“ schneidet lange Fernwege auf den sichtbaren Ausschnitt zu – hält die Antwort klein
    const j = await overpass(`[out:json][timeout:25];relation["type"="route"]["route"~"^(bicycle|mtb)$"](${bb});out tags geom(${bb});`, 30000);
    bikeArea = c;
    for (const el of (j && j.elements) || []) {
      if (el.type !== 'relation') continue;
      const t = el.tags || {};
      const lines = (el.members || []).filter(m => m.type === 'way' && m.geometry && m.geometry.length > 1)
        .map(m => m.geometry.filter(Boolean).map(p => [r5(p.lon), r5(p.lat)])).filter(l => l.length > 1);
      if (!lines.length) continue;
      const net = t.route === 'mtb' ? 'mtb' : (BIKE_NET[t.network] ? t.network : 'lcn');
      const old = bikeRoutes.get(el.id);
      // bei erneutem Laden die Teilstücke beider Ausschnitte behalten
      const all = old ? old.lines.concat(lines) : lines;
      bikeRoutes.set(el.id, { id: el.id, name: t.name || t.ref || L('Radroute'), ref: t.name && t.ref ? t.ref : '', net,
        km: parseFloat(String(t.distance || '').replace(',', '.')) || null, from: t.from || '', to: t.to || '',
        lines: all, kmHere: all.reduce((a, l) => a + lineLen(l), 0) / 1000 });
    }
    setSrc('bikeroutes', bikeRoutesFC());
    if (S.exploring && !S.bikeToldCount && bikeRoutes.size) {
      S.bikeToldCount = true;
      speak(L('{n} Radrouten in der Nähe. Tippe eine an, um ihr zu folgen.', { n: bikeRoutes.size }));
    }
  } catch (e) {
    if (S.exploring) toast(L('Radrouten gerade nicht verfügbar'));
  } finally { bikeLoading = false; renderExploreBanner(); }
}

// Kacheln (~450 × 450 m): schon erkundet = cyan, auf dieser Fahrt neu entdeckt = pink
function renderCells() {
  if (!S.pos) return;
  cellsAt = Date.now();
  const fresh = new Set();
  (S.trip ? S.trip.coords : []).forEach(c => { const k = cellKey(c[1], c[0]); if (!explored.has(k)) fresh.add(k); });
  S.newCells = fresh.size;
  if (S.newCells > lastNewCells && lastNewCells >= 0 && S.exploring) { vibrate(25); if (S.newCells % 5 === 0) toast(`🧭 ${L('{n} neue Kacheln entdeckt!', { n: S.newCells })}`); }
  lastNewCells = S.newCells;
  const i0 = Math.floor(S.pos.lat / CELL), j0 = Math.floor(S.pos.lng / (CELL * 1.5)), R = 10, feats = [];
  for (let i = i0 - R; i <= i0 + R; i++) for (let j = j0 - R; j <= j0 + R; j++) {
    const k = i + ':' + j, st = fresh.has(k) ? 'new' : explored.has(k) ? 'old' : null;
    if (!st) continue;
    const a = i * CELL, b = j * CELL * 1.5, b2 = b + CELL * 1.5, a2 = a + CELL;
    feats.push({ type: 'Feature', properties: { st }, geometry: { type: 'Polygon', coordinates: [[[b, a], [b2, a], [b2, a2], [b, a2], [b, a]]] } });
  }
  setSrc('cells', { type: 'FeatureCollection', features: feats });
}

// kürzester Abstand zur gewählten Route (m)
function distToRoute(r) {
  let best = Infinity;
  for (const l of r.lines) for (const p of l) { const d = haversine(S.pos.lat, S.pos.lng, p[1], p[0]); if (d < best) best = d; }
  return best;
}
function renderExploreBanner() {
  if (!S.exploring) return;
  const fr = S.followRoute && bikeRoutes.get(S.followRoute), n = bikeRoutes.size;
  $('manText').textContent = fr ? `⭐ ${fr.name}` : bikeLoading && !n ? L('Radrouten werden geladen…') : L('{n} Radrouten in der Nähe', { n });
  let sub = L('{n} neue Kacheln', { n: S.newCells || 0 });
  if (fr && S.pos) { const d = distToRoute(fr); sub = `${d < 40 ? L('Du bist auf der Route ✓') : L('Route {d} entfernt', { d: fmtDist(d) })} · ${sub}`; }
  $('manStreet').textContent = sub;
}
// bei jeder GPS-Position (aus onFix)
function exploreTick() {
  loadBikeRoutes(false);
  if (Date.now() - cellsAt > 5000) renderCells();
  renderExploreBanner();
}

// Linienstil: die verfolgte Route leuchtet, die anderen treten zurück
function bikeRoutePaint() {
  const f = S.followRoute, is = ['==', ['get', 'id'], f || -1];
  return {
    width: f ? ['case', is, 7, 3] : ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 5],
    opacity: f ? ['case', is, 1, .3] : .85,
    glow: f ? ['case', is, .55, 0] : .22
  };
}
function applyBikeRoutePaint() {
  if (!mapReady || !map.getLayer('bikeroutes-line')) return;
  const p = bikeRoutePaint();
  map.setPaintProperty('bikeroutes-line', 'line-width', p.width);
  map.setPaintProperty('bikeroutes-line', 'line-opacity', p.opacity);
  map.setPaintProperty('bikeroutes-glow', 'line-opacity', p.glow);
}

// Radroute angetippt: Infos, Akku-Check und „Folgen“
function onBikeRouteClick(e) {
  const f = e.features && e.features[0], r = f && bikeRoutes.get(f.properties.id);
  if (!r) return;
  const net = BIKE_NET[r.net], following = S.followRoute === r.id;
  const ev = r.km && rangeKm(vehicle) != null ? (rangeKm(vehicle) >= r.km
    ? `<div class="text-xs font-bold text-lime-300 mt-1">🔋 ${L('Akku reicht für die ganze Route ✓')}</div>`
    : `<div class="text-xs font-bold text-amber-300 mt-1">🔋 ${L('Akku reicht für ~{km} km der Route', { km: fmtKm(rangeKm(vehicle)) })}</div>`) : '';
  const div = document.createElement('div');
  div.className = 'poi-pop';
  div.innerHTML = `<div class="text-[10px] uppercase tracking-[.2em] font-game" style="color:${net.color}">${esc(net.label)}</div>
    <div class="text-lg font-extrabold leading-tight mt-0.5">${esc(r.name)}${r.ref ? ` <span class="text-slate-400 text-sm">(${esc(r.ref)})</span>` : ''}</div>
    ${r.from || r.to ? `<div class="text-sm text-slate-300 mt-0.5">${esc(r.from)}${r.from && r.to ? ' → ' : ''}${esc(r.to)}</div>` : ''}
    <div class="text-sm text-slate-300 mt-1">${r.km ? `${L('Gesamtlänge')} ~${fmtKm(r.km)} km · ` : ''}${L('hier sichtbar')} ~${fmtKm(r.kmHere)} km</div>
    ${ev}
    <div class="grid grid-cols-2 gap-2 mt-3">
      <button class="poi-btn rt-follow">${following ? '✖ ' + L('Nicht mehr folgen') : '⭐ ' + L('Folgen')}</button>
      <button class="poi-btn rt-show">🗺️ ${L('Ganz zeigen')}</button>
    </div>`;
  const pop = openPlaceCard(div);
  div.querySelector('.rt-follow').onclick = () => {
    pop.remove();
    S.followRoute = following ? null : r.id;
    applyBikeRoutePaint(); renderExploreBanner();
    if (S.followRoute) { speak(L('Folge {n}', { n: r.name })); toast(`⭐ ${r.name}`); }
  };
  div.querySelector('.rt-show').onclick = () => {
    pop.remove();
    if (S.follow) { S.follow = false; $('recenterBtn').classList.add('active-ring'); }
    fitCoords(r.lines.flat().filter((c, i) => i % 3 === 0));
  };
}

function startExplore() {
  if (!canExplore(vehicle)) return;
  S.exploring = true; S.followRoute = null; S.newCells = 0; S.bikeToldCount = false; lastNewCells = 0; cellsAt = 0;
  applyBikeRoutePaint();
  setSrc('bikeroutes', bikeRoutesFC());
  startFree();
  loadBikeRoutes(true);
  renderCells();
}
function stopExplore() {
  if (!S.exploring) return;
  S.exploring = false; S.followRoute = null;
  setSrc('bikeroutes', emptyFC()); setSrc('cells', emptyFC());
}
// Erkunden-Knopf nur für Fahrrad, E-Bike und E-Roller
function renderExploreBtn() {
  $('bikeBtns').classList.toggle('hidden', !canExplore(vehicle));
}

/* =================================================================
   RUNDTOUR (BRouter plant die Runde, OSRM liefert die Abbiegehinweise)
   ================================================================= */
const BROUTER = 'https://brouter.de/brouter';
const LOOP_KM = Array.from({ length: 15 }, (_, i) => 10 + i * 5); // 10, 15, … 80 km
let loopDir = Math.floor(Math.random() * 360);

// OSRM-Route über mehrere Punkte (Fahrrad-Profil), ohne Alternativen
async function fetchViaRoute(points) {
  let lastErr;
  const coords = points.map(p => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  for (const base of ROUTERS.bike) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(`${base}${coords}?overview=full&geometries=geojson&steps=true&continue_straight=true`, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error(j.message || L('Keine Route gefunden'));
      return j.routes[0];
    } catch (e) { lastErr = e.name === 'AbortError' ? new Error(L('Zeitüberschreitung')) : e; }
    finally { clearTimeout(timer); }
  }
  throw lastErr;
}
// Route als Runde kennzeichnen und die Zwischenpunkte mit ihrer Position entlang der Route merken
function markLoop(N, vias) {
  N.loop = true;
  N.vias = vias.map(v => { const sn = snapToRoute(N, v.lat, v.lng, true); return { lat: v.lat, lng: v.lng, along: sn ? sn.along : 0 }; })
    .sort((a, b) => a.along - b.along);
  return N;
}
// BRouter-Rundkurs holen; der Parameter wirkt etwa wie Länge ÷ 5 – einmal nachjustieren, falls die Runde zu kurz/lang ist
async function brouterLoop(from, km, dir) {
  const target = km * 1000;
  let rt = target / 5, best = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const url = `${BROUTER}?lonlats=${from.lng.toFixed(5)},${from.lat.toFixed(5)}&profile=trekking&alternativeidx=0&format=geojson` +
        `&engineMode=4&roundTripDistance=${Math.round(rt)}&direction=${Math.round(dir)}`;
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(), f = j.features && j.features[0];
      if (!f) throw new Error(L('Keine Route gefunden'));
      const len = +f.properties['track-length'] || lineLen(f.geometry.coordinates);
      if (!best || Math.abs(len - target) < Math.abs(best.len - target)) best = { len, coords: f.geometry.coordinates };
      if (Math.abs(len - target) / target < .12) break;
      rt *= target / len;
    } catch (e) { if (!best && attempt === 2) throw e; if (e.name === 'AbortError' && !best) throw new Error(L('Zeitüberschreitung')); }
    finally { clearTimeout(timer); }
  }
  if (!best) throw new Error(L('Keine Route gefunden'));
  return best;
}
// Ganze Rundtour planen: Runde von BRouter, daraus ~10 Zwischenpunkte für die Navigation mit Ansagen
async function planRoundTrip(from, km, dir) {
  const loop = await brouterLoop(from, km, dir);
  const c = loop.coords, cum = [0];
  for (let i = 1; i < c.length; i++) cum[i] = cum[i - 1] + haversine(c[i - 1][1], c[i - 1][0], c[i][1], c[i][0]);
  const total = cum[cum.length - 1], n = 10, vias = [];
  for (let k = 1; k <= n; k++) {
    const want = total * k / (n + 1);
    let i = cum.findIndex(x => x >= want); if (i < 0) i = c.length - 1;
    vias.push({ lng: c[i][0], lat: c[i][1] });
  }
  const route = await fetchViaRoute([from].concat(vias, [from]));
  return markLoop(prepareNav(route), vias);
}

/* --- Auswahl der Länge und Vorschau --- */
function openLoopPicker() {
  if (!S.pos) { toast(L('Kein Standort – bitte GPS erlauben, dann erneut wählen.')); return; }
  const range = rangeKm(vehicle);
  $('loopChips').innerHTML = LOOP_KM.map(km => {
    const tight = range != null && km > range;
    return `<button data-km="${km}" class="loop-chip ${tight ? 'tight' : ''}"><span class="font-game font-black text-lg">${km}</span><span class="text-[10px]">${tight ? '🔋!' : 'km'}</span></button>`;
  }).join('');
  $('loopChips').querySelectorAll('button').forEach(b => b.onclick = () => { closeLoopPicker(); showRoundTrip(+b.dataset.km); });
  $('loopRange').innerHTML = range != null
    ? `🔋 ${L('Dein Akku reicht für ~{km} km', { km: fmtKm(range) })}${LOOP_KM.some(k => k > range) ? ` · <span class="text-amber-300">${L('längere Runden sind markiert')}</span>` : ''}`
    : '';
  $('loopModal').classList.remove('hidden');
}
function closeLoopPicker() { $('loopModal').classList.add('hidden'); }

async function showRoundTrip(km, newDir) {
  if (S.mode === 'nav' || S.mode === 'free') { toast(L('Erst die aktuelle Fahrt beenden')); return; }
  if (!S.pos) { toast(L('Kein Standort – bitte GPS erlauben, dann erneut wählen.')); return; }
  if (newDir) loopDir = (loopDir + 100 + Math.random() * 80) % 360; // „Andere Runde“: deutlich andere Richtung
  if (S.viewTrip) closeTripView();
  S.start = null;
  const from = { lat: S.pos.lat, lng: S.pos.lng };
  S.dest = { name: L('Rundtour {km} km', { km }), sub: L('Start und Ziel: dein Standort'), lat: from.lat, lng: from.lng, loop: true, loopKm: km, here: true };
  setDestMarker(null); setStartMarker(null);
  renderFavBtn();
  $('destName').textContent = S.dest.name;
  $('destSub').textContent = S.dest.sub;
  $('destFrom').classList.add('hidden');
  $('routeCards').innerHTML = `<div class="text-center text-slate-400 py-4 font-game text-sm blink">${L('PLANE RUNDTOUR…')}</div>`;
  $('goBtn').disabled = true;
  clearFuelStations(); S.routeWx = null;
  setMode('preview');
  renderRouteExtras();
  try {
    const N = await planRoundTrip(from, km, loopDir);
    if (S.mode !== 'preview' || !S.dest || !S.dest.loop) return;
    S.routes = [N]; S.routeIdx = 0;
    $('goBtn').disabled = false;
    drawPreview(true);
    routeWeather(N);
  } catch (e) {
    if (S.mode === 'preview') $('routeCards').innerHTML = `<div class="text-center text-red-300 py-3 text-sm">${L('Rundtour gerade nicht verfügbar ({e}). Später erneut versuchen.', { e: esc(e.message) })}</div>`;
  }
}
