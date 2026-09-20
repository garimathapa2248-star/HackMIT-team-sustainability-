// api.js: the ONLY file the screens talk to.
//
// Every function below returns the same shape whether it calls the real API or the mock. To switch to
// the real backend, load the page with ?mock=0 (or change MOCK below). When a real endpoint differs from
// the contract, adapt it HERE, in one place, and nothing else has to change.
//
// The mock is deliberately honest: everything it returns carries `mock: true`, and every seeded person
// or reply is flagged so the UI can label it "simulated". No numbers come from any AI: the mock computes
// scores, distances and counts from fixture data, exactly as the real API will.

import { LANG_CODES, TAGS, TOPICS, labelOf } from './strings.js';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const config = {
  MOCK: params.get('mock') !== '0', //         default true: no backend needed
  delayScale: params.has('fast') ? 0.1 : 1, //  ?fast=1 makes the mock delays 10x shorter
  demo: params.get('demo') !== '0', //          simulated neighbors reply in the room (labeled simulated). ?demo=0 turns them off
  replyLanguage: params.get('lang') === 'npi' ? 'npi' : 'eng', // ?lang=npi: simulated replies in Nepali
  fail: params.get('fail') || null, //          ?fail=extract makes that call always fail (test error states)
  failOnce: params.get('failonce') || null, //  ?failonce=join fails only the first call (test "retry")
};
export const MOCK = config.MOCK;

