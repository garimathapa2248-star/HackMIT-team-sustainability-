import { getMessages, sendMessage, reportMessage } from '../api.js';
import { T } from '../strings.js';
import { h, chip, errorBox, pageHeader, langName, langAttr } from './ui.js';

const BASE_MS = 2000; // poll every 2 seconds
const MAX_MS = 16000; // ...backing off to 16 s while the service is failing

export default async function room(ctx) {
  const { root, state, store } = ctx;
  const memberId = store.get('member_id');
  const [roomId] = ctx.params;
  if (!memberId) return ctx.go('#/join');
  store.set('room_id', roomId);

  const join = state.join;
  const myName = state.form.name;
  const sharedLine = join ? (join.group_language ? T.room.sharedLanguage(langName(join.group_language)) : T.room.noSharedLanguage) : null;

  const status = h('span', { class: 'live-status', role: 'status' }, T.room.live);
  const log = h('div', { class: 'log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Messages' });
  const empty = h('p', { class: 'muted empty' }, T.room.empty);
  log.append(empty);
  const sendStatus = h('div', { 'aria-live': 'polite' });

  const area = h('textarea', { id: 'compose', rows: '3', maxlength: '1000' });
  const sendBtn = h('button', { class: 'btn primary', type: 'submit' }, T.room.send);
  const composer = h('form', { class: 'card composer', novalidate: true }, h('label', { for: 'compose' }, T.room.compose), area, h('div', { class: 'row' }, sendBtn), sendStatus);

  root.append(
    pageHeader(T.room.title, T.room.lede),
    h('div', { class: 'room-bar' }, sharedLine && h('span', { class: 'muted' }, sharedLine), status, h('a', { class: 'btn', href: `#/room/${encodeURIComponent(roomId)}/plan` }, T.room.draftPlan)),
    log,
    composer
  );

  // ---- message list ----------------------------------------------------------------------------------------------
  const seen = new Set();
  let lastId = 0;

  function messageNode(m) {
    const mine = m.author_name === myName && !m.simulated;
    const reportBtn = !mine && h('button', { class: 'link', type: 'button' }, T.room.report);
    const node = h('article', { class: `msg${mine ? ' mine' : ''}${m.simulated ? ' sim' : ''}` },
      h('header', {}, h('strong', {}, mine ? T.room.you : m.author_name), ' ', h('span', { class: 'muted' }, `· ${m.community_name}`), ' ', m.simulated && chip('simulation', T.room.simulated), ' ', h('time', { datetime: m.ts, class: 'muted small' }, new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))),
      h('p', { lang: langAttr(m.language) }, m.text),
      reportBtn
    );
    if (reportBtn) {
      reportBtn.addEventListener('click', async () => {
        reportBtn.disabled = true;
        try { await reportMessage(roomId, m.id, memberId); reportBtn.replaceWith(h('span', { class: 'muted small' }, T.room.reported)); }
        catch { reportBtn.disabled = false; }
      });
    }
    return node;
  }

  function addMessages(messages) {
    const fresh = messages.filter((m) => !seen.has(m.id));
    if (!fresh.length) return;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
    empty.remove();
    for (const m of fresh) {
      seen.add(m.id);
      lastId = Math.max(lastId, m.id);
      log.append(messageNode(m));
    }
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  // ---- polling: every 2 s, paused while the tab is hidden, exponential backoff on failure --------------------------
  let timer = null;
  let failures = 0;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(poll, Math.min(BASE_MS * 2 ** failures, MAX_MS));
  };
  async function poll() {
    if (stopped) return;
    if (document.hidden) { status.textContent = T.room.paused; return; } // resumes from the visibilitychange handler
    try {
      const { messages } = await getMessages(roomId, lastId);
      if (stopped) return;
      failures = 0;
      status.textContent = T.room.live;
      addMessages(messages);
    } catch (error) {
      if (stopped) return;
      if (error?.status === 404) {
        stopped = true;
        root.replaceChildren(pageHeader(T.errors.gone), h('a', { class: 'btn primary', href: '#/join', onclick: () => ctx.resetAll() }, T.startOver));
        root.querySelector('h1')?.focus();
        return;
      }
      failures += 1;
      status.textContent = T.room.reconnecting;
    }
    schedule();
  }
  const onVisible = () => { if (!document.hidden && !stopped) { clearTimeout(timer); poll(); } };
  document.addEventListener('visibilitychange', onVisible);
  ctx.onLeave(() => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); });

  // ---- sending -------------------------------------------------------------------------------------------------------
  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = area.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    sendBtn.textContent = T.room.sending;
    sendStatus.replaceChildren();
    try {
      const language = join?.group_language || state.form.languages[0]?.code || 'eng';
      const result = await sendMessage(roomId, memberId, text, language);
      if (stopped) return;
      area.value = '';
      if (result?.message) addMessages([result.message]);
      clearTimeout(timer);
      poll();
    } catch (error) {
      if (!stopped) sendStatus.replaceChildren(errorBox(T.room.sendFailed));
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = T.room.send;
    }
  });

  await poll();
}
