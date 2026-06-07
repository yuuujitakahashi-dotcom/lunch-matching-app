import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

async function assertMember(db: ReturnType<typeof getServiceClient>, lunchGroupId: string, anonymousId: string) {
  const { data: group, error } = await db
    .from("lunch_groups")
    .select("member_ids")
    .eq("id", lunchGroupId)
    .single();

  if (error || !group || !group.member_ids.includes(anonymousId)) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const lunch_group_id = req.nextUrl.searchParams.get("lunch_group_id");
  const anonymous_id = req.nextUrl.searchParams.get("anonymous_id");

  if (!lunch_group_id || !anonymous_id) {
    return NextResponse.json({ error: "lunch_group_id and anonymous_id are required" }, { status: 400 });
  }

  const db = getServiceClient();

  if (!(await assertMember(db, lunch_group_id, anonymous_id))) {
    return NextResponse.json({ error: "このグループのメンバーではありません" }, { status: 403 });
  }

  const { data, error } = await db
    .from("chat_messages")
    .select("*")
    .eq("lunch_group_id", lunch_group_id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { lunch_group_id, anonymous_id, nickname, message } = await req.json();

  if (!lunch_group_id || !anonymous_id || !nickname || !message?.trim()) {
    return NextResponse.json({ error: "lunch_group_id, anonymous_id, nickname and message are required" }, { status: 400 });
  }

  const db = getServiceClient();

  if (!(await assertMember(db, lunch_group_id, anonymous_id))) {
    return NextResponse.json({ error: "このグループのメンバーではありません" }, { status: 403 });
  }

  const { data, error } = await db
    .from("chat_messages")
    .insert({ lunch_group_id, anonymous_id, nickname, message: message.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
