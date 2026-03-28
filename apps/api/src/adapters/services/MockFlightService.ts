import { IFlightService } from '../../domain/interfaces';
import { AlternativeFlight } from '../../domain/entities';
import flightsData from '../../data/flights.json';

export class MockFlightService implements IFlightService {
  async findAlternatives(
    origin: string,
    destination: string,
    date: Date,
    preferences?: { seatPreference?: string; originalPrice?: number }
  ): Promise<AlternativeFlight[]> {
    const depDate = new Date(date);
    const minTime = new Date(depDate.getTime() - 6 * 60 * 60 * 1000);
    const maxTime = new Date(depDate.getTime() + 12 * 60 * 60 * 1000);

    const candidates = (flightsData as any[])
      .filter((f) => {
        const dep = new Date(f.departureTime);
        return (
          f.origin === origin &&
          f.destination === destination &&
          dep >= minTime &&
          dep <= maxTime &&
          f.seatsAvailable > 0
        );
      })
      .map((f) => {
        const dep = new Date(f.departureTime);
        const arr = new Date(f.arrivalTime);
        const durationMs = arr.getTime() - dep.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          flightNumber: f.flightNumber,
          airline: f.airline,
          origin: f.origin,
          destination: f.destination,
          departureTime: dep,
          arrivalTime: arr,
          price: f.price,
          duration: `${hours}h ${mins}m`,
          seatsAvailable: f.seatsAvailable,
          seatClass: f.seatClass || 'economy',
          amenities: f.amenities || [],
        } as AlternativeFlight;
      });

    // If no date-matched flights, fall back to all matching route flights (date-agnostic)
    const result = candidates.length > 0 ? candidates : (flightsData as any[])
      .filter((f) => f.origin === origin && f.destination === destination && f.seatsAvailable > 0)
      .map((f) => {
        // Shift the flight times to be relative to the requested date
        const originalDep = new Date(f.departureTime);
        const originalArr = new Date(f.arrivalTime);
        const durationMs = originalArr.getTime() - originalDep.getTime();
        const newDep = new Date(date);
        newDep.setHours(originalDep.getHours(), originalDep.getMinutes(), 0, 0);
        const newArr = new Date(newDep.getTime() + durationMs);
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const mins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
          flightNumber: f.flightNumber,
          airline: f.airline,
          origin: f.origin,
          destination: f.destination,
          departureTime: newDep,
          arrivalTime: newArr,
          price: f.price,
          duration: `${hours}h ${mins}m`,
          seatsAvailable: f.seatsAvailable,
          seatClass: f.seatClass || 'economy',
          amenities: f.amenities || [],
        } as AlternativeFlight;
      });

    // Score each candidate: 40% arrival earliness + 30% price + 30% seat match
    const origPrice = preferences?.originalPrice || result[0]?.price || 15000;
    const seatPref = preferences?.seatPreference?.toLowerCase() || 'any';

    const scored = result.map((f) => {
      // Arrival earliness: earlier is better (normalize to 0-1)
      const arrivalMs = f.arrivalTime.getTime();
      const allArrivals = result.map((c) => c.arrivalTime.getTime());
      const earliest = Math.min(...allArrivals);
      const latest = Math.max(...allArrivals);
      const arrivalRange = latest - earliest || 1;
      const arrivalEarliness = 1 - (arrivalMs - earliest) / arrivalRange;

      // Price delta: closer to original price is better
      const priceDelta = Math.abs(f.price - origPrice) / origPrice;
      const priceScore = Math.max(0, 1 - priceDelta);

      // Seat match
      const seatMatch = seatPref === 'any' || seatPref === f.seatClass ? 1 : 0.3;

      const score = 0.4 * arrivalEarliness + 0.3 * priceScore + 0.3 * seatMatch;

      return {
        ...f,
        score: Math.round(score * 100) / 100,
        scoreBreakdown: {
          arrivalEarliness: Math.round(arrivalEarliness * 100),
          priceDelta: Math.round(priceScore * 100),
          seatMatch: Math.round(seatMatch * 100),
        },
      };
    });

    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    return scored.slice(0, 3);
  }
}
