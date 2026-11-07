// NeonNav – Verkehrslage: Staus, Sperrungen & Warnungen der Autobahn GmbH, Ansagen und Ausweichrouten
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   VERKEHR (verkehr.autobahn.de – offizielle, freie Daten für deutsche Autobahnen)
   ================================================================= */
const AUTOBAHN_API = 'https://verkehr.autobahn.de/o/autobahn/';
const TRAFFIC_TTL = 3 * 60000;   // Meldungen je Autobahn höchstens alle 3 Minuten neu laden
const TRAFFIC_KIND = {
  jam:     { color: '#ff1744', icon: '🚗', label: L('Stau') },
  slow:    { color: '#ff9100', icon: '🐢', label: L('Stockender Verkehr') },
  closure: { color: '#b00020', icon: '⛔', label: L('Sperrung') },
  warn:    { color: '#ffd600', icon: '⚠️', label: L('Gefahrenmeldung') },
  works:   { color: '#facc15', icon: '🚧', label: L('Baustelle') }
};
const roadCache = new Map();     // 'A7' → { at, items }
let autobahnRoads = null;        // Liste aller Autobahnen der Schnittstelle
let areaTraffic = { on: false, items: [], at: 0, center: null, loading: false };
const trafficOn = () => profileOf(tripVehicle()) === 'car';

// Autobahn-Nummern einer Route aus den Straßenbezeichnungen der Abschnitte („A 7;E 45“ → A7)
function routeRoads(N) {
  const set = new Set();
  N.steps.forEach(s => String(s.ref || '').split(/[;,/]/).forEach(r => { const m = r.trim().match(/^A\s?(\d{1,3})$/i); if (m) set.add('A' + m[1]); }));
  return [...set];
}
const ptOf = s => { const [a, b] = String(s || '').split(',').map(Number); return isFinite(a) && isFinite(b) ? [b, a] : null; };
function parseTraffic(road, x, isClosure) {
  if (x.future === true || x.future === 'true') return null; // geplante Baustellen später
  const desc = (x.description || []).filter(Boolean).map(String);
  const all = desc.join(' ');
  let kind;
  // gesperrte Auf-/Abfahrten betreffen die Route meist nicht – weglassen statt falsch umzuleiten
  if (isClosure && /ENTRY_EXIT/.test(String(x.display_type))) return null;
  if (isClosure) kind = String(x.isBlocked) === 'true' || /Vollsperrung/i.test(String(x.title) + all) ? 'closure' : 'works';
  else {
    const t = x.abnormalTrafficType || '';
    kind = String(x.isBlocked) === 'true' ? 'closure' : /QUEUING|STATIONARY/.test(t) || /Stillstand|Stau/i.test(all) ? 'jam' : /SLOW|HEAVY/.test(t) ? 'slow' : 'warn';
  }
  const line = x.geometry && x.geometry.type === 'LineString' && x.geometry.coordinates.length > 1
    ? x.geometry.coordinates.map(c => [r5(+c[0]), r5(+c[1])]) : [ptOf(x.point) || (x.coordinate ? [+x.coordinate.long, +x.coordinate.lat] : null)].filter(Boolean);
  if (!line.length) return null;
  return { id: x.identifier || `${road}-${line[0].join(',')}`, road, kind, title: String(x.title || road).replace(/\s+/g, ' ').trim(),
    sub: String(x.subtitle || '').trim(), delay: Math.max(0, parseInt(x.delayTimeValue, 10) || 0), speed: parseInt(x.averageSpeed, 10) || null,
    accident: /Unfall/i.test(all), desc: desc.slice(0, 12), line };
}
async function loadRoad(road) {
  const c = roadCache.get(road);
  if (c && Date.now() - c.at < TRAFFIC_TTL) return c.items;
  const get = async kind => {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(`${AUTOBAHN_API}${road}/services/${kind}`, { signal: ctl.signal });
      if (!r.ok) return [];
      const j = await r.json();
      return (j[kind] || []).map(x => parseTraffic(road, x, kind === 'closure')).filter(Boolean);
    } catch (e) { return []; } finally { clearTimeout(timer); }
  };
  const [w, cl] = await Promise.all([get('warning'), get('closure')]);
  const items = w.concat(cl);
  roadCache.set(road, { at: Date.now(), items });
  return items;
}

