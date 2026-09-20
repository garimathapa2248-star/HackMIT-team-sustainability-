import { getMap } from '../api.js';
import { T } from '../strings.js';
import { renderMap, mapKey } from '../map.js';
import { h, busy, errorBox, museTag } from './ui.js';

export default async function land(ctx) {
  const { root, state } = ctx;
  const mapBox = h('div', { class: 'map-card' });

  root.append(
    h(
      'section',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, T.land.eyebrow),
      h('h1', {}, ...T.land.titleParts.map((part, i) => (i % 2 ? h('em', {}, part) : part))),
      h('p', { class: 'lede' }, T.land.lede),
      h('div', { class: 'row' }, h('a', { class: 'btn primary big', href: '#/join' }, T.land.cta))
    ),
    h('section', { class: 'how', 'aria-labelledby': 'how-h' }, h('h2', { id: 'how-h' }, T.land.how), h('ol', { class: 'how-list' }, T.land.steps.map((step, i) => h('li', { class: 'card' }, h('span', { class: 'how-n', 'aria-hidden': 'true' }, i + 1), h('h3', {}, step.title), h('p', {}, step.body), h('p', {}, museTag(step.muse)))))),
    h('p', { class: 'note' }, T.land.museNote),
    h('section', { 'aria-labelledby': 'map-h' }, h('h2', { id: 'map-h' }, T.land.mapTitle), h('p', { class: 'muted' }, T.land.mapNote), mapBox)
  );

  async function load() {
    mapBox.replaceChildren(busy('Loading the sample map…'));
    try {
      const map = await getMap();
      if (!ctx.alive()) return;
      state.map = map;
      mapBox.replaceChildren(renderMap({ map }), mapKey());
    } catch (error) {
      if (ctx.alive()) mapBox.replaceChildren(errorBox(error, load));
    }
  }
  load();
}
