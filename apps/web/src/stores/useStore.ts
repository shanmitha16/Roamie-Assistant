import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  preferredLang: string;
  tripPurpose: string;
  dietaryPref?: string;
  seatPreference?: string;
  passportCountry?: string;
  paymentBalance?: number;
}

interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  flights: any[];
  hotels: any[];
  cabs?: any[];
  itinerary: any[];
  budgetAmount?: number;
  currency?: string;
  preferences?: string[];
}

export interface CartItem {
  id: string;
  type: 'hotel' | 'flight';
  name: string;
  details: string;
  price: number;
  bookingUrl?: string;
  tripId: string;
  imageTag?: string;
}

interface AppStore {
  user: User | null;
  trips: Trip[];
  currentTrip: Trip | null;
  cart: CartItem[];
  loading: boolean;
  error: string | null;
  itineraryBuilding: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; preferredLang: string; tripPurpose: string; dietaryPref?: string; seatPreference?: string; passportCountry?: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchTrips: () => Promise<void>;
  fetchTrip: (id: string) => Promise<void>;
  createTrip: (data: { destination: string; startDate: string; endDate: string; budgetAmount?: number; currency?: string; preferences?: string[] }) => Promise<{ tripId: string; built: boolean }>;
  deleteTrip: (id: string) => Promise<void>;
  addFlight: (tripId: string, data: any) => Promise<void>;
  addHotel: (tripId: string, data: any) => Promise<void>;
  buildItinerary: (tripId: string, calendarEvents?: any[], savedPlaces?: string[], energyLevel?: string) => Promise<any>;
  triggerDisruption: (tripId: string, flightId: string, type: string, simulateZeroFlights?: boolean) => Promise<any>;
  scanExpense: (receiptText: string, tripId?: string) => Promise<any>;
  fetchExpenses: (tripId?: string) => Promise<any>;
  fetchChecklist: (tripId: string) => Promise<any>;
  confirmDisruption: (token: string) => Promise<any>;
  cancelDisruption: (token: string) => Promise<any>;
  searchDestinations: (query: string) => Promise<any[]>;
  getCoords: (query: string) => Promise<{ lat: number; lng: number } | null>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  fetchBookingSuggestions: (tripId: string) => Promise<{ hotels: any[]; flights: any[] }>;
  updateItineraryDay: (dayId: string, events: any[]) => Promise<void>;
  addCustomEvent: (dayId: string, event: any) => Promise<void>;
  regenerateDay: (tripId: string, dayId: string, energyLevel?: string) => Promise<any>;
  saveNote: (tripId: string, dayId: string, eventTime: string, note: string) => Promise<any>;
  fetchNotes: (tripId: string) => Promise<any[]>;
  undoDay: (dayId: string) => Promise<any>;
  setError: (error: string | null) => void;
}

// Load persisted cart from localStorage
const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem('openclaw-cart');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const persistCart = (cart: CartItem[]) => {
  localStorage.setItem('openclaw-cart', JSON.stringify(cart));
};

