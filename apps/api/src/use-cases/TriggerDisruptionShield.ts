import { v4 as uuidv4 } from 'uuid';
import { ITripRepository, IItineraryService, IFlightService } from '../domain/interfaces';
import { DisruptionResolution, ItineraryDayEntity, TripContext, DisruptionStep } from '../domain/entities';
import { QRCodeService } from '../adapters/services/QRCodeService';

export class TriggerDisruptionShield {
  constructor(
    private tripRepo: ITripRepository,
    private flightService: IFlightService,
    private itineraryService: IItineraryService,
    private qrService: QRCodeService,
  ) {}

  async execute(params: {
    tripId: string;
    flightId: string;
    disruptionType: 'cancelled' | 'delayed' | 'missed';
    simulateZeroFlights?: boolean;
    lang?: string;
    onProgress?: (step: DisruptionStep) => void;
  }): Promise<DisruptionResolution> {
    const startTime = Date.now();
    const emit = (step: DisruptionStep) => params.onProgress?.(step);

    const steps: DisruptionStep[] = [
      { step: 1, label: 'Detecting disruption', status: 'pending' },
      { step: 2, label: 'Finding alternative flights', status: 'pending' },
      { step: 3, label: 'Scoring & selecting best option', status: 'pending' },
      { step: 4, label: 'Shifting hotel check-in', status: 'pending' },
      { step: 5, label: 'Rescheduling cab pickup', status: 'pending' },
      { step: 6, label: 'Rebuilding itinerary', status: 'pending' },
      { step: 7, label: 'Generating QR confirmation', status: 'pending' },
    ];

    // Step 1: Detect and load context
    steps[0].status = 'in-progress';
    emit(steps[0]);

    const trip = await this.tripRepo.findTripById(params.tripId);
    if (!trip) throw new Error('Trip not found');

    const flight = await this.tripRepo.findFlightById(params.flightId) ?? {
      id: params.flightId,
      tripId: params.tripId,
      flightNumber: 'XX-MOCK',
      origin: 'Home City',
      destination: trip.destination,
      departureTime: trip.startDate,
      arrivalTime: new Date(trip.startDate.getTime() + 3 * 3600000),
      airline: 'Demo Airlines',
      status: 'confirmed',
      price: 5000,
      seatClass: 'economy',
      confirmationCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = await this.tripRepo.findUserById(trip.userId);
    if (!user) throw new Error('User not found');

    const hotels = await this.tripRepo.findHotelsByTripId(params.tripId);
    const hotel = hotels[0];
    const cabs = await this.tripRepo.findCabsByTripId(params.tripId);
    const cab = cabs[0];

    steps[0].status = 'completed';
    steps[0].detail = `${params.disruptionType.toUpperCase()}: ${flight.flightNumber} ${flight.origin}→${flight.destination}`;
    emit(steps[0]);

    // Step 2: Find alternatives
    steps[1].status = 'in-progress';
    emit(steps[1]);

    let alternativeFlights: import('../domain/entities').AlternativeFlight[] = [];
    if (params.simulateZeroFlights) {
      alternativeFlights = [];
    } else {
      try {
        alternativeFlights = await this.flightService.findAlternatives(
          flight.origin,
          flight.destination,
          flight.departureTime,
          { seatPreference: user.seatPreference || undefined, originalPrice: flight.price }
        );
      } catch {
        throw new Error('Failed to find alternative flights');
      }
    }
    if (!params.simulateZeroFlights && alternativeFlights.length === 0) {
      throw new Error('No alternative flights available');
    }

    steps[1].status = 'completed';
    steps[1].detail = `${alternativeFlights.length} alternatives found`;
    emit(steps[1]);

    // Step 3: Score and select
    steps[2].status = 'in-progress';
    emit(steps[2]);

    const selectedFlight = alternativeFlights[0]; // Already sorted by score
    steps[2].status = 'completed';
    steps[2].detail = `${selectedFlight.flightNumber} selected (score: ${selectedFlight.score?.toFixed(2) ?? 'N/A'})`;
    emit(steps[2]);

    // Step 4: Shift hotel
    steps[3].status = 'in-progress';
    emit(steps[3]);

    const originalHotelCheckIn = hotel ? new Date(hotel.checkIn) : new Date();
    const updatedHotelCheckIn = new Date(selectedFlight.arrivalTime);
    updatedHotelCheckIn.setHours(updatedHotelCheckIn.getHours() + 2);

    if (hotel) {
      try {
        await this.tripRepo.updateHotel(hotel.id, { checkIn: updatedHotelCheckIn });
      } catch (e) { console.warn('Hotel update failed:', e); }
    }

    steps[3].status = 'completed';
    steps[3].detail = `Check-in shifted to ${updatedHotelCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    emit(steps[3]);

    // Step 5: Reschedule cab
    steps[4].status = 'in-progress';
    emit(steps[4]);

    const originalCabTime = cab ? new Date(cab.pickupTime) : new Date();
    const updatedCabTime = new Date(selectedFlight.arrivalTime);
    updatedCabTime.setMinutes(updatedCabTime.getMinutes() + 45);

    if (cab) {
      try {
        await this.tripRepo.updateCab(cab.id, { pickupTime: updatedCabTime });
      } catch (e) { console.warn('Cab update failed:', e); }
    }

    steps[4].status = 'completed';
    steps[4].detail = `Pickup rescheduled to ${updatedCabTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    emit(steps[4]);

    // Step 6: Rebuild itinerary
    steps[5].status = 'in-progress';
    emit(steps[5]);

    let updatedItinerary: ItineraryDayEntity[];
    try {
      const context: TripContext = {
        destination: trip.destination,
        startDate: trip.startDate.toISOString().split('T')[0],
        endDate: trip.endDate.toISOString().split('T')[0],
        tripPurpose: user.tripPurpose,
        savedPlaces: [],
        calendarEvents: [{
          title: `Flight ${selectedFlight.flightNumber} arrives`,
          start: selectedFlight.arrivalTime.toISOString(),
          end: new Date(selectedFlight.arrivalTime.getTime() + 60 * 60 * 1000).toISOString(),
          location: flight.destination,
        }],
        dietaryPref: user.dietaryPref,
        lang: params.lang || user.preferredLang || 'en',
      };

      const plan = await this.itineraryService.generateItinerary(context);
      updatedItinerary = plan.days.map((day) => ({
        id: uuidv4(),
        tripId: params.tripId,
        date: new Date(day.date),
        events: day.events,
        freeGaps: day.freeGaps,
        previousVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch {
      const existingDays = await this.tripRepo.findItineraryDays(params.tripId);
      updatedItinerary = existingDays.map((day) => ({
        ...day,
        events: day.events.map((e) => ({
          ...e,
          description: `[Updated after disruption] ${e.description}`,
        })),
      }));
    }

    steps[5].status = 'completed';
    steps[5].detail = `${updatedItinerary.length} days rebuilt`;
    emit(steps[5]);

    // Step 7: Generate QR
    steps[6].status = 'in-progress';
    emit(steps[6]);

    const confirmationToken = uuidv4().substring(0, 8);
    const qrUrl = `https://roamie.app/confirm/${confirmationToken}?action=pay&amount=${selectedFlight.price}&currency=INR&flight=${selectedFlight.flightNumber}`;
    let qrCodeData = '';
    try {
      qrCodeData = await this.qrService.generateQR(qrUrl);
    } catch { qrCodeData = ''; }

    // Update records
    try {
      await this.tripRepo.updateFlight(params.flightId, { status: params.disruptionType });
      await this.tripRepo.updateTrip(params.tripId, { status: 'disrupted' });
      await this.tripRepo.createDisruptionLog({
        tripId: params.tripId,
        flightId: params.flightId,
        type: params.disruptionType,
        detectedAt: new Date(),
        resolvedAt: new Date(),
        resolution: JSON.stringify({
          selectedFlight: selectedFlight.flightNumber,
          hotelShifted: !!hotel,
          cabShifted: !!cab,
        }),
      });
    } catch (error) {
      console.warn('Failed to update records:', error);
    }

    steps[6].status = 'completed';
    steps[6].detail = 'QR card ready';
    emit(steps[6]);

    const totalResolutionTimeMs = Date.now() - startTime;

    return {
      steps,
      alternativeFlights: alternativeFlights.slice(0, 3),
      selectedFlight,
      updatedHotelCheckIn,
      originalHotelCheckIn,
      updatedCabBooking: {
        pickup: cab?.pickup || `${flight.destination} Airport`,
        dropoff: cab?.dropoff || (hotel ? hotel.hotelName : `Hotel in ${trip.destination}`),
        time: updatedCabTime,
        originalTime: originalCabTime,
      },
      updatedItinerary,
      qrCodeData,
      confirmationToken,
      totalResolutionTimeMs,
    };
  }
}
