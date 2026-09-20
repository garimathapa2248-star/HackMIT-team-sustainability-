// Small helpers shared by every screen. All content goes in as text nodes, never as HTML.
import { CHIP, CHIP_HELP, LANG, T } from '../strings.js';

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  add(el, kids);
  return el;
}
export function add(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/** Honesty chip: observed | model | assumption | simulation | self | sample. The words carry the meaning, not the colour. */
export const chip = (kind, text) => h('span', { class: `chip chip-${kind}`, title: CHIP_HELP[kind] }, text ?? CHIP[kind]);

export const busy = (text) => h('div', { class: 'busy', role: 'status' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), h('span', {}, text));

export function errorMessage(error) {
  if (error?.kind === 'offline') return T.errors.offline;
  if (error?.kind === 'timeout') return T.errors.timeout;
  if (error?.status === 422 && error.message) return error.message; // validation messages are written for people
  return T.errors.generic;
}
export function errorBox(error, onRetry, extra) {
  return h(
    'div',
    { class: 'error', role: 'alert' },
    h('p', {}, typeof error === 'string' ? error : errorMessage(error)),
    h('div', { class: 'row' }, onRetry && h('button', { class: 'btn', type: 'button', onclick: onRetry }, T.errors.retry), extra)
  );
}

export const langName = (code) => LANG[code]?.name ?? code;
export const langAttr = (code) => LANG[code]?.bcp47 ?? 'en';

export function pageHeader(title, lede) {
  return h('header', { class: 'page-head' }, h('h1', { tabindex: '-1' }, title), lede && h('p', { class: 'lede' }, lede));
}

/** "Muse" attribution. Shows which job Muse did, and says "simulated" when the answer came from the mock. */
export function museTag(job, simulated) {
  return h('span', { class: 'muse-tag' }, h('span', { class: 'muse-dot', 'aria-hidden': 'true' }), `${job}`, simulated && chip('simulation', 'simulated'));
}
