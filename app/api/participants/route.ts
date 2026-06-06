import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { anonymous_id, nickname } = await req.json();

  if (!anonymous_id || !nickname) {
    return NextResponse.json({ error: "anonymous_id and nickname are required" }, { status: 400 });
  }

  if (nickname.length > 20) {
    return NextResponse.json({ error: "nickname must be 20 characters or less" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data, error } = await db
    .from("participants")
    .upsert(
      { anonymous_id, nickname, updated_at: new Date().toISOString() },
      { onConflict: "anonymous_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
