import "server-only";

import {
  insertProviderActivityLog,
  touchProviderConnectionSync,
  type ProviderActivityRecord,
} from "./metadata-db";
import {
  buildProofHash,
  parseSourceType,
  submitVerifiedProgressOnchain,
} from "./verifier-program";

export type ProviderActivityIngestInput = {
  provider: string;
  wallet: string;
  goalAddress: string;
  providerActivityId: string;
  progressAmount: number;
  proofUri: string;
  sourceType: "device_app" | "wearable" | "official_api";
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  routeGeoJson?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  autoSubmitOnchain?: boolean;
};

export const ingestProviderActivity = async (
  input: ProviderActivityIngestInput,
) => {
  const proofHash = buildProofHash({
    activityId: input.providerActivityId,
    goalAddress: input.goalAddress,
    progressAmount: Math.floor(input.progressAmount),
    proofUri: input.proofUri,
    sourceType: input.sourceType,
  });

  let onchainSignature: string | null = null;
  let verifier: string | null = null;

  if (input.autoSubmitOnchain !== false) {
    const result = await submitVerifiedProgressOnchain({
      goalAddress: input.goalAddress,
      progressAmount: Math.floor(input.progressAmount),
      proofHash,
      sourceType: parseSourceType(input.sourceType),
    });

    onchainSignature = result.signature;
    verifier = result.verifier;
  }

  const createdAt = new Date().toISOString();
  const record: ProviderActivityRecord = {
    provider: input.provider,
    wallet: input.wallet,
    goalAddress: input.goalAddress,
    providerActivityId: input.providerActivityId,
    sourceType: input.sourceType,
    progressAmount: Math.floor(input.progressAmount),
    distanceMeters: input.distanceMeters ?? null,
    durationSeconds: input.durationSeconds ?? null,
    proofUri: input.proofUri,
    routeGeoJson: input.routeGeoJson ?? null,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    proofHashHex: Buffer.from(proofHash).toString("hex"),
    onchainSignature,
    createdAt,
  };

  insertProviderActivityLog(record);
  touchProviderConnectionSync(input.wallet, input.provider, createdAt);

  return {
    record,
    verifier,
  };
};
