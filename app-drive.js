// NeonNav – GPS, Fahrtaufzeichnung, Ghost-Rennen, Routing & Navigation
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   GPS
   ================================================================= */
let watchId = null;
function startGPS() {
  if (!('geolocation' in navigator)) { $('gpsText').textContent = L('Kein GPS'); return; }
  if (!window.isSecureContext) toast(L('GPS braucht HTTPS (z. B. GitHub Pages)'));
  if (watchId !== null) return;
  watchId = navigator.geolocation.watchPosition(p => {
    onFix({ lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed, heading: p.coords.heading, acc: p.coords.accuracy, t: p.timestamp || Date.now() });
  }, err => {
    $('gpsText').textContent = err.code === 1 ? L('GPS verweigert') : L('Suche GPS…');
    if (err.code === 1) toast(L('Standort verweigert – bitte in den Einstellungen erlauben'));
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}
function stopGPS() { if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; } }

function onFix(f) {
  const prev = S.pos;
  let kmh = 0;
  if (f.speed != null && !isNaN(f.speed) && f.speed >= 0) kmh = f.speed * 3.6;
  else if (prev && f.t - prev.t > 500) kmh = haversine(prev.lat, prev.lng, f.lat, f.lng) / ((f.t - prev.t) / 1000) * 3.6;
  if (kmh < 2) kmh = 0;

  let hdg = S.heading;
  if (f.heading != null && !isNaN(f.heading) && kmh > 3) hdg = f.heading;
  else if (prev && haversine(prev.lat, prev.lng, f.lat, f.lng) > 4) hdg = bearingTo(prev.lat, prev.lng, f.lat, f.lng);

  S.speed = kmh;
  S.pos = { lat: f.lat, lng: f.lng, t: f.t, acc: f.acc };
  S.lastFixAt = Date.now();
  $('gpsText').textContent = `GPS ±${Math.round(f.acc || 0)} m`;

  if (S.trip) recordTrip(f, kmh);
  if (S.mode === 'nav' && S.nav) {
    const sn = updateNav(f);
    if (sn && sn.dist < 25) hdg = sn.bearing;
  }
  // Im Stand gibt GPS keine Richtung her – dann zählt der Geräte-Kompass
  if (kmh < 6 && devHdgFresh()) hdg = S.devHdg;
  S.heading = hdg;

  movePuck(f.lat, f.lng, hdg);
  if (S.firstFix) {
    S.firstFix = false;
    applyTheme();
    if (S.mode === 'browse' && !S.viewTrip) map.jumpTo({ center: [f.lng, f.lat], zoom: 15.5, pitch: S.view3d ? 45 : 0 });
  }
  checkHazards();
  maybeLoadCamsArea();
  updateWxNow();
  updateLimit(f, kmh, hdg);
  ghostTick();
  renderGauge();
  renderFreeStats();
  if (S.exploring) exploreTick();
  freeTrafficTick();
  camera();
}

/* =================================================================
   FAHRT AUFZEICHNEN
   ================================================================= */
function startTrip(label) {
  // tl: Zeitverlauf [ms seit Start, gefahrene Meter] – Grundlage fürs Ghost-Rennen
  S.trip = { start: Date.now(), label, coords: [], tl: [], distance: 0, max: 0, xpAcc: 0, overSec: 0 };
  if (isLightEV(vehicle)) S.trip.startCharge = vehicle.charge != null ? vehicle.charge : 100;
  if (S.pos) { S.trip.coords.push([r5(S.pos.lng), r5(S.pos.lat)]); S.trip.tl.push([0, 0]); }
  setSrc('trail', emptyFC());
  nativePost({ type: 'trip', on: true });
}
// Nachricht an die iOS-App (nur dort vorhanden; im Browser passiert nichts)
function nativePost(msg) { try { window.webkit.messageHandlers.native.postMessage(msg); } catch (e) {} }
function recordTrip(f, kmh, quiet) {
  const T = S.trip, good = f.acc == null || f.acc <= 35, last = T.coords[T.coords.length - 1];
  // Zeitstempel der Messung – wichtig für nachgelieferte Hintergrund-Positionen
  const at = Math.max(0, (f.t || Date.now()) - T.start);
  if (!last) { if (good) { T.coords.push([r5(f.lng), r5(f.lat)]); T.tl.push([at, 0]); } }
  else {
    const d = haversine(last[1], last[0], f.lat, f.lng);
    const maxJump = S.bridgeGap ? 300000 : 2000;
    if (good && d >= 5 && d < maxJump && !(kmh < 3 && d < 15)) {
      S.bridgeGap = false;
      T.coords.push([r5(f.lng), r5(f.lat)]);
      T.distance += d;
      T.tl.push([at, Math.round(T.distance)]);
      T.xpAcc += d;
      if (T.xpAcc >= 100) { const n = Math.floor(T.xpAcc / 100); T.xpAcc -= n * 100; addXP(n); }
    }
  }
  if (good && kmh < 350) T.max = Math.max(T.max, kmh);
  if (S.mode === 'free' && !quiet) setSrc('trail', lineFC(T.coords));
}
// Von der iOS-App im Hintergrund gesammelte Positionen: Strecke ins Fahrtenbuch übernehmen,
// danach mit der neuesten Position normal weitermachen (Ansagen, Blitzer, Kamera)
window.neonnavBackfill = list => {
  if (!list || !list.length) return;
  const lastT = S.pos ? S.pos.t || 0 : 0;
  const fresh = list.filter(f => f.t > lastT);
  if (!fresh.length) return;
  if (S.trip) {
    for (let i = 0; i < fresh.length - 1; i++) {
      const f = fresh[i], kmh = f.speed != null && f.speed >= 0 ? f.speed * 3.6 : 0;
      recordTrip(f, kmh < 2 ? 0 : kmh, true);
    }
    S.bridgeGap = false;
    // vorletzte Position als Ausgangspunkt, damit onFix Tempo und Richtung richtig berechnet
    const pen = fresh[Math.max(0, fresh.length - 2)];
    if (fresh.length > 1) S.pos = { lat: pen.lat, lng: pen.lng, t: pen.t, acc: pen.acc };
  }
  onFix(fresh[fresh.length - 1]);
};
function finishTrip() {
  const T = S.trip;
  S.trip = null;
  nativePost({ type: 'trip', on: false });
  setSrc('trail', emptyFC());
  if (!T || T.distance < 50 || T.coords.length < 2) return null;
  let coords = T.coords;
  if (coords.length > 4000) { const k = Math.ceil(coords.length / 4000); coords = coords.filter((c, i) => i % k === 0 || i === coords.length - 1); }
  const dur = Date.now() - T.start;
  const trip = { id: 't' + Date.now().toString(36), date: new Date(T.start).toISOString(), label: T.label, duration: dur,
                 distance: Math.round(T.distance), avg: dur > 0 ? (T.distance / 1000) / (dur / 3600000) : 0, max: T.max, coords };
  const tv = tripVehicle(), c = costFor(trip.distance, trip.avg, tv);
  trip.cost = c.eur; trip.costExtra = c.extra; trip.co2 = Math.round(c.co2 * 100) / 100;
  trip.vehicle = vehicleLabel(tv); trip.kind = tv.kind; trip.over = Math.round(T.overSec || 0); trip.lim = Math.round(T.limSec || 0); if (T.walk) trip.walk = true;
  let trips = store.get(LS.trips, []);
  trips.unshift(trip);
  while (!store.set(LS.trips, trips) && trips.length > 1) trips.pop();
  S.lastTripRaw = T;
  addExplored(trip.coords);
  return trip;
}

/* =================================================================
   GHOST-RENNEN – gegen die eigene Bestzeit (gleicher Start ±500 m, gleiches Ziel ±150 m)
   ================================================================= */
let ghostMarker = null;
const fmtSec = ms => { const s = Math.round(Math.abs(ms) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`; };
const ghostMatch = (g, fromLat, fromLng, to) => haversine(g.to[0], g.to[1], to.lat, to.lng) < 150 && haversine(g.from[0], g.from[1], fromLat, fromLng) < 500;

function ghostStart(dest, N) {
  ghostStop();
  if (!dest || dest.walk || !S.pos) return;
  const g = store.get(LS.ghosts, []).find(x => ghostMatch(x, S.pos.lat, S.pos.lng, dest));
  if (!g) return;
  S.ghost = g;
  const el = document.createElement('div');
  el.className = 'ghost-mk'; el.textContent = '👻';
  ghostMarker = new maplibregl.Marker({ element: el }).setLngLat([g.pts[0][0], g.pts[0][1]]).addTo(map);
  $('ghostLine').textContent = '👻 ' + L('Dein Geist fährt mit · Bestzeit {t}', { t: fmtSec(g.dur) });
  $('ghostLine').className = 'mb-2 text-sm font-bold px-1 text-violet-300';
}
function ghostStop() {
  if (ghostMarker) { ghostMarker.remove(); ghostMarker = null; }
  S.ghost = null;
  $('ghostLine').classList.add('hidden');
}
// Interpolation in den Geist-Punkten [lng, lat, Meter, ms] nach Zeit (k = 3) oder Strecke (k = 2)
function ghostInterp(pts, k, v) {
  if (v <= pts[0][k]) return pts[0];
  const last = pts[pts.length - 1];
  if (v >= last[k]) return last;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (pts[mid][k] <= v) lo = mid; else hi = mid; }
  const a = pts[lo], b = pts[hi], f = b[k] > a[k] ? (v - a[k]) / (b[k] - a[k]) : 0;
  return a.map((x, i) => x + (b[i] - x) * f);
}
function ghostTick() {
  const g = S.ghost, T = S.trip;
  if (!g || !T || S.mode !== 'nav') return;
  const el = Date.now() - T.start, gp = ghostInterp(g.pts, 3, el);
  if (ghostMarker) ghostMarker.setLngLat([gp[0], gp[1]]);
  // Wie lange hat der Geist für meine bisherige Strecke gebraucht?
  const diff = el - ghostInterp(g.pts, 2, T.distance)[3];
  const line = $('ghostLine');
  if (T.distance < 200) return;
  line.textContent = '👻 ' + (diff < -3000 ? L('{t} schneller als dein Geist', { t: fmtSec(diff) }) : diff > 3000 ? L('{t} hinter deinem Geist', { t: fmtSec(diff) }) : L('Kopf an Kopf mit deinem Geist!'));
  line.className = `mb-2 text-sm font-bold px-1 ${diff < -3000 ? 'text-lime-300' : diff > 3000 ? 'text-pink-300' : 'text-violet-300'}`;
}
// Nach Ankunft: Bestzeit speichern bzw. vergleichen. Gibt einen Zusatz für die Ankunftsmeldung zurück.
function ghostFinish(dest, trip) {
  const T = S.lastTripRaw;
  if (!T || !T.tl || T.tl.length < 2 || T.tl.length !== T.coords.length) return '';
  const list = store.get(LS.ghosts, []), from = T.coords[0];
  const idx = list.findIndex(g => ghostMatch(g, from[1], from[0], dest)), old = idx >= 0 ? list[idx] : null;
  const fair = (trip.over || 0) <= 10; // höchstens 10 s über dem Tempolimit
  if (!fair) return ' · 👻 ' + L('Bestzeit zählt nur ohne Tempoverstöße');
  if (old && trip.duration >= old.dur) return ' · 👻 ' + L('{t} langsamer als dein Geist', { t: fmtSec(trip.duration - old.dur) });
  let pts = T.coords.map((c, i) => [c[0], c[1], T.tl[i][1], T.tl[i][0]]);
  if (pts.length > 600) { const k = Math.ceil(pts.length / 600); pts = pts.filter((p, i) => i % k === 0 || i === pts.length - 1); }
  const g = { from: [from[1], from[0]], to: [dest.lat, dest.lng], name: dest.name, dur: trip.duration, date: trip.date, pts };
  let msg;
  if (old) { list[idx] = g; bumpStat('ghostWins'); msg = ' · 👻 ' + L('NEUE BESTZEIT, {t} schneller!', { t: fmtSec(old.dur - trip.duration) }); }
  else { list.unshift(g); msg = ' · 👻 ' + L('Geist gespeichert – nächstes Mal fährt er mit'); }
  let keep = list.slice(0, 15);
  while (!store.set(LS.ghosts, keep) && keep.length > 1) keep.pop();
  return msg;
}

/* =================================================================
   ROUTING (OSRM) & NAVIGATIONSLOGIK
   ================================================================= */
async function fetchRoutes(from, to) {
  let lastErr;
  for (const base of ROUTERS[to.walk ? 'foot' : profileOf(vehicle)]) {
    // Zeitlimit je Server – hängt einer (Funkloch, Überlastung), kommt sofort der nächste dran
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const url = `${base}${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error(j.message || L('Keine Route gefunden'));
      return j.routes;
    } catch (e) { lastErr = e.name === 'AbortError' ? new Error(L('Zeitüberschreitung')) : e; }
    finally { clearTimeout(timer); }
  }
  throw lastErr;
}

function prepareNav(route) {
  const coords = route.geometry.coordinates, cum = [0];
  for (let i = 1; i < coords.length; i++) cum[i] = cum[i - 1] + haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
  const total = cum[cum.length - 1] || 1;
  // Bei Routen über Zwischenpunkte (Rundtour) die „Ankunft/Abfahrt“ an jedem Zwischenpunkt weglassen
  const legs = route.legs, steps = legs.flatMap((l, li) => l.steps.filter(s =>
    !(li < legs.length - 1 && s.maneuver.type === 'arrive') && !(li > 0 && s.maneuver.type === 'depart')));
  const sumSteps = steps.reduce((a, s) => a + s.distance, 0) || 1, k = total / sumSteps;
  const stepStart = [];
  let acc = 0;
  for (const s of steps) { stepStart.push(acc * k); acc += s.distance; }
  const N = { route, coords, cum, total, steps, stepStart, duration: route.duration, lastIdx: 0, along: 0,
              announced: {}, offCount: 0, lastReroute: 0, routeHaz: [] };
  computeRouteHazards(N);
  return N;
}

// Position auf die Route projizieren (lokale Meter-Ebene)
function snapToRoute(N, lat, lng, full) {
  const c = N.coords;
  if (c.length < 2) return null;
  const kx = 111320 * Math.cos(lat * toR), ky = 110540;
  // Rundtour: Anfang und Ende liegen übereinander – nur kurz voraus suchen, sonst springt die Position ans Ende
  const ahead = N.loop ? 60 : 400;
  const from = full ? 0 : Math.max(0, N.lastIdx - 10), to = full ? c.length - 1 : Math.min(c.length - 1, N.lastIdx + ahead);
  let best = { dist: Infinity, idx: null, t: 0 };
  for (let i = from; i < to; i++) {
    const ax = (c[i][0] - lng) * kx, ay = (c[i][1] - lat) * ky, bx = (c[i + 1][0] - lng) * kx, by = (c[i + 1][1] - lat) * ky;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = L2 ? clamp(-(ax * dx + ay * dy) / L2, 0, 1) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.dist) best = { dist: d, idx: i, t };
  }
  if (!full && best.dist > 80) {
    const b2 = snapToRoute(N, lat, lng, true);
    // bei einer Runde nicht über den halben Kreis nach vorn springen
    if (b2 && b2.dist < best.dist && !(N.loop && b2.along - N.along > N.total * .3)) best = b2;
  }
  if (best.idx == null) return null;
  const a = c[best.idx], b = c[best.idx + 1];
  best.along = N.cum[best.idx] + best.t * (N.cum[best.idx + 1] - N.cum[best.idx]);
  best.bearing = bearingTo(a[1], a[0], b[1], b[0]);
  return best;
}

