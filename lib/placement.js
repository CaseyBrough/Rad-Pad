// Where a map pin goes: on the North America map (from its city), or in an
// "outside North America" area shown beside it. The admin can override the
// automatic choice per pin with the map_area column.

import { parseLocation, classifyIntl, CA_PROVINCE_CODES } from './geo'

export const AREAS = [
  { id: 'europe', label: 'Europe', emoji: '🏰' },
  { id: 'oceania', label: 'Oceania', emoji: '🦘' },
  { id: 'asia', label: 'Asia', emoji: '🏯' },
  { id: 'middle-east', label: 'Middle East', emoji: '🕌' },
  { id: 'africa', label: 'Africa', emoji: '🌍' },
  { id: 'latin-america', label: 'Latin America', emoji: '🌎' },
]
export const AREA_LABEL = Object.fromEntries(AREAS.map(a => [a.id, a.label]))

// What the admin can pick. '' = automatic.
export const AREA_OPTIONS = [
  { value: '', label: 'Automatic (from the location text)' },
  { value: 'na', label: 'North America — pin the city on the map' },
  ...AREAS.map(a => ({ value: a.id, label: `Outside North America — ${a.label}` })),
]

const COUNTRIES = {
  europe: ['ireland', 'united kingdom', 'uk', 'u k', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland', 'netherlands', 'holland', 'france', 'germany', 'spain', 'italy', 'portugal', 'belgium', 'luxembourg', 'switzerland', 'austria', 'sweden', 'norway', 'denmark', 'finland', 'iceland', 'poland', 'czechia', 'czech republic', 'slovakia', 'hungary', 'romania', 'bulgaria', 'greece', 'croatia', 'serbia', 'slovenia', 'estonia', 'latvia', 'lithuania', 'ukraine', 'malta', 'cyprus', 'europe'],
  oceania: ['australia', 'new zealand', 'nz', 'fiji', 'papua new guinea', 'samoa', 'tonga', 'oceania'],
  asia: ['japan', 'china', 'hong kong', 'taiwan', 'south korea', 'korea', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'singapore', 'malaysia', 'indonesia', 'thailand', 'vietnam', 'philippines', 'cambodia', 'asia'],
  'middle-east': ['united arab emirates', 'uae', 'dubai', 'abu dhabi', 'saudi arabia', 'qatar', 'kuwait', 'bahrain', 'oman', 'israel', 'jordan', 'lebanon', 'turkey', 'turkiye', 'egypt', 'iran', 'iraq'],
  africa: ['south africa', 'nigeria', 'kenya', 'ghana', 'ethiopia', 'tanzania', 'uganda', 'morocco', 'tunisia', 'algeria', 'senegal', 'rwanda', 'zimbabwe', 'zambia', 'namibia', 'botswana', 'africa'],
  'latin-america': ['mexico', 'guatemala', 'belize', 'honduras', 'el salvador', 'nicaragua', 'costa rica', 'panama', 'colombia', 'venezuela', 'ecuador', 'peru', 'bolivia', 'chile', 'argentina', 'uruguay', 'paraguay', 'brazil', 'dominican republic', 'puerto rico', 'jamaica', 'bahamas', 'cuba', 'south america', 'latin america'],
}
const COUNTRY_INDEX = []
Object.entries(COUNTRIES).forEach(([area, names]) => names.forEach(n => COUNTRY_INDEX.push([n, area])))
COUNTRY_INDEX.sort((a, b) => b[0].length - a[0].length)

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\bnew (england|mexico)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

// A country (or well-known area) named in the text. Whole words only, so
// "Paris, TX" is not France; it takes a country name to count.
export function areaFromCountry(text) {
  const t = ` ${norm(text)} `
  for (const [name, area] of COUNTRY_INDEX) {
    if (t.includes(` ${name} `)) return area
  }
  return null
}

// -> { kind: 'na', parsed } | { kind: 'intl', area, via } | { kind: 'none' }
export function placePin({ location, map_area: override } = {}) {
  const text = String(location || '')
  const forced = override && override !== 'auto' ? override : ''
  if (forced && forced !== 'na' && AREA_LABEL[forced]) return { kind: 'intl', area: forced, via: 'admin' }

  // "Panama City, FL" and "Lebanon, TN" are American; only a place that does not
  // read as a US state or Canadian province gets checked for a foreign country.
  // (Matching the bare city name first is what put Sydney, Australia in Nova Scotia.)
  const strict = parseLocation(text, { loose: false })
  if (strict) return { kind: 'na', parsed: strict, country: CA_PROVINCE_CODES.has(strict.region) ? 'Canada' : 'USA' }
  if (!forced) {
    const area = areaFromCountry(text)
    if (area) return { kind: 'intl', area, via: 'country' }
  }
  const parsed = parseLocation(text)
  if (parsed) return { kind: 'na', parsed, country: CA_PROVINCE_CODES.has(parsed.region) ? 'Canada' : 'USA' }
  if (!forced) {
    const loose = classifyIntl(text)
    if (loose) return { kind: 'intl', area: loose, via: 'city' }
  }
  return { kind: 'none' }
}

// One line for the admin: where this pin will show up and why.
export function describePlacement(pin) {
  const w = placePin(pin)
  if (w.kind === 'na') {
    const { city, region, precision } = w.parsed
    return { ok: true, text: `On the map · ${city}${region ? `, ${region}` : ''}${precision === 'city' ? '' : ' (approximate — city not recognised)'}` }
  }
  if (w.kind === 'intl') {
    return { ok: true, text: `Beyond North America · ${AREA_LABEL[w.area]}${w.via === 'admin' ? ' (set by you)' : ''}` }
  }
  return { ok: false, text: 'Can’t place this location yet — choose where it goes' }
}
