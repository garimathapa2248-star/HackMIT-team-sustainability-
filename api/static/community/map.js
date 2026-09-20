// The map is drawn from data, as SVG. No tiles and no network. Each cell is a rectangle coloured by its risk.
import { h, chip } from './views/ui.js';

const CELL = 30;
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const kid of kids) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
};

// Single-hue ramp from --risk-0 to --risk-1. The ramp is redrawn here so the SVG needs no CSS variables to print.
const from = [241, 234, 217];
const to = [164, 72, 44];
const riskColor = (risk) => {
  const t = Math.max(0, Math.min(1, risk));
  return `rgb(${from.map((f, i) => Math.round(f + (to[i] - f) * t)).join(',')})`;
};

/**
 * renderMap({ map, homeId, matches, hub, onSelect })
 *  - homeId: the person's community (drawn solid, labelled "You")
 *  - matches: ranked matches; drawn with their rank number
 *  - hub: { c, r, near } the proposed shared hub
 *  - onSelect(communityId): called when a community is clicked or Enter is pressed on it
 */
export function renderMap({ map, homeId, matches = [], hub, onSelect } = {}) {
  const width = map.cols * CELL;
  const height = map.rows * CELL;
  const rank = new Map(matches.map((m, i) => [m.community_id, i + 1]));
  const description = homeId
    ? 'A sample map of landslide risk. Darker squares are higher risk. Your community, its ranked neighbors and a proposed hub are marked. The same information is in the list next to the map.'
    : 'A sample map of landslide risk. Darker squares are higher risk. Communities are marked with circles.';

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'map-svg', role: 'img', 'aria-label': description, preserveAspectRatio: 'xMidYMid meet' });
  const cells = svg('g', { 'aria-hidden': 'true' });
  for (const cell of map.cells) {
    cells.append(svg('rect', { x: cell.c * CELL, y: cell.r * CELL, width: CELL, height: CELL, fill: riskColor(cell.risk), stroke: '#f4f2ed', 'stroke-width': 0.5 }));
  }
  root.append(cells);

  const marks = svg('g');
  const center = (c, r) => [c * CELL + CELL / 2, r * CELL + CELL / 2];
  for (const community of map.communities) {
    const [x, y] = center(community.c, community.r);
    const isHome = community.id === homeId;
    const n = rank.get(community.id);
    const group = svg('g', {
      class: `map-community${isHome ? ' is-home' : ''}${n ? ' is-match' : ''}`,
      'data-id': community.id,
      tabindex: onSelect ? '0' : null,
      role: onSelect ? 'button' : null,
      'aria-label': onSelect ? `${community.name}${isHome ? ', your community' : n ? `, rank ${n}` : ''}` : null,
    });
    group.append(svg('title', {}, community.name));
    group.append(svg('circle', { cx: x, cy: y, r: isHome ? 14 : 12, class: 'dot' }));
    if (n) group.append(svg('text', { x, y: y + 5.5, class: 'dot-num', 'text-anchor': 'middle' }, n));
    if (isHome) group.append(svg('text', { x, y: y + 5.5, class: 'dot-num', 'text-anchor': 'middle' }, '★'));
    group.append(svg('text', { x, y: y + 32, class: 'dot-label', 'text-anchor': 'middle' }, community.name));
    if (onSelect) {
      group.addEventListener('click', () => onSelect(community.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(community.id);
        }
      });
    }
    marks.append(group);
  }
  if (hub) {
    const [x, y] = center(hub.c, hub.r);
    const group = svg('g', { class: 'map-hub' });
    group.append(svg('title', {}, `Proposed shared hub, near ${hub.near}`));
    group.append(svg('path', { d: `M ${x} ${y - 16} L ${x + 16} ${y} L ${x} ${y + 16} L ${x - 16} ${y} Z`, class: 'hub-shape' }));
    group.append(svg('text', { x, y: y + 5.5, class: 'dot-num', 'text-anchor': 'middle' }, 'H'));
    group.append(svg('text', { x, y: y - 20, class: 'dot-label', 'text-anchor': 'middle' }, 'Proposed hub'));
    marks.append(group);
  }
  root.append(marks);
  return root;
}

/** The key. Says what colours and shapes mean, and what kind of number the risk is. */
export function mapKey({ withHub = false, withRanks = false } = {}) {
  return h(
    'div',
    { class: 'map-key' },
    h('div', { class: 'key-ramp' }, h('span', {}, 'Lower risk'), h('span', { class: 'ramp', 'aria-hidden': 'true' }), h('span', {}, 'Higher risk'), chip('model', 'model output')),
    h(
      'ul',
      { class: 'key-list' },
      h('li', {}, h('span', { class: 'key-dot' }), ' Community'),
      withRanks && h('li', {}, h('span', { class: 'key-dot home' }), ' ★ Your community; numbers show rank'),
      withHub && h('li', {}, h('span', { class: 'key-diamond' }), ' H Proposed hub')
    )
  );
}
