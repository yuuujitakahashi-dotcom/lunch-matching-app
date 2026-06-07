import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import {
  getThisWeekLunchDates,
  getNextWeekLunchDates,
  getWeekAfterNextLunchDates,
  toDateString,
  getDayLabel,
  isGroupConfirmed,
  namesVisible,
} from "@/lib/dates";
import { DayStatus } from "@/types";

export async function GET(req: NextRequest) {
  const anonymous_id = req.nextUrl.searchParams.get("anonymous_id");
  const db = getServiceClient();

  // カレンダーに表示しうる3週間分（今週・来週・再来週）をまとめて取得
  const weekDates = [
    ...getThisWeekLunchDates(),
    ...getNextWeekLunchDates(),
    ...getWeekAfterNextLunchDates(),
  ].map(toDateString);

  const [regResult, groupResult] = await Promise.all([
    db
      .from("registrations")
      .select("*")
      .in("lunch_date", weekDates)
      .eq("status", "registered"),
    db
      .from("lunch_groups")
      .select("*")
      .in("lunch_date", weekDates)
      .eq("status", "confirmed"),
  ]);

  if (regResult.error) {
    return NextResponse.json({ error: regResult.error.message }, { status: 500 });
  }
  if (groupResult.error) {
    return NextResponse.json({ error: groupResult.error.message }, { status: 500 });
  }

  const registrations = regResult.data ?? [];
  const groups = groupResult.data ?? [];

  // 名前を表示してよい日（過去 or 当日10:00以降）の分だけ、ニックネームを引いてくる
  const otherIds = [...new Set(
    registrations
      .filter((r) => namesVisible(r.lunch_date) && r.anonymous_id !== anonymous_id)
      .map((r) => r.anonymous_id)
  )];

  let nicknameMap: Record<string, string> = {};
  if (otherIds.length > 0) {
    const { data: participants } = await db
      .from("participants")
      .select("anonymous_id, nickname")
      .in("anonymous_id", otherIds);
    nicknameMap = Object.fromEntries((participants ?? []).map((p) => [p.anonymous_id, p.nickname]));
  }

  const dayStatuses: DayStatus[] = weekDates.map((dateStr) => {
    const dayRegs = registrations.filter((r) => r.lunch_date === dateStr);
    const dayGroups = groups.filter((g) => g.lunch_date === dateStr);
    const visible = namesVisible(dateStr);

    return {
      date: dateStr,
      dayLabel: getDayLabel(dateStr),
      participantCount: dayRegs.length,
      isRegistered: anonymous_id ? dayRegs.some((r) => r.anonymous_id === anonymous_id) : false,
      names: visible
        ? dayRegs
            .filter((r) => r.anonymous_id !== anonymous_id)
            .map((r) => nicknameMap[r.anonymous_id])
            .filter((n): n is string => !!n)
        : [],
      groups: dayGroups,
      isConfirmed: isGroupConfirmed(dateStr),
    };
  });

  return NextResponse.json(dayStatuses);
}
