import { LawNudge } from '../domain/entities';
import lawNudgesData from '../data/lawNudges.json';

const COUNTRY_CODES: Record<string, string> = {
  'singapore': 'SG', 'japan': 'JP', 'tokyo': 'JP', 'osaka': 'JP', 'kyoto': 'JP',
  'london': 'GB', 'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB',
  'india': 'IN', 'mumbai': 'IN', 'delhi': 'IN', 'new delhi': 'IN', 'bangalore': 'IN',
  'united states': 'US', 'usa': 'US', 'new york': 'US', 'los angeles': 'US', 'san francisco': 'US',
  'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
  'thailand': 'TH', 'bangkok': 'TH', 'phuket': 'TH', 'chiang mai': 'TH',
};

export class GetLawNudges {
  execute(params: {
    destination: string;
    eventCategories: string[];
  }): LawNudge[] {
    const destLower = params.destination.toLowerCase();
    let countryCode = COUNTRY_CODES[destLower] || '';

    // Try partial match
    if (!countryCode) {
      for (const [city, code] of Object.entries(COUNTRY_CODES)) {
        if (destLower.includes(city) || city.includes(destLower)) {
          countryCode = code;
          break;
        }
      }
    }
    if (!countryCode) return [];

    const allNudges = lawNudgesData as any[];
    const relevantCategories = new Set([...params.eventCategories, 'any']);

    return allNudges
      .filter(n => n.country === countryCode && relevantCategories.has(n.venueType))
      .map(n => ({
        country: n.country,
        venueType: n.venueType,
        rule: n.rule,
        severity: n.severity as 'info' | 'warning' | 'critical',
      }));
  }
}
