// Lightweight free-text "City, ST" (or "City, Province, Country") geocoding.
// No external API — resolves against a known-city table first, then falls
// back to a state/province centroid so every submission lands somewhere
// reasonable even without an exact city match.

export const CITY_COORDS = {
  'norman wells|nt': [65.282, -126.8329],
  'new york city|ny': [40.7128, -74.006],
  'new york|ny': [40.7128, -74.006],
  'minneapolis|mn': [44.9778, -93.265],
  'san luis obispo|ca': [35.2828, -120.6596],
  'houston|tx': [29.7604, -95.3698],
  'missoula|mt': [46.8721, -113.994],
  'santa cruz|ca': [36.9741, -122.0308],
  'denver|co': [39.7392, -104.9903],
  'brick|nj': [40.0583, -74.1102],
  'falls church|va': [38.8823, -77.1711],
  'sioux falls|sd': [43.5446, -96.7311],
  'beamsville|on': [43.1697, -79.4708],
  'round rock|tx': [30.5083, -97.6789],
  'white house|tn': [36.4595, -86.6642],
  'fort worth|tx': [32.7555, -97.3308],
  'tallahassee|fl': [30.4383, -84.2807],
  'birmingham|al': [33.5186, -86.8104],
  'cleveland|oh': [41.4993, -81.6944],
  'burlington|on': [43.3255, -79.799],
  'san francisco|ca': [37.7749, -122.4194],
  'sacramento|ca': [38.5816, -121.4944],
  'orlando|fl': [28.5383, -81.3792],
  'austin|tx': [30.2672, -97.7431],
  'greensboro|nc': [36.0726, -79.792],
  'toronto|on': [43.6532, -79.3832],
  'atlanta|ga': [33.749, -84.388],
  'milwaukee|wi': [43.0389, -87.9065],
  'phoenix|az': [33.4484, -112.074],
  'hollywood|fl': [26.0112, -80.1495],
  'murrieta|ca': [33.5539, -117.2139],
  'myrtle beach|sc': [33.6891, -78.8867],
  'los angeles|ca': [34.0522, -118.2437],
  'winston-salem|nc': [36.0999, -80.2442],
  'squamish|bc': [49.7016, -123.1558],
  'boise|id': [43.615, -116.2023],
  'orange|ca': [33.7879, -117.8531],
  'rexburg|id': [43.8259, -111.7897],
  'rapid city|sd': [44.0805, -103.231],
  'chicago|il': [41.8781, -87.6298],
  'saskatoon|sk': [52.1332, -106.67],
  'santa barbara|ca': [34.4208, -119.6982],
  'salt lake city|ut': [40.7608, -111.891],
  'cincinnati|oh': [39.1031, -84.512],
  'columbus|oh': [39.9612, -82.9988],
  'charleston|sc': [32.7765, -79.9311],
  'seattle|wa': [47.6062, -122.3321],
  'portland|or': [45.5152, -122.6784],
  'nashville|tn': [36.1627, -86.7816],
  'boston|ma': [42.3601, -71.0589],
  'miami|fl': [25.7617, -80.1918],
  'dallas|tx': [32.7767, -96.797],
  'san diego|ca': [32.7157, -117.1611],
  'vancouver|bc': [49.2827, -123.1207],
  'calgary|ab': [51.0447, -114.0719],
  'ottawa|on': [45.4215, -75.6972],
  'montreal|qc': [45.5019, -73.5674],
  'winnipeg|mb': [49.8951, -97.1384],
  'philadelphia|pa': [39.9526, -75.1652],
  'las vegas|nv': [36.1699, -115.1398],
}

const US_STATE_NAMES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
  kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
}
const CA_PROVINCE_NAMES = {
  alberta: 'AB', 'british columbia': 'BC', manitoba: 'MB', 'new brunswick': 'NB',
  'newfoundland and labrador': 'NL', 'newfoundland': 'NL', 'nova scotia': 'NS',
  'northwest territories': 'NT', nunavut: 'NU', ontario: 'ON',
  'prince edward island': 'PE', quebec: 'QC', saskatchewan: 'SK', yukon: 'YT',
}

// Abbreviation -> full name, for matching search text like "Texas" against
// a member's stored 2-letter region code.
export const REGION_FULL_NAMES = (() => {
  const rev = {}
  for (const [full, abbr] of Object.entries(US_STATE_NAMES)) rev[abbr] = full
  for (const [full, abbr] of Object.entries(CA_PROVINCE_NAMES)) rev[abbr] = full
  return rev
})()

