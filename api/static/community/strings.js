// All UI text lives here: the vocabulary (languages, tags, topics) and the copy for every screen.

// ISO 639-3 codes. `bcp47` is what goes in lang="" on the page so browsers pick the right font and rules.
export const LANG = {
  npi: { name: 'Nepali', native: 'नेपाली', bcp47: 'ne' },
  mai: { name: 'Maithili', native: 'मैथिली', bcp47: 'mai' },
  taj: { name: 'Tamang', native: 'तामाङ', bcp47: 'taj' },
  xsr: { name: 'Sherpa', native: 'शेर्पा', bcp47: 'xsr' },
  new: { name: 'Newar', native: 'नेपाल भाषा', bcp47: 'new' },
  hin: { name: 'Hindi', native: 'हिन्दी', bcp47: 'hi' },
  eng: { name: 'English', native: 'English', bcp47: 'en' },
};
export const LANG_CODES = Object.keys(LANG);

// Comfort levels offered in the form. 2 is the default; 3 is optional.
export const LEVELS = { 2: 'Conversational', 3: 'Fluent' };
export const DEFAULT_LEVEL = 2;

// Offers and needs share one vocabulary. "translation" means a person who can interpret; it is not a feature of this app.
export const TAG_LABEL = {
  first_aid: 'First aid',
  evacuation_route_knowledge: 'Knowledge of evacuation routes',
  medical_supplies: 'Medical supplies',
  shelter_space: 'Shelter space',
  radio_comms: 'Radio communication',
  phone_relay: 'Phone relay',
  early_warning_knowledge: 'Early-warning knowledge',
  transport: 'Transport',
  food_water: 'Food and water',
  translation: 'Someone who can interpret',
  tools_labor: 'Tools and labor',
  seedlings: 'Seedlings',
};
export const TAGS = Object.keys(TAG_LABEL);

export const TOPIC_LABEL = {
  early_warning: 'Early warning',
  evacuation_planning: 'Evacuation planning',
  first_aid_training: 'First-aid training',
  slope_planting: 'Slope planting',
  road_safety: 'Road safety',
  children_and_school_safety: 'Children and school safety',
  livelihoods: 'Livelihoods',
  water_sanitation: 'Water and sanitation',
};
export const TOPICS = Object.keys(TOPIC_LABEL);

// Friendly label for any tag or topic; never show a raw tag to a person.
export const labelOf = (tag) => TAG_LABEL[tag] || TOPIC_LABEL[tag] || tag;

// ---- Honesty chips: every number and claim on screen wears one of these. -----------------------------------------
export const CHIP = {
  observed: 'observed',
  model: 'model output',
  assumption: 'assumption',
  simulation: 'simulation',
  self: 'self-reported',
  sample: 'sample data',
};
export const CHIP_HELP = {
  observed: 'Measured or recorded in the real world.',
  model: 'Calculated by a model from data. It is an estimate.',
  assumption: 'Based on a stated assumption, for example an easy walking pace.',
  simulation: 'Made up for this demo. No real person wrote it.',
  self: 'Told to us by the community. We have not checked it.',
  sample: 'Illustrative fixture data. It is not about real places or people.',
};

