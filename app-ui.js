// NeonNav – UI-Modi & Layout, Events, App-Start
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   UI-MODI & LAYOUT
   ================================================================= */
function sheetHeight() { const el = [...document.querySelectorAll('.sheet')].find(e => !e.classList.contains('hidden')); return el ? el.offsetHeight : 0; }
function layout() {
  const h = sheetHeight();
  $('rail').style.bottom = `${h + 12}px`;
  $('gauge').style.bottom = `${h + 12}px`;
  document.documentElement.style.setProperty('--sheet-h', `${h + (S.mode === 'preview' ? 10 : 130)}px`);
}
function setMode(m) {
  S.mode = m;
  const driving = m === 'nav' || m === 'free';
  document.body.classList.toggle('driving', driving);
  resetFreeBanner();
  $('topBar').classList.toggle('hidden', driving);
  $('navTop').classList.toggle('hidden', !driving);
  $('browseSheet').classList.toggle('hidden', m !== 'browse');
  $('previewSheet').classList.toggle('hidden', m !== 'preview');
  $('driveSheet').classList.toggle('hidden', !driving);
  $('gauge').classList.toggle('hidden', m === 'preview');
  $('reportCamBtn').classList.toggle('hidden', m === 'preview');
  $('reportHazBtn').classList.toggle('hidden', m === 'preview');
  if (!driving) { $('hazNext').classList.add('hidden'); hideAlarm(); S.limit = null; renderLimit(false); }
  if (m === 'browse') renderFavChips(); else setSheetOpen(false);
  if (m === 'free') { $('d1l').textContent = L('Zeit'); $('d2l').textContent = 'km'; $('d3l').textContent = 'Ø km/h'; }
  if (driving) $('driveDest').textContent = m === 'nav' && S.dest ? `🏁 ${S.dest.name}` : `🛣️ ${L('Freie Fahrt')}`;
  setRailOpen(false);
  layout();
  if (S.pos) checkHazards();
}

function renderGauge() {
  const stale = !S.pos || Date.now() - S.lastFixAt > 8000, v = stale ? 0 : S.speed;
  $('gSpeed').textContent = stale ? '–' : Math.round(v);
  $('gArc').setAttribute('stroke-dasharray', `${(Math.min(1, v / 200) * 197.9).toFixed(1)} 999`);
  $('gMax').textContent = S.trip ? `MAX ${Math.round(S.trip.max)}` : '';
}
function renderFreeStats() {
  if (S.mode !== 'free' || !S.trip) return;
  const el = Date.now() - S.trip.start;
  $('d1').textContent = fmtClock(el);
  $('d2').textContent = (S.trip.distance / 1000).toFixed(1).replace('.', DEC);
  $('d3').textContent = el > 5000 ? Math.round((S.trip.distance / 1000) / (el / 3600000)) : 0;
  renderCostLine(50, 0);
}

/* Display wach halten */
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {}
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) {} wakeLock = null; }
// Rückkehr aus dem Hintergrund: Position sofort holen, Strecke überbrücken, Ansage wiederholen
document.addEventListener('visibilitychange', () => {
  const driving = S.mode === 'nav' || S.mode === 'free';
  if (document.visibilityState === 'hidden') { S.hiddenAt = Date.now(); return; }
  if (!driving) return;
  requestWakeLock();
  if (S.hiddenAt && Date.now() - S.hiddenAt > 4000) {
    S.bridgeGap = true;
    if (S.nav) S.nav.announced = {};
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed,
        heading: p.coords.heading, acc: p.coords.accuracy, t: p.timestamp || Date.now() }), () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }
    toast(L('Willkommen zurück – Position aktualisiert'));
  }
});

/* =================================================================
   EVENTS & START
   ================================================================= */
// Erster Tipp klappt Favoriten & Co. auf, zweiter Tipp öffnet die Suche
let sheetOpen = false;
function setSheetOpen(on) {
  sheetOpen = on;
  $('sheetMore').classList.toggle('open', on);
  $('sheetToggle').querySelector('svg').style.transform = on ? 'rotate(180deg)' : '';
  $('sheetToggle').setAttribute('aria-expanded', String(on));
}
$('searchOpen').onclick = () => { if (sheetOpen) openSearch(); else setSheetOpen(true); };
$('sheetToggle').onclick = () => setSheetOpen(!sheetOpen);
map.on('click', () => { if (sheetOpen) setSheetOpen(false); setRailOpen(false); });
map.on('dragstart', () => { if (sheetOpen) setSheetOpen(false); setRailOpen(false); });