export const STATE_CENTROIDS = {
  AL: [32.8, -86.8], AK: [64.2, -152.0], AZ: [34.2, -111.9], AR: [34.9, -92.4],
  CA: [37.2, -119.7], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
  FL: [28.6, -82.4], GA: [32.6, -83.4], HI: [20.3, -156.3], ID: [44.4, -114.6],
  IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5], KS: [38.5, -98.4],
  KY: [37.5, -85.3], LA: [31.0, -92.0], ME: [45.4, -69.2], MD: [39.0, -76.7],
  MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7],
  MO: [38.4, -92.5], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6],
  NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.4, -106.1], NY: [42.9, -75.5],
  NC: [35.5, -79.4], ND: [47.5, -100.5], OH: [40.3, -82.8], OK: [35.6, -97.5],
  OR: [44.0, -120.6], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7],
  VT: [44.0, -72.7], VA: [37.5, -78.8], WA: [47.5, -120.5], WV: [38.6, -80.7],
  WI: [44.6, -89.9], WY: [43.0, -107.5], DC: [38.9, -77.0],
  AB: [55.0, -115.0], BC: [54.5, -125.0], MB: [55.0, -97.0], NB: [46.5, -66.0],
  NL: [53.0, -60.0], NS: [45.0, -63.0], NT: [64.0, -119.0], NU: [70.0, -90.0],
  ON: [50.0, -85.0], PE: [46.4, -63.2], QC: [52.0, -72.0], SK: [55.0, -106.0],
  YT: [63.0, -135.0],
}

function normalizeRegion(raw) {
  if (!raw) return null
  // strip trailing punctuation ("WA." / "TX,") and collapse whitespace
  const trimmed = raw.replace(/[.,]+$/, '').trim()
  const upper = trimmed.toUpperCase()
  if (STATE_CENTROIDS[upper]) return upper
  const lower = trimmed.toLowerCase()
  if (US_STATE_NAMES[lower]) return US_STATE_NAMES[lower]
  if (CA_PROVINCE_NAMES[lower]) return CA_PROVINCE_NAMES[lower]
  return null
}

function tryResolve(city, region) {
  if (!region) return null
  const cityKey = `${city.toLowerCase()}|${region.toLowerCase()}`
  if (CITY_COORDS[cityKey]) {
    const [lat, lon] = CITY_COORDS[cityKey]
    return { city, region, lat, lon, precision: 'city' }
  }
  if (STATE_CENTROIDS[region]) {
    const [lat, lon] = STATE_CENTROIDS[region]
    return { city, region, lat, lon, precision: 'region' }
  }
  return null
}

// parseLocation("Charleston, SC") / ("Austin Texas") / ("Salt Lake City, Utah")
// -> { city, region, lat, lon, precision: 'city'|'region' }, or null if nothing usable.
export function parseLocation(text) {
  if (!text) return null
  const cleaned = text.trim()
  if (!cleaned) return null

  // comma-separated form: "City, ST" / "City, State" — try the last comma
  // segment as the region, in case there are multiple commas (e.g. "City, ST, USA").
  const commaParts = cleaned.split(',').map(s => s.trim()).filter(Boolean)
  if (commaParts.length > 1) {
    for (let i = commaParts.length - 1; i >= 1; i--) {
      const region = normalizeRegion(commaParts[i])
      if (region) {
        const city = commaParts.slice(0, i).join(', ')
        const hit = tryResolve(city, region)
        if (hit) return hit
      }
    }
  }

  // no usable comma form — try trailing words as the region ("Austin Texas",
  // "Northern VA & DC"): last word first, then last two words for names
  // like "New York" / "South Carolina".
  const words = cleaned.replace(/[.,]+$/, '').split(/\s+/).filter(Boolean)
  for (const wordCount of [2, 1]) {
    if (words.length <= wordCount) continue
    const region = normalizeRegion(words.slice(-wordCount).join(' '))
    if (region) {
      const city = words.slice(0, -wordCount).join(' ')
      const hit = tryResolve(city, region)
      if (hit) return hit
    }
  }

  // last resort — a loose, unambiguous single-city-name match
  const cityLower = commaParts[0].toLowerCase()
  const matches = Object.entries(CITY_COORDS).filter(([k]) => k.split('|')[0] === cityLower)
  if (matches.length === 1) {
    const [lat, lon] = matches[0][1]
    const matchedRegion = matches[0][0].split('|')[1].toUpperCase()
    return { city: commaParts[0], region: matchedRegion, lat, lon, precision: 'city' }
  }

  return null
}
