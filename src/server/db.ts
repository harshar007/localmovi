import { PrismaClient } from '@prisma/client';
import { DB_PATH, DATABASE_DIR } from './config';
import fs from 'fs';
import path from 'path';

// Ensure directory for SQLite DB exists
if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

// Point Prisma to unpacked engine binary when running inside packaged Electron
const resourcesPath = (process as any).resourcesPath;
if (resourcesPath) {
  const unpackedEnginePath = path.join(
    resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    '.prisma',
    'client',
    'query_engine-windows.dll.node'
  );
  if (fs.existsSync(unpackedEnginePath)) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = unpackedEnginePath;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${DB_PATH.replace(/\\/g, '/')}`,
    },
  },
  log: ['error', 'warn'],
});

export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log(`[DB] Connected to SQLite database at: ${DB_PATH}`);

    // Automatically create SQLite tables if they do not exist yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Media" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "fileSize" REAL NOT NULL,
        "duration" REAL NOT NULL DEFAULT 0,
        "resolution" TEXT NOT NULL DEFAULT 'Unknown',
        "width" INTEGER,
        "height" INTEGER,
        "codec" TEXT NOT NULL DEFAULT 'unknown',
        "audioCodec" TEXT DEFAULT 'unknown',
        "bitrate" INTEGER DEFAULT 0,
        "frameRate" REAL DEFAULT 0,
        "thumbnailPath" TEXT,
        "libraryFolderId" TEXT,
        "favorite" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("libraryFolderId") REFERENCES "LibraryFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Media_filePath_key" ON "Media"("filePath");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Media_title_idx" ON "Media"("title");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Media_libraryFolderId_idx" ON "Media"("libraryFolderId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Media_createdAt_idx" ON "Media"("createdAt");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LibraryFolder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "folderPath" TEXT NOT NULL,
        "name" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "lastScannedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "LibraryFolder_folderPath_key" ON "LibraryFolder"("folderPath");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlaybackProgress" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "mediaId" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "position" REAL NOT NULL DEFAULT 0,
        "duration" REAL NOT NULL DEFAULT 0,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PlaybackProgress_mediaId_deviceId_key" ON "PlaybackProgress"("mediaId", "deviceId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PlaybackProgress_deviceId_idx" ON "PlaybackProgress"("deviceId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Device" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "deviceType" TEXT NOT NULL DEFAULT 'browser',
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "isHost" BOOLEAN NOT NULL DEFAULT false,
        "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PlaybackSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "target" TEXT NOT NULL DEFAULT 'HOST_PC',
        "mediaId" TEXT,
        "state" TEXT NOT NULL DEFAULT 'stopped',
        "position" REAL NOT NULL DEFAULT 0,
        "duration" REAL NOT NULL DEFAULT 0,
        "volume" REAL NOT NULL DEFAULT 1.0,
        "playbackRate" REAL NOT NULL DEFAULT 1.0,
        "controllerDeviceId" TEXT,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Room" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "mediaId" TEXT,
        "state" TEXT NOT NULL DEFAULT 'paused',
        "position" REAL NOT NULL DEFAULT 0,
        "controllerId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Room_code_key" ON "Room"("code");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RoomMember" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "roomId" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "deviceName" TEXT NOT NULL,
        "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastPingAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RoomMember_roomId_deviceId_key" ON "RoomMember"("roomId", "deviceId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Settings" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'admin',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`);

    console.log('[DB] Database schema and tables verified/created successfully.');
  } catch (error) {
    console.error('[DB] Failed to connect or initialize database schema:', error);
    throw error;
  }
}
