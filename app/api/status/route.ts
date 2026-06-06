import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getThisWeekLunchDates, toDateString, getDayLabel, isGroupConfirmed } from "@/lib/dates";
import { DayStatus } from "@/types";

export async function GET(req: NextRequest) {
  const anonymous_id = req.nextUrl.searchParams.get("anonymous_id");
  const db = getServiceClient();

  const weekDates = getThisWeekLunchDates().map(toDateString);

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

  const dayStatuses: DayStatus[] = weekDates.map((dateStr) => {
    const dayRegs = registrations.filter((r) => r.lunch_date === dateStr);
    const dayGroups = groups.filter((g) => g.lunch_date === dateStr);

    return {
      date: dateStr,
      dayLabel: getDayLabel(dateStr),
      participantCount: dayRegs.length,
      isRegistered: anonymous_id ? dayRegs.some((r) => r.anonymous_id === anonymous_id) : false,
      groups: dayGroups,
      isConfirmed: isGroupConfirmed(dateStr),
    };
  });

  return NextResponse.json(dayStatuses);
}