export const useStore = create<AppStore>((set: any, get: any) => ({
  user: {
    id: 'demo-user',
    email: 'demo@roamie.app',
    name: 'Alex Chen',
    preferredLang: 'en',
    tripPurpose: 'leisure'
  },
  trips: [],
  currentTrip: null,
  cart: loadCart(),
  loading: false,
  error: null,
  itineraryBuilding: false,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('roamie-token', data.accessToken);
      localStorage.setItem('roamie-refresh', data.refreshToken);
      set({ user: data.user, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'Login failed', loading: false });
      throw e;
    }
  },

  register: async (regData: any) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', regData);
      localStorage.setItem('roamie-token', data.accessToken);
      localStorage.setItem('roamie-refresh', data.refreshToken);
      set({ user: data.user, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'Registration failed', loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem('roamie-token');
    localStorage.removeItem('roamie-refresh');
    set({ user: null, trips: [], currentTrip: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('roamie-token');
    if (token) {
      try {
        const { data } = await api.get('/auth/me');
        set({ user: data.user });
        return;
      } catch {
        // Token invalid/expired, fall through to auto-login
      }
    }
    // Auto-login with demo user for seamless prototype experience
    try {
      const { data } = await api.post('/auth/login', {
        email: 'demo@roamie.app',
        password: 'password123',
      });
      localStorage.setItem('roamie-token', data.accessToken);
      localStorage.setItem('roamie-refresh', data.refreshToken);
      set({ user: data.user });
    } catch {
      set({ user: null });
    }
  },

  updateProfile: async (profileData: any) => {
    try {
      const { data } = await api.put('/auth/profile', profileData);
      set({ user: data.user });
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'Update failed' });
    }
  },

  fetchTrips: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/trips');
      set({ trips: data.trips, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTrip: async (id: string) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/trips/${id}`);
      set({ currentTrip: data.trip, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTrip: async (tripData: any) => {
    const { data } = await api.post('/trips', tripData);
    const tripId = data.trip.id;
    await get().fetchTrips();
    await get().fetchTrip(tripId);

    return { tripId, built: false };
  },

  deleteTrip: async (id: string) => {
    await api.delete(`/trips/${id}`);
    const trips = get().trips.filter(t => t.id !== id);
    set({ trips });
    if (get().currentTrip?.id === id) set({ currentTrip: null });
  },

  addFlight: async (tripId: string, flightData: any) => {
    await api.post(`/trips/${tripId}/flights`, flightData);
    await get().fetchTrip(tripId);
  },

  addHotel: async (tripId: string, hotelData: any) => {
    await api.post(`/trips/${tripId}/hotels`, hotelData);
    await get().fetchTrip(tripId);
  },

  buildItinerary: async (tripId: string, calendarEvents: any[] = [], savedPlaces: string[] = [], energyLevel?: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/itinerary/build', { tripId, calendarEvents, savedPlaces, energyLevel });
      // Re-fetch the full trip so itinerary is populated in store
      await get().fetchTrip(tripId);
      set({ loading: false });
      return data;
    } catch (e: any) {
      set({ loading: false, error: e.response?.data?.error || 'Failed to build itinerary' });
      throw e;
    }
  },

  triggerDisruption: async (tripId, flightId, disruptionType, simulateZeroFlights = false) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/disruption/trigger', { tripId, flightId, disruptionType, simulateZeroFlights });
      set({ loading: false });
      return data;
    } catch (e: any) {
      set({ loading: false, error: e.response?.data?.error });
      throw e;
    }
  },

  scanExpense: async (receiptText: string, tripId?: string) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/expense/scan', { receiptText, tripId });
      set({ loading: false });
      return data;
    } catch (e: any) {
      set({ loading: false, error: e.response?.data?.error });
      throw e;
    }
  },

  fetchExpenses: async (tripId?: string) => {
    const params = tripId ? `?tripId=${tripId}` : '';
    const { data } = await api.get(`/expense/list${params}`);
    return data;
  },

  fetchChecklist: async (tripId: string) => {
    const { data } = await api.get(`/checklist/${tripId}`);
    return data;
  },

  confirmDisruption: async (token: string) => {
    const { data } = await api.post(`/disruption/confirm/${token}`);
    return data;
  },

  cancelDisruption: async (token: string) => {
    const { data } = await api.post(`/disruption/cancel/${token}`);
    return data;
  },

  searchDestinations: async (query: string) => {
    try {
      const { data } = await api.get(`/geocode/autocomplete?q=${encodeURIComponent(query)}`);
      return data.results || [];
    } catch {
      return [];
    }
  },

  getCoords: async (query: string) => {
    try {
      const { data } = await api.get(`/geocode/coords?q=${encodeURIComponent(query)}`);
      return data;
    } catch {
      return null;
    }
  },

  addToCart: (item: CartItem) => {
    const cart = [...get().cart.filter(c => c.id !== item.id), item];
    persistCart(cart);
    set({ cart });
  },

  removeFromCart: (id: string) => {
    const cart = get().cart.filter(c => c.id !== id);
    persistCart(cart);
    set({ cart });
  },

  clearCart: () => {
    persistCart([]);
    set({ cart: [] });
  },

  fetchBookingSuggestions: async (tripId: string) => {
    try {
      const { data } = await api.get(`/booking-suggestions/${tripId}`);
      return data;
    } catch {
      return { hotels: [], flights: [] };
    }
  },

  updateItineraryDay: async (dayId: string, events: any[]) => {
    await api.put(`/itinerary/day/${dayId}`, { events });
    const trip = get().currentTrip;
    if (trip) {
      set({
        currentTrip: {
          ...trip,
          itinerary: trip.itinerary.map((d: any) =>
            d.id === dayId ? { ...d, events } : d
          ),
        },
      });
    }
  },

  addCustomEvent: async (dayId: string, newEvent: any) => {
    const trip = get().currentTrip;
    if (!trip) return;
    const day = trip.itinerary.find((d: any) => d.id === dayId);
    if (!day) return;

    const existingEvents: any[] = Array.isArray(day.events)
      ? [...day.events]
      : (() => { try { return JSON.parse(day.events as any); } catch { return []; } })();

    // Mark user event
    newEvent.userAdded = true;
    existingEvents.push(newEvent);

    // Sort by time
    const toMins = (t: string) => {
      const [h, m] = (t || '09:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const fromMins = (m: number) => {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    existingEvents.sort((a: any, b: any) => toMins(a.time) - toMins(b.time));

    // Resolve overlaps: cascade shift non-user events
    for (let i = 0; i < existingEvents.length - 1; i++) {
      const curr = existingEvents[i];
      const next = existingEvents[i + 1];
      const currEnd = toMins(curr.time) + (curr.duration_minutes || 60);
      const nextStart = toMins(next.time);
      if (currEnd > nextStart && !next.userAdded) {
        // Shift the next event forward
        next.time = fromMins(currEnd + 5);
      }
    }

    await get().updateItineraryDay(dayId, existingEvents);
  },

  regenerateDay: async (tripId: string, dayId: string, energyLevel?: string) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/itinerary/regenerate-day', { tripId, dayId, energyLevel });
      const trip = get().currentTrip;
      if (trip) {
        set({
          currentTrip: {
            ...trip,
            itinerary: trip.itinerary.map((d: any) =>
              d.id === dayId ? { ...d, events: data.day.events } : d
            ),
          },
        });
      }
      set({ loading: false });
      return data;
    } catch (e: any) {
      set({ loading: false, error: e.response?.data?.error || 'Failed to regenerate day' });
      throw e;
    }
  },

  saveNote: async (tripId: string, dayId: string, eventTime: string, note: string) => {
    try {
      const { data } = await api.post('/itinerary/notes', { tripId, dayId, eventTime, note });
      return data.note;
    } catch {
      return null;
    }
  },

  fetchNotes: async (tripId: string) => {
    try {
      const { data } = await api.get(`/itinerary/notes/${tripId}`);
      return data.notes || [];
    } catch {
      return [];
    }
  },

  undoDay: async (dayId: string) => {
    try {
      const { data } = await api.post(`/itinerary/undo/${dayId}`);
      const trip = get().currentTrip;
      if (trip) {
        set({
          currentTrip: {
            ...trip,
            itinerary: trip.itinerary.map((d: any) =>
              d.id === dayId ? { ...d, events: data.day.events } : d
            ),
          },
        });
      }
      return data;
    } catch {
      return null;
    }
  },

  setError: (error: string | null) => set({ error }),
}));