// Meldung auf die Route legen – nur in Fahrtrichtung (die Gegenfahrbahn liegt ~20–40 m daneben)
function matchTraffic(N, it) {
  const a = it.line[0], b = it.line[it.line.length - 1];
  const s1 = snapToRoute(N, a[1], a[0], true);
  if (!s1 || s1.dist > 60) return null;
  if (it.line.length < 2) return s1.dist <= 30 ? { along: s1.along, len: 0 } : null;
  const s2 = snapToRoute(N, b[1], b[0], true);
  if (!s2 || s2.dist > 60) return null;
  const ib = bearingTo(a[1], a[0], it.line[Math.min(1, it.line.length - 1)][1], it.line[Math.min(1, it.line.length - 1)][0]);
  const diff = Math.abs(((ib - s1.bearing + 540) % 360) - 180);
  if (diff > 60 || s2.along < s1.along - 30) return null;
  return { along: s1.along, len: Math.max(0, s2.along - s1.along) };
}
// Zeitverlust einer Meldung in Minuten (Sperrung: Route praktisch unbrauchbar)
const trafficCost = t => t.kind === 'closure' ? 90 : t.kind === 'works' ? 0 : t.delay || (t.kind === 'jam' ? 10 : t.kind === 'slow' ? 3 : 0);
async function loadTrafficForRoutes(navs) {
  if (!trafficOn()) return;
  const roads = [...new Set(navs.flatMap(routeRoads))];
  const lists = await Promise.all(roads.map(loadRoad));
  const items = lists.flat();
  navs.forEach(N => {
    const mine = new Set(routeRoads(N));
    N.traffic = items.filter(t => mine.has(t.road)).map(t => { const m = matchTraffic(N, t); return m ? Object.assign({}, t, m) : null; })
      .filter(Boolean).sort((x, y) => x.along - y.along);
    N.trafficDelay = N.traffic.reduce((s, t) => s + trafficCost(t), 0);
    N.trafficAt = Date.now();
  });
}
const trafficAhead = N => (N.traffic || []).filter(t => t.along + t.len > N.along - 50);
const trafficDelayAhead = N => trafficAhead(N).reduce((s, t) => s + (t.kind === 'closure' ? 0 : trafficCost(t)), 0);

/* --- Karte --- */
function trafficFC(list) {
  return { type: 'FeatureCollection', features: list.map(t => ({ type: 'Feature',
    properties: { id: t.id, kind: t.kind, color: TRAFFIC_KIND[t.kind].color },
    geometry: t.line.length > 1 ? { type: 'LineString', coordinates: t.line } : { type: 'Point', coordinates: t.line[0] } })) };
}
let trafficShown = [];
function showTraffic(list) { trafficShown = list || []; setSrc('traffic', trafficFC(trafficShown)); }
function onTrafficClick(e) {
  const f = e.features && e.features[0], t = f && trafficShown.find(x => x.id === f.properties.id);
  if (!t) return;
  const k = TRAFFIC_KIND[t.kind], div = document.createElement('div');
  div.className = 'poi-pop';
  div.innerHTML = `<div class="text-[10px] uppercase tracking-[.2em] font-game" style="color:${k.color}">${k.icon} ${esc(t.accident ? L('Unfall') : k.label)}</div>
    <div class="text-lg font-extrabold leading-tight mt-0.5">${esc(t.title)}</div>
    ${t.sub ? `<div class="text-sm text-slate-300">${esc(t.sub.replace('->', '→'))}</div>` : ''}
    ${t.delay ? `<div class="text-sm font-bold text-red-300 mt-1">⏱️ ${L('Zeitverlust ca. {m} min', { m: t.delay })}</div>` : ''}
    ${t.speed ? `<div class="text-xs text-slate-400">${L('Ø {v} km/h', { v: t.speed })}</div>` : ''}
    <div class="mt-2 text-xs text-slate-300 leading-snug max-h-48 overflow-y-auto">${t.desc.filter(l => !/^Beginn:|^$/.test(l)).map(esc).join('<br>')}</div>
    <div class="text-[10px] text-slate-500 mt-2">${L('Quelle')}: Autobahn GmbH</div>`;
  openPlaceCard(div);
}