function pointAlong(N, s) {
  const cum = N.cum, c = N.coords;
  s = clamp(s, 0, N.total);
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
  const seg = cum[hi] - cum[lo], k = seg > 0 ? (s - cum[lo]) / seg : 0;
  const a = c[lo], b = c[hi];
  return { lat: a[1] + (b[1] - a[1]) * k, lng: a[0] + (b[0] - a[0]) * k, bearing: bearingTo(a[1], a[0], b[1], b[0]) };
}

function computeRouteHazards(N) {
  N.routeHaz = [];
  if (!N.cells) {
    N.cells = new Set();
    for (let s = 0; s <= N.total; s += 400) { const p = pointAlong(N, s); N.cells.add(Math.floor(p.lat * 100) + ':' + Math.floor(p.lng * 100)); }
  }
  const nearRoute = h => {
    const cy = Math.floor(h.lat * 100), cx = Math.floor(h.lng * 100);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (N.cells.has((cy + dy) + ':' + (cx + dx))) return true;
    return false;
  };
  const cams = osmEnabled ? [...osmCams.values()] : [];
  for (const h of allHaz().concat(cams)) {
    if (!nearRoute(h)) continue;
    const sn = snapToRoute(N, h.lat, h.lng, true);
    if (sn && sn.dist <= ROUTE_HAZ_R) N.routeHaz.push({ h, along: sn.along });
  }
  N.routeHaz.sort((a, b) => a.along - b.along);
}

