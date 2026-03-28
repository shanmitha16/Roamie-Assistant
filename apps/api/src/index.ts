import { createApp } from './infrastructure/server';
import { config } from './infrastructure/config';
import bcrypt from 'bcryptjs';
import prisma from './infrastructure/database';

const app = createApp();

async function ensureDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: 'demo@roamie.app' } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
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
        travelProfile: JSON.stringify({ frequentFlyer: true }),
      },
    });
    console.log('✅ Demo user seeded: demo@roamie.app / password123');
  }
}

async function startServer() {
  await ensureDemoUser();
  app.listen(config.PORT, () => {
    console.log(`🚀 Roamie API running on http://localhost:${config.PORT}`);
    console.log(`📡 Ollama endpoint: ${config.OLLAMA_BASE_URL}`);
    console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
