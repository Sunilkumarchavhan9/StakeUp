import { NextResponse } from "next/server";

import {
  type RecipientMetadataRecord,
  listRecipientMetadata,
  upsertRecipientMetadata,
} from "@/app/lib/server/metadata-db";

export async function GET() {
  return NextResponse.json(listRecipientMetadata());
}

export async function POST(request: Request) {
  const nextRecord = (await request.json()) as RecipientMetadataRecord;
  return NextResponse.json(upsertRecipientMetadata(nextRecord), { status: 201 });
}

export async function PATCH(request: Request) {
  const nextRecord = (await request.json()) as RecipientMetadataRecord;
  return NextResponse.json(upsertRecipientMetadata(nextRecord));
}
