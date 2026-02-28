import { NextResponse } from "next/server";

import {
  buildProofHash,
  parseSourceType,
  submitVerifiedProgressOnchain,
} from "@/app/lib/server/verifier-program";

type VerifiedProgressRequest = {
  activityId?: string;
  goalAddress: string;
  progressAmount: number;
  proofUri: string;
  sourceType: "device_app" | "wearable" | "official_api";
};

const validateRequest = (body: Partial<VerifiedProgressRequest>) => {
  if (!body.goalAddress) {
    throw new Error("goalAddress is required");
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

export async function POST(request: Request) {
  try {
    const token = process.env.STAKEUP_SYNC_TOKEN;
    const providedToken = request.headers.get("x-stakeup-sync-token");

    if (token && providedToken !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<VerifiedProgressRequest>;
    validateRequest(body);

    const sourceType = parseSourceType(body.sourceType as string);
    const proofHash = buildProofHash({
      activityId: body.activityId,
      goalAddress: body.goalAddress as string,
      progressAmount: Math.floor(body.progressAmount as number),
      proofUri: body.proofUri as string,
      sourceType: body.sourceType as string,
    });

    const result = await submitVerifiedProgressOnchain({
      goalAddress: body.goalAddress as string,
      progressAmount: Math.floor(body.progressAmount as number),
      proofHash,
      sourceType,
    });

    return NextResponse.json(
      {
        ...result,
        mode: token ? "token-protected" : "open-dev",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit verified progress",
      },
      { status: 400 },
    );
  }
}
