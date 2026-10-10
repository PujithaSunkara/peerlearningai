import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;
let dbMode: 'external' | 'memory-server' = 'external';

export function getDatabaseMode() {
  return dbMode;
}

export async function connectDatabase(): Promise<void> {
  const configuredUri = process.env.MONGODB_URI;

  if (configuredUri && configuredUri !== 'mongodb://127.0.0.1:27017/peerconnect_ai') {
    try {
      await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 4000,
      });
      dbMode = 'external';
      console.log('[Database] Connected to external MongoDB.');
      return;
    } catch (err) {
      console.warn('[Database] External MONGODB_URI unreachable, falling back to embedded MongoDB server:', (err as Error).message);
    }
  } else if (configuredUri) {
    try {
      await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 2000,
      });
      dbMode = 'external';
      console.log('[Database] Connected to local MongoDB.');
      return;
    } catch {
      // Local daemon not running; spin up embedded MongoMemoryServer
    }
  }

  mongoMemoryServer = await MongoMemoryServer.create();
  const memoryUri = mongoMemoryServer.getUri();
  await mongoose.connect(memoryUri);
  dbMode = 'memory-server';
  console.log('[Database] Connected to embedded MongoMemoryServer instance.');
}
