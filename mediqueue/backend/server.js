require('dotenv').config();
const getJwtSecret = require('./utils/jwtSecret');
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const Doctor = require('./models/Doctor');
const seedDatabase = require('./utils/seedData');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    getJwtSecret();

    // Connect to database
    await connectDB();

    // Auto-seed doctors if collection is empty
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount === 0) {
      console.log('[Bootstrap] No doctors found in database. Auto-seeding initial medical staff...');
      await seedDatabase();
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log('========================================================');
      console.log(` 🏥 MediQueue Backend API Server Active`);
      console.log(` 📡 Base URL: http://localhost:${PORT}`);
      console.log(` 🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(` 🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('========================================================');
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[Server Startup Failure]', error);
    process.exit(1);
  }
};

startServer();
