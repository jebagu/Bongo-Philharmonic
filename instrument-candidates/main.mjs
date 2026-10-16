import { BANKS, ALL_VOICES, IS_DRUM, ROLE_LABEL, grooveEvents } from './catalog.mjs';
import { SoundEngine, BACKING } from './audio.mjs';

const $ = selector => document.querySelector(selector);
const KEY = `${location.pathname.startsWith('/BongoPlanet/composer/') ? 'bongo-philharmonic' : 'bongo-planet'}-instrument-candidates-v1`;
let bank = BANKS[0], engine, initializing, activity = 'idle', epoch = 0, timer, tourTimer, toastTimer;
let step = 0, nextTime = 0, tempo = bank.bpm, mode = 'note', filter = 'all', picksOnly = false;
const muted = new Set(), picks = new Set(), activeCards = new Map();
let visualEvents = [], history = [], scopedStatus = '', previewTimeout;
try { const value = JSON.parse(localStorage.getItem(KEY) ?? '{}'); if (Array.isArray(value.picks)) for (const id of value.picks) if (ALL_VOICES.some(v => v.id === id)) picks.add(id); } catch {}

function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3200); }
function setStatus(text) { $('#transport-status').textContent = text; scopedStatus = text; }
function savePicks() { try { localStorage.setItem(KEY, JSON.stringify({ picks: [...picks] })); } catch { toast('Shortlist works for this visit; browser storage is unavailable.'); } updatePickCount(); }
function updatePickCount() { $('#pick-count').textContent = picks.size; $('#show-picks').classList.toggle('active', picksOnly); $('#show-picks').setAttribute('aria-pressed', String(picksOnly)); }

async function audio() {
  if (!initializing) {
    initializing = (async () => {
      engine = new SoundEngine(new (window.AudioContext || window.webkitAudioContext)());
      await engine.load();
      engine.volume(Number($('#volume').value) / 100);
      return engine;
    })().catch(error => { initializing = undefined; engine?.context.close(); engine = undefined; throw error; });
  }
  const value = await initializing;
  await value.context.resume();
  return value;
}

function stop(message = 'Stopped. Pick a sound or start the set again.') {
  epoch++;
  activity = 'idle'; clearInterval(timer); clearTimeout(tourTimer); clearTimeout(previewTimeout);
  engine?.stop(); visualEvents = []; activeCards.clear();
  for (const card of document.querySelectorAll('.sound-card.playing')) card.classList.remove('playing');
  for (const light of document.querySelectorAll('.step.on')) light.classList.remove('on');
  $('#groove').setAttribute('aria-pressed', 'false'); $('#groove-label').textContent = 'Hear the set together';
  $('#tour').setAttribute('aria-pressed', 'false'); $('#tour').textContent = '▷ Audition all 16';
  $('#display-mode').textContent = 'READY WHEN YOU ARE'; $('#bar-label').textContent = 'D MINOR · 4 BARS';
  setStatus(message);
}

async function guardedStart(task, loadingMessage) {
  stop(loadingMessage);
  const token = epoch;
  try {
    const value = await audio();
    if (token !== epoch || document.hidden) return;
    task(value, token);
  } catch (error) {
    if (token !== epoch) return;
    stop('Audio could not start. Please try again.'); toast(error.message);
  }
}

function flash(v, at, duration = .35) { visualEvents.push({ id: v.id, time: at, end: at + Math.min(duration, 2.5) }); }
function sound(v, note, at, duration, velocity = .8, pan = 0) {
  engine.play(v, note, at, duration, velocity, pan);
  flash(v, at, duration);
  history.push({ id: v.id, note, at, duration, activity });
  if (history.length > 5000) history.splice(0, 1000);
}

function auditionPattern(v, at, auditionMode = mode) {
  const root = v.auditionNote ?? v.root ?? 62;
  if (IS_DRUM(v) || v.role === 'fx') {
    const count = auditionMode === 'phrase' ? 4 : 1;
    for (let i = 0; i < count; i++) sound(v, root, at + i * .3, .35, i % 2 ? .66 : .88);
    return count === 4 ? 1.5 : 1.1;
  }
  if (v.speech) { sound(v, root, at, 2.5, .9); return Math.max(1.6, Math.min(3.3, engine.samples.get(v.asset)?.duration ?? 2)); }
  if (auditionMode === 'chord') {
    for (const offset of [0, 3, 7]) sound(v, root + offset, at, 1.2, .5);
    return 2.5;
  }
  if (auditionMode === 'phrase') {
    const offsets = v.role === 'bass' ? [0, 0, 7, 12, 10, 7] : [0, 3, 7, 12, 10, 7];
    offsets.forEach((offset, i) => sound(v, root + offset, at + i * .22, .18, i === 0 ? .85 : .72));
    return 2.3;
  }
  const duration = v.role === 'pad' ? 1.8 : v.role === 'voice' ? 1.3 : .9;
  sound(v, root, at, duration, .9);
  return duration + (v.release ?? .6) + .15;
}

