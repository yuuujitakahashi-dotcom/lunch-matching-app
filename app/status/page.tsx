"use client";

import { useState, useEffect, useCallback } from "react";
import { Toast, useToast } from "../components/Toast";
import { isCancellable, isToday } from "@/lib/dates";
import { DayStatus, LunchGroup } from "@/types";

export default function StatusPage() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    const id = localStorage.getItem("anonymous_id");
    const name = localStorage.getItem("nickname");
    setAnonymousId(id);
    setNickname(name ?? "");
  }, []);

  const fetchStatus = useCallback(async () => {
    const id = localStorage.getItem("anonymous_id");
    const url = id ? `/api/status?anonymous_id=${id}` : "/api/status";
    const res = await fetch(url);
    if (!res.ok) return;
    setDayStatuses(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCancel = async (date: string) => {
    if (!anonymousId) return;
    setCancelling(date);

    const res = await fetch("/api/registrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous_id: anonymousId, lunch_date: date }),
    });

    setCancelling(null);
    if (!res.ok) return show("キャンセルに失敗しました", "error");
    show("辞退しました");
    fetchStatus();
  };

  const myGroupFor = (status: DayStatus): LunchGroup | null => {
    if (!anonymousId) return null;
    return status.groups.find((g) => g.member_ids.includes(anonymousId)) ?? null;
  };

  if (loading) {
    return <div className="text-center text-gray-400 mt-16">読み込み中...</div>;
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-700 mb-1">今週のランチ状況</h2>
      <p className="text-sm text-gray-400 mb-6">月〜金の参加状況とグループを確認できます</p>

      <div className="space-y-4">
        {dayStatuses.map((status) => {
          const myGroup = myGroupFor(status);
          const today = isToday(status.date);
          const cancellable = isCancellable(status.date);

          return (
            <div
              key={status.date}
              className={`bg-white rounded-2xl shadow-sm p-5 ${
                status.isRegistered ? "border-2 border-orange-200" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-lg text-gray-700">{status.dayLabel}曜日</span>
                  <span className="ml-2 text-sm text-gray-400">{status.date}</span>
                  {today && (
                    <span className="ml-2 text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full font-medium">
                      今日
                    </span>
                  )}
                </div>
                {status.isRegistered && (
                  <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full font-medium">
                    参加予定
                  </span>
                )}
              </div>

              {!status.isConfirmed ? (
                <p className="text-sm text-gray-500">
                  {status.participantCount > 0
                    ? `${status.participantCount}名が参加予定`
                    : "まだ登録者がいません"}
                  {" — グループは前日20時に確定します"}
                </p>
              ) : status.groups.length === 0 ? (
                <p className="text-sm text-gray-400">😔 参加者不足のため中止になりました</p>
              ) : (
                <div className="space-y-2">
                  {status.groups.map((group, i) => {
                    const isMyGroup = myGroup?.id === group.id;
                    return (
                      <div
                        key={group.id}
                        className={`rounded-xl px-4 py-3 text-sm ${
                          isMyGroup
                            ? "bg-orange-50 border border-orange-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <span className="font-medium text-gray-600">
                          グループ{i + 1}
                          {isMyGroup && (
                            <span className="ml-2 text-orange-500 text-xs">← あなたのグループ</span>
                          )}
                        </span>
                        <p className="mt-1 text-gray-700">{group.nicknames.join("、")}</p>
                      </div>
                    );
                  })}

                  {myGroup && status.isRegistered && cancellable && !today && (
                    <button
                      onClick={() => handleCancel(status.date)}
                      disabled={cancelling === status.date}
                      className="mt-2 text-sm text-red-400 hover:text-red-600 underline"
                    >
                      {cancelling === status.date ? "処理中..." : "辞退する"}
                    </button>
                  )}

                  {today && (
                    <p className="mt-2 text-sm text-orange-500 font-medium">
                      🍱 今日のランチ、楽しんできてください！
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <a href="/" className="text-sm text-orange-400 hover:text-orange-600 underline">
          ← 参加登録に戻る
        </a>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}
