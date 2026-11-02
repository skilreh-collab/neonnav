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
map.on('click', () => { if (sheetOpen) setSheetOpen(false); });
map.on('dragstart', () => { if (sheetOpen) setSheetOpen(false); });
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
