// NeonNav – Erfolge, Statistik, Fahrtenbuch
// Teil der Web-App; alle app-*.js teilen sich den globalen Bereich und werden in index.html der Reihe nach geladen.
'use strict';

/* =================================================================
   ERFOLGE, STATISTIK & ENTDECKER
   ================================================================= */
let stats = store.get(LS.stats, {});
function bumpStat(k) { stats[k] = (stats[k] || 0) + 1; store.set(LS.stats, stats); }

// Erkundete Kacheln (~450 × 450 m). Beim ersten Start aus vorhandenen Fahrten nachgetragen.
const CELL = 0.004;
const cellKey = (lat, lng) => Math.floor(lat / CELL) + ':' + Math.floor(lng / (CELL * 1.5));
let explored = new Set(store.get(LS.explore, null) || []);
if (!store.get(LS.explore, null)) {
  store.get(LS.trips, []).forEach(t => (t.coords || []).forEach(c => explored.add(cellKey(c[1], c[0]))));
  store.set(LS.explore, [...explored]);
}
function addExplored(coords) {
  const before = explored.size;
  coords.forEach(c => explored.add(cellKey(c[1], c[0])));
  if (explored.size !== before) store.set(LS.explore, [...explored]);
  return explored.size - before;
}
const exploredKm2 = () => Math.round(explored.size * 0.2);

const co2Of = t => t.co2 != null ? t.co2 : (parseFloat(((t.costExtra || '').match(/([\d,]+) kg CO₂/) || [])[1]?.replace(',', '.')) || 0);
const ACH = [
  { id: 'first',    icon: '🚀', name: L('Erste Fahrt'),       desc: L('Deine erste aufgezeichnete Fahrt'),         xp: 50,  test: c => c.trips >= 1 },
  { id: 'trips10',  icon: '🔟', name: L('Stammfahrer'),       desc: L('10 Fahrten'),                               xp: 100, prog: c => [c.trips, 10] },
  { id: 'trips50',  icon: '🏅', name: L('Vielfahrer'),        desc: L('50 Fahrten'),                               xp: 250, prog: c => [c.trips, 50] },
  { id: 'km100',    icon: '🛣️', name: L('100 km'),            desc: L('Insgesamt 100 km unterwegs'),               xp: 100, prog: c => [c.km, 100] },
  { id: 'km1000',   icon: '🌍', name: L('Tausender'),         desc: L('Insgesamt 1.000 km unterwegs'),             xp: 300, prog: c => [c.km, 1000] },
  { id: 'km5000',   icon: '🪐', name: L('Kilometerfresser'),  desc: L('Insgesamt 5.000 km unterwegs'),             xp: 600, prog: c => [c.km, 5000] },
  { id: 'long',     icon: '🏔️', name: L('Langstrecke'),       desc: L('Eine Fahrt über 100 km'),                   xp: 150, test: c => c.longest >= 100 },
  { id: 'marathon', icon: '⏱️', name: L('Sitzfleisch'),       desc: L('Eine Fahrt über 2 Stunden'),                xp: 150, test: c => c.longestH >= 2 },
  { id: 'night',    icon: '🦉', name: L('Nachteule'),         desc: L('Fahrt zwischen 0 und 4 Uhr gestartet'),     xp: 100, test: c => c.night },
  { id: 'early',    icon: '🌅', name: L('Frühaufsteher'),     desc: L('Fahrt zwischen 4 und 6 Uhr gestartet'),     xp: 100, test: c => c.early },
  { id: 'weekend',  icon: '🎉', name: L('Wochenend-Cruiser'), desc: L('Am Wochenende über 30 km am Stück'),        xp: 100, test: c => c.weekend },
  { id: 'saver',    icon: '💶', name: L('Sparfuchs'),         desc: L('Mind. 10 km motorisiert für max. 1 €'),     xp: 100, test: c => c.saver },
  { id: 'green',    icon: '🌱', name: L('Grün unterwegs'),    desc: L('50 km mit Fahrrad, E-Bike oder zu Fuß'),    xp: 150, prog: c => [c.greenKm, 50] },
  { id: 'clean',    icon: '😇', name: L('Vorbildlich'),       desc: L('5 Fahrten über 10 km ohne Tempoverstoß'),   xp: 150, prog: c => [c.clean, 5] },
  { id: 'arrive10', icon: '🏁', name: L('Zielsicher'),        desc: L('10 Ziele erreicht'),                        xp: 100, prog: c => [c.arrivals, 10] },
  { id: 'scout',    icon: '📸', name: L('Blitzer-Scout'),     desc: L('5 Blitzer oder Gefahren gemeldet'),         xp: 100, prog: c => [c.reports, 5] },
  { id: 'explorer', icon: '🧭', name: L('Entdecker'),         desc: L('50 Kacheln der Karte erkundet'),            xp: 100, prog: c => [c.cells, 50] },
  { id: 'pioneer',  icon: '🗺️', name: L('Pionier'),           desc: L('500 Kacheln der Karte erkundet'),           xp: 300, prog: c => [c.cells, 500] },
  { id: 'home',     icon: '🏠', name: L('Heimathafen'),       desc: L('Zuhause als Favorit festgelegt'),           xp: 30,  test: c => c.home },
  { id: 'ghost',    icon: '👻', name: L('Geisterjäger'),      desc: L('Deine eigene Bestzeit geschlagen'),         xp: 150, test: c => c.ghostWins >= 1 },
  { id: 'lvl5',     icon: '⭐', name: L('Turbo-Level'),       desc: L('Level 5 erreicht'),                         xp: 0,   prog: c => [c.level, 5] },
  { id: 'lvl10',    icon: '🌟', name: L('Neon-Legende'),      desc: L('Level 10 erreicht'),                        xp: 0,   prog: c => [c.level, 10] }
];
const achReached = (a, c) => a.test ? a.test(c) : (([v, goal]) => v >= goal)(a.prog(c));
let achDone = store.get(LS.ach, {});
let achQueue = [], achShowing = false;