/* --- Routenvorschau: Stau je Route, stau-ärmere Route empfehlen --- */
function trafficRouteLine(N) {
  if (!N.traffic) return '';
  const real = N.traffic.filter(t => t.kind !== 'works');
  if (!real.length) return routeRoads(N).length ? `<div class="text-xs font-bold text-lime-300 mt-1">🚦 ${L('Autobahn frei – keine Staus gemeldet')}</div>` : '';
  const jams = real.filter(t => t.kind === 'jam' || t.kind === 'slow').length, cl = real.filter(t => t.kind === 'closure').length;
  const parts = [jams && L(jams > 1 ? '{n} Staus' : '{n} Stau', { n: jams }), cl && L(cl > 1 ? '{n} Sperrungen' : '{n} Sperrung', { n: cl }),
    real.length - jams - cl > 0 && L('{n} Warnungen', { n: real.length - jams - cl })].filter(Boolean).join(' · ');
  const d = trafficDelayAhead(Object.assign({}, N, { along: 0 }));
  return `<div class="text-xs font-bold text-red-300 mt-1">🚗 ${parts}${d ? ` · +${d} min` : ''}</div>`;
}
// nach dem Laden: Route mit der kürzesten Gesamtzeit (Fahrzeit + Stau) vorschlagen
function recommendByTraffic(navs) {
  const eff = N => N.duration / 60 + (N.trafficDelay || 0);
  let best = 0;
  navs.forEach((N, i) => { if (eff(N) < eff(navs[best])) best = i; });
  const save = Math.round(eff(navs[S.routeIdx]) - eff(navs[best]));
  if (best !== S.routeIdx && save >= 5) {
    S.routeIdx = best;
    toast(`🚦 ${L('Wegen Stau: Route {n} empfohlen, spart ~{m} min', { n: best + 1, m: save })}`);
  }
}

/* --- Navigation: Ansagen, Anzeige, Ausweichroute --- */
let trafficLoading = false;
function trafficTick(N) {
  if (!trafficOn() || !N) return;
  if (!trafficLoading && (!N.trafficAt || Date.now() - N.trafficAt > TRAFFIC_TTL)) {
    trafficLoading = true;
    const before = new Set((N.traffic || []).map(t => t.id));
    loadTrafficForRoutes([N]).then(() => {
      if (S.nav !== N) return;
      showTraffic(N.traffic);
      // neue, relevante Meldung voraus → Ausweichroute prüfen
      const fresh = trafficAhead(N).filter(t => !before.has(t.id) && (trafficCost(t) >= 5 || t.kind === 'closure'));
      if (fresh.length || (!before.size && trafficAhead(N).some(t => trafficCost(t) >= 5 || t.kind === 'closure'))) checkDetour(N);
    }).finally(() => { trafficLoading = false; });
  }
  const next = trafficAhead(N).find(t => t.kind !== 'works' || t.along - N.along < 1500);
  const el = $('trafficNext');
  if (!next) { el.classList.add('hidden'); return; }
  const d = Math.max(0, next.along - N.along), k = TRAFFIC_KIND[next.kind];
  el.classList.remove('hidden');
  el.style.color = k.color;
  el.textContent = `${k.icon} ${next.accident ? L('Unfall') : k.label} ${d < 30 ? L('jetzt') : L('in {d}', { d: fmtDist(d) })}${next.delay ? ` · +${next.delay} min` : ''} · ${next.title.replace(/^A\d+\s*\|\s*/, '')}`;
  // Ansagen: weit vorher und kurz davor, je einmal
  const st = N.trafficSaid || (N.trafficSaid = {});
  const far = S.speed > 80 ? 3000 : 1500, near = S.speed > 80 ? 800 : 400;
  if (next.kind === 'works') { if (d <= near && !st[next.id + 'n']) { st[next.id + 'n'] = st[next.id + 'f'] = true; speak(L('Achtung, Baustelle voraus.')); } return; }
  const what = next.accident ? L('Unfall') : next.kind === 'jam' ? L('Stau') : next.kind === 'slow' ? L('stockender Verkehr') : next.kind === 'closure' ? L('Sperrung') : L('Gefahrenmeldung');
  const loss = next.delay ? ' ' + L('Etwa {m} Minuten Zeitverlust.', { m: next.delay }) : '';
  if (d <= near && !st[next.id + 'n']) { st[next.id + 'n'] = st[next.id + 'f'] = true; speak(L('Achtung, {w} voraus.', { w: what }) + loss); vibrate([80, 60, 80]); }
  else if (d <= far && d > near && !st[next.id + 'f']) { st[next.id + 'f'] = true; speak(L('Achtung, {w} in {d}.', { w: what, d: speechDist(d) }) + loss); }
}