/* --- Ziehbare Felder: Höhe folgt dem Finger, rastet bei „klein“ oder „groß“ ein --- */
// Start-Feld: klein = nur Suche, groß = Favoriten & Co. (bestehendes sheetMore).
// Vorschau & Fahrt: klein blendet alles mit data-extra aus; die Wahl wird gemerkt.
const SHEET_KEY = { previewSheet: 'preview', driveSheet: 'drive' };
const sheetPref = Object.assign({ preview: false, drive: false }, store.get(LS.sheets, {}));
Object.entries(SHEET_KEY).forEach(([id, k]) => $(id).classList.toggle('compact', !!sheetPref[k]));

const sheetPanel = el => el.firstElementChild;
const isCompact = el => el.id === 'browseSheet' ? !sheetOpen : el.classList.contains('compact');
function setCompact(el, on) {
  if (el.id === 'browseSheet') { setSheetOpen(!on); return; }
  el.classList.toggle('compact', on);
  sheetPref[SHEET_KEY[el.id]] = on;
  store.set(LS.sheets, sheetPref);
  layout();
}
// Höhe des Feldes im Zustand klein/groß messen, ohne dass etwas sichtbar umspringt
function measureSheet(el, compact) {
  const panel = sheetPanel(el), keepH = panel.style.height, was = isCompact(el);
  el.classList.add('measuring');
  panel.style.height = '';
  if (el.id === 'browseSheet') $('sheetMore').classList.toggle('open', !compact); else el.classList.toggle('compact', compact);
  const h = panel.offsetHeight;
  if (el.id === 'browseSheet') $('sheetMore').classList.toggle('open', !was); else el.classList.toggle('compact', was);
  panel.style.height = keepH;
  void panel.offsetHeight;
  el.classList.remove('measuring');
  return h;
}
function initSheetDrag(el) {
  const panel = sheetPanel(el);
  let start = null, drag = null, swallowClick = false;
  panel.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  panel.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!drag) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
      // Ziehen beginnt: beide Höhen messen, Inhalt voll zeigen und per Höhe beschneiden
      const hMin = measureSheet(el, true), hMax = measureSheet(el, false), h0 = panel.offsetHeight;
      drag = { hMin, hMax, h0, h: h0, lastY: e.clientY, lastT: performance.now(), v: 0 };
      el.classList.add('dragging');
      if (el.id === 'browseSheet') $('sheetMore').classList.add('open'); else el.classList.remove('compact');
      panel.style.overflow = 'hidden';
      panel.style.height = `${h0}px`;
      try { panel.setPointerCapture(e.pointerId); } catch (x) {}
    }
    let h = drag.h0 - dy;
    // über die Grenzen hinaus nur noch gedämpft (Gummiband)
    if (h > drag.hMax) h = drag.hMax + (h - drag.hMax) * .25;
    if (h < drag.hMin) h = drag.hMin - (drag.hMin - h) * .25;
    const now = performance.now();
    drag.v = (e.clientY - drag.lastY) / Math.max(1, now - drag.lastT) * .6 + drag.v * .4;
    drag.lastY = e.clientY; drag.lastT = now; drag.h = h;
    panel.style.height = `${h}px`;
    layout();
  });
  const end = e => {
    if (!start || (e && e.pointerId !== start.id)) return;
    start = null;
    if (!drag) return;
    const d = drag; drag = null;
    swallowClick = true; setTimeout(() => { swallowClick = false; }, 350);
    // Schwung entscheidet, sonst die nähere Raststufe
    const compact = d.v > .35 ? true : d.v < -.35 ? false : d.h < (d.hMin + d.hMax) / 2;
    el.classList.remove('dragging');
    panel.classList.add('sheet-panel-anim');
    panel.style.height = `${compact ? d.hMin : d.hMax}px`;
    const finish = () => {
      panel.classList.remove('sheet-panel-anim');
      el.classList.add('measuring');
      setCompact(el, compact);
      panel.style.height = ''; panel.style.overflow = '';
      void panel.offsetHeight;
      el.classList.remove('measuring');
      layout();
    };
    let done = false;
    const once = () => { if (!done) { done = true; finish(); } };
    panel.addEventListener('transitionend', once, { once: true });
    setTimeout(once, 400);
    const tick = () => { layout(); if (!done) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
  // Nach dem Ziehen keinen Knopf unter dem Finger auslösen
  panel.addEventListener('click', e => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  // Griff antippen schaltet zwischen klein und groß
  panel.querySelector('.grabber').addEventListener('click', () => setCompact(el, !isCompact(el)));
}
['browseSheet', 'previewSheet', 'driveSheet'].forEach(id => initSheetDrag($(id)));

/* --- Seitenleiste: alle Knöpfe in einem --- */
let railOpen = false, railTimer = 0, railSwiped = false;
function railAutoClose(ms) { clearTimeout(railTimer); railTimer = setTimeout(() => setRailOpen(false), ms); }
function setRailOpen(on) {
  railOpen = on;
  // Reihenfolge von unten zählen, damit jeder Knopf aus dem Sammelknopf herausfährt
  const items = [...$('railItems').children].filter(b => !b.classList.contains('hidden'));
  items.forEach((b, i) => b.style.setProperty('--i', items.length - i));
  $('rail').classList.toggle('open', on);
  $('railToggle').setAttribute('aria-expanded', String(on));
  clearTimeout(railTimer);
  if (on) railAutoClose(6000);
}
$('railToggle').onclick = () => { if (railSwiped) { railSwiped = false; return; } setRailOpen(!railOpen); };
$('railItems').addEventListener('click', () => { if (railOpen) railAutoClose(4000); });
// Wischen: hoch/links öffnet, runter/rechts schließt
let railStart = null;
$('rail').addEventListener('pointerdown', e => {
  railStart = { x: e.clientX, y: e.clientY };
  // Finger am Knopf festhalten, auch wenn er beim Wischen darüber hinausgleitet
  const b = e.target.closest('.rail-btn');
  if (b) { try { b.setPointerCapture(e.pointerId); } catch (x) {} }
});
$('rail').addEventListener('pointerup', e => {
  if (!railStart) return;
  const dx = e.clientX - railStart.x, dy = e.clientY - railStart.y;
  railStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  const open = Math.abs(dy) >= Math.abs(dx) ? dy < 0 : dx < 0;
  railSwiped = true; setTimeout(() => { railSwiped = false; }, 350);
  setRailOpen(open);
});
$('searchClose').onclick = () => { closeSearch(); if (S.mode !== 'preview') S.start = null; };
// Start- und Zielfeld teilen sich die Trefferliste; das zuletzt fokussierte Feld bekommt den gewählten Ort
['startInput', 'searchInput'].forEach(id => {
  const inp = $(id), target = id === 'startInput' ? 'start' : 'dest';
  inp.addEventListener('focus', () => {
    if (searchTarget === target) return;
    searchTarget = target; searchSeq++; clearTimeout(searchTimer);
    const q = inp.value.trim();
    if (q.length >= 3 && !(target === 'start' && S.start && q === S.start.name)) doSearch(q); else renderRecentsList();
  });
  inp.addEventListener('input', () => {
    searchTarget = target;
    if (target === 'start' && !inp.value.trim()) S.start = null;
    clearTimeout(searchTimer);
    const q = inp.value.trim();
    if (q.length < 3) { searchSeq++; renderRecentsList(); return; }
    $('searchResults').innerHTML = `<div class="text-center text-cyan-300 py-8 font-game text-sm blink">${L('SCANNE…')}</div>`;
    searchTimer = setTimeout(() => doSearch(q), 550);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const q = inp.value.trim(); if (q.length >= 2) { clearTimeout(searchTimer); doSearch(q); } }
  });
});
$('swapBtn').onclick = swapRoute;
$('previewClose').onclick = cancelPreview;
$('favBtn').onclick = () => { if (S.dest) openFavModal(S.dest); };
document.querySelectorAll('.fav-opt').forEach(b => b.onclick = () => { if (favTarget) saveFav(favTarget, b.dataset.ft); closeFavModal(); });
$('favRemove').onclick = () => { const f = favTarget && favAt(favTarget); if (f) removeFav(f.id); closeFavModal(); };
$('favCancel').onclick = closeFavModal;
$('placeClose').onclick = closePlaceCard;
$('placeModal').onclick = e => { if (e.target.id === 'placeModal') closePlaceCard(); };
$('favModal').onclick = e => { if (e.target.id === 'favModal') closeFavModal(); };
$('goBtn').onclick = startNav;
$('freeBtn').onclick = startFree;
$('endBtn').onclick = () => { if (confirm(S.mode === 'nav' ? L('Navigation beenden?') : L('Freie Fahrt beenden und speichern?'))) endDrive('manual'); };
$('reportCamBtn').onclick = () => report('blitzer');
$('reportHazBtn').onclick = () => report('gefahr');
$('historyBtn').onclick = openHistory;
$('garageBtn').onclick = openGarage;
$('garageClose').onclick = closeGarage;
$('garageModal').onclick = e => { if (e.target.id === 'garageModal') closeGarage(); };
$('garageSave').onclick = saveGarage;
$('settingsBtn').onclick = openSettings;
$('settingsClose').onclick = closeSettings;
$('settingsModal').onclick = e => { if (e.target.id === 'settingsModal') closeSettings(); };
$('osmToggle').onchange = () => setOsmEnabled($('osmToggle').checked);
$('poiToggle').onchange = () => setPoisEnabled($('poiToggle').checked);
$('voiceTest').onclick = testVoice;
$('tkLoad').onclick = () => loadFuelPrices(false);
$('modelSel').onchange = () => {
  const v = $('modelSel').value;
  if (v === '__custom') { draft.model = L('Eigenes Fahrzeug'); return; }
  const hit = modelList(draft.kind, draft.fuel, draft.brand).find(([n]) => n === v);
  if (hit) { draft.model = hit[0]; draft.cons = hit[1]; $('consInput').value = fmtDec(hit[1]); }
};
$('brandSel').onchange = () => {
  draft.brand = $('brandSel').value;
  const list = modelList('car', draft.fuel, draft.brand);
  if (list.length) { draft.model = list[0][0]; draft.cons = list[0][1]; }
  renderGarage();
};
// Dezimalfelder: nur Ziffern und ein Trennzeichen (Komma oder Punkt) zulassen
document.querySelectorAll('input.dec').forEach(inp => inp.addEventListener('input', () => {
  let v = inp.value.replace(/[^0-9.,]/g, '');
  const i = v.search(/[.,]/);
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, '');
  if (v !== inp.value) inp.value = v;
}));
$('historyClose').onclick = closeHistory;
document.querySelectorAll('#histTabs button').forEach(b => b.onclick = () => setHistTab(b.dataset.tab));
$('historyModal').onclick = e => { if (e.target.id === 'historyModal') closeHistory(); };
$('viewClose').onclick = closeTripView;
$('muteBtn').onclick = () => { muted = !muted; store.set(LS.mute, muted); renderMute(); if (!muted) { unlockAudio(); tone(1000, .08, 0, .5, 'triangle'); } else if ('speechSynthesis' in window) speechSynthesis.cancel(); };
$('viewBtn').onclick = () => {
  S.view3d = !S.view3d; store.set(LS.view, S.view3d);
  $('viewBtn').textContent = S.view3d ? '3D' : '2D';
  if (S.follow && S.pos && S.mode !== 'preview') camera();
  else map.easeTo({ pitch: S.view3d ? 50 : 0, bearing: S.view3d ? map.getBearing() : 0, duration: 600 });
};
$('recenterBtn').onclick = () => {
  if (S.viewTrip) { closeTripView(); return; }
  S.follow = true; S.camZoom = null; $('recenterBtn').classList.remove('active-ring');
  if (S.pos) camera(); else toast(L('Noch kein Standort'));
};
$('clearHazBtn').onclick = () => {
  if (!hazards.length) { toast(L('Keine Meldungen gespeichert')); return; }
  if (!confirm(L('Alle {n} Meldungen löschen?', { n: hazards.length }))) return;
  hazards = []; store.set(LS.haz, hazards); alertStage.clear(); renderHazards(); hideAlarm(); renderHistory();
};