function achContext() {
  const trips = store.get(LS.trips, []);
  const c = { trips: trips.length, km: 0, longest: 0, longestH: 0, night: false, early: false, weekend: false, saver: false, greenKm: 0, clean: 0,
              arrivals: stats.arrivals || 0, reports: stats.reports || 0, ghostWins: stats.ghostWins || 0, cells: explored.size,
              home: favs.some(f => f.type === 'home'), level: levelOf(xp) };
  for (const t of trips) {
    const km = (t.distance || 0) / 1000, d = new Date(t.date), h = d.getHours(), day = d.getDay();
    c.km += km;
    c.longest = Math.max(c.longest, km);
    c.longestH = Math.max(c.longestH, (t.duration || 0) / 3600000);
    if (h < 4) c.night = true; else if (h < 6) c.early = true;
    if ((day === 0 || day === 6) && km >= 30) c.weekend = true;
    if (km >= 10 && ['car', 'moto', 'ebike'].includes(t.kind) && t.cost != null && t.cost <= 1) c.saver = true;
    if (['bike', 'ebike', 'foot'].includes(t.kind)) c.greenKm += km;
    if (km >= 10 && t.over === 0 && (t.lim || 0) >= 300) c.clean++;   // nur, wenn das Tempolimit mind. 5 min bekannt war
  }
  return c;
}
function checkAchievements() {
  let gained = 0;
  // mehrfach prüfen: XP aus Erfolgen können Level-Erfolge auslösen
  for (let round = 0; round < 3; round++) {
    const c = achContext(), fresh = ACH.filter(a => !achDone[a.id] && achReached(a, c));
    if (!fresh.length) break;
    fresh.forEach(a => { achDone[a.id] = Date.now(); achQueue.push(a); gained += a.xp; });
    store.set(LS.ach, achDone);
    if (fresh.some(a => a.xp)) addXP(fresh.reduce((s, a) => s + a.xp, 0));
  }
  if (gained || achQueue.length) showNextAch();
}
function showNextAch() {
  if (achShowing || !achQueue.length) return;
  const a = achQueue.shift(), el = $('achPop');
  achShowing = true;
  $('achPopIcon').textContent = a.icon;
  $('achPopTitle').textContent = a.name;
  $('achPopSub').textContent = a.desc + (a.xp ? ` · +${a.xp} XP` : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  jingle(); vibrate([40, 30, 40, 30, 120]);
  setTimeout(() => { el.classList.remove('show'); achShowing = false; showNextAch(); }, 4300);
}

function renderAch() {
  const c = achContext(), done = ACH.filter(a => achDone[a.id]).length;
  $('achPane').innerHTML = `<div class="text-sm text-slate-400 mb-2">${L('{a} von {b} freigeschaltet', { a: done, b: ACH.length })}</div>
    <div class="grid grid-cols-2 gap-2">${ACH.map(a => {
      const got = achDone[a.id], p = a.prog ? a.prog(c) : null, pct = p ? clamp(p[0] / p[1] * 100, 0, 100) : (got ? 100 : 0);
      return `<div class="rounded-2xl p-3 border ${got ? 'border-yellow-300/60 bg-yellow-300/10' : 'border-slate-800 bg-slate-900/70'}">
        <div class="text-3xl leading-none ${got ? '' : 'grayscale opacity-40'}">${a.icon}</div>
        <div class="mt-1 font-bold text-sm ${got ? 'text-yellow-200' : 'text-slate-300'}">${esc(a.name)}</div>
        <div class="text-[11px] text-slate-400 leading-snug">${esc(a.desc)}</div>
        ${got ? `<div class="text-[10px] text-yellow-300/80 mt-1">✓ ${new Date(got).toLocaleDateString(LOC)}</div>`
          : p ? `<div class="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:linear-gradient(90deg,var(--neon),var(--pink))"></div></div>
                 <div class="text-[10px] text-slate-500 mt-0.5">${Math.floor(p[0]).toLocaleString(LOC)} / ${p[1].toLocaleString(LOC)}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
}

let statMonth = null;
function renderStats() {
  const trips = store.get(LS.trips, []), now = new Date();
  // Start im aktuellen Monat – ist der noch leer (z. B. am Monatsanfang), im Monat der letzten Fahrt
  if (!statMonth) { const ref = trips.length ? new Date(trips[0].date) : now; statMonth = new Date(ref.getFullYear(), ref.getMonth(), 1); }
  const inMonth = (t, m) => { const d = new Date(t.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); };
  const prevM = new Date(statMonth.getFullYear(), statMonth.getMonth() - 1, 1);
  const cur = trips.filter(t => inMonth(t, statMonth)), pre = trips.filter(t => inMonth(t, prevM));
  const sum = (list, f) => list.reduce((a, t) => a + (f(t) || 0), 0);
  const km = sum(cur, t => t.distance) / 1000, kmPrev = sum(pre, t => t.distance) / 1000;
  const eur = sum(cur, t => t.cost), co2 = sum(cur, co2Of), ms = sum(cur, t => t.duration);
  const maxV = cur.reduce((a, t) => Math.max(a, t.max || 0), 0), avg = ms > 0 ? km / (ms / 3600000) : 0;
  const delta = kmPrev > 0 ? Math.round((km - kmPrev) / kmPrev * 100) : null;
  const dests = {};
  cur.forEach(t => { const l = t.label || ''; if (l && !/^(Freie Fahrt|Erkunden|Navigation|Rundtour .*)$/.test(l) && !t.walk) dests[l] = (dests[l] || 0) + 1; });
  const top = Object.entries(dests).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const isNow = statMonth.getFullYear() === now.getFullYear() && statMonth.getMonth() === now.getMonth();
  const tile = (v, l, cls = 'text-white') => `<div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><div class="font-game text-xl font-black ${cls}">${v}</div><div class="text-[10px] uppercase tracking-wider text-slate-500">${l}</div></div>`;
  const n1 = v => v.toFixed(v < 100 ? 1 : 0).replace('.', DEC);
  $('statsPane').innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <button id="stPrev" class="h-10 w-10 rounded-xl bg-slate-800 text-lg" aria-label="${L('Voriger Monat')}">‹</button>
      <div class="font-game font-bold text-cyan-200">${statMonth.toLocaleDateString(LOC, { month: 'long', year: 'numeric' }).toUpperCase()}</div>
      <button id="stNext" class="h-10 w-10 rounded-xl bg-slate-800 text-lg ${isNow ? 'opacity-30' : ''}" ${isNow ? 'disabled' : ''} aria-label="${L('Nächster Monat')}">›</button>
    </div>
    ${cur.length ? `<div class="grid grid-cols-2 gap-2">
      ${tile(n1(km) + ' km', L('Strecke') + (delta != null ? ` · <span class="${delta >= 0 ? 'text-lime-300' : 'text-pink-300'}">${delta >= 0 ? '+' : ''}${delta} %</span>` : ''), 'neon-text')}
      ${tile(cur.length, cur.length === 1 ? L('Fahrt') : L('Fahrten'))}
      ${tile(fmtEur(eur), L('Kosten'), 'text-lime-300')}
      ${tile(n1(co2) + ' kg', 'CO₂', 'text-emerald-300')}
      ${tile(fmtClock(ms).replace(/:\d\d$/, ' h'), L('Fahrzeit'))}
      ${tile(Math.round(avg) + ' / ' + Math.round(maxV), L('Ø / Max km/h'), 'pink-text')}
    </div>
    ${top.length ? `<div class="mt-3 rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><div class="text-[11px] uppercase tracking-[.2em] text-slate-400 font-game mb-1">${L('Lieblingsziele')}</div>
      ${top.map(([l, n], i) => `<div class="flex justify-between gap-2 text-sm py-0.5"><span class="truncate">${['🥇', '🥈', '🥉'][i]} ${esc(L(l))}</span><span class="text-slate-400 shrink-0">${n}×</span></div>`).join('')}</div>` : ''}`
    : `<div class="text-center text-slate-400 py-8">${L('Keine Fahrten in diesem Monat.')}</div>`}
    <div class="mt-3 rounded-2xl p-3 border border-violet-400/40" style="background:linear-gradient(135deg,rgba(79,70,229,.18),rgba(236,72,153,.12))">
      <div class="flex items-center justify-between gap-2">
        <div><div class="font-bold">🧭 ${L('Entdecker-Karte')}</div>
          <div class="text-xs text-slate-300">${L('{n} Kacheln erkundet', { n: explored.size.toLocaleString(LOC) })} · ≈ ${exploredKm2().toLocaleString(LOC)} km²</div></div>
        <button id="exploreBtn" class="shrink-0 h-10 px-3 rounded-xl font-bold text-sm text-white" style="background:linear-gradient(135deg,#6366f1,#ec4899)">${L('Zeigen')}</button>
      </div>
    </div>`;
  $('stPrev').onclick = () => { statMonth = prevM; renderStats(); };
  $('stNext').onclick = () => { statMonth = new Date(statMonth.getFullYear(), statMonth.getMonth() + 1, 1); renderStats(); };
  $('exploreBtn').onclick = () => { closeHistory(); showExplore(); };
}

// Alle Fahrten als leuchtende Heatmap
function showExplore() {
  if (S.mode === 'nav' || S.mode === 'free') { toast(L('Während der Fahrt nicht möglich')); return; }
  if (S.mode === 'preview') cancelPreview();
  const trips = store.get(LS.trips, []), pts = [];
  trips.forEach(t => (t.coords || []).forEach((c, i) => { if (i % 3 === 0) pts.push(c); }));
  if (!pts.length) { toast(L('Noch keine Fahrten – los geht’s!')); return; }
  const sample = pts.length > 40000 ? pts.filter((c, i) => i % Math.ceil(pts.length / 40000) === 0) : pts;
  S.viewTrip = { explore: true }; S.follow = false;
  setSrc('explore', { type: 'FeatureCollection', features: sample.map(c => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })) });
  $('viewTitle').textContent = '🧭 ' + L('Entdecker-Karte');
  $('viewStats').textContent = `${L('{n} Fahrten', { n: trips.length })} · ${L('{n} Kacheln', { n: explored.size.toLocaleString(LOC) })} · ≈ ${exploredKm2().toLocaleString(LOC)} km²`;
  $('viewBar').classList.remove('hidden');
  fitCoords(sample);
}

