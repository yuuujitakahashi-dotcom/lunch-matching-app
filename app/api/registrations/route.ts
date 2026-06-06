import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getThisWeekLunchDates, toDateString } from "@/lib/dates";

export async function POST(req: NextRequest) {
  const { anonymous_id, lunch_date } = await req.json();

  if (!anonymous_id || !lunch_date) {
    return NextResponse.json({ error: "anonymous_id and lunch_date are required" }, { status: 400 });
  }

  const validDates = getThisWeekLunchDates().map(toDateString);
  if (!validDates.includes(lunch_date)) {
    return NextResponse.json({ error: "Invalid lunch_date" }, { status: 400 });
  }

  const db = getServiceClient();

  const { data, error } = await db
    .from("registrations")
    .upsert(
      { anonymous_id, lunch_date, status: "registered", cancelled_at: null },
      { onConflict: "anonymous_id,lunch_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { anonymous_id, lunch_date } = await req.json();

  if (!anonymous_id || !lunch_date) {
    return NextResponse.json({ error: "anonymous_id and lunch_date are required" }, { status: 400 });
  }

  const db = getServiceClient();

  const { error } = await db
    .from("registrations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("anonymous_id", anonymous_id)
    .eq("lunch_date", lunch_date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
