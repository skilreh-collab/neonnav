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
  const on = canExplore(vehicle);
  $('exploreStart').classList.toggle('hidden', !on);
  $('driveBtns').classList.toggle('grid-cols-2', on);
}