/* =================================================================
   FAHRTENBUCH
   ================================================================= */
let histTab = 'trips';
function setHistTab(t) {
  histTab = t;
  document.querySelectorAll('#histTabs button').forEach(b => {
    const on = b.dataset.tab === t;
    b.className = `h-10 rounded-xl text-xs font-bold border ${on ? 'border-cyan-300 bg-cyan-400/15 text-white' : 'border-slate-700 bg-slate-900 text-slate-400'}`;
  });
  $('historyList').classList.toggle('hidden', t !== 'trips');
  $('histFoot').classList.toggle('hidden', t !== 'trips');
  $('statsPane').classList.toggle('hidden', t !== 'stats');
  $('achPane').classList.toggle('hidden', t !== 'ach');
  if (t === 'trips') renderHistory(); else if (t === 'stats') renderStats(); else renderAch();
}
function openHistory() { renderHistory(); setHistTab(histTab); $('historyModal').classList.remove('hidden'); }
function closeHistory() { $('historyModal').classList.add('hidden'); }
function renderHistory() {
  const trips = store.get(LS.trips, []), list = $('historyList');
  const km = trips.reduce((a, t) => a + (t.distance || 0), 0) / 1000;
  const eur = trips.reduce((a, t) => a + (t.cost || 0), 0);
  $('histSummary').textContent = `${L(trips.length === 1 ? '{n} Fahrt' : '{n} Fahrten', { n: trips.length })} · ${km.toFixed(1).replace('.', DEC)} km · ${fmtEur(eur)} · Level ${levelOf(xp)}`;
  $('hazCount').textContent = L(hazards.length === 1 ? '{n} Meldung gespeichert' : '{n} Meldungen gespeichert', { n: hazards.length });
  list.innerHTML = '';
  if (!trips.length) { list.innerHTML = `<div class="text-center text-slate-400 py-10">${L('Noch keine Fahrten.')}<br><span class="text-sm">${L('Starte eine Navigation oder eine freie Fahrt.')}</span></div>`; return; }
  trips.forEach(t => {
    const d = new Date(t.date), row = document.createElement('div');
    row.className = 'flex items-stretch gap-2';
    row.innerHTML = `
      <button class="t-open flex-1 min-w-0 text-left rounded-2xl bg-slate-900 border border-slate-800 p-3 active:scale-[.98] transition">
        <div class="flex justify-between items-center gap-2">
          <span class="font-bold text-white truncate">${esc(L(t.label || 'Fahrt'))}</span>
          <span class="text-xs text-slate-400 shrink-0">${d.toLocaleDateString(LOC, { day: '2-digit', month: '2-digit', year: '2-digit' })} · ${timeStr(d)}${t.demo ? ' · <span class="text-amber-300">Demo</span>' : ''}</span>
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5 truncate">${esc(t.vehicle || '')}${t.cost != null ? ` · <span class="text-lime-300 font-bold">💶 ${fmtEur(t.cost)}</span>` : ''}${t.costExtra ? ` · ${esc(t.costExtra)}` : ''}</div>
        <div class="grid grid-cols-4 gap-1 mt-2 text-center">
          <div><div class="font-game text-base font-black neon-text">${(t.distance / 1000).toFixed(1).replace('.', DEC)}</div><div class="text-[9px] uppercase text-slate-500">km</div></div>
          <div><div class="font-game text-base font-black text-white">${fmtClock(t.duration)}</div><div class="text-[9px] uppercase text-slate-500">Dauer</div></div>
          <div><div class="font-game text-base font-black text-lime-300">${Math.round(t.avg)}</div><div class="text-[9px] uppercase text-slate-500">Ø km/h</div></div>
          <div><div class="font-game text-base font-black pink-text">${Math.round(t.max)}</div><div class="text-[9px] uppercase text-slate-500">Max</div></div>
        </div>
      </button>
      <button class="t-del w-12 rounded-2xl bg-slate-900 border border-slate-800 text-xl" aria-label="${L('Löschen')}">🗑</button>`;
    row.querySelector('.t-open').onclick = () => { closeHistory(); showTrip(t); };
    row.querySelector('.t-del').onclick = () => {
      if (!confirm(L('Diese Fahrt löschen?'))) return;
      store.set(LS.trips, store.get(LS.trips, []).filter(x => x.id !== t.id));
      if (S.viewTrip && S.viewTrip.id === t.id) closeTripView();
      renderHistory();
    };
    list.appendChild(row);
  });
}
function showTrip(t) {
  if (S.mode === 'nav' || S.mode === 'free') { toast(L('Während der Fahrt nicht möglich')); return; }
  if (S.mode === 'preview') cancelPreview();
  S.viewTrip = t; S.follow = false;
  setSrc('history', lineFC(t.coords));
  $('viewTitle').textContent = `${L(t.label || 'Fahrt')} · ${new Date(t.date).toLocaleDateString(LOC)}`;
  $('viewStats').textContent = `${(t.distance / 1000).toFixed(1).replace('.', DEC)} km · ${fmtClock(t.duration)} · Ø ${Math.round(t.avg)} · Max ${Math.round(t.max)} km/h${t.cost != null ? ` · ${fmtEur(t.cost)}` : ''}`;
  $('viewBar').classList.remove('hidden');
  fitCoords(t.coords);
}
function closeTripView() {
  S.viewTrip = null;
  setSrc('history', emptyFC());
  setSrc('explore', emptyFC());
  $('viewBar').classList.add('hidden');
  S.follow = true; $('recenterBtn').classList.remove('active-ring');
  camera();
}
