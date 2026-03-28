import { PackingItem, WeatherForecast, ItineraryEvent } from '../domain/entities';
import { IPackingService } from '../domain/interfaces';
import packingTemplates from '../data/packingTemplates.json';

export class GeneratePackingList {
  constructor() {}

  async execute(params: {
    events: ItineraryEvent[];
    weather?: WeatherForecast;
    destination: string;
    tripPurpose: string;
    lang: string;
  }): Promise<PackingItem[]> {
    // Determine climate from weather
    const avgTemp = params.weather?.daily
      ? params.weather.daily.reduce((sum, d) => sum + (d.tempMax + d.tempMin) / 2, 0) / params.weather.daily.length
      : 25;
    const hasRain = params.weather?.daily?.some(d => d.precipitationProbability > 50) ?? false;

    const templates = packingTemplates as any;
    const clothingKey = avgTemp > 25 ? 'clothing_hot' : avgTemp < 15 ? 'clothing_cold' : 'clothing_mild';

    const items: PackingItem[] = [];

    // Add clothing for climate
    (templates[clothingKey] || []).forEach((t: any) => {
      items.push({ category: 'clothing', item: t.item, reason: t.reason, essential: t.essential });
    });

    // Add toiletries
    (templates.toiletries || []).forEach((t: any) => {
      items.push({ category: 'toiletries', item: t.item, reason: t.reason, essential: t.essential });
    });

    // Add tech
    (templates.tech || []).forEach((t: any) => {
      items.push({ category: 'tech', item: t.item, reason: t.reason, essential: t.essential });
    });

    // Add documents
    (templates.documents || []).forEach((t: any) => {
      items.push({ category: 'documents', item: t.item, reason: t.reason, essential: t.essential });
    });

    // Add misc
    (templates.misc || []).forEach((t: any) => {
      items.push({ category: 'misc', item: t.item, reason: t.reason, essential: t.essential });
    });

    // Add business items if business trip
    if (params.tripPurpose === 'business') {
      (templates.business || []).forEach((t: any) => {
        items.push({ category: 'misc', item: t.item, reason: t.reason, essential: t.essential });
      });
    }

    // Enrich based on events
    const eventTypes = new Set(params.events.map(e => e.type));
    if (eventTypes.has('sightseeing') || eventTypes.has('activity')) {
      const hasWalkingShoes = items.some(i => i.item.toLowerCase().includes('walking'));
      if (!hasWalkingShoes) {
        items.push({ category: 'clothing', item: 'Comfortable walking shoes', reason: 'Your itinerary has extensive sightseeing', essential: true });
      }
    }

    if (hasRain) {
      const hasRainGear = items.some(i => i.item.toLowerCase().includes('rain') || i.item.toLowerCase().includes('umbrella'));
      if (!hasRainGear) {
        items.push({ category: 'clothing', item: 'Waterproof rain jacket', reason: 'Rain forecast for your travel dates', essential: true });
      }
    }

    return items;
  }
}
