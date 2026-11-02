// NeonNav – Ziel & Vorschau, Suche, Favoriten & Parkplatz
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   ZIEL, VORSCHAU, START, ANKUNFT
   ================================================================= */
let destMarker = null, startMarker = null;
// Marker „A“ für einen eigenen Startpunkt aus der Suche
function setStartMarker(p) {
  if (startMarker) startMarker.remove();
  startMarker = null;
  if (!p) return;
  const el = document.createElement('div'); el.className = 'start-mk'; el.textContent = 'A';
  startMarker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
}
function setDestMarker(p) {
  if (destMarker) destMarker.remove();
  destMarker = null;
  if (!p) { setStartMarker(null); return; }
  const el = document.createElement('div'); el.className = 'dest-mk'; el.textContent = '🏁';
  destMarker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
}

async function setDestination(place) {
  closeSearch();
  if (S.mode === 'nav' || S.mode === 'free') { toast(L('Erst die aktuelle Fahrt beenden')); return; }
  if (S.viewTrip) closeTripView();
  S.dest = place;
  if (!place.walk && !place.here) saveRecent(place);
  setDestMarker(place);
  setStartMarker(S.start);
  renderFavBtn();
  $('destName').textContent = place.name;
  $('destSub').textContent = place.sub || '';
  $('destFrom').textContent = S.start ? L('Von: {n}', { n: S.start.name }) : '';
  $('destFrom').classList.toggle('hidden', !S.start);
  $('routeCards').innerHTML = `<div class="text-center text-slate-400 py-4 font-game text-sm blink">${L('BERECHNE ROUTE…')}</div>`;
  $('goBtn').disabled = true;
  clearFuelStations(); S.routeWx = null;
  setMode('preview');
  renderRouteExtras();
  // Eigener Startpunkt aus der Suche, sonst die aktuelle GPS-Position
  const from = S.start || S.pos;
  if (!from) {
    $('routeCards').innerHTML = `<div class="text-center text-amber-300 py-3 text-sm">${L('Kein Standort – bitte GPS erlauben, dann erneut wählen.')}</div>`;
    map.easeTo({ center: [place.lng, place.lat], zoom: 14, padding: pad() });
    return;
  }
  try {
    const routes = await fetchRoutes(from, place);
    if (S.mode !== 'preview') return;
    S.routes = routes.map(prepareNav);
    S.routeIdx = 0;
    $('goBtn').disabled = false;
    drawPreview(true);
    routeWeather(S.routes[0]);
    if (!place.walk) routeFuel(S.routes[0]);
    const navs = S.routes;
    loadCamsAlongRoutes(navs).then(() => { if (S.mode === 'preview' && S.routes === navs) { navs.forEach(computeRouteHazards); drawPreview(false); } });
    // Verkehrslage je Route; ist eine Alternative trotz Stau schneller, wird sie vorgeschlagen
    loadTrafficForRoutes(navs).then(() => { if (S.mode === 'preview' && S.routes === navs) { recommendByTraffic(navs); drawPreview(false); } }).catch(() => {});
  } catch (e) {
    $('routeCards').innerHTML = `<div class="text-center text-red-300 py-3 text-sm">${L('Route nicht verfügbar ({e}). Später erneut versuchen.', { e: esc(e.message) })}</div>`;
  }
}

