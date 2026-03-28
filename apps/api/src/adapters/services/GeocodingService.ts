/**
 * GeocodingService — Uses free Nominatim (OpenStreetMap) API for
 * destination autocomplete and coordinate lookup.
 * Rate limit: 1 request/second (we add a small cache).
 */

interface GeoResult {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  country: string;
  type: string;
}

// Simple in-memory cache to respect Nominatim's rate limits
const coordsCache = new Map<string, { lat: number; lng: number }>();

export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';

  async autocomplete(query: string): Promise<GeoResult[]> {
    if (!query || query.length < 2) return [];

    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1&accept-language=en`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Roamie/1.0 (travel-planner)' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data: any[] = await res.json() as any[];

      // Exclude irrelevant types (roads, individual houses, postcodes) but allow all place-level results
      const excludedTypes = new Set(['house', 'highway', 'road', 'postcode', 'street', 'residential', 'motorway', 'trunk']);

      return data
        .filter((d: any) => !excludedTypes.has(d.type))
        .map((d: any) => ({
          name: d.address?.city || d.address?.town || d.address?.village || d.address?.state || d.name || d.display_name.split(',')[0],
          displayName: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          country: d.address?.country || '',
          type: d.type || d.class || 'place',
        }))
        .slice(0, 6);
    } catch (error) {
      console.warn('Geocoding autocomplete failed:', (error as Error).message);
      return [];
    }
  }

  async getCoords(query: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = query.toLowerCase().trim();
    if (coordsCache.has(cacheKey)) return coordsCache.get(cacheKey)!;

    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Roamie/1.0 (travel-planner)' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return null;
      const data: any[] = await res.json() as any[];

      if (data.length === 0) return null;

      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      coordsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Geocoding coords lookup failed:', (error as Error).message);
      return null;
    }
  }
}