function updateNav(f) {
  const N = S.nav, sn = snapToRoute(N, f.lat, f.lng, false);
  if (!sn) return null;
  const good = f.acc == null || f.acc <= 40;

  if (sn.dist > 50 && good) N.offCount++; else N.offCount = 0;
  if (N.offCount >= 3 && Date.now() - N.lastReroute > 10000 && !S.rerouting) { N.lastReroute = Date.now(); reroute(); return sn; }
  if (sn.dist <= 50) { N.lastIdx = sn.idx; N.along = sn.along; }

  const remain = Math.max(0, N.total - N.along);
  let ni = N.steps.length - 1;
  for (let i = 1; i < N.steps.length; i++) if (N.stepStart[i] > N.along + 3) { ni = i; break; }

  if (remain < 30 && (!N.loop || N.along > N.total * .6)) { arrived(); return sn; }
  const d = Math.max(0, N.stepStart[ni] - N.along);
  renderManeuver(N, ni, d);
  renderNavStats(N, remain);
  trafficTick(N);
  if (mapReady && map.getLayer('route-line')) map.setPaintProperty('route-line', 'line-gradient', routeGradient(N.along / N.total));
  voiceLogic(N, ni, d);
  checkFuelAhead(N);
  return sn;
}

/* --- Anweisungen (Bausteine je Sprache über L()) --- */
const ORD = { 1: L('erste'), 2: L('zweite'), 3: L('dritte'), 4: L('vierte'), 5: L('fünfte'), 6: L('sechste'), 7: L('siebte'), 8: L('achte') };
const DIR = { 'left': L('links abbiegen'), 'right': L('rechts abbiegen'), 'slight left': L('leicht links halten'), 'slight right': L('leicht rechts halten'),
              'sharp left': L('scharf links abbiegen'), 'sharp right': L('scharf rechts abbiegen'), 'straight': L('geradeaus weiterfahren'), 'uturn': L('wenden') };

