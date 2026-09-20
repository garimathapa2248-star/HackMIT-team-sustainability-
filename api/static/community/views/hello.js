import { draftHello, sendMessage } from '../api.js';
import { T } from '../strings.js';
import { h, busy, errorBox, pageHeader, museTag, langAttr } from './ui.js';

export default async function hello(ctx) {
  const { root, state, store } = ctx;
  const join = state.join;
  const memberId = store.get('member_id');
  const roomId = store.get('room_id');
  const [communityId] = ctx.params;
  const target = join?.matches.find((m) => m.community_id === communityId);
  if (!join || !memberId || !roomId || !target) return ctx.go('#/neighbors');

  root.append(pageHeader(T.hello.title(target.name), T.hello.lede));
  if (target.no_shared_language) root.append(h('p', { class: 'note' }, T.hello.noSharedNote));
  const body = h('div');
  root.append(body);

  let draft = null;

  async function load() {
    body.replaceChildren(busy(T.hello.writing));
    try {
      draft = await draftHello(memberId, communityId);
      if (!ctx.alive()) return;
      form(draft.text, draft.language, museTag(T.hello.museTag, draft.mock));
    } catch (error) {
      if (!ctx.alive()) return;
      draft = null;
      // Muse failing must not block the person: they can write their own.
      body.replaceChildren(errorBox(T.hello.failed, load, null));
      body.append(formNode('', join.group_language || state.form.languages[0]?.code || 'eng', null));
    }
  }

  function form(text, language, tag) {
    body.replaceChildren(formNode(text, language, tag));
  }

  function formNode(text, language, tag) {
    const area = h('textarea', { id: 'msg', rows: '8', maxlength: '1000', lang: langAttr(language), 'aria-describedby': 'msg-h' });
    area.value = text;
    const status = h('div', { 'aria-live': 'polite' });
    const send = h('button', { class: 'btn primary big', type: 'submit' }, T.hello.send);
    const el = h('form', { class: 'card form', novalidate: true },
      tag && h('p', {}, tag),
      h('div', { class: 'field' }, h('label', { for: 'msg' }, T.hello.label), h('p', { class: 'help', id: 'msg-h' }, draft ? 'You can change anything here.' : ''), area),
      h('div', { class: 'row' }, send, draft && h('button', { class: 'btn', type: 'button', onclick: load }, T.hello.retryDraft), h('a', { class: 'btn', href: '#/neighbors' }, T.back)),
      status
    );
    el.addEventListener('submit', async (event) => {
      event.preventDefault();
      const value = area.value.trim();
      if (!value) { status.replaceChildren(errorBox(T.hello.empty)); area.focus(); return; }
      send.disabled = true;
      status.replaceChildren(busy(T.hello.sending));
      try {
        await sendMessage(roomId, memberId, value, language);
        if (!ctx.alive()) return;
        ctx.go(`#/room/${encodeURIComponent(roomId)}`);
      } catch (error) {
        if (!ctx.alive()) return;
        send.disabled = false;
        status.replaceChildren(errorBox(error, () => el.requestSubmit()));
      }
    });
    return el;
  }

  load();
}
