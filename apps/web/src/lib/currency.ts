export const MOCK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 151.5,
  SGD: 1.35,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SGD: 'S$',
};

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = MOCK_RATES[fromCurrency.toUpperCase()] || 1;
  const toRate = MOCK_RATES[toCurrency.toUpperCase()] || 1;
  
  // Convert from origin currency to USD, then from USD to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function calculateTripCost(trip: any, cart: any[] = []): number {
  if (!trip) return 0;
  
  const tripCurrency = trip.currency || 'USD';
  let totalUSD = 0;
  
  const addCost = (amount: number, currency: string = 'USD') => {
    totalUSD += amount / (MOCK_RATES[currency.toUpperCase()] || 1);
  };

  trip.flights?.forEach((f: any) => addCost(f.price || 0, f.currency || 'USD'));
  trip.hotels?.forEach((h: any) => addCost(h.price || 0, h.currency || 'USD'));
  
  const tripCart = cart.filter(c => c.tripId === trip.id);
  tripCart.forEach(c => addCost(c.price || 0, c.currency || 'USD'));
  
  // Add mock cost for itinerary events
  trip.itinerary?.forEach((day: any) => {
    day.events?.forEach((evt: any) => {
      // Mock $20 per activity
      if (evt.type !== 'flight' && evt.type !== 'hotel' && !evt.isBreathingRoom) {
        addCost(evt.price || 20, evt.currency || 'USD');
      }
    });
  });

  return convertCurrency(totalUSD, 'USD', tripCurrency);
}
