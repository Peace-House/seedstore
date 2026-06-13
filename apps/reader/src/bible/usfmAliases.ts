// Maps the many ways an author spells a Bible book to the USFM 3-letter
// id YouVersion expects. Mirror of `lib/bible/data/usfm_book_aliases.dart`
// on mobile — keep the two in sync.
//
// Lookup is case-insensitive and dot-insensitive: `resolveUsfmId` lowercases,
// strips whitespace, and drops dots before lookup so `"Exo. "`, `"EXODUS"`,
// `"exo"`, and `"1 Cor"` all resolve.
//
// Generous on purpose — full names, SBL abbreviations, short forms, and the
// awkward numbered-book variants ("1 Cor", "I Cor", "1Cor", "First
// Corinthians"). Ambiguous matches (e.g. "Jud") resolve to the more common
// modern usage (JDG); the rarer one requires the longer form ("Jude").

export const usfmAliases: Record<string, string> = {
  // Old Testament
  gen: 'GEN', gn: 'GEN', genesis: 'GEN',
  exo: 'EXO', ex: 'EXO', exod: 'EXO', exodus: 'EXO',
  lev: 'LEV', lv: 'LEV', leviticus: 'LEV',
  num: 'NUM', nm: 'NUM', numbers: 'NUM',
  deu: 'DEU', dt: 'DEU', deut: 'DEU', deuteronomy: 'DEU',
  jos: 'JOS', josh: 'JOS', joshua: 'JOS',
  jdg: 'JDG', jud: 'JDG', judg: 'JDG', judges: 'JDG',
  rut: 'RUT', ru: 'RUT', ruth: 'RUT',
  '1sa': '1SA', '1sam': '1SA', '1samuel': '1SA', isam: '1SA',
  '2sa': '2SA', '2sam': '2SA', '2samuel': '2SA', iisam: '2SA',
  '1ki': '1KI', '1kgs': '1KI', '1kings': '1KI', '1kin': '1KI', iking: '1KI',
  '2ki': '2KI', '2kgs': '2KI', '2kings': '2KI', '2kin': '2KI', iiking: '2KI',
  '1ch': '1CH', '1chr': '1CH', '1chronicles': '1CH', '1chron': '1CH',
  '2ch': '2CH', '2chr': '2CH', '2chronicles': '2CH', '2chron': '2CH',
  ezr: 'EZR', ezra: 'EZR',
  neh: 'NEH', nehemiah: 'NEH',
  est: 'EST', esth: 'EST', esther: 'EST',
  job: 'JOB',
  psa: 'PSA', ps: 'PSA', psalm: 'PSA', psalms: 'PSA', pss: 'PSA',
  pro: 'PRO', pr: 'PRO', prov: 'PRO', proverbs: 'PRO',
  ecc: 'ECC', eccl: 'ECC', ecclesiastes: 'ECC', qoh: 'ECC',
  sng: 'SNG', song: 'SNG', songofsongs: 'SNG', songofsolomon: 'SNG',
  sos: 'SNG', cant: 'SNG', canticles: 'SNG',
  isa: 'ISA', is: 'ISA', isaiah: 'ISA',
  jer: 'JER', jeremiah: 'JER',
  lam: 'LAM', lamentations: 'LAM',
  ezk: 'EZK', eze: 'EZK', ezek: 'EZK', ezekiel: 'EZK',
  dan: 'DAN', dn: 'DAN', daniel: 'DAN',
  hos: 'HOS', hosea: 'HOS',
  jol: 'JOL', joel: 'JOL',
  amo: 'AMO', am: 'AMO', amos: 'AMO',
  oba: 'OBA', ob: 'OBA', obad: 'OBA', obadiah: 'OBA',
  jon: 'JON', jonah: 'JON',
  mic: 'MIC', mi: 'MIC', micah: 'MIC',
  nam: 'NAM', nah: 'NAM', nahum: 'NAM',
  hab: 'HAB', habakkuk: 'HAB',
  zep: 'ZEP', zeph: 'ZEP', zephaniah: 'ZEP',
  hag: 'HAG', haggai: 'HAG',
  zec: 'ZEC', zech: 'ZEC', zechariah: 'ZEC',
  mal: 'MAL', malachi: 'MAL',

  // New Testament
  mat: 'MAT', mt: 'MAT', matt: 'MAT', matthew: 'MAT',
  mrk: 'MRK', mk: 'MRK', mar: 'MRK', mark: 'MRK',
  luk: 'LUK', lk: 'LUK', luke: 'LUK',
  jhn: 'JHN', jn: 'JHN', joh: 'JHN', john: 'JHN',
  act: 'ACT', ac: 'ACT', acts: 'ACT',
  rom: 'ROM', ro: 'ROM', romans: 'ROM',
  '1co': '1CO', '1cor': '1CO', '1corinthians': '1CO', icor: '1CO',
  '1corinth': '1CO', firstcorinthians: '1CO',
  '2co': '2CO', '2cor': '2CO', '2corinthians': '2CO', iicor: '2CO',
  '2corinth': '2CO', secondcorinthians: '2CO',
  gal: 'GAL', galatians: 'GAL',
  eph: 'EPH', ephesians: 'EPH',
  php: 'PHP', phil: 'PHP', philippians: 'PHP',
  col: 'COL', colossians: 'COL',
  '1th': '1TH', '1thess': '1TH', '1thes': '1TH', '1thessalonians': '1TH',
  ithess: '1TH', firstthessalonians: '1TH',
  '2th': '2TH', '2thess': '2TH', '2thes': '2TH', '2thessalonians': '2TH',
  iithess: '2TH', secondthessalonians: '2TH',
  '1ti': '1TI', '1tim': '1TI', '1timothy': '1TI', itim: '1TI',
  firsttimothy: '1TI',
  '2ti': '2TI', '2tim': '2TI', '2timothy': '2TI', iitim: '2TI',
  secondtimothy: '2TI',
  tit: 'TIT', titus: 'TIT',
  phm: 'PHM', phlm: 'PHM', philemon: 'PHM',
  heb: 'HEB', hebrews: 'HEB',
  jas: 'JAS', jm: 'JAS', jam: 'JAS', james: 'JAS',
  '1pe': '1PE', '1pet': '1PE', '1peter': '1PE', ipet: '1PE',
  firstpeter: '1PE',
  '2pe': '2PE', '2pet': '2PE', '2peter': '2PE', iipet: '2PE',
  secondpeter: '2PE',
  '1jn': '1JN', '1jhn': '1JN', '1john': '1JN', ijn: '1JN', ijohn: '1JN',
  firstjohn: '1JN',
  '2jn': '2JN', '2jhn': '2JN', '2john': '2JN', iijn: '2JN', iijohn: '2JN',
  secondjohn: '2JN',
  '3jn': '3JN', '3jhn': '3JN', '3john': '3JN', iiijn: '3JN', iiijohn: '3JN',
  thirdjohn: '3JN',
  jude: 'JUD',
  rev: 'REV', rv: 'REV', revelation: 'REV', apocalypse: 'REV',
}