// E-Bike / E-Roller: reicht der Akku für die Strecke – und für Hin und Zurück?
function evRouteLine(m) {
  if (S.dest && S.dest.walk) return '';
  const left = rangeKm(vehicle);
  if (left == null) return '';
  const km = m / 1000, charge = vehicle.charge != null ? vehicle.charge : 100;
  if (S.dest && S.dest.loop) {
    const ok = left >= km, tone = left >= km * 1.15 ? 'text-lime-300' : ok ? 'text-amber-300' : 'text-red-300';
    const txt = ok ? (left >= km * 1.15 ? L('Akku reicht für die ganze Runde ✓') : L('Akku reicht knapp für die Runde'))
      : L('Akku reicht nicht – {km} km fehlen', { km: fmtKm(km - left) });
    return `<div class="text-xs font-bold mt-1 ${tone}">🔋 ${Math.round(charge)} % · ~${fmtKm(left)} km · ${txt}</div>`;
  }
  const one = left >= km, both = left >= km * 2;
  const tone = both ? 'text-lime-300' : one ? 'text-amber-300' : 'text-red-300';
  const txt = !one ? L('Akku reicht nicht – {km} km fehlen', { km: fmtKm(km - left) })
    : both ? L('Reicht hin und zurück ohne Laden ✓')
    : L('Reicht hin – für zurück nachladen');
  return `<div class="text-xs font-bold mt-1 ${tone}">🔋 ${Math.round(charge)} % · ~${fmtKm(left)} km · ${txt}</div>`;
}
function drawPreview(fit) {
  if (!S.routes.length) return;
  const sel = S.routes[S.routeIdx];
  setSrc('route', lineFC(sel.coords));
  if (mapReady && map.getLayer('route-line')) map.setPaintProperty('route-line', 'line-gradient', routeGradient(0));
  setSrc('alts', { type: 'FeatureCollection', features: S.routes.map((r, i) => i === S.routeIdx ? null :
    { type: 'Feature', properties: { idx: i }, geometry: { type: 'LineString', coordinates: r.coords } }).filter(Boolean) });

  $('routeCards').innerHTML = S.routes.map((r, i) => {
    const on = i === S.routeIdx, hz = r.routeHaz.length, c = costFor(r.total, (r.total / 1000) / (r.duration / 3600), tripVehicle());
    const ev = evRouteLine(r.total) + trafficRouteLine(r);
    // im kleinen Feld bleibt nur die gewählte Route sichtbar
    return `<button data-idx="${i}" ${on ? '' : 'data-extra'} class="route-card w-full text-left rounded-2xl p-3 border ${on ? 'border-cyan-300 bg-cyan-400/10' : 'border-slate-700 bg-black/30'}">
      <div class="flex justify-between items-baseline gap-2">
        <span class="font-game text-2xl font-black ${on ? 'neon-text' : 'text-slate-200'}">${fmtDur(r.duration)}</span>
        <span class="text-slate-300 font-semibold">${(r.total / 1000).toFixed(1).replace('.', DEC)} km</span>
      </div>
      <div class="mt-1 flex justify-between gap-2 text-sm"><span class="font-game font-bold text-lime-300">💶 ${c.text}</span><span class="text-xs text-slate-400 self-center">${c.extra}</span></div>
      <div class="text-xs text-slate-400 mt-1">${L('Ankunft')} ${timeStr(new Date(Date.now() + r.duration * 1000))}${i === 0 ? ` · <span class="text-lime-300">${L('Schnellste')}</span>` : ''} ·
        ${hz ? `<span class="text-red-300">📸 ${L(hz > 1 ? '{n} Meldungen auf der Strecke' : '{n} Meldung auf der Strecke', { n: hz })}</span>` : L('keine Meldungen')}</div>
      ${ev}
    </button>`;
  }).join('');
  document.querySelectorAll('.route-card').forEach(b => b.onclick = () => selectRoute(+b.dataset.idx));
  showTraffic(sel.traffic || []);

  if (fit) requestAnimationFrame(() => fitCoords(S.routes.flatMap(r => [r.coords[0], r.coords[r.coords.length - 1]]).concat(sel.coords.filter((c, i) => i % 20 === 0))));
}
function selectRoute(i) { if (i === S.routeIdx || !S.routes[i]) return; S.routeIdx = i; drawPreview(false); }

// Start und Ziel tauschen (ohne eigenen Start: aktuelle Position wird zum Ziel)
function swapRoute() {
  if (!S.dest) return;
  const here = S.pos ? { name: L('Mein Standort'), sub: '', lat: S.pos.lat, lng: S.pos.lng, here: true } : null;
  const newDest = S.start || here;
  if (!newDest) { toast(L('Kein Standort – bitte GPS erlauben, dann erneut wählen.')); return; }
  S.start = S.dest.here ? null : S.dest;
  setDestination(newDest);
}

