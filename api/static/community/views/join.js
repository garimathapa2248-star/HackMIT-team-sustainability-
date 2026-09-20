import { getMap, extractNote } from '../api.js';
import { T, LANG, LANG_CODES, LEVELS, DEFAULT_LEVEL } from '../strings.js';
import { h, busy, errorBox, pageHeader, langAttr } from './ui.js';

const PHONE = /(\+?\d[\s\-().]*){7,}/; // seven or more digits in a row is treated as a phone number

export default async function join(ctx) {
  const { root, state } = ctx;
  const form = state.form;
  root.append(pageHeader(T.join.title, T.join.lede));
  const body = h('div');
  root.append(body);

  async function ensureMap() {
    if (state.map) return true;
    body.replaceChildren(busy('Loading…'));
    try { state.map = await getMap(); return true; } catch (error) {
      if (ctx.alive()) body.replaceChildren(errorBox(error, () => ensureMap().then((ok) => ok && ctx.alive() && draw())));
      return false;
    }
  }
  if (!(await ensureMap()) || !ctx.alive()) return;
  draw();

  function draw() {
    const errs = h('div', { class: 'error', role: 'alert', hidden: true, tabindex: '-1', id: 'form-errors' });
    const name = h('input', { id: 'f-name', name: 'name', type: 'text', autocomplete: 'given-name', maxlength: '40', 'aria-describedby': 'f-name-h' });
    name.value = form.name;
    const community = h('select', { id: 'f-community', name: 'community' }, h('option', { value: '' }, T.join.communityPlaceholder), state.map.communities.map((c) => h('option', { value: c.id }, c.name)));
    community.value = form.community_id;
    const note = h('textarea', { id: 'f-note', name: 'note', rows: '5', maxlength: '600', 'aria-describedby': 'f-note-h f-note-c' });
    note.value = form.note;
    const count = h('span', { id: 'f-note-c', class: 'muted small' }, T.join.noteCount(form.note.length));
    note.addEventListener('input', () => { count.textContent = T.join.noteCount(note.value.length); });

    const langRows = LANG_CODES.map((code) => {
      const current = form.languages.find((l) => l.code === code);
      const box = h('input', { type: 'checkbox', id: `f-lang-${code}`, name: 'lang', value: code });
      box.checked = Boolean(current);
      const level = h('select', { 'aria-label': `${T.join.level}: ${LANG[code].name}`, disabled: !current }, Object.entries(LEVELS).map(([v, label]) => h('option', { value: v }, label)));
      level.value = String(current?.level ?? DEFAULT_LEVEL);
      box.addEventListener('change', () => { level.disabled = !box.checked; });
      return { code, box, level, row: h('div', { class: 'lang-row' }, h('label', { for: box.id, class: 'check' }, box, h('span', {}, LANG[code].name, ' ', h('span', { class: 'native', lang: langAttr(code) }, LANG[code].native))), level) };
    });

    const submit = h('button', { class: 'btn primary big', type: 'submit' }, T.join.submit);
    const status = h('div', { 'aria-live': 'polite' });

    const formEl = h(
      'form',
      { class: 'card form', novalidate: true },
      errs,
      h('div', { class: 'field' }, h('label', { for: 'f-name' }, T.join.name), name, h('p', { class: 'help', id: 'f-name-h' }, T.join.nameHelp)),
      h('div', { class: 'field' }, h('label', { for: 'f-community' }, T.join.community), community, h('p', { class: 'help' }, T.join.communityHelp)),
      h('fieldset', { class: 'field' }, h('legend', {}, T.join.languages), h('p', { class: 'help' }, T.join.languagesHelp), langRows.map((r) => r.row)),
      h('div', { class: 'field' }, h('label', { for: 'f-note' }, T.join.note), h('p', { class: 'help', id: 'f-note-h' }, T.join.noteHelp), note, count),
      h('div', { class: 'row' }, submit),
      h('p', { class: 'muted small' }, T.join.privacy),
      status
    );

    function collect() {
      form.name = name.value.trim();
      form.community_id = community.value;
      form.languages = langRows.filter((r) => r.box.checked).map((r) => ({ code: r.code, level: Number(r.level.value) }));
      form.note = note.value;
    }
    function problems() {
      const list = [];
      if (form.name.length < 2 || form.name.length > 40) list.push([name, T.join.errName]);
      if (!form.community_id) list.push([community, T.join.errCommunity]);
      if (form.languages.length === 0) list.push([langRows[0].box, T.join.errLanguages]);
      if (form.note.length > 500) list.push([note, T.join.errNoteLong]);
      else if (PHONE.test(form.note)) list.push([note, T.join.errNotePhone]);
      return list;
    }

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      collect();
      const list = problems();
      if (list.length) {
        errs.hidden = false;
        errs.replaceChildren(h('p', {}, list.length === 1 ? 'One thing to fix:' : 'A few things to fix:'), h('ul', {}, list.map(([field, text]) => h('li', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); field.focus(); } }, text)))));
        errs.focus();
        return;
      }
      errs.hidden = true;
      if (!form.note.trim()) return proceed({ offers: [], needs: [], topics: [], language: null, confidence: 0, source: 'none' });

      submit.disabled = true;
      status.replaceChildren(busy(T.join.reading));
      try {
        const extraction = await extractNote(form.note.trim());
        if (!ctx.alive()) return;
        proceed(extraction);
      } catch (error) {
        if (!ctx.alive()) return;
        submit.disabled = false;
        // Muse failing must never block joining: offer a way through.
        status.replaceChildren(
          errorBox(T.join.readFailed, () => formEl.requestSubmit(), h('button', { class: 'btn', type: 'button', onclick: () => proceed({ offers: [], needs: [], topics: [], language: null, confidence: 0, source: 'fallback' }) }, T.join.skipReading))
        );
      }
    });

    function proceed(extraction) {
      state.extraction = extraction;
      state.chosen = null;
      ctx.go('#/confirm');
    }

    body.replaceChildren(formEl);
  }
}
