import { getMap } from '../api.js';
import { T } from '../strings.js';
import { renderMap, mapKey } from '../map.js';
import { h, chip, busy, errorBox, pageHeader, langName } from './ui.js';

// Which honesty chip a "why this rank" fact wears. Things people told us are self-reported; the rest are estimates.
const factChip = (fact) => (fact.self_reported ? chip('self') : fact.component === 'P' ? chip('assumption') : chip('model'));

export default async function neighbors(ctx) {
  const { root, state } = ctx;
  const join = state.join;
  if (!join) return ctx.go('#/join');

  root.append(pageHeader(T.neighbors.title, T.neighbors.lede));
  const mapBox = h('div', { class: 'map-card' }, busy('Loading the map…'));
  const list = h('ol', { class: 'match-list' });

  const groupLine = join.group_language ? T.neighbors.groupLanguage(langName(join.group_language)) : T.neighbors.noGroupLanguage;
  const nearName = join.hub?.near;

  const cards = new Map();
  for (const m of join.matches) {
    const languageLine = m.no_shared_language
      ? h('p', { class: 'lang-gap' }, T.neighbors.noShared)
      : h('p', { class: 'muted' }, T.neighbors.shared(m.shared_languages.map(langName).join(', ')));
    const card = h(
      'li',
      { class: `card match${m.no_shared_language ? ' is-gap' : ''}`, id: `match-${m.community_id}` },
      h('div', { class: 'match-top' },
        h('h3', {}, m.name),
        h('p', { class: 'score' }, h('span', { class: 'score-n' }, m.score), ' ', h('span', { class: 'muted small' }, `${T.neighbors.score} ${T.neighbors.scoreNote}`), ' ', chip('model'))
      ),
      languageLine,
      h('details', { class: 'why' }, h('summary', {}, T.neighbors.whyRanked), h('ul', {}, m.facts.map((f) => h('li', {}, f.fact, ' ', factChip(f))))),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: `#/hello/${encodeURIComponent(m.community_id)}`, 'aria-label': `${T.neighbors.hello}: ${m.name}` }, T.neighbors.hello))
    );
    cards.set(m.community_id, card);
    list.append(card);
  }

  const highlight = (id) => {
    const card = cards.get(id);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 1400);
    card.querySelector('a')?.focus({ preventScroll: true });
  };

  root.append(
    h('div', { class: 'two-col' },
      h('section', { class: 'col-map', 'aria-labelledby': 'nm' }, h('h2', { id: 'nm' }, T.neighbors.mapTitle), mapBox,
        join.hub && h('div', { class: 'card hub-card' },
          h('h3', {}, T.neighbors.hubTitle),
          h('p', {}, T.neighbors.hubBody(nearName)),
          h('p', {}, `${T.neighbors.hubWalk}: `, h('strong', {}, T.neighbors.minutes(join.hub.walk_minutes)), ' ', chip('assumption'), h('span', { class: 'muted small' }, ' at an easy walking pace'))
        )
      ),
      h('section', { class: 'col-list', 'aria-label': 'Ranked neighbors' },
        h('p', { class: 'note' }, groupLine),
        h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/room/${encodeURIComponent(join.room_id)}` }, T.neighbors.room), h('span', { class: 'muted small' }, T.neighbors.roomNote)),
        list
      )
    )
  );

  async function drawMap() {
    try {
      if (!state.map) state.map = await getMap();
      if (!ctx.alive()) return;
      mapBox.replaceChildren(renderMap({ map: state.map, homeId: state.form.community_id, matches: join.matches, hub: join.hub, onSelect: highlight }), mapKey({ withHub: Boolean(join.hub), withRanks: true }));
    } catch (error) {
      if (ctx.alive()) mapBox.replaceChildren(errorBox(error, () => { mapBox.replaceChildren(busy('Loading the map…')); drawMap(); }));
    }
  }
  drawMap();
}
