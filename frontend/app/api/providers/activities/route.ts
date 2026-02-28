import { NextResponse } from "next/server";

import { listProviderActivityLogs } from "@/app/lib/server/metadata-db";
import {
  ingestProviderActivity,
  type ProviderActivityIngestInput,
} from "@/app/lib/server/provider-sync";

const validatePayload = (body: Partial<ProviderActivityIngestInput>) => {
  if (!body.provider) {
    throw new Error("provider is required");
  }
  if (!body.wallet) {
    throw new Error("wallet is required");
  }
  if (!body.goalAddress) {
    throw new Error("goalAddress is required");
  }
  if (!body.providerActivityId) {
    throw new Error("providerActivityId is required");
  }
  if (!body.proofUri) {
    throw new Error("proofUri is required");
  }
  if (!body.sourceType) {
    throw new Error("sourceType is required");
  }
  if (
    typeof body.progressAmount !== "number" ||
    !Number.isFinite(body.progressAmount) ||
    body.progressAmount <= 0
  ) {
    throw new Error("progressAmount must be a positive number");
  }
};

export async function GET() {
  return NextResponse.json(listProviderActivityLogs());
}

export async function POST(request: Request) {
  try {
    const token = process.env.STAKEUP_PROVIDER_TOKEN;
    const providedToken = request.headers.get("x-stakeup-provider-token");

    if (token && token !== providedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<ProviderActivityIngestInput>;
    validatePayload(body);

    const result = await ingestProviderActivity({
      provider: body.provider as string,
      wallet: body.wallet as string,
      goalAddress: body.goalAddress as string,
      providerActivityId: body.providerActivityId as string,
      progressAmount: Math.floor(body.progressAmount as number),
      proofUri: body.proofUri as string,
      sourceType: body.sourceType as "device_app" | "wearable" | "official_api",
      distanceMeters: body.distanceMeters ?? null,
      durationSeconds: body.durationSeconds ?? null,
      routeGeoJson: body.routeGeoJson ?? null,
      startedAt: body.startedAt ?? null,
      endedAt: body.endedAt ?? null,
      autoSubmitOnchain: body.autoSubmitOnchain ?? true,
    });

    return NextResponse.json(
      {
        activity: result.record,
        verifier: result.verifier,
        mode: token ? "token-protected" : "open-dev",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to ingest provider activity" },
      { status: 400 },
    );
  }
}