function cancelPreview() {
  S.start = null;
  S.dest = null; S.routes = []; S.routeWx = null;
  showTraffic(areaTraffic.on ? areaTraffic.items : []);
  clearFuelStations();
  setDestMarker(null);
  setSrc('route', emptyFC()); setSrc('alts', emptyFC());
  setMode('browse');
  S.follow = true; $('recenterBtn').classList.remove('active-ring');
  camera();
}

function startNav() {
  if (!S.routes.length) return;
  unlockAudio();
  const N = S.routes[S.routeIdx];
  N.along = 0; N.lastIdx = 0; N.announced = {}; N.offCount = 0;
  S.nav = N; S.rerouteFails = 0; N.trafficSaid = {};
  showTraffic(N.traffic || []);
  setSrc('alts', emptyFC());
  setRouteOnMap(N);
  computeRouteHazards(N);
  startTrip(S.dest ? S.dest.name : 'Navigation');
  maybeRefreshPrices();
  loadCamsAlongRoutes([N]);
  S.follow = true; S.camZoom = null; $('recenterBtn').classList.remove('active-ring');
  setMode('nav');
  requestWakeLock();
  $('manIcon').innerHTML = iconFor(N.steps[Math.min(1, N.steps.length - 1)]);
  fuelAnnounced = false;
  if (fuelOnRoute.length && N !== S.routes[0]) { fuelOnRoute = snapFuelTo(N, fuelOnRoute); showFuelMarkers(fuelOnRoute.slice(0, 10)); }
  if (S.trip && S.dest && S.dest.walk) S.trip.walk = true;
  ghostStart(S.dest, N);
  loadLimitsAlongRoute(N);
  const wx = S.routeWx && S.routeWx.warn ? ' ' + L('Achtung, {w} {where}.', { w: S.routeWx.warn, where: S.routeWx.mid && wxWarn(S.routeWx.mid) ? L('unterwegs') : L('am Ziel') }) : '';
  speak(L('Los geht\'s. Ankunft in etwa {t}.', { t: fmtDur(N.duration).replace('h', L('Stunden')).replace('min', L('Minuten')) }) + wx + (S.ghost ? ' ' + L('Dein Geist fährt mit – schlag deine Bestzeit, aber fair!') : ''));
  if (S.pos) { updateNav(S.pos); camera(); }
}

function startFree() {
  unlockAudio();
  if (S.viewTrip) closeTripView();
  S.nav = null;
  // Erkunden-Modus (app-explore.js) ist eine freie Fahrt mit Radrouten und Kacheln
  const ex = !!S.exploring;
  startTrip(ex ? 'Erkunden' : 'Freie Fahrt');
  maybeRefreshPrices();
  S.follow = true; S.camZoom = null; $('recenterBtn').classList.remove('active-ring');
  $('manIcon').innerHTML = `<span style="font-size:34px">${ex ? kindInfo(vehicle.kind).icon : '🚗'}</span>`;
  $('manDist').textContent = ex ? L('ERKUNDEN') : L('FREIE FAHRT');
  $('manDist').style.fontSize = '24px';
  $('manText').textContent = ex ? L('Radrouten werden geladen…') : L('Blitzerwarner aktiv');
  $('manStreet').textContent = ex ? L('{n} neue Kacheln', { n: 0 }) : L('Strecke wird aufgezeichnet');
  $('manNext').classList.add('hidden');
  renderLanes(null, 0);
  setMode('free');
  // Auto/Motorrad: Verkehrslage der Umgebung automatisch einblenden und Staus voraus ansagen
  if (!ex && trafficOn() && !areaTraffic.on) setAreaTraffic(true);
  renderFreeStats();
  requestWakeLock();
  speak(ex ? L('Erkunden-Modus. Ich zeige dir Radrouten und neue Gegenden.') : L('Freie Fahrt. Blitzerwarner ist aktiv.'));
  camera();
  S.freeBannerTimer = setTimeout(flyBannerIntoCar, 3500);
}

