// NeonNav – Grundlagen: Konstanten, Helfer, Übersetzung, Zustand
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   KONSTANTEN & HELFER
   ================================================================= */
const $ = id => document.getElementById(id);
const LS = {
  haz: 'neonnav.hazards.v1', trips: 'neonnav.trips.v1', recents: 'neonnav.recents.v1',
  xp: 'neonnav.xp.v1', mute: 'neonnav.mute.v1', view: 'neonnav.view3d.v1',
  vehicle: 'neonnav.vehicle.v1', prices: 'neonnav.prices.v1', tk: 'neonnav.tkkey.v1',
  cams: 'neonnav.osmcams.v1', osm: 'neonnav.osm.v1', install: 'neonnav.installhint.v1',
  theme: 'neonnav.theme.v1', voice: 'neonnav.voice.v1', pois: 'neonnav.pois.v1',
  favs: 'neonnav.favs.v1', park: 'neonnav.park.v1', ach: 'neonnav.ach.v1', stats: 'neonnav.stats.v1',
  explore: 'neonnav.explore.v1', ghosts: 'neonnav.ghosts.v1', lang: 'neonnav.lang.v1', sheets: 'neonnav.sheets.v1'
};
// KI-Beifahrer wurde entfernt – gespeicherten Gemini-Schlüssel vom Gerät löschen
try { localStorage.removeItem('neonnav.gemini.v1'); localStorage.removeItem('neonnav.geminimodel.v1'); } catch (e) {}
const ROUTERS = {
  car:  ['https://routing.openstreetmap.de/routed-car/route/v1/driving/', 'https://router.project-osrm.org/route/v1/driving/'],
  bike: ['https://routing.openstreetmap.de/routed-bike/route/v1/driving/'],
  foot: ['https://routing.openstreetmap.de/routed-foot/route/v1/driving/']
};
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
                  'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const TANKERKOENIG = 'https://creativecommons.tankerkoenig.de/json/list.php';
const ALERT_R = 400, CLOSE_R = 150, REARM_R = 500, ROUTE_HAZ_R = 40;
const DEFAULT_POS = { lat: 48.13743, lng: 11.57549 }; // München, Marienplatz
const MAP_STYLES = {
  night: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  day: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
};
const NOMINATIM = 'https://nominatim.openstreetmap.org/';
const RANKS = ['ROOKIE', 'STREET RUNNER', 'ROAD HUNTER', 'NIGHT RIDER', 'TURBO PILOT', 'ASPHALT LEGEND', 'NEON GOD'];

const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

/* --- Sprache: Übersetzungen aus i18n.js, Deutsch ist die Ausgangssprache --- */
const I18N = window.NN_I18N || { langs: { de: { name: 'Deutsch', flag: '🇩🇪', loc: 'de-DE', ai: 'Deutsch' } }, order: [], t: {} };
const LANG = (() => {
  const saved = store.get(LS.lang, null);
  if (saved && I18N.langs[saved]) return saved;
  // Bisherige Nutzer behalten Deutsch, neue bekommen die Gerätesprache (falls vorhanden)
  if (localStorage.getItem(LS.xp) || localStorage.getItem(LS.trips)) return 'de';
  const dev = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return I18N.langs[dev] ? dev : 'de';
})();
const LINFO = I18N.langs[LANG] || I18N.langs.de;
const LI = I18N.order.indexOf(LANG);   // -1 = Deutsch
const LOC = LINFO.loc || 'de-DE';
const DEC = LANG === 'en' ? '.' : ',';
// L('Deutscher Text {x}', { x }) → Übersetzung; fehlt sie, bleibt der deutsche Text
function L(s, v) {
  let t = s;
  if (LI >= 0) { const e = I18N.t[s]; if (e && e[LI]) t = e[LI]; }
  return v ? t.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : t;
}
// Feste Texte im HTML übersetzen: Textknoten, placeholder/aria-label/title und data-i18n-html (Absätze mit Links)
(function translateStatic() {
  document.documentElement.lang = LANG;
  if (LI < 0) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!n.parentNode || /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) continue;
    const s = n.nodeValue.trim();
    if (!s) continue;
    const t = L(s);
    if (t !== s) n.nodeValue = n.nodeValue.replace(s, () => t);
  }
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => {
    const v = el.getAttribute(a);
    if (v && L(v) !== v) el.setAttribute(a, L(v));
  }));
  document.querySelectorAll('[data-i18n-html]').forEach(el => { if (I18N.t[el.dataset.i18nHtml]) el.innerHTML = L(el.dataset.i18nHtml); });
})();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r5 = n => Math.round(n * 1e5) / 1e5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toR = Math.PI / 180;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, dLat = (lat2 - lat1) * toR, dLon = (lon2 - lon1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function bearingTo(lat1, lng1, lat2, lng2) {
  const y = Math.sin((lng2 - lng1) * toR) * Math.cos(lat2 * toR);
  const x = Math.cos(lat1 * toR) * Math.sin(lat2 * toR) - Math.sin(lat1 * toR) * Math.cos(lat2 * toR) * Math.cos((lng2 - lng1) * toR);
  return (Math.atan2(y, x) / toR + 360) % 360;
}
function destPoint(lat, lng, brg, dist) {
  const R = 6371000, p1 = lat * toR, l1 = lng * toR, th = brg * toR, d = dist / R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / toR, ((l2 / toR) + 540) % 360 - 180];
}

function fmtDist(m) {
  if (m < 1000) return `${m < 100 ? Math.max(0, Math.round(m / 10) * 10) : Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', DEC)} km`;
}
function speechDist(m) {
  if (m < 1000) return L('{n} Metern', { n: Math.max(50, Math.round(m / 50) * 50) });
  const km = Math.round(m / 100) / 10;
  return km === 1 ? L('einem Kilometer') : L('{n} Kilometern', { n: String(km).replace('.', DEC) });
}
function fmtDur(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
const timeStr = d => d.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });
const emptyFC = () => ({ type: 'FeatureCollection', features: [] });
const lineFC = (coords, props = {}) => ({ type: 'FeatureCollection', features: coords.length > 1 ? [{ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } }] : [] });

let toastT;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.opacity = '1'; el.style.transform = 'translate(-50%,0)';
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,8px)'; }, 2800);
}
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

/* =================================================================
   ZUSTAND
   ================================================================= */
const S = {
  mode: 'browse',          // browse | preview | nav | free
  pos: null, lastFixAt: 0, speed: 0, heading: 0,
  follow: true, view3d: store.get(LS.view, true),
  dest: null, routes: [], routeIdx: 0, nav: null, trip: null,
  viewTrip: null, camZoom: null, rerouting: false, firstFix: true
};