// ---- Screen copy --------------------------------------------------------------------------------------------------
export const T = {
  brand: 'RootLedger',
  brandSub: 'Community hub',
  sample: 'Sample data · illustrative',
  skip: 'Skip to main content',
  steps: { join: 'Join', confirm: 'Check', neighbors: 'Neighbors', room: 'Room', plan: 'Plan' },
  startOver: 'Start over',
  back: 'Back',

  errors: {
    offline: 'We could not reach the service. Check the connection and try again.',
    timeout: 'That took too long. Please try again.',
    generic: 'Something went wrong on our side. Please try again.',
    retry: 'Try again',
    gone: 'We could not find this room. It may have been reset.',
    unknown: 'This page does not exist.',
  },

  land: {
    eyebrow: 'For communities on steep, landslide-prone slopes',
    titleParts: ['Find neighboring communities you can ', 'talk to', ', and agree a ', 'safe place', ' to share.'],
    lede:
      'Landslides do not stop at a ward boundary. Join, and we will show you nearby communities that share a language with you, then help you agree a plan for a shared safe hub.',
    cta: 'Get started',
    how: 'How it works',
    steps: [
      {
        title: 'Tell us in your own words',
        body: 'Write a short note about what your community can offer and what it could use. It is only used to fill in a form. It is never saved.',
        muse: 'Muse reads your note',
      },
      {
        title: 'Say hello',
        body: 'We rank neighboring communities by how well you could help each other. You pick who to greet, and edit the first message before it is sent.',
        muse: 'Muse writes the first message',
      },
      {
        title: 'Agree a plan',
        body: 'Talk in a shared room. When you are ready, get a plan drafted from the conversation. Each community says whether it agrees.',
        muse: 'Muse drafts the plan',
      },
    ],
    museNote: 'Muse is an AI assistant. It helps with words. It never produces numbers: every score and distance comes from data.',
    mapTitle: 'The slope, at a glance',
    mapNote: 'Redder squares mean higher landslide risk. Circles are communities.',
  },

  join: {
    title: 'Tell us about you',
    lede: 'We only ask for what we need. We use your community, not your home address.',
    name: 'Your first name',
    nameHelp: '2 to 40 characters.',
    community: 'Your community',
    communityHelp: 'Choose the community you live in. We never ask where your house is.',
    communityPlaceholder: 'Choose a community',
    languages: 'Languages you can talk in',
    languagesHelp: 'Choose all that apply. This is how we find neighbors you can talk to.',
    level: 'Comfort level',
    note: 'A note about your community (optional)',
    noteHelp:
      'For example: “We can bring radios and food. We need first aid supplies.” Please do not include phone numbers or home locations. The note is not saved.',
    noteCount: (n) => `${n} of 500 characters`,
    submit: 'Continue',
    submitNote: 'Read my note',
    reading: 'Muse is reading your note…',
    readFailed: 'Muse could not read the note just now.',
    skipReading: 'Skip this and choose from the lists',
    errName: 'Please enter a name of 2 to 40 characters.',
    errCommunity: 'Please choose your community.',
    errLanguages: 'Please choose at least one language.',
    errNoteLong: 'The note is longer than 500 characters. Please shorten it.',
    errNotePhone: 'The note looks like it has a phone number in it. Please remove it. We never store phone numbers.',
    privacy: 'Nothing you type here is stored except what you confirm on the next screen.',
  },

  confirm: {
    title: 'Check what Muse read',
    lede: 'You are in charge. Tick or untick anything. Only what is ticked below is used.',
    museRead: 'Muse read your note',
    museFallback: 'Muse could not read the note, so nothing is ticked. Choose from the lists.',
    museEmpty: 'You did not write a note, so nothing is ticked. Choose from the lists.',
    museUnsure: 'Muse was not sure about this one. Please check each box yourself.',
    confidence: 'Muse’s confidence',
    offers: 'What your community can offer',
    needs: 'What your community could use',
    topics: 'What you would like to work on together',
    none: 'Nothing chosen yet. That is fine, but a few choices help us find better neighbors.',
    submit: 'Find neighbors',
    finding: 'Finding neighbors…',
    edit: 'Edit my note',
  },

  neighbors: {
    title: 'Neighbors you can talk to',
    lede: 'Communities are ranked by how well you could help each other. The score only puts the list in order. Every community stays on the list.',
    groupLanguage: (name) => `A language your whole group can use: ${name}`,
    noGroupLanguage: 'No language is shared by everyone yet.',
    hubTitle: 'A proposed shared hub',
    hubBody: (near) => `The map suggests a spot on lower-risk ground, near ${near}.`,
    hubWalk: 'Walk from your community',
    minutes: (n) => `${n} min`,
    score: 'Match score',
    scoreNote: 'out of 100. Ranks only.',
    noShared: 'No shared language yet. Translation is planned.',
    shared: (names) => `Shared: ${names}`,
    hello: 'Say hello',
    room: 'Open the room',
    roomNote: 'The room is where your group talks and agrees a plan.',
    whyRanked: 'Why this rank',
    yourCommunity: 'Your community',
    hubOnMap: 'Proposed hub',
    mapTitle: 'Where everyone is',
  },

  hello: {
    title: (name) => `Say hello to ${name}`,
    lede: 'Muse wrote a first message for you. Read it, change anything, then send. Nothing is sent until you press Send.',
    writing: 'Muse is writing a first message…',
    failed: 'Muse could not write a draft just now. You can write your own message below.',
    label: 'Your message',
    museTag: 'Drafted by Muse',
    send: 'Send to the room',
    sending: 'Sending…',
    retryDraft: 'Ask Muse again',
    noSharedNote: 'This community may not share a language with you yet. Translation is planned. You can still say hello.',
    empty: 'Please write a message first.',
  },

  room: {
    title: 'Your room',
    lede: 'Messages appear here as neighbors write. Be kind and keep it about staying safe.',
    sharedLanguage: (name) => `Shared language: ${name}`,
    noSharedLanguage: 'No language is shared by everyone yet.',
    empty: 'No messages yet. Write the first one below.',
    compose: 'Write a message',
    send: 'Send',
    sending: 'Sending…',
    report: 'Report',
    reported: 'Reported. Thank you.',
    you: 'You',
    simulated: 'simulated reply',
    live: 'Up to date',
    reconnecting: 'Reconnecting…',
    paused: 'Paused while this tab is hidden',
    draftPlan: 'Draft the plan with Muse',
    sendFailed: 'The message was not sent. It is still in the box. Try again.',
  },

  plan: {
    title: 'A plan for a shared hub',
    lede: 'Muse reads the conversation and drafts a starting point. It is a suggestion. The communities decide.',
    draftCta: 'Draft the plan with Muse',
    drafting: 'Muse is reading the conversation and drafting the plan…',
    redraft: 'Update the plan from the latest messages',
    museTag: 'Drafted by Muse',
    where: 'Where',
    when: 'When',
    who: 'Who brings what',
    summary: 'In short',
    walk: 'Walk from your community to the hub',
    agreeTitle: 'Does your community agree?',
    agreeBody: 'Saying yes tells the others that your community is happy with this plan.',
    agree: 'We agree',
    agreeing: 'Saving…',
    agreed: 'You have agreed for your community.',
    tally: (a, t) => `${a} of ${t} communities have agreed`,
    established: 'Enough communities have agreed. The plan is established.',
    notYet: 'More agreement is needed before the plan is established.',
    simulatedAgreed: (n) => `${n} of these agreements are simulated for this demo.`,
    backToRoom: 'Back to the room',
  },
};
