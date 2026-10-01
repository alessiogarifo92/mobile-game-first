/** UI strings. English is the default and the fallback for any missing key or language. */
const en = {
  'app.title': 'Mix & Splash',
  'app.tagline': 'Paint by mixing colours',
  'level.title': 'Level {n}',
  'level.waiting': 'WAITING',
  'win.title': 'Masterpiece!',
  'win.summary': '"{name}" painted in {moves} moves',
  'win.next': 'Next',
  'win.map': 'Map',
  'jam.title': 'Jam!',
  'jam.body': 'A bucket has nowhere to wait.\nEvery waiting slot is full.',
  'jam.continue': '+1 slot and continue',
  'jam.retry': 'Retry',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.sound': 'Sound',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.howto': 'How to play',
  'settings.replayTutorial': 'Replay tutorial',
  'settings.close': 'Close',
  'hint.2': 'Paint stops at the first unfinished pixel',
  'hint.4': 'Red + Yellow = Orange',
  'hint.5': 'Yellow + Blue = Green',
  'hint.7': 'Red + Blue = Purple',
  'hint.8': 'Few waiting slots: choose the order!',
  'guide.tap': 'Tap a column to send a paint bucket onto the belt',
  'guide.watch': 'It rides around the canvas and paints every pixel of its colour it can reach',
  'guide.next': 'Send the next one!',
  'guide.free': 'Now finish the picture!',
  'tip.gotIt': 'Got it',
  'tip.mixing.title': 'Mix on the canvas',
  'tip.mixing.body': 'You only have red, yellow and blue.\nHit a pixel with two colours to mix them.',
  'tip.blocked.title': 'Lane blocked',
  'tip.blocked.body': 'Paint stops at the first unfinished pixel.\nIf that pixel needs another colour, the bucket cannot shoot past it.',
  'tip.slots.title': 'Waiting slots',
  'tip.slots.body': 'Buckets with paint left wait here.\nTap one to send it again. If every slot is full: jam!',
  'howto.title': 'How to play',
  'howto.1.title': 'Launch',
  'howto.1.body': 'Tap a column: its front bucket rides the belt around the canvas and paints the pixels of its colour.',
  'howto.2.title': 'Mix',
  'howto.2.body': 'Only red, yellow and blue. Orange, green and purple pixels need two colours.',
  'howto.3.title': 'Plan',
  'howto.3.body': 'Paint stops at the first unfinished pixel. Buckets with paint left wait in a slot — keep a slot free!',
  'howto.next': 'Next',
  'howto.done': 'Play',
  'level.1': 'Heart',
  'level.2': 'Sun',
  'level.3': 'Mushroom',
  'level.4': 'Orange',
  'level.5': 'Leaf',
  'level.6': 'Pumpkin',
  'level.7': 'Grapes',
  'level.8': 'Rainbow',
  'level.9': 'Flower',
  'level.10': 'Fish',
  'level.11': 'Butterfly',
  'level.12': 'Watermelon',
  'level.13': 'Cat',
  'level.14': 'Tree',
  'level.15': 'Parrot',
};

export type MessageKey = keyof typeof en;

const it: Record<MessageKey, string> = {
  'app.title': 'Mix & Splash',
  'app.tagline': 'Dipingi mescolando i colori',
  'level.title': 'Livello {n}',
  'level.waiting': 'ATTESA',
  'win.title': 'Capolavoro!',
  'win.summary': '"{name}" completato in {moves} mosse',
  'win.next': 'Avanti',
  'win.map': 'Mappa',
  'jam.title': 'Ingorgo!',
  'jam.body': 'Un secchiello non trova posto.\nTutti gli slot d\'attesa sono pieni.',
  'jam.continue': '+1 slot e continua',
  'jam.retry': 'Riprova',
  'settings.title': 'Impostazioni',
  'settings.language': 'Lingua',
  'settings.sound': 'Suono',
  'settings.on': 'Sì',
  'settings.off': 'No',
  'settings.howto': 'Come si gioca',
  'settings.replayTutorial': 'Rivedi il tutorial',
  'settings.close': 'Chiudi',
  'hint.2': 'La vernice si ferma sul primo pixel non finito',
  'hint.4': 'Rosso + Giallo = Arancione',
  'hint.5': 'Giallo + Blu = Verde',
  'hint.7': 'Rosso + Blu = Viola',
  'hint.8': 'Pochi slot d\'attesa: scegli l\'ordine!',
  'guide.tap': 'Tocca una colonna per mandare un secchiello sul nastro',
  'guide.watch': 'Gira attorno alla tela e dipinge ogni pixel del suo colore che riesce a raggiungere',
  'guide.next': 'Manda il prossimo!',
  'guide.free': 'Ora completa il quadro!',
  'tip.gotIt': 'Ho capito',
  'tip.mixing.title': 'Mescola sulla tela',
  'tip.mixing.body': 'Hai solo rosso, giallo e blu.\nColpisci un pixel con due colori per mescolarli.',
  'tip.blocked.title': 'Corsia bloccata',
  'tip.blocked.body': 'La vernice si ferma sul primo pixel non finito.\nSe quel pixel vuole un altro colore, il secchiello non può superarlo.',
  'tip.slots.title': 'Slot d\'attesa',
  'tip.slots.body': 'I secchielli con vernice avanzata aspettano qui.\nToccane uno per rilanciarlo. Se gli slot sono pieni: ingorgo!',
  'howto.title': 'Come si gioca',
  'howto.1.title': 'Lancia',
  'howto.1.body': 'Tocca una colonna: il primo secchiello gira sul nastro attorno alla tela e dipinge i pixel del suo colore.',
  'howto.2.title': 'Mescola',
  'howto.2.body': 'Solo rosso, giallo e blu. I pixel arancioni, verdi e viola vogliono due colori.',
  'howto.3.title': 'Pianifica',
  'howto.3.body': 'La vernice si ferma sul primo pixel non finito. I secchielli avanzati aspettano in uno slot: tienine uno libero!',
  'howto.next': 'Avanti',
  'howto.done': 'Gioca',
  'level.1': 'Cuore',
  'level.2': 'Sole',
  'level.3': 'Fungo',
  'level.4': 'Arancia',
  'level.5': 'Foglia',
  'level.6': 'Zucca',
  'level.7': 'Uva',
  'level.8': 'Arcobaleno',
  'level.9': 'Fiore',
  'level.10': 'Pesce',
  'level.11': 'Farfalla',
  'level.12': 'Anguria',
  'level.13': 'Gatto',
  'level.14': 'Albero',
  'level.15': 'Pappagallo',
};

export const DICTIONARIES = { en, it } as const;
export type Language = keyof typeof DICTIONARIES;
export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGES = Object.keys(DICTIONARIES) as Language[];
/** Each language's name in that language, for the picker. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', it: 'Italiano' };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in DICTIONARIES;
}

export type Params = Record<string, string | number>;

/** Looks up a key, falling back to English, and fills `{name}` placeholders (unknown ones stay visible). */
export function translate(language: string, key: string, params: Params = {}): string {
  const dict: Record<string, string> = isLanguage(language) ? DICTIONARIES[language] : DICTIONARIES[DEFAULT_LANGUAGE];
  const template = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Translated level name; unknown ids fall back to the generic level title. */
export function levelName(language: string, id: number): string {
  const key = `level.${id}`;
  return key in en ? translate(language, key) : translate(language, 'level.title', { n: id });
}
