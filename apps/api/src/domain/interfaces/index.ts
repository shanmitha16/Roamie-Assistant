import {
  TripEntity, ItineraryDayEntity, FlightBookingEntity,
  HotelBookingEntity, CabBookingEntity, UserEntity,
  DisruptionLogEntity, TripContext, ItineraryPlan,
  AlternativeFlight, PackingItem, DocChecklistItem,
  LawNudge, WeatherForecast
} from '../entities';

export interface ITripRepository {
  findTripById(id: string): Promise<TripEntity | null>;
  findTripsByUserId(userId: string): Promise<TripEntity[]>;
  createTrip(data: Omit<TripEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripEntity>;
  updateTrip(id: string, data: Partial<TripEntity>): Promise<TripEntity>;
  deleteTrip(id: string): Promise<void>;
  findItineraryDays(tripId: string): Promise<ItineraryDayEntity[]>;
  upsertItineraryDay(data: { tripId: string; date: Date; events: string; freeGaps: string; previousVersion?: string }): Promise<ItineraryDayEntity>;
  findFlightsByTripId(tripId: string): Promise<FlightBookingEntity[]>;
  findFlightById(id: string): Promise<FlightBookingEntity | null>;
  updateFlight(id: string, data: Partial<FlightBookingEntity>): Promise<FlightBookingEntity>;
  findHotelsByTripId(tripId: string): Promise<HotelBookingEntity[]>;
  updateHotel(id: string, data: Partial<HotelBookingEntity>): Promise<HotelBookingEntity>;
  findCabsByTripId(tripId: string): Promise<CabBookingEntity[]>;
  updateCab(id: string, data: Partial<CabBookingEntity>): Promise<CabBookingEntity>;
  findUserById(id: string): Promise<UserEntity | null>;
  createDisruptionLog(data: Omit<DisruptionLogEntity, 'id' | 'createdAt'>): Promise<DisruptionLogEntity>;
}

export interface IItineraryService {
  generateItinerary(context: TripContext): Promise<ItineraryPlan>;
}

export interface IFlightService {
  findAlternatives(
    origin: string,
    destination: string,
    date: Date,
    preferences?: { seatPreference?: string; originalPrice?: number }
  ): Promise<AlternativeFlight[]>;
}

export interface IExpenseService {
  scanReceipt(receiptText: string, lang: string): Promise<{
    amount: number;
    currency: string;
    category: string;
    description: string;
    date?: string;
  }>;
}

export interface IWeatherService {
  getForecast(lat: number, lng: number, days?: number): Promise<WeatherForecast>;
}

export interface IPackingService {
  generatePackingList(context: {
    events: import('../entities').ItineraryEvent[];
    weather: WeatherForecast;
    destination: string;
    lang: string;
  }): Promise<PackingItem[]>;
}

export interface IChecklistService {
  generateChecklist(passportCountry: string, destination: string, lang: string): Promise<DocChecklistItem[]>;
}

export interface ILawNudgeService {
  getNudges(destination: string, eventCategories: string[]): LawNudge[];
  askQuestion(question: string, destination: string, lang: string): Promise<string>;
}

export interface ITranslationService {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
}