function streetOf(step) {
  if (step.name && step.ref) return `${step.name} (${step.ref})`;
  return step.name || step.ref || '';
}
function action(step) {
  const m = step.maneuver, t = m.type, mod = m.modifier || 'straight', left = mod.includes('left'), side = left ? L('links') : L('rechts');
  switch (t) {
    case 'arrive': return L('Ziel erreichen');
    case 'depart': return L('Losfahren');
    case 'roundabout': case 'rotary': return m.exit ? L('Im Kreisverkehr {o} Ausfahrt', { o: ORD[m.exit] || m.exit + '.' }) : L('In den Kreisverkehr');
    case 'exit roundabout': case 'exit rotary': return L('Kreisverkehr verlassen');
    case 'on ramp': return L('Auffahrt {s} nehmen', { s: side });
    case 'off ramp': return L('Ausfahrt {s} nehmen', { s: side });
    case 'fork': return L('An der Gabelung {s} halten', { s: side });
    case 'merge': return left ? L('Links einfädeln') : L('Rechts einfädeln');
    case 'end of road': return L('Am Straßenende {s} abbiegen', { s: side });
    case 'continue': case 'new name': return mod === 'straight' ? L('Geradeaus weiter') : cap(DIR[mod] || L('weiterfahren'));
    default: return cap(DIR[mod] || L('weiterfahren'));
  }
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function subline(step) {
  const nm = streetOf(step);
  if (step.destinations && /ramp|fork/.test(step.maneuver.type)) return L('Richtung {x}', { x: step.destinations });
  return nm;
}
function speechPhrase(step) {
  const m = step.maneuver;
  if (m.type === 'arrive') return L('erreichen Sie Ihr Ziel');
  let p = action(step);
  p = p.charAt(0).toLowerCase() + p.slice(1);
  if ((m.type === 'roundabout' || m.type === 'rotary') && m.exit) p = L('im Kreisverkehr die {o} Ausfahrt nehmen', { o: ORD[m.exit] || m.exit + '.' });
  const sub = subline(step);
  return sub ? `${p}, ${sub}` : p;
}

/* --- Manöver-Icons --- */
const SK = 'fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  straight: `<path d="M24 44 V14" ${SK}/><path d="M12 19 L24 5 L36 19 Z" fill="currentColor"/>`,
  right: `<path d="M15 44 V27 Q15 17 25 17 H32" ${SK}/><path d="M30 5 L44 17 L30 29 Z" fill="currentColor"/>`,
  slight: `<path d="M17 44 V30 L30 16" ${SK}/><path d="M24 9 L39 6 L36 21 Z" fill="currentColor"/>`,
  sharp: `<path d="M14 44 V16 Q14 8 21 11 L31 25" ${SK}/><path d="M24 29 L40 36 L38 19 Z" fill="currentColor"/>`,
  uturn: `<path d="M33 44 V19 Q33 8 23 8 Q13 8 13 19 V29" ${SK}/><path d="M4 27 L13 42 L22 27 Z" fill="currentColor"/>`,
  round: `<circle cx="24" cy="19" r="10" ${SK}/><path d="M24 44 V29" ${SK}/><path d="M32 13 L42 6" ${SK}/>`
};
function iconFor(step, color = '#00e5ff') {
  const t = step.maneuver.type, mod = step.maneuver.modifier || 'straight';
  if (t === 'arrive') return '<span style="font-size:36px;line-height:1">🏁</span>';
  let key = 'straight';
  if (t === 'roundabout' || t === 'rotary' || t === 'exit roundabout' || t === 'exit rotary') key = 'round';
  else if (mod === 'uturn') key = 'uturn';
  else if (mod.includes('sharp')) key = 'sharp';
  else if (mod.includes('slight')) key = 'slight';
  else if (mod === 'left' || mod === 'right') key = 'right';
  const mirror = mod.includes('left') && key !== 'round' && key !== 'straight';
  return `<svg viewBox="0 0 48 48" width="100%" height="100%" style="color:${color};filter:drop-shadow(0 0 6px ${color})"><g ${mirror ? 'transform="translate(48 0) scale(-1 1)"' : ''}>${ICON[key]}</g></svg>`;
}

