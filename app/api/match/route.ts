import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { createGroups } from "@/lib/matching";
import { getThisWeekLunchDates, toDateString, getJstNow } from "@/lib/dates";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = req.headers.get("x-cron-secret");
  const adminKey = req.nextUrl.searchParams.get("key");
  return (
    cronSecret === process.env.CRON_SECRET ||
    adminKey === process.env.ADMIN_KEY
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  const jstNow = getJstNow();

  // 翌日の日付を対象とする（前日20時に実行されるため）
  const tomorrow = new Date(jstNow);
  tomorrow.setDate(jstNow.getDate() + 1);
  const targetDate = toDateString(tomorrow);

  const weekDates = getThisWeekLunchDates().map(toDateString);
  if (!weekDates.includes(targetDate)) {
    return NextResponse.json({ message: "No lunch day tomorrow" });
  }

  // 既に確定済みなら何もしない
  const { data: existing } = await db
    .from("lunch_groups")
    .select("id")
    .eq("lunch_date", targetDate)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: "Already confirmed", date: targetDate });
  }

  // 登録者取得
  const { data: regs, error: regError } = await db
    .from("registrations")
    .select("anonymous_id")
    .eq("lunch_date", targetDate)
    .eq("status", "registered");

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }

  const anonymousIds = (regs ?? []).map((r) => r.anonymous_id);

  if (anonymousIds.length < 2) {
    await db.from("lunch_groups").insert({
      lunch_date: targetDate,
      member_ids: [],
      nicknames: [],
      status: "cancelled",
      confirmed_at: new Date().toISOString(),
    });
    return NextResponse.json({ message: "Cancelled: not enough participants", date: targetDate, count: anonymousIds.length });
  }

  // ニックネーム取得
  const { data: participants, error: partError } = await db
    .from("participants")
    .select("anonymous_id, nickname")
    .in("anonymous_id", anonymousIds);

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  const nicknameMap = Object.fromEntries(
    (participants ?? []).map((p) => [p.anonymous_id, p.nickname])
  );
  const nicknames = anonymousIds.map((id) => nicknameMap[id] ?? id);

  const groups = createGroups(anonymousIds, nicknames);
  if (!groups) {
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }

  const insertData = groups.map((group) => ({
    lunch_date: targetDate,
    member_ids: group.map((m) => m.id),
    nicknames: group.map((m) => m.nickname),
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
  }));

  const { error: insertError } = await db.from("lunch_groups").insert(insertData);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Matched", date: targetDate, groups: insertData });
}
