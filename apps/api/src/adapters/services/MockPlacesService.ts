import placesData from '../../data/places.json';

interface PlaceRecord {
  name: string;
  city: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  openingHours: string;
  priceRange: string;
  vibeScore: number;
  crowdLevel: string;
  culturalNudge: string;
  tripPurpose: string[];
}

export class MockPlacesService {
  private places: PlaceRecord[];

  constructor() {
    this.places = placesData.places as PlaceRecord[];
  }

  findNearby(options: {
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    category?: string;
    tripPurpose?: string;
    limit?: number;
  }): PlaceRecord[] {
    let results = [...this.places];

    if (options.city) {
      results = results.filter(
        (p) => p.city.toLowerCase() === options.city!.toLowerCase()
      );
    }

    if (options.category) {
      results = results.filter((p) => p.category === options.category);
    }

    if (options.tripPurpose) {
      results = results.filter((p) =>
        p.tripPurpose.includes(options.tripPurpose!)
      );
    }

    if (options.lat && options.lng && options.radius) {
      results = results.filter((p) => {
        const dist = this.haversine(options.lat!, options.lng!, p.lat, p.lng);
        return dist <= options.radius!;
      });
    }

    results.sort((a, b) => b.vibeScore - a.vibeScore);

    return results.slice(0, options.limit || 5);
  }

  findByCity(city: string): PlaceRecord[] {
    return this.places.filter(
      (p) => p.city.toLowerCase() === city.toLowerCase()
    );
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
