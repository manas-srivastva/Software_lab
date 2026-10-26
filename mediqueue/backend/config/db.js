const mongoose = require('mongoose');

let memoryServerInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue';
  
  try {
    console.log(`[Database] Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB host: ${mongoose.connection.host}`);
    return mongoose.connection;
  } catch (err) {
    console.warn(`[Database] Local/External MongoDB not reachable (${err.message}).`);
    console.log(`[Database] Launching zero-config embedded MongoDB instance...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'mediqueue',
        },
      });
      const memoryUri = memoryServerInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected successfully to embedded MongoDB instance at ${memoryUri}`);
      return mongoose.connection;
    } catch (innerErr) {
      console.error(`[Database Error] Could not connect to embedded MongoDB:`, innerErr.message);
      throw innerErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
  }
};

module.exports = { connectDB, disconnectDB };
