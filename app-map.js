// NeonNav – Karte (MapLibre), Tag/Nacht, Puck, Kamera, Kompass
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   KARTE (MapLibre, 3D)
   ================================================================= */
/* --- Tag/Nacht: Sonnenauf- und -untergang (vereinfachter NOAA/SunCalc-Algorithmus) --- */
function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545;
  const toDays = d => d.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const fromJ = j => new Date((j + 0.5 - J1970) * dayMs);
  const n = Math.round(toDays(date) - 0.0009 + lng / 360);
  const ds = 0.0009 - lng / 360 + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosW = (Math.sin(rad * -0.833) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosW < -1) return { rise: null, set: null, polar: 'day' };
  if (cosW > 1) return { rise: null, set: null, polar: 'night' };
  const w = Math.acos(cosW) / (2 * Math.PI);
  return { rise: fromJ(noon - w), set: fromJ(noon + w) };
}
let themePref = store.get(LS.theme, 'auto'); // auto | day | night
function autoTheme() {
  const p = S.pos || DEFAULT_POS, now = new Date(), t = sunTimes(now, p.lat, p.lng);
  if (t.polar) return t.polar;
  return now >= t.rise && now < t.set ? 'day' : 'night';
}
const wantedTheme = () => themePref === 'auto' ? autoTheme() : themePref;
let curTheme = wantedTheme();
function markTheme() {
  document.documentElement.dataset.theme = curTheme;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = curTheme === 'day' ? '#e8ecf3' : '#05060f';
}
markTheme();
function applyTheme() {
  const t = wantedTheme();
  if (t === curTheme) return;
  curTheme = t; markTheme();
  mapReady = false;
  map.setStyle(MAP_STYLES[t], { diff: false });
}
setInterval(applyTheme, 60000);

const map = new maplibregl.Map({
  container: 'map', style: MAP_STYLES[curTheme], center: [10.45, 51.16], zoom: 5,
  attributionControl: false, maxPitch: 70, dragRotate: true, touchPitch: true
});
// Nur der Pflicht-Hinweis der Kartendaten (OpenStreetMap/CARTO-Lizenz) als kleines ⓘ – immer zugeklappt
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
const collapseAttrib = () => document.querySelectorAll('.maplibregl-ctrl-attrib.maplibregl-compact-show').forEach(el => {
  el.classList.remove('maplibregl-compact-show'); el.removeAttribute('open');
});
map.on('load', collapseAttrib);
map.on('styledata', () => setTimeout(collapseAttrib, 0));

let mapReady = false, styleErrShown = false;
map.on('error', e => {
  if (!mapReady && !styleErrShown) { styleErrShown = true; toast(L('Karte konnte nicht geladen werden – Internet prüfen')); }
});

