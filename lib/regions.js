// The Rad Pad's regional Slack channels (see the regional map on The Pad page),
// expressed as groups of US states / Canadian provinces so the member map can
// zoom to a region and say which channel it belongs to.

export const REGIONS = [
  { id: 'canada', label: 'Canada', channel: 'region-canada', emoji: '🍁', color: '#4C86C6', codes: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] },
  { id: 'west-coast', label: 'West Coast', channel: 'region-west-coast', emoji: '🌊', color: '#F07C66', codes: ['CA', 'OR', 'WA', 'AZ'] },
  { id: 'mountain-west', label: 'Mountain West', channel: 'region-mountain-west', emoji: '🏔️', color: '#D874B8', codes: ['MT', 'NV', 'UT', 'CO', 'WY', 'ID'] },
  { id: 'texas', label: 'Texas', channel: 'region-texas', emoji: '⭐', color: '#D04F4A', codes: ['TX', 'OK', 'NM'] },
  { id: 'midwest', label: 'Midwest', channel: 'region-midwest', emoji: '🌾', color: '#5FAF6F', codes: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'] },
  { id: 'south-east', label: 'South East', channel: 'region-south-east', emoji: '🌴', color: '#E0A030', codes: ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'] },
  { id: 'new-england', label: 'New England', channel: 'region-new-england', emoji: '🦞', color: '#A06BC8', codes: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC'] },
]

const BY_CODE = {}
REGIONS.forEach(r => r.codes.forEach(c => { BY_CODE[c] = r }))

export function regionOfCode(code) {
  return BY_CODE[String(code || '').toUpperCase()] || null
}

// Great-circle distance in miles.
export function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const rad = d => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