export class ApiError extends Error {
  // kind: 'offline' | 'timeout' | 'http'
  constructor(kind, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------------------------------
// The real client. The page and the API are served by the same FastAPI app, so URLs are same-origin.
// ---------------------------------------------------------------------------------------------------
async function http(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch (error) {
    throw new ApiError(error?.name === 'AbortError' ? 'timeout' : 'offline', 'The service could not be reached.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError('http', `The service answered ${response.status}.`, response.status);
  return response.status === 204 ? {} : response.json();
}

// ---------------------------------------------------------------------------------------------------
// Public functions. One per endpoint in the contract.
// ---------------------------------------------------------------------------------------------------

/** GET /community/map */
export const getMap = () => (config.MOCK ? mock.getMap() : http('GET', '/community/map'));

/** POST /community/extract { note } -> { offers, needs, topics, language, confidence, source } */
export const extractNote = (note) => (config.MOCK ? mock.extractNote(note) : http('POST', '/community/extract', { note }));

/** POST /community/join: send the CONFIRMED tags. -> { member_id, room_id, group_language, matches, hub, labels } */
export const joinHub = (payload) => (config.MOCK ? mock.joinHub(payload) : http('POST', '/community/join', payload));

/** POST /community/draft { member_id, to_community_id } -> { text, language, source } */
export const draftHello = (memberId, toCommunityId) =>
  config.MOCK
    ? mock.draftHello(memberId, toCommunityId)
    : http('POST', '/community/draft', { member_id: memberId, to_community_id: toCommunityId });

/** GET /community/rooms/{room_id}/messages?after={id} -> { messages: [...] } */
export const getMessages = (roomId, after = 0) =>
  config.MOCK
    ? mock.getMessages(roomId, after)
    : http('GET', `/community/rooms/${encodeURIComponent(roomId)}/messages?after=${encodeURIComponent(after)}`);

/** POST /community/rooms/{room_id}/messages { member_id, text, language }. (The contract gives no response shape: we assume { message }.) */
export const sendMessage = (roomId, memberId, text, language) =>
  config.MOCK
    ? mock.sendMessage(roomId, memberId, text, language)
    : http('POST', `/community/rooms/${encodeURIComponent(roomId)}/messages`, { member_id: memberId, text, language });

/** POST /community/rooms/{room_id}/plan { member_id } -> { plan: { where, when, items, summary }, language, source } */
export const synthesizePlan = (roomId, memberId) =>
  config.MOCK
    ? mock.synthesizePlan(roomId, memberId)
    : http('POST', `/community/rooms/${encodeURIComponent(roomId)}/plan`, { member_id: memberId });

/** POST /community/rooms/{room_id}/agree { member_id } -> { agreed, total, established } */
export const agreeToPlan = (roomId, memberId) =>
  config.MOCK
    ? mock.agreeToPlan(roomId, memberId)
    : http('POST', `/community/rooms/${encodeURIComponent(roomId)}/agree`, { member_id: memberId });

/**
 * PROPOSED, NOT IN YOUR CONTRACT: GET /community/rooms/{room_id}/plan -> { plan, language, source, agreed, total, established }
 * Without it, the page can only learn the "3 of 4 agreed" tally at the moment THIS person taps "I agree",
 * never when a neighbour agrees later. Decide whether to add it to the backend.
 */
export const getRoomPlan = (roomId) =>
  config.MOCK ? mock.getRoomPlan(roomId) : http('GET', `/community/rooms/${encodeURIComponent(roomId)}/plan`);

/** POST /community/report { room_id, message_id, member_id } */
export const reportMessage = (roomId, messageId, memberId) =>
  config.MOCK
    ? mock.reportMessage(roomId, messageId, memberId)
    : http('POST', '/community/report', { room_id: roomId, message_id: messageId, member_id: memberId });

// ===================================================================================================
// THE MOCK. Everything below is fixture data and pretend server logic. It never leaves the browser.
// ===================================================================================================

const COLS = 24;
const ROWS = 16;
const CELL_METRES = 250; //   assumption: one grid cell is about 250 m across
const WALK_KMH = 4; //        assumption: an easy walking speed on a slope
const MIN_PER_CELL = ((CELL_METRES / 1000) / WALK_KMH) * 60; // 3.75 minutes per cell

// A deterministic 0..1 "random" number from a cell, so the map is the same every time.
const jitter = (c, r) => {
  const x = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// Sample landslide risk: highest on the steep middle band, with a diagonal ridge and a little texture.
function riskAt(c, r) {
  const band = Math.exp(-(((r - 6.5) / 3.2) ** 2));
  const ridge = 0.25 * Math.exp(-(((c - r * 0.9 - 4) / 4) ** 2));
  return Math.max(0, Math.min(1, 0.08 + 0.62 * band + ridge + (jitter(c, r) - 0.5) * 0.16));
}

// Seven FICTIONAL communities.
const COMMUNITIES = [
  { id: 'upper-ridge', name: 'Upper Ridge Ward', c: 5, r: 3 },
  { id: 'school-hill', name: 'School Hill', c: 10, r: 5 },
  { id: 'terrace-farms', name: 'Terrace Farms', c: 17, r: 4 },
  { id: 'cliffside-path', name: 'Cliffside Path', c: 13, r: 8 },
  { id: 'riverbank-ward', name: 'Riverbank Ward', c: 6, r: 13 },
  { id: 'bridge-market', name: 'Bridge Market', c: 16, r: 12 },
  { id: 'lower-meadow', name: 'Lower Meadow', c: 21, r: 10 },
];
const byId = Object.fromEntries(COMMUNITIES.map((community) => [community.id, community]));

// Eight FICTIONAL seeded members. Levels: 2 conversational, 3 fluent. Cliffside Path speaks only Sherpa,
// so it is the community that will show "No shared language yet".
const SEED = [
  ['seed-1', 'Pasang T.', 'upper-ridge', { npi: 3, taj: 3, eng: 2 }, ['early_warning_knowledge', 'radio_comms'], ['medical_supplies'], ['early_warning', 'evacuation_planning']],
  ['seed-2', 'Ramesh K.', 'school-hill', { npi: 3, eng: 3 }, ['shelter_space', 'radio_comms', 'translation'], ['first_aid', 'food_water'], ['children_and_school_safety', 'evacuation_planning']],
  ['seed-3', 'Sunita M.', 'terrace-farms', { npi: 3, mai: 3, eng: 2 }, ['seedlings', 'tools_labor', 'food_water'], ['early_warning_knowledge'], ['slope_planting', 'livelihoods']],
  ['seed-4', 'Lhakpa S.', 'cliffside-path', { xsr: 3 }, ['evacuation_route_knowledge', 'early_warning_knowledge'], ['medical_supplies', 'shelter_space'], ['evacuation_planning', 'road_safety']],
  ['seed-5', 'Dawa S.', 'cliffside-path', { xsr: 3 }, ['transport', 'tools_labor'], ['first_aid'], ['road_safety']],
  ['seed-6', 'Binod S.', 'riverbank-ward', { npi: 3, new: 3, hin: 2, eng: 2 }, ['phone_relay', 'food_water'], ['shelter_space', 'medical_supplies'], ['water_sanitation', 'early_warning']],
  ['seed-7', 'Farida A.', 'bridge-market', { npi: 3, hin: 3, eng: 3 }, ['medical_supplies', 'transport', 'phone_relay'], ['first_aid'], ['road_safety', 'livelihoods']],
  ['seed-8', 'Kiran B.', 'lower-meadow', { mai: 3, npi: 2, eng: 2 }, ['shelter_space', 'food_water'], ['evacuation_route_knowledge'], ['water_sanitation', 'livelihoods']],
];

let db;
let counters;
function resetDb() {
  counters = {};
  db = { members: new Map(), rooms: new Map(), reports: [], seq: 0 };
  for (const [id, name, community_id, langs, offers, needs, topics] of SEED) {
    db.members.set(id, {
      id,
      name,
      community_id,
      languages: Object.entries(langs).map(([code, level]) => ({ code, level })),
      offers,
      needs,
      topics,
      seeded: true,
    });
  }
}
resetDb();

const uid = (prefix) => `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)}`;
const wait = (min, max) =>
  new Promise((resolve) => setTimeout(resolve, (min + Math.random() * (max - min)) * config.delayScale));
const later = (ms, fn) => setTimeout(fn, ms * config.delayScale);
const invalid = (message) => new ApiError('http', message, 422);

// ?fail=<name> always fails; ?failonce=<name> fails the first call only. Lets us test error states and Retry.
function maybeFail(name) {
  counters[name] = (counters[name] || 0) + 1;
  if (config.fail === name || (config.failOnce === name && counters[name] === 1)) {
    throw new ApiError('http', `Simulated failure of "${name}".`, 503);
  }
}
// Every mock response says `mock: true`, so the UI can label it "simulated" instead of pretending it is real.
async function respond(name, min, max, work) {
  await wait(min, max);
  maybeFail(name);
  return { ...work(), mock: true };
}

const speaks = (member, code) => member.languages.some((l) => l.code === code && l.level >= 2);
const membersOf = (communityId) => [...db.members.values()].filter((m) => m.community_id === communityId);
const languagesOf = (communityId) => new Set(membersOf(communityId).flatMap((m) => m.languages.filter((l) => l.level >= 2).map((l) => l.code)));
const unionOf = (communityId, key) => new Set(membersOf(communityId).flatMap((m) => m[key]));
const intersect = (a, b) => [...a].filter((x) => b.has(x));
const distance = (a, b) => Math.hypot(a.c - b.c, a.r - b.r);
const walkMinutes = (a, b) => Math.round(distance(a, b) * MIN_PER_CELL);
const round2 = (n) => Math.round(n * 100) / 100;
const exposureOf = (community) => {
  let sum = 0;
  let count = 0;
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const c = community.c + dc;
    const r = community.r + dr;
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) { sum += riskAt(c, r); count++; }
  }
  return round2(sum / count);
};

const mock = {
  // ---- GET /community/map -------------------------------------------------------------------------
  getMap: () =>
    respond('map', 250, 500, () => ({
      cols: COLS,
      rows: ROWS,
      cells: Array.from({ length: COLS * ROWS }, (_, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        return { c, r, risk: round2(riskAt(c, r)) };
      }),
      communities: COMMUNITIES.map((community) => ({
        ...community,
        exposure: exposureOf(community),
        n_members: membersOf(community.id).length,
      })),
      sample: true,
    })),

  // ---- POST /community/extract: a keyword "reader" standing in for Muse -----------------------------
  extractNote: (note) =>
    respond('extract', 700, 1100, () => {
      const text = String(note ?? '').trim();
      if (text.length > 500) throw invalid('The note is too long.');
      if (!text) return { offers: [], needs: [], topics: [], language: null, confidence: 0, source: 'fallback' };
      const found = readNote(text);
      const tagCount = found.offers.length + found.needs.length + found.topics.length;
      return {
        ...found,
        confidence: tagCount === 0 ? 0.2 : Math.min(0.92, round2(0.55 + 0.1 * tagCount)),
        source: 'muse',
      };
    }),

  // ---- POST /community/join -------------------------------------------------------------------------
  joinHub: (payload) =>
    respond('join', 900, 1400, () => {
      const name = String(payload?.name ?? '').trim();
      if (name.length < 2 || name.length > 40) throw invalid('Enter a name of 2 to 40 characters.');
      const home = byId[payload?.community_id];
      if (!home) throw invalid('Choose a community from the list.');
      const languages = (payload?.languages ?? []).filter((l) => LANG_CODES.includes(l.code) && [2, 3].includes(l.level));
      if (languages.length === 0) throw invalid('Choose at least one language.');
      const keep = (list, vocab) => [...new Set(list ?? [])].filter((tag) => vocab.includes(tag));
      // NOTE: `payload.note` is deliberately ignored. The note is never stored.
      const member = {
        id: uid('m'),
        name,
        community_id: home.id,
        languages,
        offers: keep(payload.offers, TAGS),
        needs: keep(payload.needs, TAGS),
        topics: keep(payload.topics, TOPICS),
        seeded: false,
      };

      const myLangs = new Set(languages.map((l) => l.code));
      const myOffers = new Set(member.offers);
      const myNeeds = new Set(member.needs);
      const myTopics = new Set(member.topics);
      const maxDistance = Math.hypot(COLS, ROWS);

      const matches = COMMUNITIES.filter((c) => c.id !== home.id).map((other) => {
        const theirOffers = unionOf(other.id, 'offers');
        const theirNeeds = unionOf(other.id, 'needs');
        const theirTopics = unionOf(other.id, 'topics');
        const gets = intersect(myNeeds, theirOffers); //  what they can give me
        const gives = intersect(myOffers, theirNeeds); // what I can give them
        const wanted = myNeeds.size + myOffers.size;
        const C = wanted === 0 ? 0.3 : Math.min(1, (gets.length + gives.length) / wanted);
        const P = 1 - distance(home, other) / maxDistance;
        const sharedTopics = intersect(myTopics, theirTopics);
        const unionTopics = new Set([...myTopics, ...theirTopics]).size;
        const T = unionTopics === 0 ? 0 : sharedTopics.length / unionTopics;
        const R = Math.min(exposureOf(home), exposureOf(other));

        const shared = intersect(myLangs, languagesOf(other.id));
        const languageFactor = shared.length > 0 ? 1 : 0.4; // ranks lower; NEVER hides
        const raw = 0.4 * C + 0.2 * P + 0.2 * T + 0.2 * R;
        const minutes = walkMinutes(home, other);

        const facts = [
          ...gets.slice(0, 2).map((tag) => ({ component: 'C', fact: `${other.name} can offer: ${labelOf(tag).toLowerCase()}`, self_reported: true })),
          ...gives.slice(0, 1).map((tag) => ({ component: 'C', fact: `${other.name} needs ${labelOf(tag).toLowerCase()}, which you can offer`, self_reported: true })),
          ...sharedTopics.slice(0, 1).map((tag) => ({ component: 'T', fact: `You both want to work on: ${labelOf(tag).toLowerCase()}`, self_reported: true })),
          { component: 'P', fact: `About ${minutes} minutes' walk between the two wards`, self_reported: false },
          { component: 'R', fact: R >= 0.5 ? 'Both wards sit on steep, high-risk slope' : 'Both wards face some landslide risk', self_reported: false },
        ];
        return {
          community_id: other.id,
          name: other.name,
          score: Math.round(100 * raw * languageFactor),
          language_factor: languageFactor,
          no_shared_language: shared.length === 0,
          shared_languages: shared,
          components: { C: round2(C), P: round2(P), T: round2(T), R: round2(R) },
          facts,
        };
      });
      matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

      // Connect the top three communities into one room. Same set of communities = same room.
      const connected = [home.id, ...matches.slice(0, 3).map((m) => m.community_id)];
      db.members.set(member.id, member);
      const roomId = `room-${[...connected].sort().join('_')}`;
      const group = pickGroupLanguage(myLangs, connected.filter((id) => id !== home.id));
      const hub = proposeHub(connected.map((id) => byId[id]), home);
      let room = db.rooms.get(roomId);
      if (!room) {
        room = { id: roomId, communities: connected, hub, messages: [], nextId: 1, agreed: new Set(), plan: null, simulatedAgreed: new Set(), demoTimers: false };
        db.rooms.set(roomId, room);
      }
      member.room_id = roomId;
      member.group_language = group;

      return {
        member_id: member.id,
        room_id: roomId,
        group_language: group,
        matches,
        hub,
        labels: { score: 'model output', walk_minutes: 'assumption' },
      };
    }),

  // ---- POST /community/draft: a template standing in for Muse writing the first message --------------
  draftHello: (memberId, toCommunityId) =>
    respond('draft', 900, 1500, () => {
      const member = db.members.get(memberId);
      const to = byId[toCommunityId];
      if (!member || !to) throw invalid('Unknown member or community.');
      const from = byId[member.community_id];
      // Only Nepali and English have templates in the mock. Any other group language falls back to English.
      const language = member.group_language === 'npi' ? 'npi' : 'eng';
      const offers = member.offers.map((tag) => labelOf(tag).toLowerCase());
      const needs = member.needs.map((tag) => labelOf(tag).toLowerCase());
      const text =
        language === 'npi'
          ? `नमस्ते ${to.name} का छिमेकीहरू। म ${from.name} बाट ${member.name}। हामी सबैलाई पहिरोको जोखिम छ। के हामी सुरक्षित साझा ठाउँको बारेमा कुरा गर्न सक्छौं?`
          : [
              `Hello, neighbors of ${to.name}. I'm ${member.name} from ${from.name}.`,
              "We all live with landslide risk on this slope, and I'd like to talk about a safe place we could share.",
              offers.length ? `What I can offer: ${offers.join(', ')}.` : '',
              needs.length ? `What we could use help with: ${needs.join(', ')}.` : '',
              'Could we find a time this week to talk?',
            ].filter(Boolean).join(' ');
      return { text, language, source: 'muse' };
    }),

  // ---- GET /community/rooms/{room_id}/messages?after= -------------------------------------------------
  getMessages: (roomId, after) =>
    respond('messages', 150, 300, () => {
      const room = db.rooms.get(roomId);
      if (!room) throw new ApiError('http', 'Room not found.', 404);
      return { messages: room.messages.filter((m) => m.id > Number(after || 0)) };
    }),

  // ---- POST /community/rooms/{room_id}/messages -------------------------------------------------------
  sendMessage: (roomId, memberId, text, language) =>
    respond('send', 200, 400, () => {
      const room = db.rooms.get(roomId);
      const member = db.members.get(memberId);
      if (!room || !member) throw invalid('Unknown room or member.');
      const body = String(text ?? '').trim();
      if (!body || body.length > 1000) throw invalid('Write a message of up to 1000 characters.');
      const message = pushMessage(room, member, language || 'eng', body, false);
      if (config.demo) scheduleSimulatedReplies(room, member);
      return { message };
    }),

  // ---- POST /community/rooms/{room_id}/plan: a template standing in for Muse synthesizing the thread ----
  synthesizePlan: (roomId, memberId) =>
    respond('plan', 1200, 1800, () => {
      const room = db.rooms.get(roomId);
      const member = db.members.get(memberId);
      if (!room || !member) throw invalid('Unknown room or member.');
      room.plan = buildPlan(room, member);
      return { ...room.plan };
    }),

  // ---- POST /community/rooms/{room_id}/agree ----------------------------------------------------------
  agreeToPlan: (roomId, memberId) =>
    respond('agree', 300, 500, () => {
      const room = db.rooms.get(roomId);
      const member = db.members.get(memberId);
      if (!room || !member) throw invalid('Unknown room or member.');
      if (!room.plan) throw invalid('There is no plan to agree to yet.');
      room.agreed.add(member.community_id);
      if (config.demo) scheduleSimulatedAgreements(room, member.community_id);
      return tally(room);
    }),

  // ---- (proposed) GET /community/rooms/{room_id}/plan ---------------------------------------------------
  getRoomPlan: (roomId) =>
    respond('roomplan', 150, 300, () => {
      const room = db.rooms.get(roomId);
      if (!room) throw new ApiError('http', 'Room not found.', 404);
      return { ...(room.plan ?? { plan: null }), ...tally(room) };
    }),

  // ---- POST /community/report ---------------------------------------------------------------------------
  reportMessage: (roomId, messageId, memberId) =>
    respond('report', 200, 350, () => {
      const room = db.rooms.get(roomId);
      if (!room || !db.members.has(memberId) || !room.messages.some((m) => m.id === messageId)) throw invalid('Unknown message.');
      db.reports.push({ roomId, messageId, memberId }); // kept in memory only
      return { ok: true };
    }),
};

// ---- helpers for the mock's pretend server logic ------------------------------------------------------------

// Reads a note with keyword rules. English and a few Nepali words. This stands in for Muse; the UI labels it simulated.
const DEVANAGARI = /[ऀ-ॿ]/g;
const OFFER_CUES = /\b(i can|we can|can bring|can provide|can help|we have|i have|offer|able to)\b|सक्छु|सक्छौं|दिन सक्छ/i;
const NEED_CUES = /\b(need|needs|lack|short of|looking for|worried|no |without|want)\b|चाहिन्छ|आवश्यक|चिन्ता|अभाव/i;
const TAG_RULES = [
  ['first_aid', /first[- ]aid|bandage|wound|injur/i, /प्राथमिक उपचार|घाइते/],
  ['medical_supplies', /medic|medicine|supplies/i, /औषधि|औषधी/],
  ['shelter_space', /shelter|safe (place|room|space)|space to stay|roof/i, /आश्रय|सुरक्षित ठाउँ/],
  ['evacuation_route_knowledge', /route|trail|way out|evacuat/i, /बाटो|निकास/],
  ['radio_comms', /radio|walkie/i, /रेडियो/],
  ['phone_relay', /phone|signal|network|sms/i, /फोन|सिग्नल/],
  ['early_warning_knowledge', /warning|rain gauge|crack|tilting|early sign/i, /चेतावनी|दरार/],
  ['transport', /transport|vehicle|motorbike|porter|cart/i, /गाडी|ढुवानी/],
  ['food_water', /food|water|rice|drinking/i, /खाना|पानी|चामल/],
  ['translation', /interpret|translat/i, /अनुवाद|दोभाषे/],
  ['tools_labor', /tools?|labou?r|shovel|dig/i, /औजार|श्रम/],
  ['seedlings', /seedling|plant(ing)?|trees?|bamboo|vetiver/i, /बिरुवा|रुख/],
];
const TOPIC_RULES = [
  ['early_warning', /warning|rain gauge|crack/i, /चेतावनी|दरार/],
  ['evacuation_planning', /evacuat|escape route|drill/i, /निकास/],
  ['first_aid_training', /first[- ]aid|training/i, /प्राथमिक उपचार/],
  ['slope_planting', /plant|seedling|trees?|bamboo|vetiver/i, /बिरुवा|रुख/],
  ['road_safety', /road|bridge|trail|path/i, /सडक|पुल/],
  ['children_and_school_safety', /child|school|kids/i, /बालबालिका|विद्यालय|स्कुल/],
  ['livelihoods', /farm|income|market|livelihood|crops?/i, /खेती|आम्दानी|बजार/],
  ['water_sanitation', /water|toilet|sanitation|drinking/i, /पानी|शौचालय/],
];
function readNote(text) {
  const language = (text.match(DEVANAGARI) || []).length / text.length > 0.3 ? 'npi' : 'eng';
  const offers = new Set();
  const needs = new Set();
  const topics = new Set();
  // Read clause by clause, so "we need medicine, but we can bring radios" splits into a need and an offer.
  // A clause with no cue of its own ("... and medicine") inherits the previous clause's cue; a new sentence resets it.
  let mode = null; // 'offer' | 'need' | null
  for (const clause of text.split(/([.;\n।])|,|\bbut\b|\band\b|तर/i)) {
    if (clause === undefined) continue;
    if (/^[.;\n।]$/.test(clause)) { mode = null; continue; }
    const tags = TAG_RULES.filter(([, latin, dev]) => latin.test(clause) || dev.test(clause)).map(([tag]) => tag);
    const isOffer = OFFER_CUES.test(clause);
    const isNeed = NEED_CUES.test(clause);
    if (isNeed) mode = 'need';
    else if (isOffer) mode = 'offer';
    for (const tag of tags) {
      if (mode === 'offer') offers.add(tag);
      else if (mode === 'need') needs.add(tag);
    }
  }
  for (const [topic, latin, dev] of TOPIC_RULES) if (latin.test(text) || dev.test(text)) topics.add(topic);
  return { offers: [...offers], needs: [...needs], topics: [...topics], language };
}

// The language the whole group can use: one that you AND every connected community speak.
// The demo prefers English so viewers can follow; ?lang=npi prefers Nepali.
function pickGroupLanguage(myLangs, otherIds) {
  let common = new Set(myLangs);
  for (const id of otherIds) common = new Set([...common].filter((code) => languagesOf(id).has(code)));
  if (common.size === 0) return null;
  for (const preferred of [config.replyLanguage, 'eng', 'npi']) if (common.has(preferred)) return preferred;
  return [...common][0];
}

// A safe spot near the middle of the connected communities: close to all of them, on low-risk ground.
function proposeHub(connected, home) {
  const mean = { c: connected.reduce((s, x) => s + x.c, 0) / connected.length, r: connected.reduce((s, x) => s + x.r, 0) / connected.length };
  let best = null;
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (Math.hypot(c - mean.c, r - mean.r) > 4) continue;
    const cost = connected.reduce((s, x) => s + distance(x, { c, r }), 0) / connected.length + 8 * riskAt(c, r);
    if (!best || cost < best.cost) best = { c, r, cost };
  }
  const near = [...connected].sort((a, b) => distance(a, best) - distance(b, best))[0];
  return { c: best.c, r: best.r, near: near.name, walk_minutes: walkMinutes(home, best) };
}

function pushMessage(room, member, language, text, simulated) {
  const message = {
    id: room.nextId++,
    author_name: member.name,
    community_name: byId[member.community_id].name,
    language,
    text,
    ts: new Date().toISOString(),
    simulated,
  };
  room.messages.push(message);
  return message;
}

const REPLIES = {
  eng: [
    'Hello! Our ward can bring first-aid supplies to a shared hub. Which day works for you?',
    'We can share the route we use when the upper trail cracks. Should we meet at the hub site to walk it together?',
  ],
  npi: [
    'नमस्ते! हाम्रो टोलले सुरक्षित साझा ठाउँमा प्राथमिक उपचारको सामान ल्याउन सक्छ। कुन दिन मिल्छ?',
    'माथिल्लो बाटो चिरिँदा हामीले प्रयोग गर्ने बाटो देखाउन सक्छौं। हबमा भेटेर सँगै हिँडौं?',
  ],
};
// ?demo=1: one or two seeded neighbours from the connected communities reply a few seconds later.
// Their messages are flagged simulated:true so the UI can say so.
function scheduleSimulatedReplies(room, sender) {
  const speakers = room.communities
    .filter((id) => id !== sender.community_id)
    .map((id) => membersOf(id).find((m) => m.seeded))
    .filter(Boolean)
    .slice(0, 2);
  const language = room.messages.length && REPLIES[config.replyLanguage] ? config.replyLanguage : 'eng';
  speakers.forEach((speaker, i) => {
    later(3000 + i * 3500, () => pushMessage(room, speaker, language, REPLIES[language][i], true));
  });
}
function scheduleSimulatedAgreements(room, myCommunityId) {
  room.communities
    .filter((id) => id !== myCommunityId && !room.simulatedAgreed.has(id))
    .slice(0, 2)
    .forEach((id, i) => later(2500 + i * 2500, () => { room.agreed.add(id); room.simulatedAgreed.add(id); }));
}
const tally = (room) => {
  const total = room.communities.length;
  return { agreed: room.agreed.size, total, established: room.agreed.size * 2 > total, simulated_agreed: room.simulatedAgreed.size };
};

// The plan comes from data: the hub, the walking time, and each community's own self-reported offers.
function buildPlan(room, member) {
  const language = member.group_language === 'npi' ? 'npi' : 'eng';
  const home = byId[member.community_id];
  const items = room.communities.map((id) => {
    const offers = [...unionOf(id, 'offers')].slice(0, 2).map((tag) => labelOf(tag).toLowerCase());
    return { who: byId[id].name, brings: offers.length ? offers.join(', ') : 'to be decided by the group' };
  });
  const plan =
    language === 'npi'
      ? {
          where: `${room.hub.near} नजिकको सुरक्षित ठाउँ, ${home.name} बाट करिब ${room.hub.walk_minutes} मिनेट पैदल`,
          when: 'शनिबार बिहान, अर्को ठूलो वर्षा अघि (समूहले पक्का गर्नुपर्छ)',
          items, // the mock has no Nepali tag labels, so "brings" stays in English
          summary: 'सबै समुदाय सुरक्षित साझा ठाउँमा भेला हुने र आ-आफ्नो सामग्री ल्याउने योजना छ।',
        }
      : {
          where: `A safe spot near ${room.hub.near}, about ${room.hub.walk_minutes} minutes' walk from ${home.name}`,
          when: 'Saturday morning, before the next heavy rain (to be confirmed by the group)',
          items,
          summary: 'Each community brings what it said it can offer and meets at the shared hub. The group confirms the time and place.',
        };
  return { plan, language, source: 'muse' };
}

/** For tests only: put the mock back to its starting state. */
export const __resetMock = () => resetDb();
