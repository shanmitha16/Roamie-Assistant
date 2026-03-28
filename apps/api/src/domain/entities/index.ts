// ========================================
// Domain Entities — Roamie
// ========================================

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  preferredLang: string;
  tripPurpose: string;
  dietaryPref: string | null;
  seatPreference: string | null;
  passportCountry: string | null;
  paymentBalance: number;
  travelProfile: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripEntity {
  id: string;
  userId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryEvent {
  time: string;
  duration_minutes: number;
  type: 'activity' | 'food' | 'transport' | 'break' | 'meeting' | 'sightseeing' | 'shopping';
  title: string;
  description: string;
  location: string;
  isGapSuggestion: boolean;
  isBreathingRoom: boolean;
  culturalNudge?: string;
}

export interface FreeGap {
  start: string;
  end: string;
  durationMinutes: number;
  suggestions?: GapSuggestion[];
}

export interface GapSuggestion {
  name: string;
  category: string;
  distance: string;
  duration_minutes: number;
}

export interface ItineraryDayEntity {
  id: string;
  tripId: string;
  date: Date;
  events: ItineraryEvent[];
  freeGaps: FreeGap[];
  previousVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlightBookingEntity {
  id: string;
  tripId: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  airline: string;
  status: string;
  price: number;
  seatClass: string;
  confirmationCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HotelBookingEntity {
  id: string;
  tripId: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  confirmationCode: string | null;
  status: string;
  latestCheckIn: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CabBookingEntity {
  id: string;
  tripId: string;
  pickup: string;
  dropoff: string;
  pickupTime: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseEntity {
  id: string;
  userId: string;
  tripId: string | null;
  amount: number;
  currency: string;
  category: string;
  description: string;
  receiptText: string | null;
  date: Date;
  createdAt: Date;
}

export interface DisruptionLogEntity {
  id: string;
  tripId: string;
  flightId: string;
  type: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  resolution: string;
  createdAt: Date;
}

export interface AlternativeFlight {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  duration: string;
  seatsAvailable: number;
  seatClass: string;
  amenities: string[];
  score?: number;
  bookingUrl?: string;
  scoreBreakdown?: {
    arrivalEarliness: number;
    priceDelta: number;
    seatMatch: number;
  };
}

export interface DisruptionResolution {
  steps: DisruptionStep[];
  alternativeFlights: AlternativeFlight[];
  selectedFlight: AlternativeFlight;
  updatedHotelCheckIn: Date;
  originalHotelCheckIn: Date;
  updatedCabBooking: { pickup: string; dropoff: string; time: Date; originalTime: Date };
  updatedItinerary: ItineraryDayEntity[];
  qrCodeData: string;
  confirmationToken: string;
  totalResolutionTimeMs: number;
}

export interface DisruptionStep {
  step: number;
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
  detail?: string;
}

export interface TripContext {
  destination: string;
  startDate: string;
  endDate: string;
  tripPurpose: string;
  savedPlaces: string[];
  calendarEvents: CalendarEvent[];
  dietaryPref: string | null;
  lang: string;
  weather?: WeatherForecast;
  energyLevel?: 'high' | 'medium' | 'low';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
}

export interface ItineraryPlan {
  days: {
    date: string;
    events: ItineraryEvent[];
    freeGaps: FreeGap[];
  }[];
  documentChecklist: string[];
  culturalNudges: string[];
  packingTips?: string[];
}

export interface WeatherForecast {
  daily: {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitationProbability: number;
    weatherCode: number;
    description: string;
  }[];
}

export interface PackingItem {
  category: 'clothing' | 'toiletries' | 'documents' | 'tech' | 'misc';
  item: string;
  reason: string;
  essential: boolean;
}

export interface DocChecklistItem {
  category: 'documents' | 'health' | 'money' | 'safety';
  item: string;
  details: string;
  urgent: boolean;
}

export interface LawNudge {
  country: string;
  venueType: string;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ExpenseReport {
  expenses: ExpenseEntity[];
  totalByCategory: Record<string, number>;
  totalByCurrency: Record<string, number>;
  grandTotal: number;
  homeCurrency: string;
}