// Freie Fahrt: Hinweis-Banner nur kurz zeigen, dann in das Fahrzeug hineinfliegen lassen
function flyBannerIntoCar() {
  if (S.mode !== 'free') return;
  const top = $('navTop'), card = top.firstElementChild;
  const a = card.getBoundingClientRect(), b = puckEl.getBoundingClientRect();
  // Ohne GPS-Puck auf der Karte: dorthin fliegen, wo das Fahrzeug während der Fahrt sitzt
  const bx = puckAdded && b.width ? b.left + b.width / 2 : innerWidth / 2;
  const by = puckAdded && b.width ? b.top + b.height / 2 : innerHeight * .7;
  top.style.setProperty('--fx', `${Math.round(bx - (a.left + a.width / 2))}px`);
  top.style.setProperty('--fy', `${Math.round(by - (a.top + a.height / 2))}px`);
  // Kompass bleibt sichtbar – er wandert in die obere rechte Ecke
  S.compassHome = $('compass').parentNode;
  $('compassFloat').appendChild($('compass'));
  $('compassFloat').classList.remove('hidden');
  top.classList.add('fly-in');
  setTimeout(() => {
    if (S.mode !== 'free' || !top.classList.contains('fly-in')) return;
    top.classList.add('hidden');
    puckEl.classList.remove('gulp'); void puckEl.offsetWidth; puckEl.classList.add('gulp');
    vibrate(30);
  }, 850);
}
// Fahrzeug antippen holt das Banner bei freier Fahrt kurz zurück
puckEl.addEventListener('click', e => {
  if (S.mode !== 'free' || !$('navTop').classList.contains('hidden')) return;
  e.stopPropagation();
  resetFreeBanner();
  $('navTop').classList.remove('hidden');
  S.freeBannerTimer = setTimeout(flyBannerIntoCar, 3500);
});
function resetFreeBanner() {
  clearTimeout(S.freeBannerTimer);
  $('navTop').classList.remove('fly-in');
  if (S.compassHome && $('compass').parentNode !== S.compassHome) S.compassHome.appendChild($('compass'));
  $('compassFloat').classList.add('hidden');
}

function endDrive(reason) {
  const wasNav = S.mode === 'nav', dest = S.dest, walk = !!(dest && dest.walk);
  const evTrip = S.trip && S.trip.startCharge != null && !walk ? { start: S.trip.startCharge, m: S.trip.distance } : null;
  const trip = finishTrip();
  // E-Bike / E-Roller: Ladestand um den Verbrauch der Fahrt senken
  if (evTrip && isLightEV(vehicle)) {
    vehicle.charge = Math.max(0, Math.round((evTrip.start - chargeUsed(evTrip.m)) * 10) / 10);
    store.set(LS.vehicle, vehicle);
  }
  const ghostMsg = reason === 'arrived' && trip && dest && !walk ? ghostFinish(dest, trip) : '';
  ghostStop();
  stopExplore();
  closeDetour();
  showTraffic(areaTraffic.on ? areaTraffic.items : []);
  S.nav = null; S.dest = null; S.routes = []; S.start = null;
  setDestMarker(null);
  setSrc('route', emptyFC()); setSrc('alts', emptyFC());
  clearFuelStations();
  hideAlarm();
  releaseWakeLock();
  setMode('browse');
  S.follow = true; S.camZoom = null;
  camera();
  if (walk && reason === 'arrived') clearParking();
  else if (trip && !walk) saveParking();
  if (reason === 'arrived') bumpStat('arrivals');
  if (reason === 'arrived') {
    addXP(50);
    toast(walk ? `🅿️ ${L('Fahrzeug gefunden!')} +50 XP` : `🏁 ${L('Ziel erreicht!')} +50 XP${trip ? ` · ${(trip.distance / 1000).toFixed(1).replace('.', DEC)} km · ${fmtEur(trip.cost)}` : ''}${ghostMsg}`);
  } else if (trip) toast(`${L('Fahrt gespeichert')} · ${(trip.distance / 1000).toFixed(1).replace('.', DEC)} km · ${fmtEur(trip.cost)}`);
  else if (wasNav || reason === 'manual') toast(L('Fahrt beendet'));
  checkAchievements(trip);
}
function arrived() {
  speak(L('Sie haben Ihr Ziel erreicht.'));
  jingle(); vibrate([100, 60, 100, 60, 300]);
  endDrive('arrived');
}

