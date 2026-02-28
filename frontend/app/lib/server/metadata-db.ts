import "server-only";

import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";

import Database from "better-sqlite3";

export type RecipientMetadataRecord = {
  wallet: string;
  label: string;
  kind: number;
  createdAt: string;
};

export type ProviderConnectionRecord = {
  wallet: string;
  provider: string;
  externalUserId: string;
  displayName: string;
  status: "connected" | "revoked" | "expired";
  accessToken?: string | null;
  refreshToken?: string | null;
  scopes?: string | null;
  connectedAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
};

export type ProviderActivityRecord = {
  provider: string;
  wallet: string;
  goalAddress: string;
  providerActivityId: string;
  sourceType: "device_app" | "wearable" | "official_api";
  progressAmount: number;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  proofUri: string;
  routeGeoJson?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  proofHashHex: string;
  onchainSignature?: string | null;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "stakeup.db");

let database: Database.Database | null = null;

const ensureDatabase = () => {
  if (database) {
    return database;
  }

  mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS recipient_metadata (
      wallet TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      kind INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_connections (
      wallet TEXT NOT NULL,
      provider TEXT NOT NULL,
      external_user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      scopes TEXT,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_synced_at TEXT,
      PRIMARY KEY (wallet, provider)
    );

    CREATE TABLE IF NOT EXISTS provider_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      wallet TEXT NOT NULL,
      goal_address TEXT NOT NULL,
      provider_activity_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      progress_amount REAL NOT NULL,
      distance_meters REAL,
      duration_seconds REAL,
      proof_uri TEXT NOT NULL,
      route_geo_json TEXT,
      started_at TEXT,
      ended_at TEXT,
      proof_hash_hex TEXT NOT NULL,
      onchain_signature TEXT,
      created_at TEXT NOT NULL
    );
  `);

  migrateRecipientSeed(db);
  database = db;
  return db;
};

const readJsonSeed = <T>(fileName: string): T[] => {
  const filePath = path.join(dataDir, fileName);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T[];
  } catch {
    return [];
  }
};

const migrateRecipientSeed = (db: Database.Database) => {
  const recipientCount = Number(
    (db.prepare("SELECT COUNT(*) as count FROM recipient_metadata").get() as {
      count: number;
    }).count,
  );

  if (recipientCount > 0) {
    return;
  }

  const recipientSeed = readJsonSeed<RecipientMetadataRecord>("recipient-metadata.json");
  const insertRecipient = db.prepare(`
    INSERT OR REPLACE INTO recipient_metadata (
      wallet,
      label,
      kind,
      created_at
    ) VALUES (
      @wallet,
      @label,
      @kind,
      @createdAt
    )
  `);

  for (const record of recipientSeed) {
    insertRecipient.run(record);
  }
};

export const listRecipientMetadata = () => {
  const db = ensureDatabase();

  return db
    .prepare(
      `
        SELECT
          wallet,
          label,
          kind,
          created_at as createdAt
        FROM recipient_metadata
        ORDER BY created_at ASC
      `,
    )
    .all() as RecipientMetadataRecord[];
};

export const upsertRecipientMetadata = (record: RecipientMetadataRecord) => {
  const db = ensureDatabase();

  db.prepare(
    `
      INSERT INTO recipient_metadata (
        wallet,
        label,
        kind,
        created_at
      ) VALUES (
        @wallet,
        @label,
        @kind,
        @createdAt
      )
      ON CONFLICT(wallet) DO UPDATE SET
        label = excluded.label,
        kind = excluded.kind,
        created_at = excluded.created_at
    `,
  ).run(record);

  return record;
};

export const listProviderConnections = () => {
  const db = ensureDatabase();

  return db
    .prepare(
      `
        SELECT
          wallet,
          provider,
          external_user_id as externalUserId,
          display_name as displayName,
          status,
          access_token as accessToken,
          refresh_token as refreshToken,
          scopes,
          connected_at as connectedAt,
          updated_at as updatedAt,
          last_synced_at as lastSyncedAt
        FROM provider_connections
        ORDER BY updated_at DESC
      `,
    )
    .all() as ProviderConnectionRecord[];
};

export const upsertProviderConnection = (record: ProviderConnectionRecord) => {
  const db = ensureDatabase();

  db.prepare(
    `
      INSERT INTO provider_connections (
        wallet,
        provider,
        external_user_id,
        display_name,
        status,
        access_token,
        refresh_token,
        scopes,
        connected_at,
        updated_at,
        last_synced_at
      ) VALUES (
        @wallet,
        @provider,
        @externalUserId,
        @displayName,
        @status,
        @accessToken,
        @refreshToken,
        @scopes,
        @connectedAt,
        @updatedAt,
        @lastSyncedAt
      )
      ON CONFLICT(wallet, provider) DO UPDATE SET
        external_user_id = excluded.external_user_id,
        display_name = excluded.display_name,
        status = excluded.status,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        scopes = excluded.scopes,
        connected_at = excluded.connected_at,
        updated_at = excluded.updated_at,
        last_synced_at = excluded.last_synced_at
    `,
  ).run(record);

  return record;
};

export const touchProviderConnectionSync = (
  wallet: string,
  provider: string,
  syncedAt: string,
) => {
  const db = ensureDatabase();

  db.prepare(
    `
      UPDATE provider_connections
      SET last_synced_at = @syncedAt, updated_at = @syncedAt
      WHERE wallet = @wallet AND provider = @provider
    `,
  ).run({ wallet, provider, syncedAt });
};

export const listProviderActivityLogs = (limit = 50) => {
  const db = ensureDatabase();

  return db
    .prepare(
      `
        SELECT
          provider,
          wallet,
          goal_address as goalAddress,
          provider_activity_id as providerActivityId,
          source_type as sourceType,
          progress_amount as progressAmount,
          distance_meters as distanceMeters,
          duration_seconds as durationSeconds,
          proof_uri as proofUri,
          route_geo_json as routeGeoJson,
          started_at as startedAt,
          ended_at as endedAt,
          proof_hash_hex as proofHashHex,
          onchain_signature as onchainSignature,
          created_at as createdAt
        FROM provider_activity_logs
        ORDER BY created_at DESC
        LIMIT ?
      `,
    )
    .all(limit) as ProviderActivityRecord[];
};

export const insertProviderActivityLog = (record: ProviderActivityRecord) => {
  const db = ensureDatabase();

  db.prepare(
    `
      INSERT INTO provider_activity_logs (
        provider,
        wallet,
        goal_address,
        provider_activity_id,
        source_type,
        progress_amount,
        distance_meters,
        duration_seconds,
        proof_uri,
        route_geo_json,
        started_at,
        ended_at,
        proof_hash_hex,
        onchain_signature,
        created_at
      ) VALUES (
        @provider,
        @wallet,
        @goalAddress,
        @providerActivityId,
        @sourceType,
        @progressAmount,
        @distanceMeters,
        @durationSeconds,
        @proofUri,
        @routeGeoJson,
        @startedAt,
        @endedAt,
        @proofHashHex,
        @onchainSignature,
        @createdAt
      )
    `,
  ).run(record);

  return record;
};