// Eigene Quellen/Layer – werden nach jedem Stilwechsel (Tag/Nacht) neu angelegt
const srcCache = {};
let firstStyle = true;
map.on('style.load', () => {
  styleTweaks();
  ['explore', 'cells', 'bikeroutes', 'alts', 'route', 'trail', 'history', 'traffic', 'cams'].forEach(id => {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: srcCache[id] || emptyFC(), lineMetrics: id === 'route' });
  });
  const lay = { 'line-cap': 'round', 'line-join': 'round' };
  const day = curTheme === 'day';
  map.addLayer({ id: 'explore-heat', type: 'heatmap', source: 'explore', paint: {
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, .5, 15, 1.6],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 12, 9, 16, 22],
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', .12, '#1d4ed8', .4, '#00e5ff', .7, '#a855f7', 1, '#ff2bd6'],
    'heatmap-opacity': .9 } });
  // Erkunden: erkundete Kacheln und Radrouten aus OpenStreetMap (app-explore.js)
  map.addLayer({ id: 'cells-fill', type: 'fill', source: 'cells', paint: {
    'fill-color': ['match', ['get', 'st'], 'new', '#ff2bd6', '#00e5ff'], 'fill-opacity': ['match', ['get', 'st'], 'new', .3, .1] } });
  map.addLayer({ id: 'cells-line', type: 'line', source: 'cells', paint: {
    'line-color': ['match', ['get', 'st'], 'new', '#ff2bd6', '#00e5ff'], 'line-width': .8, 'line-opacity': .35 } });
  const bp = typeof bikeRoutePaint === 'function' ? bikeRoutePaint() : { width: 4, opacity: .85, glow: .22 };
  map.addLayer({ id: 'bikeroutes-glow', type: 'line', source: 'bikeroutes', layout: lay, paint: {
    'line-color': ['get', 'color'], 'line-width': 14, 'line-blur': 9, 'line-opacity': bp.glow } });
  map.addLayer({ id: 'bikeroutes-line', type: 'line', source: 'bikeroutes', layout: lay, paint: {
    'line-color': ['get', 'color'], 'line-width': bp.width, 'line-opacity': bp.opacity } });
  map.addLayer({ id: 'alts-line', type: 'line', source: 'alts', layout: lay, paint: { 'line-color': day ? '#7c88b0' : '#5b6a9a', 'line-width': 8, 'line-opacity': .75 } });
  map.addLayer({ id: 'trail-line', type: 'line', source: 'trail', layout: lay, paint: { 'line-color': day ? '#4caf00' : '#a3ff12', 'line-width': 5, 'line-opacity': .85, 'line-blur': .5 } });
  map.addLayer({ id: 'history-glow', type: 'line', source: 'history', layout: lay, paint: { 'line-color': '#ff2bd6', 'line-width': 18, 'line-blur': 10, 'line-opacity': day ? .25 : .45 } });
  map.addLayer({ id: 'history-line', type: 'line', source: 'history', layout: lay, paint: { 'line-color': '#ff2bd6', 'line-width': 6 } });
  map.addLayer({ id: 'route-glow', type: 'line', source: 'route', layout: lay, paint: { 'line-color': '#00e5ff', 'line-width': 22, 'line-blur': 12, 'line-opacity': day ? .3 : .45 } });
  map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: lay, paint: { 'line-width': 9, 'line-gradient': routeGradient(S.nav && S.nav.total ? (S.nav.along || 0) / S.nav.total : 0) } });

  // Verkehrslage (Autobahn GmbH): Stau rot, stockend orange, Sperrung dunkelrot, Baustelle gelb gestrichelt
  map.addLayer({ id: 'traffic-glow', type: 'line', source: 'traffic', layout: lay, filter: ['==', ['geometry-type'], 'LineString'], paint: {
    'line-color': ['get', 'color'], 'line-width': 16, 'line-blur': 9, 'line-opacity': .5 } });
  map.addLayer({ id: 'traffic-line', type: 'line', source: 'traffic', layout: lay, filter: ['all', ['==', ['geometry-type'], 'LineString'], ['!=', ['get', 'kind'], 'works']], paint: {
    'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 15, 9] } });
  map.addLayer({ id: 'traffic-works', type: 'line', source: 'traffic', layout: { 'line-join': 'round' }, filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'kind'], 'works']], paint: {
    'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 7], 'line-dasharray': [1.2, 1] } });
  map.addLayer({ id: 'traffic-dot', type: 'circle', source: 'traffic', filter: ['==', ['geometry-type'], 'Point'], paint: {
    'circle-radius': 8, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });

  // Echte Blitzer (OpenStreetMap) als performanter Kartenlayer
  map.addLayer({ id: 'cams-glow', type: 'circle', source: 'cams', minzoom: 9, paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 16, 20], 'circle-color': '#ff1744', 'circle-blur': 1, 'circle-opacity': .55 } });
  map.addLayer({ id: 'cams-dot', type: 'circle', source: 'cams', minzoom: 9, paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 16, 8], 'circle-color': '#ff1744',
    'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 16, 3] } });

  addPoiLayer();
  mapReady = true;
  if (!firstStyle) return;
  firstStyle = false;
  map.on('click', 'cams-dot', e => {
    const f = e.features && e.features[0];
    if (!f) return;
    const ms = f.properties.maxspeed;
    new maplibregl.Popup({ offset: 14 }).setLngLat(f.geometry.coordinates)
      .setHTML(`<div class="font-bold">📸 ${L('Fester Blitzer')}</div><div class="text-xs text-slate-400">${L('Quelle')}: OpenStreetMap${ms ? ` · Limit ${esc(ms)} km/h` : ''}</div>`).addTo(map);
  });

  map.on('click', 'bikeroutes-line', e => onBikeRouteClick(e));
  ['traffic-line', 'traffic-works', 'traffic-dot'].forEach(id => {
    map.on('click', id, e => onTrafficClick(e));
    map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', id, () => map.getCanvas().style.cursor = '');
  });
  map.on('mouseenter', 'bikeroutes-line', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'bikeroutes-line', () => map.getCanvas().style.cursor = '');

  map.on('click', 'alts-line', e => {
    const f = e.features && e.features[0];
    if (f && S.mode === 'preview') selectRoute(f.properties.idx);
  });
  map.on('mouseenter', 'alts-line', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'alts-line', () => map.getCanvas().style.cursor = '');

  map.on('click', 'pois-lbl', e => {
    const f = e.features && e.features[0];
    if (f) poiPopup(f);
  });
  map.on('mouseenter', 'pois-lbl', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'pois-lbl', () => map.getCanvas().style.cursor = '');

  renderCams();
  // bereits vorhandene Daten nachzeichnen
  if (S.nav) setRouteOnMap(S.nav);
  if (S.mode === 'preview') drawPreview(false);
});

function styleTweaks() {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  const day = curTheme === 'day';
  for (const l of day ? [] : layers) {
    try {
      if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#070815');
      else if (l.type === 'fill' && /water/.test(l.id)) map.setPaintProperty(l.id, 'fill-color', '#08163a');
      else if (l.type === 'line' && /water/.test(l.id)) map.setPaintProperty(l.id, 'line-color', '#0c2050');
      else if (l.type === 'line' && /(road|highway|bridge|tunnel)/.test(l.id) && !/(case|casing|label|shield)/.test(l.id)) {
        const mot = /(mot|motorway|trunk)/.test(l.id), pri = /(pri|primary)/.test(l.id), sec = /(sec|secondary|tert)/.test(l.id);
        map.setPaintProperty(l.id, 'line-color', mot ? '#8b3dff' : pri ? '#2e5f96' : sec ? '#2a3b6b' : '#262b52');
      }
    } catch (e) {}
  }
  // 3D-Gebäude
  try {
    const sources = map.getStyle().sources || {};
    const src = sources.carto ? 'carto' : Object.keys(sources).find(k => sources[k].type === 'vector');
    if (src && !map.getLayer('bld3d')) {
      const firstSymbol = layers.find(l => l.type === 'symbol');
      const h = ['coalesce', ['get', 'render_height'], ['get', 'height'], 9];
      map.addLayer({
        id: 'bld3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 14,
        paint: {
          'fill-extrusion-color': day ? ['interpolate', ['linear'], h, 0, '#e3e6ee', 40, '#d2d6e4', 120, '#bcc2d8']
                                     : ['interpolate', ['linear'], h, 0, '#121839', 40, '#241d58', 120, '#4a1f7c'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.2, h],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': day ? .7 : .82
        }
      }, firstSymbol ? firstSymbol.id : undefined);
    }
  } catch (e) {}
}

/* --- Orte (Cafés, Bars, Supermärkte …) aus den Vektorkacheln, wie bei Apple Karten --- */
// Kategorie: Farbe des Symbols + Zuordnung OSM-"kind" → Emoji
const POI_CATS = [
  { label: L('Café'),          color: '#c2410c', kinds: { cafe: '☕', ice_cream: '🍦' } },
  { label: L('Restaurant'),    color: '#f97316', kinds: { restaurant: '🍴', fast_food: '🍔', food_court: '🍴', biergarten: '🍺' } },
  { label: L('Bar'),           color: '#a855f7', kinds: { bar: '🍸', pub: '🍺', nightclub: '🪩' } },
  { label: L('Lebensmittel'),  color: '#eab308', kinds: { supermarket: '🛒', convenience: '🛒', grocery: '🛒', greengrocer: '🥕', marketplace: '🧺', kiosk: '🗞️', bakery: '🥐', pastry: '🍰', butcher: '🥩', deli: '🧀', beverages: '🍾', alcohol: '🍷', wine: '🍷' } },
  { label: L('Geschäft'),      color: '#ec4899', kinds: { clothes: '👕', shoes: '👟', books: '📚', jewelry: '💍', florist: '💐', gift: '🎁', department_store: '🛍️', mall: '🛍️', electronics: '🔌', mobile_phone: '📱', chemist: '🧴', beauty: '💅', hairdresser: '💇', optician: '👓', toys: '🧸', sports: '⚽', bicycle: '🚲' } },
  { label: L('Gesundheit'),    color: '#ef4444', kinds: { pharmacy: '💊', hospital: '🏥', doctors: '🩺', dentist: '🦷', clinic: '🏥' } },
  { label: L('Tanken & Laden'), color: '#3b82f6', kinds: { fuel: '⛽', charging_station: '🔋', parking: '🅿️' } },
  { label: L('Bank'),          color: '#16a34a', kinds: { bank: '🏦', atm: '💶' } },
  { label: L('Unterkunft'),    color: '#6366f1', kinds: { hotel: '🛏️', hostel: '🛏️', guest_house: '🛏️' } },
  { label: L('Kultur'),        color: '#0d9488', kinds: { museum: '🏛️', theatre: '🎭', cinema: '🎬', attraction: '📷', library: '📖', arts_centre: '🎨' } }
];
const POI_KIND = {}; // kind → { emoji, color, label }
POI_CATS.forEach(c => Object.entries(c.kinds).forEach(([k, emoji]) => POI_KIND[k] = { emoji, color: c.color, label: c.label }));
let poisEnabled = store.get(LS.pois, true);

// Rundes, farbiges Symbol mit Emoji als Kartenbild (wird nach jedem Stilwechsel neu registriert)
function poiImage(emoji, color) {
  const px = 2, size = 30 * px, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2 * px, 0, Math.PI * 2);
  g.fillStyle = color; g.fill();
  g.lineWidth = 2 * px; g.strokeStyle = '#ffffff'; g.stroke();
  g.font = `${15 * px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, size / 2, size / 2 + px);
  return { image: g.getImageData(0, 0, size, size), pixelRatio: px };
}
function addPoiLayer() {
  try {
    const sources = map.getStyle().sources || {};
    const src = Object.keys(sources).find(k => sources[k].type === 'vector');
    if (!src || map.getLayer('pois-lbl')) return;
    for (const [k, p] of Object.entries(POI_KIND)) {
      if (map.hasImage('poi-' + k)) continue;
      const img = poiImage(p.emoji, p.color);
      map.addImage('poi-' + k, img.image, { pixelRatio: img.pixelRatio });
    }
    const day = curTheme === 'day';
    map.addLayer({
      id: 'pois-lbl', type: 'symbol', source: src, 'source-layer': 'pois', minzoom: 15,
      filter: ['all', ['has', 'name'], ['in', ['get', 'kind'], ['literal', Object.keys(POI_KIND)]]],
      layout: {
        visibility: poisEnabled ? 'visible' : 'none',
        'icon-image': ['concat', 'poi-', ['get', 'kind']],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 15, .75, 18, 1],
        'symbol-sort-key': ['coalesce', ['get', 'min_zoom'], ['get', 'sort_rank'], 99],
        'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name']],
        'text-font': ['Montserrat Medium', 'Open Sans Regular', 'Noto Sans Regular', 'Noto Sans CJK JP Regular'],
        'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-max-width': 8,
        'text-optional': true, 'icon-padding': 4
      },
      paint: {
        'text-color': day ? '#1e293b' : '#e6f0ff',
        'text-halo-color': day ? 'rgba(255,255,255,.95)' : 'rgba(5,6,15,.9)', 'text-halo-width': 1.4
      }
    });
  } catch (e) {}
}
function setPoisEnabled(on) {
  poisEnabled = on; store.set(LS.pois, on);
  if (map.getLayer('pois-lbl')) map.setLayoutProperty('pois-lbl', 'visibility', on ? 'visible' : 'none');
}
const CUISINES = { italian: L('Italienisch'), pizza: L('Pizza'), german: L('Deutsch'), regional: L('Regional'), bavarian: L('Bayerisch'), greek: L('Griechisch'),
  turkish: L('Türkisch'), kebab: L('Döner'), asian: L('Asiatisch'), chinese: L('Chinesisch'), japanese: L('Japanisch'), sushi: L('Sushi'), thai: L('Thailändisch'),
  vietnamese: L('Vietnamesisch'), indian: L('Indisch'), mexican: L('Mexikanisch'), spanish: L('Spanisch'), french: L('Französisch'), american: L('Amerikanisch'),
  burger: L('Burger'), steak_house: L('Steakhaus'), seafood: L('Fisch'), vegetarian: L('Vegetarisch'), vegan: L('Vegan'), coffee_shop: L('Kaffee'), cake: L('Kuchen'),
  ice_cream: L('Eis'), sandwich: L('Sandwiches'), breakfast: L('Frühstück'), international: L('International'), lebanese: L('Libanesisch'), korean: L('Koreanisch') };
// OSM-Öffnungszeiten lesbar machen (Mo-Fr 09:00-18:00; Sa 10:00-14:00 → deutsche Tage, je Regel eine Zeile)
function fmtHours(oh) {
  const days = { Mo: L('Mo'), Tu: L('Di'), We: L('Mi'), Th: L('Do'), Fr: L('Fr'), Sa: L('Sa'), Su: L('So'), PH: L('Feiertag') };
  return oh.split(';').map(s => s.trim()).filter(Boolean).map(s => s
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, d => days[d])
    .replace(/\boff\b|\bclosed\b/g, L('geschlossen')).replace(/24\/7/, L('rund um die Uhr')).replace(/,(?=\S)/g, ', ')).slice(0, 7);
}
const safeUrl = u => { u = String(u || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; };
const shortUrl = u => u.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

// Details (Webseite, Telefon, Öffnungszeiten …) zum angetippten Ort aus OpenStreetMap – über Nominatim,
// eng auf die Umgebung des Symbols begrenzt. Liefert OSM-Tags; Adresse wird auf addr:* abgebildet.
async function poiDetails(name, lat, lng) {
  const d = 0.0009; // ≈ 100 m
  const vb = [lng - d, lat + d, lng + d, lat - d].map(v => v.toFixed(6)).join(',');
  const r = await fetch(`${NOMINATIM}search?format=jsonv2&limit=1&bounded=1&extratags=1&addressdetails=1&accept-language=${LANG}&viewbox=${vb}&q=${encodeURIComponent(name)}`);
  const j = await r.json();
  if (!j || !j[0]) return null;
  const a = j[0].address || {};
  return Object.assign({
    'addr:street': a.road || a.pedestrian || a.footway, 'addr:housenumber': a.house_number,
    'addr:postcode': a.postcode, 'addr:city': a.city || a.town || a.village
  }, j[0].extratags || {});
}
// Detailfenster immer mittig auf dem Bildschirm (statt als Sprechblase an der Karte)
function openPlaceCard(content) {
  const body = $('placeBody');
  body.innerHTML = '';
  body.appendChild(content);
  $('placeModal').classList.remove('hidden');
  return { remove: closePlaceCard };
}
function closePlaceCard() { $('placeModal').classList.add('hidden'); $('placeBody').innerHTML = ''; }

function poiPopup(f) {
  const p = f.properties, info = POI_KIND[p.kind] || { emoji: '📍', label: L('Ort') };
  const [lng, lat] = f.geometry.coordinates;
  const place = { name: p['name:de'] || p.name, sub: info.label, lat, lng };
  const div = document.createElement('div');
  div.className = 'poi-pop';
  div.innerHTML = `<div class="flex items-start gap-2"><div class="font-bold text-base leading-tight flex-1">${info.emoji} ${esc(place.name)}</div>
      <button class="poi-fav shrink-0 -mt-0.5 text-lg leading-none" aria-label="${L('Merken')}">${favAt(place) ? FAV_ICON[favAt(place).type] : '☆'}</button></div>
    <div class="text-xs text-slate-400 poi-cat">${esc(info.label)}</div>
    <div class="poi-det mt-1 text-xs text-slate-400">${L('Details werden geladen…')}</div>
    <div class="poi-info mt-2 grid grid-cols-2 gap-1.5 empty:hidden"></div>
    <div class="poi-links mt-1.5 grid grid-cols-2 gap-1.5"></div>`;
  const pop = openPlaceCard(div);
  div.querySelector('.poi-fav').onclick = () => { pop.remove(); openFavModal(place); };

  // Bewertungen gibt es nicht frei – daher direkt zu Google bzw. Apple Karten verlinken
  const qs = encodeURIComponent(place.name);
  const links = div.querySelector('.poi-links');
  links.innerHTML = `<a class="poi-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${qs}%20${lat.toFixed(5)}%2C${lng.toFixed(5)}&hl=${LANG}">⭐ ${L('Bewertungen')}</a>
    <a class="poi-btn" target="_blank" rel="noopener" href="https://maps.apple.com/?q=${qs}&ll=${lat.toFixed(6)},${lng.toFixed(6)}">🗺️ ${L('Apple Karten')}</a>`;

  if (!(S.mode === 'nav' || S.mode === 'free')) {
    const b = document.createElement('button');
    b.className = 'mt-2 w-full px-3 py-2 rounded-lg font-game font-bold text-black text-sm';
    b.style.background = 'linear-gradient(90deg,#00e5ff,#7cf8ff)';
    b.textContent = L('HIERHIN ▶');
    b.onclick = () => { pop.remove(); setDestination(place); };
    div.appendChild(b);
  }

  poiDetails(place.name, lat, lng).then(t => {
    const det = div.querySelector('.poi-det');
    if (!t) { det.textContent = L('Keine weiteren Details in OpenStreetMap.'); return; }
    const cuisine = (t.cuisine || '').split(';').map(c => CUISINES[c.trim()] || '').filter(Boolean).join(', ');
    if (cuisine) div.querySelector('.poi-cat').textContent = `${info.label} · ${cuisine}`;
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
    const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
    if (street) place.sub = [street, city].filter(Boolean).join(', ');
    const rows = [];
    if (street) rows.push(`📍 ${esc(place.sub)}`);
    if (t.opening_hours) rows.push(`🕒 ${fmtHours(t.opening_hours).map(esc).join('<br>')}`);
    const extras = [t.outdoor_seating === 'yes' && L('Außenbereich'), t.takeaway === 'yes' && L('Zum Mitnehmen'), t.delivery === 'yes' && L('Lieferung'),
                    t.wheelchair === 'yes' && L('Rollstuhlgerecht'), /^(vegan|yes|only)$/.test(t['diet:vegan'] || '') && L('Vegane Gerichte')].filter(Boolean);
    if (extras.length) rows.push(`✓ ${extras.join(' · ')}`);
    det.innerHTML = rows.length ? rows.map(r => `<div class="mt-1 text-slate-300">${r}</div>`).join('') : '';

    const web = safeUrl(t.website || t['contact:website'] || t.url);
    const phone = String(t.phone || t['contact:phone'] || '').split(';')[0].trim();
    const menu = safeUrl(t['website:menu']);
    const extra = [], half = phone && menu ? '' : ' col-span-2';
    if (web) extra.push(`<a class="poi-btn col-span-2" target="_blank" rel="noopener" href="${esc(web)}">🌐 ${esc(shortUrl(web))}</a>`);
    if (phone) extra.push(`<a class="poi-btn${half}" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">📞 ${half ? esc(phone) : L('Anrufen')}</a>`);
    if (menu) extra.push(`<a class="poi-btn${half}" target="_blank" rel="noopener" href="${esc(menu)}">📋 ${L('Speisekarte')}</a>`);
    div.querySelector('.poi-info').innerHTML = extra.join('');
  }).catch(() => { const det = div.querySelector('.poi-det'); if (det) det.textContent = L('Details gerade nicht verfügbar.'); });
}