// Spurpfeil für eine Fahrspur; eine Spur kann mehrere Richtungen haben (z. B. geradeaus + rechts)
const LANE_ANGLE = { straight: 0, none: 0, 'slight right': 40, right: 90, 'sharp right': 135, 'slight left': -40, left: -90, 'sharp left': -135 };
function laneSvg(indications, on) {
  const col = on ? '#5ff2ff' : 'rgba(148,163,184,.45)';
  const arrows = (indications.length ? indications : ['straight']).map(ind => {
    if (ind === 'uturn') return `<path d="M16 34 V16 a6 6 0 0 0 -12 0 V22" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M0 20 L4 27 L8 20 Z" fill="${col}"/>`;
    const a = (LANE_ANGLE[ind] != null ? LANE_ANGLE[ind] : 0) * Math.PI / 180;
    const tx = 16 + 11 * Math.sin(a), ty = 17 - 11 * Math.cos(a);
    const deg = LANE_ANGLE[ind] || 0;
    return `<path d="M16 34 V17 L${tx.toFixed(1)} ${ty.toFixed(1)}" fill="none" stroke="${col}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M0 -5 L5 3 L-5 3 Z" fill="${col}" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${deg})"/>`;
  }).join('');
  return `<svg viewBox="0 0 32 36" width="30" height="34" style="${on ? 'filter:drop-shadow(0 0 4px rgba(0,229,255,.8))' : ''}">${arrows}</svg>`;
}
function renderLanes(step, d) {
  const box = $('manLanes');
  const lanes = step && step.intersections && step.intersections[0] && step.intersections[0].lanes;
  // nur in der Nähe des Manövers und nur, wenn es wirklich eine Auswahl gibt
  if (!lanes || lanes.length < 2 || d > 1500 || lanes.every(l => l.valid)) { box.classList.add('hidden'); box.style.display = ''; return; }
  box.innerHTML = lanes.map(l => laneSvg(l.indications || [], l.valid)).join('');
  box.classList.remove('hidden'); box.style.display = 'flex';
}

