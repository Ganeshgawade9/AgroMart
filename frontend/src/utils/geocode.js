// Free OpenStreetMap Nominatim geocoding (no API key). Keep usage light:
// Nominatim's policy allows about 1 request/second, so callers should debounce.
const BASE = 'https://nominatim.openstreetmap.org';

const unique = (arr) => arr.filter((v, i) => v && arr.indexOf(v) === i);

// Turns a Nominatim "address" object into a short label like "Hinjawadi, Pune"
export function buildLabel(address = {}, fallback = 'Current location') {
  const local =
    address.suburb || address.neighbourhood || address.village ||
    address.hamlet || address.city_district || address.town;
  const city = address.city || address.town || address.county || address.state_district;
  const label = unique([local, city]).join(', ');
  return label || address.state || fallback;
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=en`
    );
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    return buildLabel(data.address);
  } catch {
    return 'Current location';
  }
}

export async function searchPlaces(query, signal) {
  const res = await fetch(
    `${BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=1&accept-language=en`,
    { signal }
  );
  if (!res.ok) throw new Error('place search failed');
  const data = await res.json();
  return data.map((p) => ({
    id: p.place_id,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lon),
    label: buildLabel(p.address, p.display_name?.split(',')[0]),
    full: p.display_name,
  }));
}