async function audition(v) {
  await guardedStart((audioEngine, token) => {
    activity = 'preview';
    const length = auditionPattern(v, audioEngine.context.currentTime + .035);
    $('#display-mode').textContent = v.name.toUpperCase(); setStatus(`Listening to ${v.name} · ${v.speech ? 'spoken phrase' : mode === 'note' ? 'single sound' : mode}`);
    previewTimeout = setTimeout(() => { if (token === epoch) { activity = 'idle'; setStatus(`${v.name}. Try another sound, or hear the set together.`); } }, length * 1000);
  }, `Preparing ${v.name}…`);
}

function schedule() {
  if (activity !== 'groove' || engine.context.state !== 'running') return;
  const now = engine.context.currentTime;
  // Never replay a burst of missed notes after the browser stalls.
  if (nextTime < now - .15) nextTime = now + .03;
  while (nextTime < now + .12) {
    const beatSeconds = 60 / tempo;
    for (const event of grooveEvents(bank, step, beatSeconds)) {
      if (muted.has(event.voice.id)) continue;
      const index = bank.voices.indexOf(event.voice);
      sound(event.voice, event.note, nextTime, event.duration, event.velocity, IS_DRUM(event.voice) || event.voice.role === 'bass' ? 0 : (index % 5 - 2) * .2);
    }
    if ($('#backing').checked) {
      const local = step % 16;
      if ([0, 8].includes(local)) engine.play(BACKING[0], 36, nextTime, .2, .6);
      if ([4, 12].includes(local)) engine.play(BACKING[1], 38, nextTime, .15, .55);
      if (local % 2 === 0) engine.play(BACKING[2], 42, nextTime, .1, local % 4 ? .37 : .48);
    }
    visualEvents.push({ step: step % 16, bar: Math.floor(step / 16), time: nextTime });
    nextTime += beatSeconds / 4; step = (step + 1) % 64;
  }
}

async function groove() {
  if (activity === 'groove') { stop(); return; }
  await guardedStart(audioEngine => {
    activity = 'groove'; step = 0; nextTime = audioEngine.context.currentTime + .06;
    $('#groove').setAttribute('aria-pressed', 'true'); $('#groove-label').textContent = 'Stop the groove';
    $('#display-mode').textContent = 'THE WHOLE ROOM';
    setStatus('Four-bar loop · all 16 voices appear over a cycle. Mute any sound below.');
    schedule(); timer = setInterval(schedule, 25);
  }, 'Preparing the listening room…');
}

async function tour() {
  if (activity === 'tour') { stop(); return; }
  await guardedStart((audioEngine, token) => {
    activity = 'tour'; let index = 0;
    $('#tour').setAttribute('aria-pressed', 'true'); $('#tour').textContent = '■ Stop audition';
    const next = () => {
      if (token !== epoch) return;
      const v = bank.voices[index];
      if (!v) { stop('You’ve heard all 16. Save a favorite or hear them together.'); return; }
      audioEngine.stop();
      const length = auditionPattern(v, audioEngine.context.currentTime + .06);
      $('#display-mode').textContent = `${String(index + 1).padStart(2, '0')} / 16 · ${v.name.toUpperCase()}`;
      setStatus(`${index + 1} of 16 · ${v.name}. ${v.description}`);
      index++; tourTimer = setTimeout(next, Math.max(2000, length * 1000 + 200));
    };
    next();
  }, 'Preparing the 16-sound audition…');
}

function waveSvg(v, index) {
  const points = Array.from({ length: 110 }, (_, i) => {
    const x = i * 2, envelope = Math.sin(Math.PI * i / 109) ** (v.role === 'pad' ? .6 : 1.7);
    const shape = (Math.sin(i * (.53 + index * .031)) + .36 * Math.sin(i * (1.4 + index * .08))) * envelope;
    return `${x.toFixed(1)},${(18 + shape * 11).toFixed(1)}`;
  }).join(' ');
  return `<svg class="mini-wave" viewBox="0 0 218 36" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18H218" stroke="currentColor" opacity=".18" fill="none"/><polyline points="${points}" stroke="currentColor" stroke-width="1.1" fill="none"/></svg>`;
}

