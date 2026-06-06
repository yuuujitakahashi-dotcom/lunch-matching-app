"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Toast, useToast } from "./components/Toast";
import { getThisWeekLunchDates, getNextWeekLunchDates, getWeekAfterNextLunchDates, toDateString } from "@/lib/dates";
import { DayStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_KEYS = ["月", "火", "水", "木", "金"];

// 確定UIプレビュー用（確認後は false に戻す）
const PREVIEW_CONFIRMED = true;

const DUMMY_GROUPS = [
  { id: "g1", lunch_date: "", member_ids: ["self"], nicknames: ["田中", "鈴木", "あなた"], status: "confirmed" as const, confirmed_at: null, notified_at: null },
  { id: "g2", lunch_date: "", member_ids: ["u2"], nicknames: ["山田", "伊藤", "渡辺"], status: "confirmed" as const, confirmed_at: null, notified_at: null },
  { id: "g3", lunch_date: "", member_ids: ["u3"], nicknames: ["小林", "加藤"], status: "confirmed" as const, confirmed_at: null, notified_at: null },
];

// ダミーデータ（後でAPIから取得）index 0-4: 今週, 5-9: 来週, 10-14: 再来週
const DUMMY_PARTICIPANTS: { name: string }[][] = [
  [{ name: "田中" }, { name: "鈴木" }, { name: "佐藤" }],
  [{ name: "山田" }, { name: "伊藤" }, { name: "渡辺" }, { name: "中村" }],
  [{ name: "小林" }, { name: "加藤" }],
  [{ name: "吉田" }, { name: "山本" }, { name: "松本" }],
  [],
  [{ name: "田中" }, { name: "伊藤" }],
  [{ name: "鈴木" }, { name: "佐藤" }, { name: "渡辺" }],
  [],
  [{ name: "加藤" }, { name: "吉田" }, { name: "中村" }],
  [{ name: "山田" }, { name: "小林" }],
  [],
  [{ name: "田中" }, { name: "松本" }],
  [{ name: "伊藤" }, { name: "渡辺" }, { name: "中村" }],
  [],
  [{ name: "鈴木" }, { name: "佐藤" }],
];


export default function HomePage() {
  const [anonymousId, setAnonymousId] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [registeredDates, setRegisteredDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [modalNicknameInput, setModalNicknameInput] = useState("");
  const [todayStatus, setTodayStatus] = useState<DayStatus | null>(null);
  const { toast, show, hide } = useToast();

  const thisWeekDates = getThisWeekLunchDates().map(toDateString);
  const nextWeekDates = getNextWeekLunchDates().map(toDateString);
  const weekAfterNextDates = getWeekAfterNextLunchDates().map(toDateString);

  const jstForSwitch = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const switchDay = jstForSwitch.getDay(); // 0=日, 5=金, 6=土
  const switchHour = jstForSwitch.getHours();
  // 金曜14:00以降 or 土・日 → 来週＋再来週 を表示
  const showNextAndAfter =
    switchDay === 0 || switchDay === 6 || (switchDay === 5 && switchHour >= 14);

  const calendarWeeks = showNextAndAfter
    ? [
        { label: "来週", dates: nextWeekDates, offset: 5 },
        { label: "再来週", dates: weekAfterNextDates, offset: 10 },
      ]
    : [
        { label: "今週", dates: thisWeekDates, offset: 0 },
        { label: "来週", dates: nextWeekDates, offset: 5 },
      ];

  useEffect(() => {
    setMounted(true);
    let id = localStorage.getItem("anonymous_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anonymous_id", id);
    }
    setAnonymousId(id);
    const stored = localStorage.getItem("nickname");
    if (stored) setNickname(stored);
  }, []);

  const fetchRegistrations = useCallback(async (id: string) => {
    const res = await fetch(`/api/status?anonymous_id=${id}`);
    if (!res.ok) return;
    const data: DayStatus[] = await res.json();
    const registered = data
      .filter((d) => d.isRegistered)
      .map((d) => d.date);
    setRegisteredDates(registered);
    const todayStr = toDateString(new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })));
    setTodayStatus(data.find((d) => d.date === todayStr) ?? null);
  }, []);

  useEffect(() => {
    if (anonymousId) fetchRegistrations(anonymousId);
  }, [anonymousId, fetchRegistrations]);

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return show("ニックネームを入力してください", "error");
    setLoading(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_id: anonymousId, nickname: trimmed }),
      });
      if (!res.ok) { show("保存に失敗しました", "error"); return; }
      localStorage.setItem("nickname", trimmed);
      setNickname(trimmed);
      setNicknameInput("");
      setEditingNickname(false);
      show("ニックネームを保存しました");
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async (date: string, nicknameToUse: string) => {
    setLoading(true);
    try {
      await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_id: anonymousId, nickname: nicknameToUse }),
      });
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_id: anonymousId, lunch_date: date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        show(body.error ?? "処理に失敗しました", "error");
        return;
      }
      setRegisteredDates((prev) => [...prev, date]);
      show("エントリーしました 🎉\nエントリーした当日の朝9時にグループをランダムで決定します");
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = async (date: string) => {
    if (!anonymousId) return;
    const isRegistered = registeredDates.includes(date);

    if (isRegistered) {
      setLoading(true);
      try {
        const res = await fetch("/api/registrations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymous_id: anonymousId, lunch_date: date }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          show(body.error ?? "処理に失敗しました", "error");
          return;
        }
        setRegisteredDates((prev) => prev.filter((d) => d !== date));
        show("キャンセルしました");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!nickname || nickname === "Guest") {
      setPendingDate(date);
      return;
    }

    await doRegister(date, nickname);
  };

  const confirmModal = async (skipNickname: boolean) => {
    if (!pendingDate) return;
    const trimmed = modalNicknameInput.trim();
    const nameToUse = (!skipNickname && trimmed) ? trimmed : "Guest";
    localStorage.setItem("nickname", nameToUse);
    setNickname(nameToUse);
    setPendingDate(null);
    setModalNicknameInput("");
    await doRegister(pendingDate, nameToUse);
  };

  if (!mounted) return null;

  const jstHour = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getHours();
  const isLunchWindow = PREVIEW_CONFIRMED || (jstHour >= 9 && jstHour < 14);
  const isGroupConfirmedNow = PREVIEW_CONFIRMED || !!todayStatus?.isConfirmed;
  const activeGroups = PREVIEW_CONFIRMED ? DUMMY_GROUPS : (todayStatus?.groups ?? []);
  const myGroup = PREVIEW_CONFIRMED
    ? DUMMY_GROUPS.find((g) => g.member_ids.includes("self")) ?? null
    : (todayStatus?.groups?.find((g) => g.member_ids.includes(anonymousId)) ?? null);
  const showLunchBanner = isLunchWindow && isGroupConfirmedNow;

  return (
    <>
      <div className="mb-6">
        {editingNickname ? (
          <div className="flex items-center gap-2">
            <Input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNickname()}
              placeholder="ニックネームを入力"
              maxLength={20}
              autoFocus
              className="text-base max-w-[200px]"
            />
            <Button size="sm" onClick={saveNickname} disabled={loading || !nicknameInput.trim()}>
              保存
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditingNickname(false); setNicknameInput(""); }}>
              キャンセル
            </Button>
          </div>
        ) : (
          <p className="text-xl text-muted-foreground flex items-center gap-2">
            こんにちは、<span className="text-foreground font-semibold">{nickname || "Guest"}</span><span className="text-muted-foreground text-xl">さん</span>
            <button
              onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="ニックネームを変更"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </p>
        )}
      </div>

      {/* ランチバナー（9:00〜14:00 グループ確定時） */}
      {showLunchBanner && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-emerald-900">
              {(() => {
                const jst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
                const days = ["日", "月", "火", "水", "木", "金", "土"];
                const label = `${jst.getMonth() + 1}/${jst.getDate()}(${days[jst.getDay()]})`;
                return `今日${label}のランチメンバーが決定しました 🎉`;
              })()}
            </p>
          </div>
          <div className="px-5 py-4">
            {activeGroups.length === 0 ? (
              <p className="text-sm text-emerald-700">今日のランチには参加者がいません</p>
            ) : (
              <>
              <div className="flex gap-6 flex-wrap">
                {activeGroups.map((group, idx) => {
                  const isMyGroup = group.id === myGroup?.id;
                  const leaderName = group.nicknames[0];
                  return (
                    <div key={group.id} className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground mb-1.5">
                        {isMyGroup ? "あなたのグループ" : `グループ ${idx + 1}`}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.nicknames.map((name) => {
                          const isSelf = isMyGroup && name === (nickname || "Guest");
                          const isLeader = name === leaderName;
                          return (
                            <span key={name} className="flex items-center gap-1">
                              <span className={cn(
                                "text-sm px-3 py-1.5 rounded-full font-medium",
                                isSelf
                                  ? "bg-emerald-700 text-white font-bold"
                                  : "bg-white border border-emerald-200 text-emerald-900"
                              )}>
                                {isLeader && <span className="mr-1">🚩</span>}{name}
                              </span>
                              {isSelf && (
                                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#064e3b", color: "#ffffff" }}>
                                  あなた
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-foreground mt-3">※ リーダー（🚩）が声をかけてランチスポット等決定おねがいします🙇</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEP 1 ラベル */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-base font-semibold">参加したい日を選んでエントリー</p>
      </div>

      {/* 横並びカレンダー */}
      {calendarWeeks.map(({ label, dates, offset }) => {
        const jstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const todayStr = toDateString(jstNow);

        const cols = dates.map((date: string, i: number) => {
          const isRegistered = registeredDates.includes(date);
          const baseParticipants = DUMMY_PARTICIPANTS[offset + i] ?? [];
          const dateObj = new Date(date + "T00:00:00");
          const mmdd = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
          const isPast = date < todayStr;
          const namesVisible = isPast || (date === todayStr && jstNow.getHours() >= 9);
          const selfEntry = isRegistered ? [{ name: "あなた", isSelf: true as const }] : [];
          const otherEntries = namesVisible ? baseParticipants.map((p: { name: string }) => ({ ...p, isSelf: false as const })) : [];
          const displayList = [...selfEntry, ...otherEntries];
          const MAX_VISIBLE = 2;
          const visible = displayList.slice(0, MAX_VISIBLE);
          const overflowCount = displayList.length - MAX_VISIBLE;
          const totalCount = (isRegistered ? 1 : 0) + baseParticipants.length;
          return { date, i, isRegistered, mmdd, visible, overflowCount, isPast, namesVisible, totalCount };
        });

        return (
          <div key={label} className="mb-5">
            <div className="rounded-xl overflow-hidden bg-card">
              {/* ヘッダー行 */}
              <div className="grid grid-cols-5 bg-muted/30">
                {cols.map(({ date, i, mmdd, isPast }) => (
                  <div key={date} className={cn("text-center pt-4 pb-2 px-1", i > 0 && "border-l border-border/40", isPast && "opacity-40")}>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-base text-foreground" data-nums>{mmdd}</span>
                      <span className="text-xs font-semibold text-foreground">{DAY_KEYS[i]}</span>
                    </div>
                    <span className="text-xs font-light text-muted-foreground" data-nums>12:00~13:00</span>
                  </div>
                ))}
              </div>
              {/* 参加者行 */}
              <div className="grid grid-cols-5">
                {cols.map(({ date, i, visible, overflowCount, isPast, namesVisible, totalCount }) => (
                  <div key={date} className={cn("flex flex-col items-center justify-center gap-1 py-2 px-2 min-h-[56px]", i > 0 && "border-l border-border/40", isPast && "opacity-40")}>
                    {namesVisible ? (
                      <>
                        {visible.map((p) => (
                          <span key={p.name} className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-xs", p.isSelf ? "text-foreground font-bold" : "text-muted-foreground")}>
                              {p.isSelf ? p.name : `${p.name}さん`}
                            </span>
                            {p.isSelf && (
                              <span className="text-[9px] font-medium px-1.5 py-1 rounded-full bg-emerald-100 text-emerald-700 leading-none">
                                参加中
                              </span>
                            )}
                          </span>
                        ))}
                        {overflowCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">他{overflowCount}名</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-center leading-relaxed" data-nums>
                        {`${totalCount}名がエントリー中`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* ボタン行 */}
              <div className="grid grid-cols-5">
                {cols.map(({ date, i, isRegistered, isPast }) => (
                  <div key={date} className={cn("p-2 flex flex-col gap-1", i > 0 && "border-l border-border/40")}>
                    {isRegistered ? (
                      <>
                        <span className="w-full text-center text-xs font-semibold py-2 rounded-lg bg-emerald-50 text-emerald-700">
                          エントリー中
                        </span>
                        <button
                          onClick={() => toggleDate(date)}
                          disabled={loading}
                          className="w-full text-[11px] py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleDate(date)}
                        disabled={loading || isPast}
                        className={cn(
                          "w-full text-xs font-semibold py-2 rounded-lg border transition-all",
                          isPast
                            ? "bg-muted/30 text-muted-foreground/40 border-transparent cursor-not-allowed"
                            : "bg-muted text-foreground border-transparent"
                        )}
                      >
                        {isPast ? "終了" : "エントリー"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <ul className="mt-3 mb-2 space-y-0.5">
        <li className="text-xs text-muted-foreground">※ キャンセルは当日朝9時まで可能です</li>
        <li className="text-xs text-muted-foreground">※ 当日キャンセルもできますが朝9:00にグループ、ニックネームが公開されます</li>
      </ul>



      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}

      {/* ニックネームモーダル */}
      {pendingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-2xl border border-border shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-semibold mb-6">ニックネームを設定してください</h2>
            <Input
              value={modalNicknameInput}
              onChange={(e) => setModalNicknameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && modalNicknameInput.trim() && confirmModal(false)}
              placeholder="ニックネームを入力"
              maxLength={20}
              autoFocus
              className="mb-2 h-12 text-base py-3"
            />
            <p className="text-xs text-muted-foreground mb-1">※ 当日の朝9時にランチグループが確定、ニックネームが公開されます</p>
            <p className="text-xs text-muted-foreground mb-4">※ キャンセルは当日の朝9時まで可能です</p>
            <Button
              className={cn(
                "w-full mb-2 transition-all",
                !modalNicknameInput.trim()
                  ? "bg-neutral-600 text-neutral-300 cursor-not-allowed hover:bg-neutral-600"
                  : "bg-neutral-900 text-white hover:bg-neutral-800"
              )}
              onClick={() => confirmModal(false)}
              disabled={loading || !modalNicknameInput.trim()}
            >
              エントリー
            </Button>
            <button
              className="w-full py-2 rounded-lg bg-neutral-200 text-sm text-neutral-600 hover:bg-neutral-300 transition-colors"
              onClick={() => { setPendingDate(null); setModalNicknameInput(""); }}
              disabled={loading}
            >
              戻る
            </button>
          </div>
        </div>
      )}
    </>
  );
}