// Alternativen ab hier rechnen; spart eine mindestens 5 Minuten, „Umfahren“ anbieten
let detourBusy = false, detourOffer = null, detourTimer = 0;
async function checkDetour(N) {
  // Mit offenen Zwischenzielen liefert OSRM keine Alternativen – dann keine Umfahrung anbieten
  if (detourBusy || detourOffer || !S.pos || !S.dest || S.nav !== N || S.rerouting || N.loop || stopsAhead(N).length) return;
  if (N.detourAskedAt && Date.now() - N.detourAskedAt < 10 * 60000) return;
  detourBusy = true;
  try {
    const routes = (await fetchRoutes(S.pos, S.dest)).map(r => prepareNav(r));
    await loadTrafficForRoutes(routes);
    if (S.nav !== N) return;
    const remain = Math.max(0, N.total - N.along);
    const cur = N.duration * (remain / N.total) / 60 + trafficDelayAhead(N) + (trafficAhead(N).some(t => t.kind === 'closure') ? 90 : 0);
    const eff = R => R.duration / 60 + (R.trafficDelay || 0);
    const best = routes.reduce((a, R) => eff(R) < eff(a) ? R : a, routes[0]);
    const save = Math.round(cur - eff(best));
    // nur wenn die Alternative die Meldung wirklich umfährt (andere Route, deutlich schneller)
    const avoids = !trafficAhead(N).filter(t => trafficCost(t) >= 5 || t.kind === 'closure').every(t => (best.traffic || []).some(b => b.id === t.id));
    N.detourAskedAt = Date.now();
    if (save >= 5 && avoids) offerDetour(best, save);
  } catch (e) { /* kein Netz – später erneut */ } finally { detourBusy = false; }
}
function offerDetour(R, save) {
  detourOffer = R;
  $('detourText').textContent = L('Stau voraus – eine Ausweichroute spart ca. {m} min.', { m: save });
  $('detourGo').textContent = `↪ ${L('Umfahren')} (−${save} min)`;
  $('detourBox').classList.remove('hidden');
  speak(L('Stau voraus. Eine Ausweichroute spart etwa {m} Minuten. Tippe auf Umfahren.', { m: save }));
  vibrate([60, 40, 60]);
  clearTimeout(detourTimer);
  detourTimer = setTimeout(() => closeDetour(), 30000);
}
function closeDetour() { clearTimeout(detourTimer); detourOffer = null; $('detourBox').classList.add('hidden'); }
function acceptDetour() {
  const R = detourOffer;
  closeDetour();
  if (!R || S.mode !== 'nav') return;
  R.along = 0; R.lastIdx = 0; R.announced = {}; R.offCount = 0;
  S.nav = R;
  setRouteOnMap(R);
  showTraffic(R.traffic);
  loadCamsAlongRoutes([R]);
  loadLimitsAlongRoute(R);
  if (fuelOnRoute.length) fuelOnRoute = snapFuelTo(R, fuelOnRoute);
  speak(L('Ausweichroute aktiv.'));
  toast('↪ ' + L('Ausweichroute aktiv'));
  if (S.pos) updateNav(S.pos);
}