const speaker = muted => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 9h4l5-4v14l-5-4H4z"/>${muted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>'}</svg>`;

function renderGrid() {
  const visible = bank.voices.filter(v => (!picksOnly || picks.has(v.id)) && (filter === 'all' || filter === 'voice' && v.role === 'voice' || filter === 'synth' && !IS_DRUM(v) && v.role !== 'voice' && v.role !== 'fx' || filter === 'drum' && (IS_DRUM(v) || v.role === 'fx')));
  $('#visible-count').textContent = visible.length;
  $('#instrument-grid').innerHTML = visible.map(v => {
    const number = String(bank.voices.indexOf(v) + 1).padStart(2, '0');
    return `<article class="sound-card${muted.has(v.id) ? ' muted' : ''}" data-id="${v.id}"><div class="card-top"><span class="card-id">${bank.number}.${number}<span class="card-role">${ROLE_LABEL[v.role]}</span></span><button class="heart" aria-label="Save ${v.name}" aria-pressed="${picks.has(v.id)}">${picks.has(v.id) ? '♥' : '♡'}</button></div>${waveSvg(v, ALL_VOICES.indexOf(v))}<h3>${v.name}</h3><p class="card-description">${v.description}</p><p class="card-ref"><span>${v.engine === 'sample' ? 'Sampled voice' : 'Sound reference'}</span>${v.reference}</p><div class="card-actions"><button class="audition" aria-label="Audition ${v.name}"><span class="play-icon" aria-hidden="true">▶</span> ${v.speech ? 'Hear voice' : IS_DRUM(v) || v.role === 'fx' ? 'Hear sound' : `Play ${mode === 'phrase' ? 'phrase' : mode === 'chord' ? 'chord' : 'note'}`}</button><button class="card-mute" aria-label="${muted.has(v.id) ? 'Include' : 'Mute'} ${v.name} in groove" aria-pressed="${muted.has(v.id)}">${speaker(muted.has(v.id))}</button></div></article>`;
  }).join('');
  $('#empty-state').hidden = visible.length > 0;
  if (picksOnly) $('#empty-state').textContent = 'No saved sounds match this view. Try All sounds, or tap “saved sounds” to return.';
  else $('#empty-state').textContent = 'No sounds match this filter.';
}

function selectBank(id) {
  stop('A fresh tape. Pick a sound or hear the set together.');
  bank = BANKS.find(b => b.id === id); tempo = bank.bpm; filter = 'all';
  document.documentElement.style.setProperty('--accent', bank.color); document.documentElement.style.setProperty('--tint', bank.light);
  for (const button of document.querySelectorAll('.bank-tab')) button.setAttribute('aria-pressed', String(button.dataset.bank === id));
  $('#bank-number').textContent = `SIDE ${bank.number}`; $('#bank-era').textContent = bank.era;
  $('#bank-title').textContent = bank.name; $('#bank-description').textContent = bank.description; $('#bank-character').textContent = bank.character;
  $('#tempo').value = tempo; $('#tempo-value').textContent = tempo;
  for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === 'all'));
  renderGrid();
}