document.querySelectorAll('.sheet').forEach(el => { if (window.ResizeObserver) new ResizeObserver(layout).observe(el); });
window.addEventListener('resize', layout);

setInterval(() => { renderGauge(); renderFreeStats(); }, 1000);

$('viewBtn').textContent = S.view3d ? '3D' : '2D';
/* Installierbare App */
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function showInstallHint() {
  if (standalone || store.get(LS.install, false)) return;
  $('installText').innerHTML = isIOS ? L('Als App installieren: <b>Teilen ⬆️</b> → <b>Zum Home-Bildschirm</b>')
    : installEvt ? L('NeonNav als App auf dem Handy installieren') : L('Als App installieren: Menü <b>⋮</b> → <b>App installieren</b>');
  $('installBtn').classList.toggle('hidden', !installEvt);
  $('installHint').classList.remove('hidden');
  layout();
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstallHint(); });
$('installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('installHint').classList.add('hidden'); layout(); };
$('installClose').onclick = () => { store.set(LS.install, true); $('installHint').classList.add('hidden'); layout(); };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
setTimeout(showInstallHint, 1500);

renderMute();
renderVehicleBtn();
renderXP();
renderRecentChips();
renderPark();
renderHazards();
setMode('browse');
setTimeout(checkAchievements, 3000); // bereits erreichte Erfolge (z. B. aus älteren Fahrten) nachträglich freischalten
startGPS();