/* --- Verkehr in der Umgebung (Karte, freie Fahrt) --- */
async function nearbyRoads(c) {
  if (!autobahnRoads) {
    try { const r = await fetch(AUTOBAHN_API); autobahnRoads = new Set(((await r.json()).roads || []).map(String)); } catch (e) { autobahnRoads = null; }
  }
  const j = await overpass(`[out:json][timeout:20];way["highway"="motorway"]["ref"](around:30000,${c.lat.toFixed(4)},${c.lng.toFixed(4)});out tags;`, 25000);
  const set = new Set();
  ((j && j.elements) || []).forEach(w => String(w.tags.ref || '').split(/[;,/]/).forEach(r => { const m = r.trim().match(/^A\s?(\d{1,3})$/i); if (m) set.add('A' + m[1]); }));
  return [...set].filter(r => !autobahnRoads || autobahnRoads.has(r)).slice(0, 12);
}
async function loadAreaTraffic(force) {
  if (!S.pos || areaTraffic.loading) return;
  if (!force && areaTraffic.center && haversine(areaTraffic.center.lat, areaTraffic.center.lng, S.pos.lat, S.pos.lng) < 10000 && Date.now() - areaTraffic.at < TRAFFIC_TTL) return;
  areaTraffic.loading = true;
  const c = { lat: S.pos.lat, lng: S.pos.lng };
  try {
    const roads = await nearbyRoads(c);
    const items = (await Promise.all(roads.map(loadRoad))).flat()
      .filter(t => haversine(c.lat, c.lng, t.line[0][1], t.line[0][0]) < 40000 && t.kind !== 'works');
    Object.assign(areaTraffic, { items, at: Date.now(), center: c });
    if (areaTraffic.on && S.mode !== 'nav' && S.mode !== 'preview') showTraffic(items);
    if (force) {
      const jams = items.filter(t => t.kind === 'jam' || t.kind === 'slow').length;
      toast(items.length ? `🚦 ${L('{n} Meldungen im Umkreis von 40 km', { n: items.length })}${jams ? ` · ${L(jams > 1 ? '{n} Staus' : '{n} Stau', { n: jams })}` : ''}` : `🚦 ${L('Autobahnen im Umkreis frei')}`);
    }
  } catch (e) { if (force) toast(L('Verkehrslage gerade nicht verfügbar')); }
  finally { areaTraffic.loading = false; }
}
function setAreaTraffic(on) {
  areaTraffic.on = on;
  $('trafficBtn').classList.toggle('active-ring', on);
  if (on) loadAreaTraffic(true); else if (S.mode !== 'nav' && S.mode !== 'preview') showTraffic([]);
}
// freie Fahrt: Meldung genau voraus (gleiche Richtung, vor mir) ansagen
function freeTrafficTick() {
  if (!areaTraffic.on || S.mode !== 'free' || !S.pos || S.speed < 30) return;
  loadAreaTraffic(false);
  const said = areaTraffic.said || (areaTraffic.said = {});
  for (const t of areaTraffic.items) {
    if (t.line.length < 2) continue;
    const p = t.line[0], d = haversine(S.pos.lat, S.pos.lng, p[1], p[0]);
    if (d > 2500 || said[t.id + (d < 700 ? 'n' : 'f')]) continue;
    const toIt = bearingTo(S.pos.lat, S.pos.lng, p[1], p[0]), dir = bearingTo(p[1], p[0], t.line[1][1], t.line[1][0]);
    const ahead = Math.abs(((toIt - S.heading + 540) % 360) - 180) < 30, same = Math.abs(((dir - S.heading + 540) % 360) - 180) < 50;
    if (!ahead || !same) continue;
    said[t.id + 'f'] = true; if (d < 700) said[t.id + 'n'] = true;
    const what = t.accident ? L('Unfall') : t.kind === 'jam' ? L('Stau') : t.kind === 'slow' ? L('stockender Verkehr') : t.kind === 'closure' ? L('Sperrung') : L('Gefahrenmeldung');
    speak(L('Achtung, {w} in {d}.', { w: what, d: speechDist(d) }) + (t.delay ? ' ' + L('Etwa {m} Minuten Zeitverlust.', { m: t.delay }) : ''));
    break;
  }
}
