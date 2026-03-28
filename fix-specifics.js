const fs = require('fs');

// Fix trip.controller.ts
const tripPath = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers/trip.controller.ts';
let tripContent = fs.readFileSync(tripPath, 'utf8');

const tripOld = `      itinerary: t.itinerary.map((day: any) => ({
        ...day,
        events: JSON.parse(day.events),
        freeGaps: JSON.parse(day.freeGaps),
      })),`;
const tripNew = `      itinerary: t.itinerary.map((day: any) => ({
        ...day,
        events: (() => { try { return typeof day.events === 'string' ? JSON.parse(day.events) : (day.events || []); } catch { return []; } })(),
        freeGaps: (() => { try { return typeof day.freeGaps === 'string' ? JSON.parse(day.freeGaps) : (day.freeGaps || []); } catch { return []; } })(),
      })),`;

const tripOld2 = `        itinerary: trip.itinerary.map((day) => ({
          ...day,
          events: JSON.parse(day.events),
          freeGaps: JSON.parse(day.freeGaps),
        })),`;
const tripNew2 = `        itinerary: trip.itinerary.map((day) => ({
          ...day,
          events: (() => { try { return typeof day.events === 'string' ? JSON.parse(day.events) : (day.events || []); } catch { return []; } })(),
          freeGaps: (() => { try { return typeof day.freeGaps === 'string' ? JSON.parse(day.freeGaps) : (day.freeGaps || []); } catch { return []; } })(),
        })),`;

tripContent = tripContent.replace(tripOld, tripNew).replace(tripOld2, tripNew2);
fs.writeFileSync(tripPath, tripContent);

// Fix disruption.controller.ts
const disPath = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers/disruption.controller.ts';
let disContent = fs.readFileSync(disPath, 'utf8');

const disOld = `    // Store pending confirmation
    pendingConfirmations.set(resolution.confirmationToken, {
      flightNumber: resolution.selectedFlight.flightNumber,
      amount: resolution.selectedFlight.price,
      tripId: parsed.data.tripId,
      status: 'pending',
    });

    res.json(resolution);
    return;`;

const disNew = `    // Store pending confirmation
    pendingConfirmations.set(resolution.confirmationToken, {
      flightNumber: resolution.selectedFlight.flightNumber,
      amount: resolution.selectedFlight.price,
      tripId: parsed.data.tripId,
      status: 'pending',
    });

    // Generate QR Code
    (resolution as any).qrCodeData = await qrService.generateQR(resolution.confirmationToken);

    // Ensure disruption type is logged to DB
    try {
      await prisma.disruptionLog.create({
        data: {
          tripId: parsed.data.tripId,
          flightId: parsed.data.flightId,
          type: parsed.data.disruptionType,
          detectedAt: new Date(),
          resolvedAt: new Date(),
          resolution: JSON.stringify({
            status: 'resolved',
            selectedFlight: resolution.selectedFlight.flightNumber,
          }),
        }
      });
    } catch (err) {
      console.warn('Failed to log disruption:', err);
    }

    res.json(resolution);
    return;`;

disContent = disContent.replace(disOld, disNew);
fs.writeFileSync(disPath, disContent);
console.log('Applied precise fixes');