function routeGradient(p) {
  if (p <= .001) return ['interpolate', ['linear'], ['line-progress'], 0, '#00e5ff', 1, '#ff2bd6'];
  p = clamp(p, .0005, .997);
  return ['interpolate', ['linear'], ['line-progress'], 0, '#3a4066', p, '#3a4066', p + .0002, '#00e5ff', 1, '#ff2bd6'];
}
function setSrc(id, data) { srcCache[id] = data; const s = mapReady && map.getSource(id); if (s) s.setData(data); }

/* Puck (Fahrzeug) */
const puckEl = document.createElement('div');
puckEl.className = 'puck';
puckEl.innerHTML = `<svg viewBox="0 0 48 48" width="48" height="48">
  <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient></defs>
  <circle class="puck-ring" cx="24" cy="24" r="21" fill="rgba(0,229,255,.14)" stroke="rgba(0,229,255,.55)" stroke-width="1.5"/>
  <path d="M24 6 L37 38 L24 30.5 L11 38 Z" fill="url(#pg)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
const puck = new maplibregl.Marker({ element: puckEl, rotationAlignment: 'map', pitchAlignment: 'map' });
let puckAdded = false, puckState = null, puckAnim = 0;

function movePuck(lat, lng, hdg) {
  if (!puckAdded) { puck.setLngLat([lng, lat]).setRotation(hdg).addTo(map); puckAdded = true; puckState = { lat, lng, hdg }; return; }
  const from = puckState;
  if (haversine(from.lat, from.lng, lat, lng) > 500) { puck.setLngLat([lng, lat]).setRotation(hdg); puckState = { lat, lng, hdg }; return; }
  const dh = ((hdg - from.hdg + 540) % 360) - 180, t0 = performance.now(), D = 950;
  cancelAnimationFrame(puckAnim);
  const step = now => {
    const k = Math.min(1, (now - t0) / D);
    const st = { lat: from.lat + (lat - from.lat) * k, lng: from.lng + (lng - from.lng) * k, hdg: from.hdg + dh * k };
    puck.setLngLat([st.lng, st.lat]).setRotation(st.hdg);
    puckState = st;
    if (k < 1) puckAnim = requestAnimationFrame(step);
  };
  puckAnim = requestAnimationFrame(step);
}

/* Kamera */
function pad() {
  const driving = S.mode === 'nav' || S.mode === 'free';
  // Während der Fahrt sitzt das Fahrzeug im unteren Drittel – die Strecke voraus führt zum oberen Bildschirmrand
  return { top: driving ? Math.round(innerHeight * .58) : 110, bottom: sheetHeight() + 20, left: 20, right: 20 };
}
function camera(instant) {
  if (!S.follow || !S.pos || S.viewTrip || S.mode === 'preview') return;
  const driving = S.mode === 'nav' || S.mode === 'free';
  let zoom, pitch, bearing;
  if (driving) {
    const tz = S.speed < 30 ? 17.2 : S.speed < 60 ? 16.5 : S.speed < 100 ? 15.7 : 15;
    if (S.camZoom == null || Math.abs(tz - S.camZoom) > .6) S.camZoom = tz;
    zoom = S.camZoom;
    pitch = S.view3d ? 62 : 0;
    bearing = S.heading; // Fahrtrichtung zeigt immer nach oben (auch in 2D)
  } else {
    zoom = Math.max(map.getZoom(), 14.5);
    pitch = S.view3d ? 45 : 0;
    bearing = S.view3d ? map.getBearing() : 0;
  }
  map.easeTo({ center: [S.pos.lng, S.pos.lat], zoom, pitch, bearing, padding: pad(),
               duration: instant ? 0 : (driving ? 1000 : 500), easing: t => t, essential: true });
}
function unfollow(e) {
  if (!e || !e.originalEvent) return;
  if (S.follow) { S.follow = false; $('recenterBtn').classList.add('active-ring'); }
}
['dragstart', 'rotatestart', 'pitchstart'].forEach(ev => map.on(ev, unfollow));

/* Kompass: Nadel zeigt nach Norden, Mitte zeigt die aktuelle Blickrichtung */
const COMPASS_DIRS = {
  de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'], en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], fr: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  it: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], tr: ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
};
let compassRot = 0;
function renderCompass() {
  const b = ((map.getBearing() % 360) + 360) % 360;
  // kürzester Drehweg, damit die Rose bei 359° → 0° nicht einmal ganz herumwirbelt
  compassRot += ((-b - compassRot) % 360 + 540) % 360 - 180;
  $('compassRose').style.transform = `rotate(${compassRot}deg)`;
  $('compassDir').textContent = (COMPASS_DIRS[LANG] || COMPASS_DIRS.en)[Math.round(b / 45) % 8];
}
map.on('rotate', renderCompass);

/* Geräte-Kompass: im Stand (oder langsam) zeigt der Pfeil dorthin, wohin das Handy zeigt */
S.devHdg = null; S.devHdgAt = 0;
let devHdgApplied = null, devHdgLast = 0;
function onDeviceHeading(h) {
  if (h == null || isNaN(h)) return;
  const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  h = ((h + so) % 360 + 360) % 360;
  // weich nachführen (kürzester Winkelweg), damit der Pfeil nicht zittert
  if (S.devHdg == null) S.devHdg = h;
  else S.devHdg = (S.devHdg + ((((h - S.devHdg) % 360) + 540) % 360 - 180) * .25 + 360) % 360;
  S.devHdgAt = Date.now();
  if (!S.pos || !puckAdded || S.speed >= 6) return;
  const now = performance.now();
  if (now - devHdgLast < 80) return;
  if (devHdgApplied != null && Math.abs(((S.devHdg - devHdgApplied + 540) % 360) - 180) < 2) return;
  devHdgLast = now; devHdgApplied = S.devHdg;
  cancelAnimationFrame(puckAnim);
  S.heading = S.devHdg;
  puck.setLngLat([S.pos.lng, S.pos.lat]).setRotation(S.devHdg);
  puckState = { lat: S.pos.lat, lng: S.pos.lng, hdg: S.devHdg };
  // während der Fahrt (Fahrtrichtung oben) dreht sich die Karte mit
  if (S.follow && !S.viewTrip && (S.mode === 'nav' || S.mode === 'free') && !map.isMoving())
    map.easeTo({ bearing: S.devHdg, duration: 250, easing: t => t, essential: true });
}
const devHdgFresh = () => S.devHdg != null && Date.now() - S.devHdgAt < 3000;
let orientOn = false, orientAsked = false;
function startDeviceHeading() {
  if (orientOn || orientAsked) return;
  orientAsked = true;
  const listen = () => {
    if (orientOn) return;
    orientOn = true;
    // Android/Chrome liefert absolute Werte über „deviceorientationabsolute“, iOS über webkitCompassHeading
    window.addEventListener('deviceorientationabsolute', e => { if (e.absolute && e.alpha != null) onDeviceHeading(360 - e.alpha); });
    window.addEventListener('deviceorientation', e => { if (e.webkitCompassHeading != null) onDeviceHeading(e.webkitCompassHeading); });
  };
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().then(r => { if (r === 'granted') listen(); }).catch(() => {});
  else if (D) listen();
}
// iOS erlaubt den Kompass nur nach einer Berührung – deshalb beim ersten Tippen anfragen
document.addEventListener('touchend', startDeviceHeading);
document.addEventListener('click', startDeviceHeading);
map.on('zoomstart', e => { if (e.originalEvent && (S.mode === 'nav' || S.mode === 'free')) unfollow(e); });

function fitCoords(coords) {
  if (!coords.length) return;
  const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
  map.fitBounds(b, { padding: { top: 110, bottom: sheetHeight() + 40, left: 40, right: 90 }, bearing: 0, pitch: 0, maxZoom: 16, duration: 900 });
}
