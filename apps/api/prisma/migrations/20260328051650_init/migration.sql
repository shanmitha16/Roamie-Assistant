-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "dietaryPref", "email", "id", "name", "passportCountry", "passwordHash", "paymentBalance", "preferredLang", "seatPreference", "travelProfile", "tripPurpose", "updatedAt") SELECT "createdAt", "dietaryPref", "email", "id", "name", "passportCountry", "passwordHash", "paymentBalance", "preferredLang", "seatPreference", "travelProfile", "tripPurpose", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
