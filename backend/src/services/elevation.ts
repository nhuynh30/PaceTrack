export interface ElevationPoint {
  lat: number;
  lng: number;
  elevationM: number;
}

// In-memory cache keyed by "lat,lng" rounded to 5 decimal places (~1 m precision)
const cache = new Map<string, number>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export async function getElevations(
  points: { lat: number; lng: number }[]
): Promise<ElevationPoint[]> {
  const apiUrl = process.env['OPEN_ELEVATION_URL'];
  if (!apiUrl) throw new Error('OPEN_ELEVATION_URL is not set');

  // Separate already-cached points from ones that need a network call
  const uncached: { lat: number; lng: number; index: number }[] = [];
  const results: (number | null)[] = new Array(points.length).fill(null);

  for (let i = 0; i < points.length; i++) {
    const { lat, lng } = points[i];
    const hit = cache.get(cacheKey(lat, lng));
    if (hit !== undefined) {
      results[i] = hit;
    } else {
      uncached.push({ lat, lng, index: i });
    }
  }

  // Fetch only uncached points in a single batch request
  if (uncached.length > 0) {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        locations: uncached.map(p => ({ latitude: p.lat, longitude: p.lng })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Open Elevation API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      results: { latitude: number; longitude: number; elevation: number }[];
    };

    for (let i = 0; i < uncached.length; i++) {
      const { lat, lng, index } = uncached[i];
      const elevation = data.results[i]?.elevation ?? 0;
      cache.set(cacheKey(lat, lng), elevation);
      results[index] = elevation;
    }
  }

  return points.map((p, i) => ({
    lat: p.lat,
    lng: p.lng,
    elevationM: results[i] ?? 0,
  }));
}
