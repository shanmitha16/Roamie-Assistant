-- AlterTable
ALTER TABLE "HotelBooking" ADD COLUMN "latestCheckIn" TEXT;

-- AlterTable
ALTER TABLE "ItineraryDay" ADD COLUMN "previousVersion" TEXT;

-- CreateTable
CREATE TABLE "CabBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "pickup" TEXT NOT NULL,
    "dropoff" TEXT NOT NULL,
    "pickupTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CabBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DisruptionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolution" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisruptionLog_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FlightBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" DATETIME NOT NULL,
    "arrivalTime" DATETIME NOT NULL,
    "airline" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "price" REAL NOT NULL DEFAULT 0,
    "seatClass" TEXT NOT NULL DEFAULT 'economy',
    "confirmationCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FlightBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FlightBooking" ("airline", "arrivalTime", "confirmationCode", "createdAt", "departureTime", "destination", "flightNumber", "id", "origin", "price", "status", "tripId", "updatedAt") SELECT "airline", "arrivalTime", "confirmationCode", "createdAt", "departureTime", "destination", "flightNumber", "id", "origin", "price", "status", "tripId", "updatedAt" FROM "FlightBooking";
DROP TABLE "FlightBooking";
ALTER TABLE "new_FlightBooking" RENAME TO "FlightBooking";
CREATE INDEX "FlightBooking_tripId_idx" ON "FlightBooking"("tripId");
CREATE INDEX "FlightBooking_status_idx" ON "FlightBooking"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "tripPurpose" TEXT NOT NULL DEFAULT 'leisure',
    "dietaryPref" TEXT,
    "seatPreference" TEXT,
    "passportCountry" TEXT,
    "paymentBalance" REAL NOT NULL DEFAULT 10000,
    "travelProfile" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "dietaryPref", "email", "id", "name", "passwordHash", "preferredLang", "seatPreference", "tripPurpose", "updatedAt") SELECT "createdAt", "dietaryPref", "email", "id", "name", "passwordHash", "preferredLang", "seatPreference", "tripPurpose", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CabBooking_tripId_idx" ON "CabBooking"("tripId");

-- CreateIndex
CREATE INDEX "DisruptionLog_tripId_idx" ON "DisruptionLog"("tripId");
