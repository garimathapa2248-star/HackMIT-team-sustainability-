// Router and state. Hash routes, so it works from any static host with no server rules.
//
// What we keep, and where:
//   sessionStorage : ONLY member_id and room_id. Nothing else, ever. Never the note.
//   memory         : everything else (form, what Muse read, the match results). It disappears on reload.
import { T } from './strings.js';
import { h, busy } from './views/ui.js';
import land from './views/land.js';
import join from './views/join.js';
import confirm from './views/confirm.js';
import neighbors from './views/neighbors.js';
import hello from './views/hello.js';
import room from './views/room.js';
import plan from './views/plan.js';

const KEYS = ['member_id', 'room_id'];
export const store = {
  get(key) {
    try { return KEYS.includes(key) ? sessionStorage.getItem(key) : null; } catch { return null; }
  },
  set(key, value) {
    try { if (KEYS.includes(key)) sessionStorage.setItem(key, value); } catch { /* storage blocked: the app still works this tab */ }
  },
  clear() {
    try { KEYS.forEach((key) => sessionStorage.removeItem(key)); } catch { /* ignore */ }
  },
};

export const state = {
  map: null, //         GET /community/map
  form: { name: '', community_id: '', languages: [], note: '' },
  extraction: null, //  what Muse read
  chosen: null, //      the tags the person confirmed
  join: null, //        the join response (matches, hub, group_language)
};

function resetAll() {
  store.clear();
  state.form = { name: '', community_id: '', languages: [], note: '' };
  state.extraction = null;
  state.chosen = null;
  state.join = null;
}

// [pattern, view, step shown in the progress bar, page title]
const ROUTES = [
  [/^#?\/?$/, land, null, 'Community hub'],
  [/^#\/join$/, join, 'join', 'Tell us about you'],
  [/^#\/confirm$/, confirm, 'confirm', 'Check what Muse read'],
  [/^#\/neighbors$/, neighbors, 'neighbors', 'Neighbors'],
  [/^#\/hello\/([^/]+)$/, hello, 'neighbors', 'Say hello'],
  [/^#\/room\/([^/]+)\/plan$/, plan, 'plan', 'Plan'],
  [/^#\/room\/([^/]+)$/, room, 'room', 'Room'],
];
const ORDER = ['join', 'confirm', 'neighbors', 'room', 'plan'];

// "Overview" button: back to the dashboard. The dashboard passes ?from=<its address> when it opens the hub;
// failing that we use the page we came from, then the dashboard's usual dev address.
(function setBackLink() {
  const safe = (value) => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin : null; } catch { return null; } };
  const origin = safe(new URLSearchParams(location.search).get('from')) || safe(document.referrer) || 'http://localhost:5173';
  document.getElementById('back-link').href = `${origin}/#overview`;
})();

const root = document.getElementById('main');
const live = document.getElementById('live');
const stepsNav = document.getElementById('steps');
let leave = []; //  cleanup functions for the screen we are leaving (timers, listeners)
let token = 0; //   lets an old screen notice it has been replaced while it was waiting on the network

export const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};
const announce = (text) => { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); };

function renderSteps(current) {
  stepsNav.hidden = !current;
  if (!current) return;
  stepsNav.replaceChildren(
    h(
      'ol',
      {},
      ORDER.map((key, i) => {
        const done = ORDER.indexOf(current) > i;
        return h('li', { class: `${key === current ? 'current' : ''} ${done ? 'done' : ''}`, 'aria-current': key === current ? 'step' : null }, h('span', { class: 'n', 'aria-hidden': 'true' }, done ? '✓' : i + 1), h('span', {}, T.steps[key]), done && h('span', { class: 'sr-only' }, ' (done)'));
      })
    )
  );
}

async function render() {
  leave.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  leave = [];
  const mine = ++token;
  const hash = location.hash || '#/';
  const found = ROUTES.map(([re, view, step, title]) => [re.exec(hash), view, step, title]).find(([m]) => m);
  root.replaceChildren();
  window.scrollTo(0, 0);

  if (!found) {
    root.append(h('section', { class: 'card' }, h('h1', { tabindex: '-1' }, T.errors.unknown), h('a', { class: 'btn primary', href: '#/' }, 'Go to the start')));
    root.querySelector('h1').focus();
    return;
  }
  const [match, view, step, title] = found;
  document.title = `${title} · ${T.brandSub} · ${T.brand}`;
  renderSteps(step);
  root.append(busy('Loading…'));

  const ctx = {
    root,
    state,
    store,
    go,
    resetAll,
    announce,
    params: match.slice(1).map((part) => decodeURIComponent(part)),
    alive: () => mine === token,
    onLeave: (fn) => leave.push(fn),
  };
  try {
    root.replaceChildren();
    await view(ctx);
  } catch (error) {
    if (!ctx.alive()) return;
    console.error(error);
    root.replaceChildren(h('section', { class: 'card' }, h('h1', { tabindex: '-1' }, T.errors.generic), h('a', { class: 'btn', href: '#/' }, T.startOver)));
  }
  if (ctx.alive()) {
    const heading = root.querySelector('h1');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    announce(document.title);
  }
}

document.getElementById('skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  root.focus();
});
window.addEventListener('hashchange', render);
render();
