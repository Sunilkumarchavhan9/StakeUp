import { NextResponse } from "next/server";

import {
  listProviderConnections,
  type ProviderConnectionRecord,
  upsertProviderConnection,
} from "@/app/lib/server/metadata-db";

const normalizeRecord = (record: Partial<ProviderConnectionRecord>) => {
  if (!record.wallet) {
    throw new Error("wallet is required");
  }
  if (!record.provider) {
    throw new Error("provider is required");
  }
  if (!record.externalUserId) {
    throw new Error("externalUserId is required");
  }
  if (!record.displayName) {
    throw new Error("displayName is required");
  }

  const now = new Date().toISOString();

  return {
    wallet: record.wallet,
    provider: record.provider,
    externalUserId: record.externalUserId,
    displayName: record.displayName,
    status: record.status ?? "connected",
    accessToken: record.accessToken ?? null,
    refreshToken: record.refreshToken ?? null,
    scopes: record.scopes ?? null,
    connectedAt: record.connectedAt ?? now,
    updatedAt: now,
    lastSyncedAt: record.lastSyncedAt ?? null,
  } satisfies ProviderConnectionRecord;
};

export async function GET() {
  return NextResponse.json(listProviderConnections());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProviderConnectionRecord>;
    return NextResponse.json(upsertProviderConnection(normalizeRecord(body)), {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save provider connection" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProviderConnectionRecord>;
    return NextResponse.json(upsertProviderConnection(normalizeRecord(body)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update provider connection" },
      { status: 400 },
    );
  }
}