// Reverse map: USFM id → preferred full English name. Used in the verse
// sheet title as a fallback before the API's `reference` field arrives.
export const usfmDisplayNames: Record<string, string> = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers',
  DEU: 'Deuteronomy', JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
  '1CH': '1 Chronicles', '2CH': '2 Chronicles', EZR: 'Ezra',
  NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms',
  PRO: 'Proverbs', ECC: 'Ecclesiastes', SNG: 'Song of Songs',
  ISA: 'Isaiah', JER: 'Jeremiah', LAM: 'Lamentations',
  EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea', JOL: 'Joel',
  AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah',
  NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai',
  ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke', JHN: 'John',
  ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians',
  '2CO': '2 Corinthians', GAL: 'Galatians', EPH: 'Ephesians',
  PHP: 'Philippians', COL: 'Colossians', '1TH': '1 Thessalonians',
  '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
  TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAS: 'James',
  '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
  '3JN': '3 John', JUD: 'Jude', REV: 'Revelation',
}

/**
 * Returns the USFM 3-letter id for a free-form book string, or null if no
 * alias matches. Strips dots, whitespace, and case so `"Exo. "`, `"EXODUS"`,
 * `"exo"`, and `"1 Cor"` all resolve to the same key.
 */
export function resolveUsfmId(name: string): string | null {
  if (!name) return null
  // Drop trailing dots, all whitespace, and any other non-alphanumeric runs
  // (curly apostrophes etc.) — same normalisation as the Dart side.
  const key = name.toLowerCase().replace(/[\s.]/g, '')
  if (!key) return null
  return usfmAliases[key] ?? null
}
