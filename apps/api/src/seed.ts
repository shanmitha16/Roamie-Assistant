import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding Roamie database...\n');

  // Clean existing data
  await prisma.disruptionLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.cabBooking.deleteMany();
  await prisma.hotelBooking.deleteMany();
  await prisma.flightBooking.deleteMany();
  await prisma.itineraryDay.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@roamie.app',
      name: 'Alex Chen',
      passwordHash,
      preferredLang: 'en',
      tripPurpose: 'leisure',
      dietaryPref: 'vegetarian',
      seatPreference: 'window',
      passportCountry: 'IN',
      paymentBalance: 25000,
      travelProfile: JSON.stringify({
        frequentFlyer: true,
        preferredAirlines: ['Singapore Airlines', 'Air India'],
        hotelPreference: 'boutique',
      }),
    },
  });
  console.log(`  ✅ User: ${user.email} (password: password123)`);

  // Create Singapore trip
  const trip = await prisma.trip.create({
    data: {
      userId: user.id,
      destination: 'Singapore',
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-22'),
      status: 'active',
    },
  });
  console.log(`  ✅ Trip: Singapore (Mar 20–22, 2026)`);

  // Flight: SQ421 BOM → SIN
  const flight = await prisma.flightBooking.create({
    data: {
      tripId: trip.id,
      flightNumber: 'SQ421',
      origin: 'BOM',
      destination: 'SIN',
      departureTime: new Date('2026-03-20T06:00:00Z'),
      arrivalTime: new Date('2026-03-20T13:30:00Z'),
      airline: 'Singapore Airlines',
      status: 'confirmed',
      price: 18500,
      seatClass: 'economy',
      confirmationCode: 'SQ-TM-421-A',
    },
  });

  // Return flight: SQ422 SIN → BOM
  await prisma.flightBooking.create({
    data: {
      tripId: trip.id,
      flightNumber: 'SQ422',
      origin: 'SIN',
      destination: 'BOM',
      departureTime: new Date('2026-03-22T20:00:00Z'),
      arrivalTime: new Date('2026-03-22T23:30:00Z'),
      airline: 'Singapore Airlines',
      status: 'confirmed',
      price: 19500,
      seatClass: 'economy',
      confirmationCode: 'SQ-TM-422-B',
    },
  });
  console.log(`  ✅ Flights: SQ421 BOM→SIN, SQ422 SIN→BOM`);

  // Hotel: Marina Bay Sands
  await prisma.hotelBooking.create({
    data: {
      tripId: trip.id,
      hotelName: 'Marina Bay Sands',
      checkIn: new Date('2026-03-20T14:00:00Z'),
      checkOut: new Date('2026-03-22T11:00:00Z'),
      confirmationCode: 'MBS-TM-3847',
      status: 'confirmed',
      latestCheckIn: '23:00',
    },
  });
  console.log(`  ✅ Hotel: Marina Bay Sands (Mar 20–22)`);

  // Cab booking
  await prisma.cabBooking.create({
    data: {
      tripId: trip.id,
      pickup: 'Singapore Changi Airport (SIN)',
      dropoff: 'Marina Bay Sands',
      pickupTime: new Date('2026-03-20T13:30:00Z'),
      status: 'confirmed',
    },
  });
  console.log(`  ✅ Cab: Airport → Marina Bay Sands`);

  // 3-day itinerary
  const day1Events = [
    { time: '08:00', duration_minutes: 60, type: 'food', title: 'Breakfast at Ya Kun Kaya Toast', description: 'Start your day with the iconic kaya toast and kopi set — a true Singaporean breakfast ritual since 1944.', location: 'Ya Kun Kaya Toast, Far East Square', isGapSuggestion: false, isBreathingRoom: false },
    { time: '09:30', duration_minutes: 120, type: 'sightseeing', title: 'Marina Bay Sands & Gardens by the Bay', description: 'Walk along the Marina Bay waterfront. Visit the Supertree Grove — free entry, stunning architecture.', location: 'Gardens by the Bay', isGapSuggestion: false, isBreathingRoom: false },
    { time: '12:00', duration_minutes: 90, type: 'food', title: 'Lunch at Maxwell Food Centre', description: 'Try the legendary Tian Tian Hainanese Chicken Rice — Michelin Bib Gourmand, under S$5.', location: 'Maxwell Food Centre, Chinatown', isGapSuggestion: false, isBreathingRoom: false },
    { time: '14:00', duration_minutes: 120, type: 'sightseeing', title: 'Chinatown Heritage Walk', description: 'Explore Buddha Tooth Relic Temple, Chinatown Street Market, and the colourful shophouses.', location: 'Chinatown, Singapore', isGapSuggestion: false, isBreathingRoom: false, culturalNudge: 'Remove shoes before entering the Buddha Tooth Relic Temple. Dress modestly.' },
    { time: '16:30', duration_minutes: 30, type: 'break', title: 'Breathing Room', description: 'Cool down at a local café. Try an iced coffee at Tiong Bahru Bakery.', location: 'Tiong Bahru Bakery', isGapSuggestion: false, isBreathingRoom: true },
    { time: '17:30', duration_minutes: 90, type: 'activity', title: 'Clarke Quay Riverside Walk', description: 'Walk along the Singapore River. Watch the boats go by. Great vibe as the lights come on at sunset.', location: 'Clarke Quay', isGapSuggestion: true, isBreathingRoom: false },
    { time: '19:30', duration_minutes: 90, type: 'food', title: 'Dinner at Lau Pa Sat', description: 'One of Singapore\'s most iconic hawker centres in a beautiful Victorian-era cast iron structure.', location: 'Lau Pa Sat, Raffles Quay', isGapSuggestion: false, isBreathingRoom: false },
    { time: '21:30', duration_minutes: 60, type: 'sightseeing', title: 'Marina Bay Sands Light Show', description: 'Watch the Spectra light and water show — free, best viewed from the waterfront promenade.', location: 'Marina Bay Sands Event Plaza', isGapSuggestion: false, isBreathingRoom: false },
  ];

  const day2Events = [
    { time: '08:30', duration_minutes: 60, type: 'food', title: 'Breakfast at Toast Box', description: 'Traditional nanyang coffee and thick toast set.', location: 'Toast Box, Orchard Road', isGapSuggestion: false, isBreathingRoom: false },
    { time: '10:00', duration_minutes: 150, type: 'activity', title: 'Sentosa Island Adventure', description: 'Cable car to Sentosa. Visit the SEA Aquarium or enjoy Palawan Beach.', location: 'Sentosa Island', isGapSuggestion: false, isBreathingRoom: false },
    { time: '12:30', duration_minutes: 60, type: 'food', title: 'Lunch at Vivocity Food Republic', description: 'Massive food court with everything from laksa to dim sum.', location: 'Vivocity Mall', isGapSuggestion: false, isBreathingRoom: false },
    { time: '14:00', duration_minutes: 120, type: 'sightseeing', title: 'Little India Walking Tour', description: 'Colourful shophouses, Sri Veeramakaliamman Temple, spice shops.', location: 'Little India, Singapore', isGapSuggestion: false, isBreathingRoom: false, culturalNudge: 'Photography may be restricted inside Hindu temples. Ask before photographing worshippers.' },
    { time: '16:30', duration_minutes: 30, type: 'break', title: 'Breathing Room', description: 'Decompress at a quiet café in Kampong Glam.', location: 'Haji Lane Café', isGapSuggestion: false, isBreathingRoom: true },
    { time: '17:30', duration_minutes: 120, type: 'shopping', title: 'Orchard Road Shopping', description: 'Singapore\'s iconic shopping strip. Browse ION Orchard or Mandarin Gallery.', location: 'Orchard Road', isGapSuggestion: false, isBreathingRoom: false },
    { time: '20:00', duration_minutes: 90, type: 'food', title: 'Dinner at Jumbo Seafood', description: 'Singapore\'s signature chilli crab — a must-try dish. Book ahead!', location: 'Jumbo Seafood, Clarke Quay', isGapSuggestion: false, isBreathingRoom: false },
  ];

  const day3Events = [
    { time: '07:30', duration_minutes: 60, type: 'food', title: 'Breakfast at Killiney Kopitiam', description: 'One of Singapore\'s oldest kopitiams. Kopi and French toast with kaya butter.', location: 'Killiney Kopitiam', isGapSuggestion: false, isBreathingRoom: false },
    { time: '09:00', duration_minutes: 120, type: 'sightseeing', title: 'Botanic Gardens (UNESCO)', description: 'Singapore\'s UNESCO World Heritage Site. National Orchid Garden — 1,000+ species.', location: 'Singapore Botanic Gardens', isGapSuggestion: false, isBreathingRoom: false },
    { time: '11:30', duration_minutes: 60, type: 'food', title: 'Brunch at Tiong Bahru', description: 'Singapore\'s hippest neighbourhood. Local bakeries, specialty coffee.', location: 'Tiong Bahru', isGapSuggestion: false, isBreathingRoom: false },
    { time: '13:00', duration_minutes: 90, type: 'activity', title: 'National Gallery Singapore', description: 'Southeast Asia\'s largest modern art museum.', location: 'National Gallery Singapore', isGapSuggestion: false, isBreathingRoom: false },
    { time: '15:00', duration_minutes: 30, type: 'break', title: 'Breathing Room', description: 'One last quiet moment. Reflect on the trip at Merlion Park.', location: 'Merlion Park', isGapSuggestion: false, isBreathingRoom: true },
    { time: '16:00', duration_minutes: 60, type: 'shopping', title: 'Last-Minute Shopping', description: 'Souvenirs at Bugis Street Market.', location: 'Bugis Street Market', isGapSuggestion: false, isBreathingRoom: false },
    { time: '17:30', duration_minutes: 60, type: 'transport', title: 'Transfer to Airport', description: 'Head to Changi Airport. Allow 60 minutes.', location: 'Singapore Changi Airport', isGapSuggestion: false, isBreathingRoom: false },
  ];

  const days = [
    { date: new Date('2026-03-20'), events: day1Events, freeGaps: [] },
    { date: new Date('2026-03-21'), events: day2Events, freeGaps: [] },
    { date: new Date('2026-03-22'), events: day3Events, freeGaps: [] },
  ];

  for (const day of days) {
    await prisma.itineraryDay.create({
      data: {
        tripId: trip.id,
        date: day.date,
        events: JSON.stringify(day.events),
        freeGaps: JSON.stringify(day.freeGaps),
      },
    });
  }
  console.log(`  ✅ Itinerary: 3 days with ${day1Events.length + day2Events.length + day3Events.length} events`);

  // Sample expenses
  await prisma.expense.createMany({
    data: [
      { userId: user.id, tripId: trip.id, amount: 4.50, currency: 'SGD', category: 'food', description: 'Kaya toast set at Ya Kun', receiptText: 'Ya Kun Toast Set $4.50' },
      { userId: user.id, tripId: trip.id, amount: 35, currency: 'SGD', category: 'transport', description: 'Grab car from airport', receiptText: 'Grab Ride\nChangi Airport T3 → Marina Bay Sands\nTotal: SGD 35.00' },
      { userId: user.id, tripId: trip.id, amount: 5, currency: 'SGD', category: 'food', description: 'Hainanese Chicken Rice', receiptText: 'Tian Tian Chicken Rice\n1x Chicken Rice $5.00\nTotal: $5.00' },
      { userId: user.id, tripId: trip.id, amount: 68, currency: 'SGD', category: 'activity', description: 'SEA Aquarium tickets ×2', receiptText: 'Resorts World Sentosa\nSEA Aquarium\n2x Adult @$34\nTotal: SGD 68.00' },
      { userId: user.id, tripId: trip.id, amount: 85, currency: 'SGD', category: 'food', description: 'Chilli crab dinner', receiptText: 'Jumbo Seafood Clarke Quay\nChilli Mud Crab $65\nMantou $8\nDrinks $12\nTotal: SGD 85.00' },
    ],
  });
  console.log(`  ✅ Expenses: 5 sample entries`);

  console.log('\n✨ Seed complete!\n');
  console.log('  Login: demo@roamie.app / password123');
  console.log(`  Trip ID: ${trip.id}`);
  console.log(`  Flight ID: ${flight.id} (SQ421 — disrupt this one)\n`);
}

seed()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
