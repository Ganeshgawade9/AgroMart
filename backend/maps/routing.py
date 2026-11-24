import urllib.request
import urllib.parse
import json
import math
import logging

logger = logging.getLogger(__name__)


def haversine(lat1, lng1, lat2, lng2):
    """Straight-line spherical distance in kilometers between two lat/lng points."""
    try:
        lat1, lng1, lat2, lng2 = float(lat1), float(lng1), float(lat2), float(lng2)
    except (TypeError, ValueError):
        return 0.0
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def fetch_route_info(lat1, lng1, lat2, lng2, mode='driving', timeout=2.5):
    """
    Fetch exact road distance (km), duration (minutes), and geojson polyline coordinates
    from OpenStreetMap / OSRM routing machines.
    Modes:
      - 'driving': standard vehicle roads (OSRM car engine)
      - 'walking': pedestrian paths, alleys, footpaths (OpenStreetMap routed-foot)
    """
    if mode == 'walking':
        url = f'https://routing.openstreetmap.de/routed-foot/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson'
    else:
        url = f'https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson'

    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'AgroConnect-Router/1.0 (agroconnect.in)',
            'Accept': 'application/json',
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                routes = data.get('routes')
                if routes and len(routes) > 0:
                    r = routes[0]
                    dist_km = round(r.get('distance', 0) / 1000.0, 1)
                    duration_mins = max(1, round(r.get('duration', 0) / 60.0))
                    raw_coords = r.get('geometry', {}).get('coordinates', [])
                    # Leaflet expects [latitude, longitude]
                    coords = [[c[1], c[0]] for c in raw_coords]
                    return {
                        'distance_km': dist_km,
                        'duration_minutes': duration_mins,
                        'coordinates': coords,
                        'source': 'osrm',
                    }
    except Exception as exc:
        logger.warning(f"OSRM route lookup failed: {exc}. Falling back to realistic road estimate.")

    # Graceful fallback: Realistic road circuity factor (urban/semi-urban India ~ 1.35x - 1.4x)
    straight = haversine(lat1, lng1, lat2, lng2)
    multiplier = 1.35 if mode == 'walking' else 1.45
    est_km = round(max(0.1, straight * multiplier), 1)
    speed_kmh = 4.5 if mode == 'walking' else 32.0
    est_mins = max(1, round(est_km / speed_kmh * 60.0))

    return {
        'distance_km': est_km,
        'duration_minutes': est_mins,
        'coordinates': [[lat1, lng1], [lat2, lng2]],
        'source': 'circuity_fallback',
    }


def enrich_shops_with_road_distance(user_lat, user_lng, shops, preferred_mode='driving'):
    """
    Enriches a list of shops with actual road distance and travel time.
    Uses OSRM Table API for lightning-fast batch resolution when available,
    and also samples walking distance for local proximity.
    """
    if not shops:
        return shops

    user_lat = float(user_lat)
    user_lng = float(user_lng)

    # 1. Initialize default straight-line and realistic circuity distances
    for shop in shops:
        s_lat = float(shop['latitude'])
        s_lng = float(shop['longitude'])
        straight = haversine(user_lat, user_lng, s_lat, s_lng)
        shop['straight_line_km'] = round(straight, 1)
        # Circuity defaults
        shop['driving_km'] = round(max(0.1, straight * 1.45), 1)
        shop['driving_mins'] = max(1, round(shop['driving_km'] / 32.0 * 60.0))
        shop['walking_km'] = round(max(0.1, straight * 1.35), 1)
        shop['walking_mins'] = max(1, round(shop['walking_km'] / 4.5 * 60.0))
        # Active default based on preferred mode
        if preferred_mode == 'walking':
            shop['distance_km'] = shop['walking_km']
            shop['duration_minutes'] = shop['walking_mins']
        else:
            shop['distance_km'] = shop['driving_km']
            shop['duration_minutes'] = shop['driving_mins']

    # 2. Query OSRM Table API for batch driving distances in a single HTTP request
    try:
        coords_str = f"{user_lng},{user_lat};" + ";".join(
            f"{float(s['longitude'])},{float(s['latitude'])}" for s in shops
        )
        table_url = f"https://router.project-osrm.org/table/v1/driving/{coords_str}?sources=0&annotations=distance,duration"
        req = urllib.request.Request(
            table_url,
            headers={
                'User-Agent': 'AgroConnect-Router/1.0',
                'Accept': 'application/json',
            }
        )
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                distances = data.get('distances', [[]])[0]
                durations = data.get('durations', [[]])[0]

                for i, shop in enumerate(shops):
                    idx = i + 1
                    if idx < len(distances) and distances[idx] is not None:
                        real_driving_km = round(distances[idx] / 1000.0, 1)
                        real_driving_mins = max(1, round((durations[idx] or 0) / 60.0))
                        shop['driving_km'] = real_driving_km
                        shop['driving_mins'] = real_driving_mins
                        if preferred_mode == 'driving':
                            shop['distance_km'] = real_driving_km
                            shop['duration_minutes'] = real_driving_mins
    except Exception as exc:
        logger.warning(f"OSRM Table API batch failed: {exc}")

    return shops
