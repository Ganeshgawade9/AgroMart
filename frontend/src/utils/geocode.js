import api from '../api/axios';

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

export function parseAddressDetails(data = {}, lat = null, lng = null) {
  const address = data.address || {};

  const village =
    address.suburb ||
    address.village ||
    address.neighbourhood ||
    address.hamlet ||
    address.town ||
    address.city_district ||
    '';

  const rawTaluka =
    address.county ||
    address.subdistrict ||
    address.tehsil ||
    address.taluk ||
    address.mandal ||
    '';
  const taluka = rawTaluka
    .replace(/\s*(subdistrict|taluka|tehsil|mandal|taluk)\b/gi, '')
    .trim();

  const rawDistrict =
    address.state_district ||
    address.district ||
    (address.city && address.city !== village ? address.city : '') ||
    '';
  const district = rawDistrict
    .replace(/\s*(district|dist\.?)\b/gi, '')
    .trim();

  const pincode = String(address.postcode || address.postal_code || '').replace(/\s+/g, '').trim();
  const state = address.state || 'Maharashtra';
  let cleanAddress = (data.display_name || '').replace(/,\s*India$/i, '').trim();
  if (!cleanAddress) {
    cleanAddress = [village, taluka, district, state, pincode].filter(Boolean).join(', ');
  }

  return {
    village,
    taluka,
    district,
    pincode,
    state,
    address: cleanAddress,
    latitude: lat != null ? Number(lat) : (data.lat ? Number(data.lat) : null),
    longitude: lng != null ? Number(lng) : (data.lon ? Number(data.lon) : null),
  };
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

/**
 * High-precision reverse geocoding into structured breakdown:
 * village, taluka, district, pincode, state, address, latitude, longitude
 * Uses backend proxy first (for reliability, no CORS), falls back to direct Nominatim.
 */
export async function reverseGeocodeDetails(lat, lng) {
  // 1. Try backend reverse-geocode endpoint
  try {
    const res = await api.get('/maps/reverse-geocode/', { params: { lat, lng } });
    if (res.data && (res.data.village || res.data.district || res.data.taluka || res.data.address)) {
      return res.data;
    }
  } catch {
    // Backend fallback to direct Nominatim
  }

  // 2. Direct client fallback
  try {
    const res = await fetch(
      `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
    );
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    return parseAddressDetails(data, lat, lng);
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return null;
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
