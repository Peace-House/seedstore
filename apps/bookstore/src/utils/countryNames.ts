/**
 * ISO 3166-1 alpha-2 → display name map.
 *
 * Keep keys uppercase. Use `countryName(code)` for the safe lookup that
 * falls back to the original code (so unknown codes still render
 * sensibly rather than blank). Use `countryLabel(code)` when you want
 * the "Nigeria (NG)" hybrid form for filter chips / dropdowns where
 * the operator may want to see the code too.
 *
 * Source: a curated subset of ISO 3166-1 covering everywhere we
 * currently have outreach data plus the long tail. Add more codes as
 * needed — there is no autoloader, this map IS the canonical list for
 * the bookstore admin UI.
 */
export const countryMap: Record<string, string> = {
  // Africa
  DZ: 'Algeria',
  AO: 'Angola',
  BJ: 'Benin',
  BW: 'Botswana',
  BF: 'Burkina Faso',
  BI: 'Burundi',
  CV: 'Cape Verde',
  CM: 'Cameroon',
  CF: 'Central African Republic',
  TD: 'Chad',
  KM: 'Comoros',
  CG: 'Congo',
  CD: 'DR Congo',
  CI: "Côte d'Ivoire",
  DJ: 'Djibouti',
  EG: 'Egypt',
  GQ: 'Equatorial Guinea',
  ER: 'Eritrea',
  SZ: 'Eswatini',
  ET: 'Ethiopia',
  GA: 'Gabon',
  GM: 'Gambia',
  GH: 'Ghana',
  GN: 'Guinea',
  GW: 'Guinea-Bissau',
  KE: 'Kenya',
  LS: 'Lesotho',
  LR: 'Liberia',
  LY: 'Libya',
  MG: 'Madagascar',
  MW: 'Malawi',
  ML: 'Mali',
  MR: 'Mauritania',
  MU: 'Mauritius',
  MA: 'Morocco',
  MZ: 'Mozambique',
  NA: 'Namibia',
  NE: 'Niger',
  NG: 'Nigeria',
  RW: 'Rwanda',
  ST: 'São Tomé and Príncipe',
  SN: 'Senegal',
  SC: 'Seychelles',
  SL: 'Sierra Leone',
  SO: 'Somalia',
  ZA: 'South Africa',
  SS: 'South Sudan',
  SD: 'Sudan',
  TZ: 'Tanzania',
  TG: 'Togo',
  TN: 'Tunisia',
  UG: 'Uganda',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',

  // Americas
  AR: 'Argentina',
  BS: 'Bahamas',
  BB: 'Barbados',
  BZ: 'Belize',
  BO: 'Bolivia',
  BR: 'Brazil',
  CA: 'Canada',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  DO: 'Dominican Republic',
  EC: 'Ecuador',
  SV: 'El Salvador',
  GT: 'Guatemala',
  GY: 'Guyana',
  HT: 'Haiti',
  HN: 'Honduras',
  JM: 'Jamaica',
  MX: 'Mexico',
  NI: 'Nicaragua',
  PA: 'Panama',
  PY: 'Paraguay',
  PE: 'Peru',
  PR: 'Puerto Rico',
  SR: 'Suriname',
  TT: 'Trinidad and Tobago',
  US: 'United States',
  UY: 'Uruguay',
  VE: 'Venezuela',

  // Asia
  AF: 'Afghanistan',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  BH: 'Bahrain',
  BD: 'Bangladesh',
  BT: 'Bhutan',
  BN: 'Brunei',
  KH: 'Cambodia',
  CN: 'China',
  GE: 'Georgia',
  HK: 'Hong Kong',
  IN: 'India',
  ID: 'Indonesia',
  IR: 'Iran',
  IQ: 'Iraq',
  IL: 'Israel',
  JP: 'Japan',
  JO: 'Jordan',
  KZ: 'Kazakhstan',
  KW: 'Kuwait',
  KG: 'Kyrgyzstan',
  LA: 'Laos',
  LB: 'Lebanon',
  MO: 'Macau',
  MY: 'Malaysia',
  MV: 'Maldives',
  MN: 'Mongolia',
  MM: 'Myanmar',
  NP: 'Nepal',
  KP: 'North Korea',
  OM: 'Oman',
  PK: 'Pakistan',
  PS: 'Palestine',
  PH: 'Philippines',
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  KR: 'South Korea',
  LK: 'Sri Lanka',
  SY: 'Syria',
  TW: 'Taiwan',
  TJ: 'Tajikistan',
  TH: 'Thailand',
  TL: 'Timor-Leste',
  TR: 'Turkey',
  TM: 'Turkmenistan',
  AE: 'United Arab Emirates',
  UZ: 'Uzbekistan',
  VN: 'Vietnam',
  YE: 'Yemen',

  // Europe
  AL: 'Albania',
  AD: 'Andorra',
  AT: 'Austria',
  BY: 'Belarus',
  BE: 'Belgium',
  BA: 'Bosnia and Herzegovina',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IS: 'Iceland',
  IE: 'Ireland',
  IT: 'Italy',
  XK: 'Kosovo',
  LV: 'Latvia',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  MD: 'Moldova',
  MC: 'Monaco',
  ME: 'Montenegro',
  NL: 'Netherlands',
  MK: 'North Macedonia',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  RU: 'Russia',
  SM: 'San Marino',
  RS: 'Serbia',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  CH: 'Switzerland',
  UA: 'Ukraine',
  GB: 'United Kingdom',
  VA: 'Vatican City',

  // Oceania
  AU: 'Australia',
  FJ: 'Fiji',
  KI: 'Kiribati',
  MH: 'Marshall Islands',
  FM: 'Micronesia',
  NR: 'Nauru',
  NZ: 'New Zealand',
  PW: 'Palau',
  PG: 'Papua New Guinea',
  WS: 'Samoa',
  SB: 'Solomon Islands',
  TO: 'Tonga',
  TV: 'Tuvalu',
  VU: 'Vanuatu',
}

/** Safe lookup: returns the country's full name, or the input code
 *  (uppercased) if unknown. Empty / nullish input returns an em-dash. */
export const countryName = (code: string | null | undefined): string => {
  if (!code) return '—'
  const key = code.trim().toUpperCase()
  return countryMap[key] ?? key
}

/** Hybrid label, e.g. "Nigeria (NG)". Falls back to just the code if
 *  the code is unknown so we don't render "NG (NG)". */
export const countryLabel = (code: string | null | undefined): string => {
  if (!code) return '—'
  const key = code.trim().toUpperCase()
  const name = countryMap[key]
  return name ? `${name} (${key})` : key
}

/** Sorted [code, name] pairs — handy for dropdowns. */
export const countryOptions = (): Array<{ code: string; name: string }> =>
  Object.entries(countryMap)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