$('#bank-tabs').innerHTML = BANKS.map(b => `<button class="bank-tab" data-bank="${b.id}" aria-pressed="${b === bank}" style="--bank-color:${b.color};--bank-light:${b.light}"><span class="tape-icon" aria-hidden="true"><span class="reels"><i></i><i></i></span></span><span><span class="bank-tab-name">${b.name}</span><span class="bank-tab-sub">${b.subtitle}</span></span><span class="bank-tab-number">${b.number}</span><span class="bank-selected" aria-hidden="true"></span></button>`).join('');
$('#steps').innerHTML = Array.from({ length: 16 }, (_, i) => `<span class="step${i % 4 === 0 ? ' downbeat' : ''}" aria-hidden="true"></span>`).join('');
$('#bank-tabs').addEventListener('click', event => { const button = event.target.closest('[data-bank]'); if (button) selectBank(button.dataset.bank); });
$('#groove').addEventListener('click', groove); $('#tour').addEventListener('click', tour); $('#stop').addEventListener('click', () => stop());
$('#tempo').addEventListener('input', () => { tempo = Number($('#tempo').value); $('#tempo-value').textContent = tempo; });
$('#volume').addEventListener('input', () => engine?.volume(Number($('#volume').value) / 100));
$('#backing').addEventListener('change', () => { if (activity === 'groove') setStatus($('#backing').checked ? 'Common backing beat on. Bank voices keep their own rhythms.' : 'Only the sixteen bank voices. The common backing beat is off.'); });
$('#audition-mode').addEventListener('click', event => { const button = event.target.closest('[data-mode]'); if (!button) return; mode = button.dataset.mode; for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b === button)); renderGrid(); });
$('#filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; filter = button.dataset.filter; for (const b of document.querySelectorAll('[data-filter]')) b.setAttribute('aria-pressed', String(b === button)); renderGrid(); });
$('#instrument-grid').addEventListener('click', event => {
  const card = event.target.closest('.sound-card'); if (!card) return;
  const v = bank.voices.find(v => v.id === card.dataset.id);
  if (event.target.closest('.heart')) { picks.has(v.id) ? picks.delete(v.id) : picks.add(v.id); savePicks(); renderGrid(); }
  else if (event.target.closest('.card-mute')) { muted.has(v.id) ? muted.delete(v.id) : muted.add(v.id); renderGrid(); }
  else if (event.target.closest('.audition')) audition(v);
});
$('#unmute').addEventListener('click', () => { for (const v of bank.voices) muted.delete(v.id); renderGrid(); toast('All sixteen sounds are back in the mix.'); });
$('#show-picks').addEventListener('click', () => { picksOnly = !picksOnly; updatePickCount(); renderGrid(); });
$('#export-picks').addEventListener('click', () => {
  const selected = BANKS.flatMap(b => b.voices.filter(v => picks.has(v.id)).map(v => ({ set: b.name, id: v.id, name: v.name, role: v.role, reference: v.reference })));
  const blob = new Blob([JSON.stringify({ title: 'Bongo Planet — instrument candidate shortlist', selected }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'Bongo-Planet-Sound-Shortlist.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(selected.length ? `Downloaded ${selected.length} saved sounds.` : 'Downloaded an empty shortlist. Tap hearts to add sounds.');
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop('Paused while the page is away. Press play when you return.'); });
window.addEventListener('pagehide', () => stop());
const canvas = $('#scope'), paint = canvas.getContext('2d'), waveform = new Uint8Array(256);
function draw() {
  const now = engine?.context.currentTime ?? 0;
  for (const event of visualEvents) {
    if (event.time > now) continue;
    if (event.id) activeCards.set(event.id, event.end);
    else {
      document.querySelectorAll('.step').forEach((light, i) => light.classList.toggle('on', i === event.step));
      if (activity === 'groove') $('#bar-label').textContent = `BAR ${event.bar + 1} / 4 · D MINOR`;
    }
  }
  visualEvents = visualEvents.filter(e => e.time > now);
  for (const [id, end] of activeCards) if (end < now) activeCards.delete(id);
  for (const card of document.querySelectorAll('.sound-card')) card.classList.toggle('playing', activeCards.has(card.dataset.id));
  paint.clearRect(0, 0, canvas.width, canvas.height);
  paint.lineWidth = 1; paint.strokeStyle = '#3e4938'; paint.beginPath(); paint.moveTo(0, 45); paint.lineTo(600, 45); paint.stroke();
  if (engine && activity !== 'idle') engine.analyser.getByteTimeDomainData(waveform); else waveform.fill(128);
  paint.strokeStyle = bank.color; paint.lineWidth = 1.8; paint.beginPath();
  for (let i = 0; i < waveform.length; i++) { const x = i / (waveform.length - 1) * 600, y = 45 + (waveform[i] - 128) / 128 * 43; i === 0 ? paint.moveTo(x, y) : paint.lineTo(x, y); }
  paint.stroke(); requestAnimationFrame(draw);
}

selectBank(bank.id); updatePickCount(); requestAnimationFrame(draw);

// Narrow read-only diagnostics for the local acceptance script; no app state is exposed.
window.candidateDiagnostics = { get state() { return { bank: bank.id, activity, epoch, tempo, mode, filter, muted: [...muted], picks: [...picks], context: engine?.context.state ?? 'uninitialized', loadedSamples: engine?.samples.size ?? 0, activeSources: engine?.sources.size ?? 0, history: history.slice(), status: scopedStatus }; } };
