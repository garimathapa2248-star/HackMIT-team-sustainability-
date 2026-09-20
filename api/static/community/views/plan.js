import { getRoomPlan, synthesizePlan, agreeToPlan } from '../api.js';
import { T } from '../strings.js';
import { h, chip, busy, errorBox, pageHeader, museTag, langAttr } from './ui.js';

export default async function plan(ctx) {
  const { root, state, store } = ctx;
  const memberId = store.get('member_id');
  const [roomId] = ctx.params;
  if (!memberId) return ctx.go('#/join');

  let current = null; // { plan, language, mock }
  let iAgreed = false;
  let stopped = false;
  let timer = null;
  let failures = 0;
  ctx.onLeave(() => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); });

  root.append(pageHeader(T.plan.title, T.plan.lede));
  const body = h('div');

  // The agreement panel is built ONCE. Polling only changes its status text, so keyboard focus never jumps.
  const agreeBtn = h('button', { class: 'btn primary big', type: 'button' }, T.plan.agree);
  const agreeStatus = h('div', { class: 'agree-status', role: 'status', 'aria-live': 'polite', tabindex: '-1' });
  const agreeError = h('div');
  const tallyBox = h('section', { class: 'card agree', 'aria-labelledby': 'agree-h' },
    h('h2', { id: 'agree-h' }, T.plan.agreeTitle), h('p', {}, T.plan.agreeBody), h('div', { class: 'row' }, agreeBtn), agreeError, agreeStatus);
  root.append(body);

  agreeBtn.addEventListener('click', async () => {
    agreeBtn.disabled = true;
    agreeBtn.textContent = T.plan.agreeing;
    agreeError.replaceChildren();
    try {
      const result = await agreeToPlan(roomId, memberId);
      if (stopped) return;
      iAgreed = true;
      showTally(result);
      agreeStatus.focus(); // the button just disabled itself: put keyboard focus somewhere sensible
    } catch (error) {
      if (stopped) return;
      agreeBtn.disabled = false;
      agreeBtn.textContent = T.plan.agree;
      agreeError.replaceChildren(errorBox(error, () => agreeBtn.click()));
    }
  });

  function showTally(t) {
    agreeBtn.textContent = iAgreed ? T.plan.agreed : T.plan.agree;
    agreeBtn.disabled = iAgreed;
    agreeStatus.replaceChildren(
      t && h('p', {}, h('strong', {}, T.plan.tally(t.agreed, t.total)), ' ', chip('observed', 'recorded')),
      t && (t.established ? h('p', { class: 'ok' }, T.plan.established) : h('p', { class: 'muted' }, T.plan.notYet)),
      t && t.simulated_agreed > 0 && h('p', { class: 'muted small' }, chip('simulation'), ' ', T.plan.simulatedAgreed(t.simulated_agreed))
    );
  }

  // Is there already a plan? (the proposed GET; if the service lacks it, we simply offer to draft one)
  try {
    const existing = await getRoomPlan(roomId);
    if (!ctx.alive()) return;
    if (existing?.plan) current = existing;
  } catch { if (!ctx.alive()) return; }
  draw();

  function draw() {
    if (!current) {
      body.replaceChildren(h('div', { class: 'card' }, h('p', {}, museTag('Muse drafts the plan')), h('button', { class: 'btn primary big', type: 'button', onclick: draft }, T.plan.draftCta)));
      return;
    }
    const p = current.plan;
    const hub = state.join?.hub;
    body.replaceChildren(
      h('article', { class: 'card plan-card' },
        h('p', {}, museTag(T.plan.museTag, current.mock)),
        h('dl', { lang: langAttr(current.language) },
          h('dt', {}, T.plan.where), h('dd', {}, p.where),
          h('dt', {}, T.plan.when), h('dd', {}, p.when),
          h('dt', {}, T.plan.who), h('dd', {}, h('ul', { class: 'who' }, p.items.map((it) => h('li', {}, h('strong', {}, it.who), ': ', it.brings)))),
          h('dt', {}, T.plan.summary), h('dd', {}, p.summary)),
        hub && h('p', { class: 'muted' }, `${T.plan.walk}: `, h('strong', {}, T.neighbors.minutes(hub.walk_minutes)), ' ', chip('assumption')),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: draft }, T.plan.redraft), h('a', { class: 'btn', href: `#/room/${encodeURIComponent(roomId)}` }, T.plan.backToRoom))
      ),
      tallyBox
    );
    poll();
  }

  async function draft() {
    body.replaceChildren(busy(T.plan.drafting));
    try {
      current = await synthesizePlan(roomId, memberId);
      if (!ctx.alive()) return;
      draw();
    } catch (error) {
      if (ctx.alive()) body.replaceChildren(errorBox(error, draft));
    }
  }

  // Refresh the tally every 3 s (paused while hidden; backs off on failure). Uses the proposed GET endpoint.
  async function poll() {
    clearTimeout(timer);
    if (stopped) return;
    if (!document.hidden) {
      try {
        const t = await getRoomPlan(roomId);
        if (stopped) return;
        failures = 0;
        if (t && typeof t.agreed === 'number') showTally(t);
      } catch { failures += 1; }
    }
    if (failures < 6) timer = setTimeout(poll, Math.min(3000 * 2 ** failures, 24000));
  }
  function onVisible() { if (!document.hidden && !stopped && current) poll(); }
  document.addEventListener('visibilitychange', onVisible);
}
