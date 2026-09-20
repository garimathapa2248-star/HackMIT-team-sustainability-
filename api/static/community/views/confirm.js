import { joinHub } from '../api.js';
import { T, TAGS, TAG_LABEL, TOPICS, TOPIC_LABEL } from '../strings.js';
import { h, chip, busy, errorBox, pageHeader, museTag } from './ui.js';

export default async function confirm(ctx) {
  const { root, state, store } = ctx;
  const { form, extraction } = state;
  if (!extraction || !form.community_id) return ctx.go('#/join');
  if (!state.chosen) {
    state.chosen = { offers: [...extraction.offers], needs: [...extraction.needs], topics: [...extraction.topics] };
  }
  const chosen = state.chosen;

  const src = extraction.source;
  const nothingRead = !extraction.offers.length && !extraction.needs.length && !extraction.topics.length;
  let museLine = null;
  if (src === 'none') museLine = T.confirm.museEmpty;
  else if (src === 'fallback' || nothingRead) museLine = T.confirm.museFallback;
  const unsure = src === 'muse' && extraction.confidence > 0 && extraction.confidence < 0.5;

  root.append(pageHeader(T.confirm.title, T.confirm.lede));
  root.append(
    h(
      'section',
      { class: 'card muse-card', 'aria-label': T.confirm.museRead },
      h('p', {}, museTag(museLine ? 'Muse' : T.confirm.museRead, src === 'muse' && extraction.mock)),
      museLine && h('p', {}, museLine),
      extraction.confidence > 0 && h('p', {}, `${T.confirm.confidence}: ${Math.round(extraction.confidence * 100)}% `, chip('model')),
      unsure && h('p', { class: 'note' }, T.confirm.museUnsure)
    )
  );

  const group = (key, legend, vocab, labels) =>
    h(
      'fieldset',
      { class: 'card field' },
      h('legend', {}, legend),
      h('div', { class: 'tag-grid' }, vocab.map((tag) => {
        const box = h('input', { type: 'checkbox', value: tag });
        box.checked = chosen[key].includes(tag);
        box.addEventListener('change', () => {
          chosen[key] = box.checked ? [...new Set([...chosen[key], tag])] : chosen[key].filter((t) => t !== tag);
        });
        return h('label', { class: 'tag' }, box, h('span', {}, labels[tag]));
      }))
    );

  const status = h('div', { 'aria-live': 'polite' });
  const submit = h('button', { class: 'btn primary big', type: 'button' }, T.confirm.submit);

  async function send() {
    submit.disabled = true;
    status.replaceChildren(busy(T.confirm.finding));
    try {
      const result = await joinHub({
        name: form.name,
        community_id: form.community_id,
        languages: form.languages,
        offers: chosen.offers,
        needs: chosen.needs,
        topics: chosen.topics,
      }); // the note is NOT sent: only what the person confirmed
      if (!ctx.alive()) return;
      state.join = result;
      store.set('member_id', result.member_id);
      store.set('room_id', result.room_id);
      form.note = ''; // the note is not kept anywhere once it has been read
      ctx.go('#/neighbors');
    } catch (error) {
      if (!ctx.alive()) return;
      submit.disabled = false;
      status.replaceChildren(errorBox(error, send));
    }
  }
  submit.addEventListener('click', send);

  root.append(
    group('offers', T.confirm.offers, TAGS, TAG_LABEL),
    group('needs', T.confirm.needs, TAGS, TAG_LABEL),
    group('topics', T.confirm.topics, TOPICS, TOPIC_LABEL),
    h('div', { class: 'row sticky-actions' }, submit, h('a', { class: 'btn', href: '#/join' }, T.confirm.edit)),
    status
  );
}
