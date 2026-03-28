import prisma from '../../infrastructure/database';
import {
  ITripRepository
} from '../../domain/interfaces';
import {
  TripEntity, ItineraryDayEntity, FlightBookingEntity,
  HotelBookingEntity, CabBookingEntity, UserEntity,
  DisruptionLogEntity
} from '../../domain/entities';

function parseEvents(raw: any): any[] {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
}

function mapItineraryDay(row: any): ItineraryDayEntity {
  return {
    ...row,
    events: parseEvents(row.events),
    freeGaps: parseEvents(row.freeGaps),
  };
}

export class PrismaTripRepository implements ITripRepository {
  async findTripById(id: string): Promise<TripEntity | null> {
    return prisma.trip.findUnique({ where: { id } });
  }

  async findTripsByUserId(userId: string): Promise<TripEntity[]> {
    return prisma.trip.findMany({ where: { userId }, orderBy: { startDate: 'asc' } });
  }

  async createTrip(data: Omit<TripEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripEntity> {
    return prisma.trip.create({ data });
  }

  async updateTrip(id: string, data: Partial<TripEntity>): Promise<TripEntity> {
    const { id: _id, createdAt, updatedAt, ...updateData } = data as any;
    return prisma.trip.update({ where: { id }, data: updateData });
  }

  async deleteTrip(id: string): Promise<void> {
    await prisma.trip.delete({ where: { id } });
  }

  async findItineraryDays(tripId: string): Promise<ItineraryDayEntity[]> {
    const rows = await prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: { date: 'asc' },
    });
    return rows.map(mapItineraryDay);
  }

  async upsertItineraryDay(data: {
    tripId: string; date: Date; events: string; freeGaps: string; previousVersion?: string;
  }): Promise<ItineraryDayEntity> {
    // Normalize to midnight UTC to avoid time-drift duplicates
    const normalizedDate = new Date(data.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const dayStart = new Date(normalizedDate);
    const dayEnd = new Date(normalizedDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existing = await prisma.itineraryDay.findFirst({
      where: {
        tripId: data.tripId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    let row;
    if (existing) {
      row = await prisma.itineraryDay.update({
        where: { id: existing.id },
        data: {
          events: data.events,
          freeGaps: data.freeGaps,
          previousVersion: data.previousVersion || existing.events,
        },
      });
    } else {
      row = await prisma.itineraryDay.create({
        data: { ...data, date: normalizedDate },
      });
    }
    return mapItineraryDay(row);
  }

  async findFlightsByTripId(tripId: string): Promise<FlightBookingEntity[]> {
    return prisma.flightBooking.findMany({ where: { tripId } });
  }

  async findFlightById(id: string): Promise<FlightBookingEntity | null> {
    return prisma.flightBooking.findUnique({ where: { id } });
  }

  async updateFlight(id: string, data: Partial<FlightBookingEntity>): Promise<FlightBookingEntity> {
    const { id: _id, createdAt, updatedAt, ...updateData } = data as any;
    return prisma.flightBooking.update({ where: { id }, data: updateData });
  }

  async findHotelsByTripId(tripId: string): Promise<HotelBookingEntity[]> {
    return prisma.hotelBooking.findMany({ where: { tripId } });
  }

  async updateHotel(id: string, data: Partial<HotelBookingEntity>): Promise<HotelBookingEntity> {
    const { id: _id, createdAt, updatedAt, ...updateData } = data as any;
    return prisma.hotelBooking.update({ where: { id }, data: updateData });
  }

  async findCabsByTripId(tripId: string): Promise<CabBookingEntity[]> {
    return prisma.cabBooking.findMany({ where: { tripId } });
  }

  async updateCab(id: string, data: Partial<CabBookingEntity>): Promise<CabBookingEntity> {
    const { id: _id, createdAt, updatedAt, ...updateData } = data as any;
    return prisma.cabBooking.update({ where: { id }, data: updateData });
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async createDisruptionLog(data: Omit<DisruptionLogEntity, 'id' | 'createdAt'>): Promise<DisruptionLogEntity> {
    return prisma.disruptionLog.create({ data }) as any;
  }
}