function renderManeuver(N, ni, d) {
  const step = N.steps[ni];
  renderLanes(step, d);
  $('manIcon').innerHTML = iconFor(step);
  $('manDist').textContent = fmtDist(d);
  $('manDist').style.fontSize = '';
  $('manText').textContent = action(step);
  $('manStreet').textContent = subline(step);
  const next = N.steps[ni + 1];
  if (next && N.stepStart[ni + 1] - N.stepStart[ni] < 400) {
    $('manNextIcon').innerHTML = iconFor(next, '#cbd5e1');
    $('manNextText').textContent = action(next);
    $('manNext').classList.remove('hidden'); $('manNext').style.display = 'flex';
  } else { $('manNext').classList.add('hidden'); }
}
function renderNavStats(N, remain) {
  // Ankunftszeit inkl. gemeldetem Stau-Zeitverlust auf dem Rest der Strecke
  const sec = N.duration * (remain / N.total) + trafficDelayAhead(N) * 60;
  $('d1').textContent = timeStr(new Date(Date.now() + sec * 1000)); $('d1l').textContent = L('Ankunft');
  const m = Math.round(sec / 60);
  if (m >= 60) { $('d2').textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; $('d2l').textContent = L('Std'); }
  else { $('d2').textContent = m; $('d2l').textContent = L('Min'); }
  $('d3').textContent = (remain / 1000).toFixed(remain < 10000 ? 1 : 0).replace('.', DEC); $('d3l').textContent = 'km';
  renderCostLine((N.total / 1000) / (N.duration / 3600), N.total);
}
function renderCostLine(avgPlan, totalPlan) {
  const T = S.trip;
  if (!T) { $('costLine').textContent = ''; return; }
  const tv = tripVehicle();
  const el = Date.now() - T.start, avg = el > 60000 ? (T.distance / 1000) / (el / 3600000) : avgPlan;
  const now = costFor(T.distance, avg, tv);
  const left = isFree(tv) ? `${kindInfo(tv.kind).icon} ${L('bisher')} ${now.extra}` : `💶 ${L('bisher')} <b class="text-lime-300 font-game">${now.text}</b>`;
  let right = `<span class="truncate">${esc(vehicleLabel(tv))}</span>`;
  if (totalPlan && !isFree(tv)) right = `${L('Ziel')} ≈ <b class="font-game text-white">${costFor(totalPlan, avgPlan, tv).text}</b>`;
  $('costLine').innerHTML = `<span>${left}</span><span class="text-right">${right}</span>`;
  renderRangeLine();
}
// E-Bike / E-Roller: Rest-Reichweite live – und ob sie bis zum Ziel reicht
function renderRangeLine() {
  const el = $('rangeLine'), T = S.trip, tv = tripVehicle();
  const start = T && T.startCharge != null ? T.startCharge : null;
  if (!T || start == null || !isLightEV(tv)) { el.classList.add('hidden'); return; }
  const charge = Math.max(0, start - chargeUsed(T.distance, tv)), left = rangeKm(tv, charge);
  const toGo = S.mode === 'nav' && S.nav ? Math.max(0, S.nav.total - S.nav.along) / 1000 : null;
  let cls = 'text-lime-300', msg = `🔋 ${Math.round(charge)} % · ${L('noch ~{km} km', { km: fmtKm(left) })}`;
  if (toGo != null) {
    if (left >= toGo * 1.1) msg += ` · ${L('reicht bis zum Ziel ✓')}`;
    else if (left >= toGo) { cls = 'text-amber-300'; msg += ` · ${L('wird knapp')}`; }
    else { cls = 'text-red-300'; msg += ` · ${L('reicht nicht – {km} km fehlen', { km: fmtKm(toGo - left) })}`; }
  } else if (left < 5) cls = 'text-red-300';
  else if (left < 12) cls = 'text-amber-300';
  el.className = `mt-2 px-1 text-sm font-bold ${cls}`;
  el.textContent = msg;
}
function updateNextHazard() {
  const el = $('hazNext');
  if (S.mode !== 'nav' || !S.nav) { el.classList.add('hidden'); return; }
  const nx = S.nav.routeHaz.find(x => x.along > S.nav.along - 15);
  if (!nx) { el.classList.add('hidden'); return; }
  el.textContent = `${nx.h.type === 'gefahr' ? '⚠️ Nächste Gefahr' : '📸 Nächster Blitzer'} in ${fmtDist(Math.max(0, nx.along - S.nav.along))}`;
  el.classList.remove('hidden');
}