/* =================================================================
   SUCHE (Nominatim) & LETZTE ZIELE
   ================================================================= */
let searchTimer = null, searchSeq = 0;
let searchTarget = 'dest';   // welches Feld die Trefferliste gerade füllt: 'start' | 'dest'
function openSearch() {
  $('searchPanel').classList.remove('hidden');
  $('searchInput').value = '';
  $('startInput').value = S.start ? S.start.name : '';
  searchTarget = 'dest';
  renderRecentsList();
  setTimeout(() => $('searchInput').focus(), 50);
}
function closeSearch() { $('searchPanel').classList.add('hidden'); $('searchInput').blur(); $('startInput').blur(); }
function pickPlace(p) {
  if (searchTarget !== 'start') { setDestination(p); return; }
  S.start = p.here ? null : p;
  $('startInput').value = S.start ? S.start.name : '';
  searchTarget = 'dest';
  renderRecentsList();
  $('searchInput').focus();
}

function placeRow(p, icon) {
  const dist = S.pos && !p.here ? ` · ${fmtDist(haversine(S.pos.lat, S.pos.lng, p.lat, p.lng))}` : '';
  return `<div class="flex items-center gap-3"><span class="text-xl w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-slate-800">${icon}</span>
    <div class="min-w-0"><div class="font-bold text-white truncate">${esc(p.name)}</div><div class="text-xs text-slate-400 truncate">${esc(p.sub || '')}${dist}</div></div></div>`;
}
function renderPlaceList(list, icon, emptyText) {
  const box = $('searchResults');
  if (!list.length) { box.innerHTML = `<div class="text-center text-slate-500 py-8">${emptyText}</div>`; return; }
  box.innerHTML = '';
  list.forEach(p => {
    const b = document.createElement('button');
    b.className = 'w-full text-left rounded-2xl bg-slate-900/80 border border-slate-800 p-3 active:scale-[.98] transition';
    b.innerHTML = placeRow(p, p.icon || icon);
    b.onclick = () => pickPlace(p);
    box.appendChild(b);
  });
}
function renderRecentsList() {
  // Favoriten zuerst, danach die letzten Ziele (ohne Doppelte)
  const fv = favs.map(f => ({ name: f.type === 'fav' ? f.name : FAV_LABEL[f.type], sub: f.type === 'fav' ? f.sub : f.name, lat: f.lat, lng: f.lng, icon: FAV_ICON[f.type] }));
  const rec = store.get(LS.recents, []).filter(r => !favAt(r));
  // Beim Startfeld oben „Mein Standort“ anbieten, um zurück auf GPS zu wechseln
  const here = searchTarget === 'start' ? [{ name: L('Mein Standort'), sub: L('Aktuelle GPS-Position'), here: true, icon: '📍',
    lat: S.pos ? S.pos.lat : 0, lng: S.pos ? S.pos.lng : 0 }] : [];
  renderPlaceList(here.concat(fv, rec), '🕘', `${L('Tippe ein Ziel ein.')}<br><span class="text-xs">${L('Tipp: Lange auf die Karte drücken setzt ein Ziel.')}</span>`);
}
async function doSearch(q) {
  const seq = ++searchSeq;
  let url = `${NOMINATIM}search?format=jsonv2&addressdetails=1&limit=8&accept-language=${LANG}&q=${encodeURIComponent(q)}`;
  if (S.pos) { const d = .8; url += `&viewbox=${S.pos.lng - d},${S.pos.lat + d},${S.pos.lng + d},${S.pos.lat - d}`; }
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const j = await r.json();
    if (seq !== searchSeq) return;
    let list = j.map(x => {
      const a = x.address || {};
      const name = x.name || [a.road, a.house_number].filter(Boolean).join(' ') || x.display_name.split(',')[0];
      const parts = x.display_name.split(',').map(s => s.trim()).filter(s => s && s !== name);
      return { name, sub: parts.slice(0, 3).join(', '), lat: +x.lat, lng: +x.lon };
    });
    if (S.pos) list.sort((a, b) => haversine(S.pos.lat, S.pos.lng, a.lat, a.lng) - haversine(S.pos.lat, S.pos.lng, b.lat, b.lng));
    renderPlaceList(list, '📍', L('Nichts gefunden.'));
  } catch (e) {
    if (seq === searchSeq) $('searchResults').innerHTML = `<div class="text-center text-red-300 py-8">${L('Suche fehlgeschlagen – Internet prüfen.')}</div>`;
  }
}
function saveRecent(p) {
  let rec = store.get(LS.recents, []).filter(x => haversine(x.lat, x.lng, p.lat, p.lng) > 30);
  rec.unshift({ name: p.name, sub: p.sub || '', lat: p.lat, lng: p.lng });
  store.set(LS.recents, rec.slice(0, 8));
  renderRecentChips();
}
function renderRecentChips() {
  const box = $('recentChips'), rec = store.get(LS.recents, []);
  box.innerHTML = '';
  box.classList.toggle('hidden', !rec.length);
  rec.slice(0, 6).forEach(p => {
    const b = document.createElement('button');
    b.className = 'shrink-0 h-10 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm font-semibold max-w-[180px] truncate';
    b.textContent = '🕘 ' + p.name;
    b.onclick = () => setDestination(p);
    box.appendChild(b);
  });
}

