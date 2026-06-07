import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getThisWeekLunchDates, toDateString, getDayLabel, getJstNow } from "@/lib/dates";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = req.headers.get("x-cron-secret");
  const adminKey = req.nextUrl.searchParams.get("key");
  return (
    cronSecret === process.env.CRON_SECRET ||
    adminKey === process.env.ADMIN_KEY
  );
}

async function sendSlack(text: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "confirmed";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const db = getServiceClient();
  const jstNow = getJstNow();

  if (type === "confirmed") {
    // 翌日のグループ確定通知
    const tomorrow = new Date(jstNow);
    tomorrow.setDate(jstNow.getDate() + 1);
    const targetDate = toDateString(tomorrow);
    const dayLabel = getDayLabel(targetDate);

    const { data: groups } = await db
      .from("lunch_groups")
      .select("*")
      .eq("lunch_date", targetDate)
      .eq("status", "confirmed");

    if (!groups || groups.length === 0) {
      const text = `😔 ${targetDate}（${dayLabel}）のランチは参加者が集まらなかったため中止です。\nまた来週！`;
      await sendSlack(text);
      return NextResponse.json({ message: "Cancelled notification sent" });
    }

    const groupText = groups
      .map((g, i) => `*グループ${i + 1}*: ${g.nicknames.join("、")}`)
      .join("\n");

    const text = `🍱 *明日のランチグループが決まりました！*\n\n📅 ${targetDate}（${dayLabel}）のランチ\n\n${groupText}\n\nサイトで確認 → ${siteUrl}/status\n\n※ 都合が悪くなった場合は当日10:00までサイトからキャンセルできます`;
    await sendSlack(text);

    await db
      .from("lunch_groups")
      .update({ notified_at: new Date().toISOString() })
      .eq("lunch_date", targetDate)
      .eq("status", "confirmed");

    return NextResponse.json({ message: "Confirmed notification sent" });
  }

  if (type === "reminder_morning") {
    // 当日朝リマインド
    const today = toDateString(jstNow);
    const dayLabel = getDayLabel(today);

    const weekDates = getThisWeekLunchDates().map(toDateString);
    if (!weekDates.includes(today)) {
      return NextResponse.json({ message: "Not a lunch day" });
    }

    const text = `☀️ *今日のランチ、お忘れなく！*\n\n📅 今日 ${today}（${dayLabel}）12:00〜\n\nキャンセル締め切りは10:00です → ${siteUrl}/status`;
    await sendSlack(text);
    return NextResponse.json({ message: "Morning reminder sent" });
  }

  if (type === "reminder_lunch") {
    // 11:30リマインド
    const today = toDateString(jstNow);
    const text = `🔔 ランチまであと30分！ ${siteUrl}/status で今日のメンバーを確認してね`;
    await sendSlack(text);
    return NextResponse.json({ message: "Lunch reminder sent" });
  }

  return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
}