function voiceLogic(N, ni, d) {
  const step = N.steps[ni];
  if (step.maneuver.type === 'arrive' && d < 60) return; // Ankunft separat
  const st = N.announced[ni] || (N.announced[ni] = {});
  const fast = S.speed > 80;
  const far = fast ? 1200 : 500, near = fast ? 400 : 180, now = fast ? 90 : 45;
  const phrase = speechPhrase(step);
  if (d <= now && !st.now) { st.now = st.near = st.far = true; speak(step.maneuver.type === 'arrive' ? L('Gleich erreichen Sie Ihr Ziel') : L('Jetzt {p}', { p: phrase })); }
  else if (d <= near && d > now && !st.near) { st.near = st.far = true; speak(L('In {d} {p}', { d: speechDist(d), p: phrase })); }
  else if (d <= far && d > near && !st.far) { st.far = true; speak(L('In {d} {p}', { d: speechDist(d), p: phrase })); }
}

async function reroute() {
  if (!S.pos || !S.dest || S.rerouting) return;
  S.rerouting = true;
  // Nur beim ersten Versuch ansagen – bei Funkloch nicht alle paar Sekunden wiederholen
  if (!S.rerouteFails) speak(L('Route wird neu berechnet'));
  $('manText').textContent = S.rerouteFails ? L('Kein Netz – neuer Versuch…') : L('Neuberechnung…');
  try {
    // Rundtour: zurück auf die Runde (über die restlichen Zwischenpunkte), nicht direkt nach Hause
    const loop = S.nav && S.nav.loop ? S.nav : null;
    const routes = loop ? [await fetchViaRoute([S.pos].concat(loop.vias.filter(v => v.along > loop.along + 300), [S.dest]))]
      : await fetchRoutes(S.pos, S.dest);
    if (S.mode !== 'nav') return;
    if (S.rerouteFails) speak(L('Neue Route gefunden'));
    S.rerouteFails = 0;
    S.nav = prepareNav(routes[0]);
    if (loop) markLoop(S.nav, loop.vias.filter(v => v.along > loop.along + 300).map(v => ({ lat: v.lat, lng: v.lng })));
    const RN = S.nav;
    loadTrafficForRoutes([RN]).then(() => { if (S.nav === RN) showTraffic(RN.traffic || []); }).catch(() => {});
    setRouteOnMap(S.nav);
    loadCamsAlongRoutes([S.nav]);
    loadLimitsAlongRoute(S.nav);
    if (fuelOnRoute.length) fuelOnRoute = snapFuelTo(S.nav, fuelOnRoute);
    toast('🔄 ' + L('Neue Route'));
  } catch (e) {
    // updateNav versucht es nach 10 s automatisch erneut, solange wir neben der Route sind
    if (!S.rerouteFails) toast(L('Neuberechnung fehlgeschlagen – ich versuche es weiter'));
    S.rerouteFails = (S.rerouteFails || 0) + 1;
    if (S.mode === 'nav') $('manText').textContent = L('Kein Netz – neuer Versuch…');
  } finally { S.rerouting = false; }
}

function setRouteOnMap(N) {
  setSrc('route', lineFC(N.coords));
  if (mapReady && map.getLayer('route-line')) map.setPaintProperty('route-line', 'line-gradient', routeGradient(N.along / N.total));
}