/* =================================================================
   FAVORITEN & PARKPLATZ
   ================================================================= */
const FAV_ICON = { home: '🏠', work: '💼', fav: '⭐' };
const FAV_LABEL = { home: L('Zuhause'), work: L('Arbeit') };
let favs = store.get(LS.favs, []);
let park = store.get(LS.park, null), parkMarker = null;
const favAt = p => favs.find(f => haversine(f.lat, f.lng, p.lat, p.lng) < 40);
// Bei Fußwegen zum geparkten Fahrzeug wird mit „Zu Fuß“ geroutet und gerechnet
const tripVehicle = () => (S.dest && S.dest.walk) ? { kind: 'foot' } : vehicle;

function saveFav(place, type) {
  // Zuhause/Arbeit gibt es nur einmal; ein Favorit am selben Ort wird ersetzt
  favs = favs.filter(f => !(type !== 'fav' && f.type === type) && haversine(f.lat, f.lng, place.lat, place.lng) >= 40);
  favs.push({ id: 'f' + Date.now().toString(36), type, name: place.name, sub: place.sub || '', lat: place.lat, lng: place.lng });
  store.set(LS.favs, favs);
  renderFavChips(); renderFavBtn();
  toast(`${FAV_ICON[type]} ${L('{x} gespeichert', { x: type === 'fav' ? place.name : FAV_LABEL[type] })}`);
  checkAchievements();
}
function removeFav(id) {
  favs = favs.filter(f => f.id !== id); store.set(LS.favs, favs);
  renderFavChips(); renderFavBtn(); toast(L('Favorit entfernt'));
}
let favTarget = null;
function openFavModal(place) {
  favTarget = place;
  const cur = favAt(place);
  $('favName').textContent = place.name;
  $('favRemove').classList.toggle('hidden', !cur);
  document.querySelectorAll('.fav-opt').forEach(b => b.classList.toggle('!border-cyan-300', !!cur && cur.type === b.dataset.ft));
  $('favModal').classList.remove('hidden');
}
function closeFavModal() { $('favModal').classList.add('hidden'); favTarget = null; }
function renderFavBtn() {
  const f = S.dest && favAt(S.dest);
  $('favBtn').textContent = f ? FAV_ICON[f.type] : '☆';
  const loop = !!(S.dest && S.dest.loop);
  $('favBtn').classList.toggle('hidden', !!(S.dest && S.dest.walk) || loop);
  // Rundtour: statt „Tauschen“ gibt es „Andere Runde“
  $('swapBtn').classList.toggle('hidden', loop);
  $('reloopBtn').classList.toggle('hidden', !loop);
}
function goFav(f) {
  setDestination(f.type === 'fav' ? { name: f.name, sub: f.sub, lat: f.lat, lng: f.lng } : { name: FAV_LABEL[f.type], sub: f.name, lat: f.lat, lng: f.lng });
}
// Langes Drücken auf einen Chip (z. B. zum Entfernen) – der normale Tipp wird dann unterdrückt
function onHold(el, fn) {
  let t = null;
  el.addEventListener('pointerdown', () => { t = setTimeout(() => { t = null; el.dataset.held = '1'; vibrate(30); fn(); }, 600); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => clearTimeout(t)));
  el.addEventListener('click', e => { if (el.dataset.held) { delete el.dataset.held; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
function renderFavChips() {
  const box = $('favChips');
  box.innerHTML = '';
  const chip = (html, cls, fn, hold) => {
    const b = document.createElement('button');
    b.className = 'shrink-0 h-10 px-3 rounded-xl text-sm font-semibold max-w-[200px] truncate ' + cls;
    b.innerHTML = html; b.onclick = fn;
    if (hold) onHold(b, hold);
    box.appendChild(b);
  };
  if (park) chip(`🅿️ ${L('Zum {x}', { x: esc(kindInfo(park.kind).label) })}${S.pos ? ` · ${fmtDist(haversine(S.pos.lat, S.pos.lng, park.lat, park.lng))}` : ''}`,
    'bg-blue-500/20 border border-blue-400/50 text-blue-100', goToCar, () => { if (confirm(L('Parkplatz vergessen?'))) clearParking(); });
  for (const t of ['home', 'work']) {
    const f = favs.find(x => x.type === t);
    if (f) chip(`${FAV_ICON[t]} ${FAV_LABEL[t]}`, 'bg-cyan-400/10 border border-cyan-400/40', () => goFav(f), () => { if (confirm(L('{x} entfernen?', { x: FAV_LABEL[t] }))) removeFav(f.id); });
    else chip(`${FAV_ICON[t]} ${FAV_LABEL[t]} +`, 'bg-slate-800/50 border border-dashed border-slate-600 text-slate-400',
      () => { openSearch(); toast(L('{x} festlegen: Ort suchen, dann ☆ antippen', { x: FAV_LABEL[t] })); });
  }
  favs.filter(f => f.type === 'fav').forEach(f => chip(`⭐ ${esc(f.name)}`, 'bg-amber-400/10 border border-amber-300/40', () => goFav(f),
    () => { if (confirm(L('„{x}“ aus den Favoriten entfernen?', { x: f.name }))) removeFav(f.id); }));
  if (fuelType()) chip('⛽ ' + L('Günstig tanken'), 'bg-lime-400/10 border border-lime-400/40 text-lime-100', nearbyFuel);
}

function renderPark() {
  if (parkMarker) { parkMarker.remove(); parkMarker = null; }
  if (park) {
    const el = document.createElement('div');
    el.className = 'park-mk'; el.textContent = 'P';
    el.addEventListener('click', ev => { ev.stopPropagation(); parkPopup(); });
    parkMarker = new maplibregl.Marker({ element: el }).setLngLat([park.lng, park.lat]).addTo(map);
  }
  renderFavChips();
}
const agoStr = t => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? L('vor {n} min', { n: m }) : m < 1440 ? L('vor {n} h', { n: Math.round(m / 60) }) : L('am {d}', { d: new Date(t).toLocaleDateString(LOC) }); };
function parkPopup() {
  const div = document.createElement('div');
  div.innerHTML = `<div class="font-bold">🅿️ ${L('Dein {x}', { x: esc(kindInfo(park.kind).label) })}</div><div class="text-xs text-slate-400">${L('Geparkt {t}', { t: agoStr(park.t) })} · ${L('{t} Uhr', { t: timeStr(new Date(park.t)) })}</div>
    <div class="mt-2 grid grid-cols-2 gap-1.5"><button class="pk-go poi-btn">🚶 ${L('Hinlaufen')}</button><button class="pk-del poi-btn">🗑 ${L('Vergessen')}</button></div>`;
  const pop = new maplibregl.Popup({ offset: 18 }).setLngLat([park.lng, park.lat]).setDOMContent(div).addTo(map);
  div.querySelector('.pk-go').onclick = () => { pop.remove(); goToCar(); };
  div.querySelector('.pk-del').onclick = () => { pop.remove(); clearParking(); toast(L('Parkplatz vergessen')); };
}
function saveParking() {
  if (!S.pos || vehicle.kind === 'foot' || Date.now() - S.lastFixAt > 120000) return;
  park = { lat: r5(S.pos.lat), lng: r5(S.pos.lng), t: Date.now(), kind: vehicle.kind };
  store.set(LS.park, park);
  renderPark();
}
function clearParking() { park = null; store.set(LS.park, null); renderPark(); }
function goToCar() {
  if (!park) return;
  setDestination({ name: L('Dein {x}', { x: kindInfo(park.kind).label }), sub: L('Geparkt {t}', { t: agoStr(park.t) }), lat: park.lat, lng: park.lng, walk: true });
}

/* Langes Drücken auf die Karte = Ziel setzen */
let lpTimer = null, lpPoint = null;
map.on('touchstart', e => {
  if (!e.originalEvent.touches || e.originalEvent.touches.length !== 1) return;
  lpPoint = e.point; clearTimeout(lpTimer);
  lpTimer = setTimeout(() => onLongPress(e.lngLat), 650);
});
map.on('touchmove', e => { if (lpPoint && (Math.abs(e.point.x - lpPoint.x) > 10 || Math.abs(e.point.y - lpPoint.y) > 10)) clearTimeout(lpTimer); });
['touchend', 'touchcancel', 'dragstart'].forEach(ev => map.on(ev, () => clearTimeout(lpTimer)));
map.on('contextmenu', e => onLongPress(e.lngLat));

async function onLongPress(ll) {
  if (S.mode === 'nav' || S.mode === 'free') return;
  vibrate(30);
  const div = document.createElement('div');
  div.innerHTML = `<div class="font-bold">📍 <span class="lp-name">${L('Ort wird gesucht…')}</span></div><div class="text-xs text-slate-400 lp-sub"></div>`;
  const b = document.createElement('button');
  b.className = 'mt-2 w-full px-3 py-2 rounded-lg font-game font-bold text-black text-sm';
  b.style.background = 'linear-gradient(90deg,#00e5ff,#7cf8ff)';
  b.textContent = L('HIERHIN ▶');
  div.appendChild(b);
  const place = { name: L('Markierter Ort'), sub: `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`, lat: ll.lat, lng: ll.lng };
  const pop = new maplibregl.Popup({ offset: 10 }).setLngLat(ll).setDOMContent(div).addTo(map);
  b.onclick = () => { pop.remove(); setDestination(place); };
  try {
    const r = await fetch(`${NOMINATIM}reverse?format=jsonv2&zoom=18&accept-language=${LANG}&lat=${ll.lat}&lon=${ll.lng}`);
    const j = await r.json();
    if (j && j.display_name) {
      const a = j.address || {};
      place.name = j.name || [a.road, a.house_number].filter(Boolean).join(' ') || j.display_name.split(',')[0];
      place.sub = j.display_name.split(',').map(s => s.trim()).filter(s => s !== place.name).slice(0, 3).join(', ');
    }
  } catch (e) {}
  div.querySelector('.lp-name').textContent = place.name;
  div.querySelector('.lp-sub').textContent = place.sub;
}
