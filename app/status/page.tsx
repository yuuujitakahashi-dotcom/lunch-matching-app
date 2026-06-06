"use client";

import { useState, useEffect, useCallback } from "react";
import { Toast, useToast } from "../components/Toast";
import { isCancellable, isToday } from "@/lib/dates";
import { DayStatus, LunchGroup } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function StatusPage() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    const id = localStorage.getItem("anonymous_id");
    setAnonymousId(id);
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
    return <p className="text-sm text-muted-foreground mt-8 text-center">読み込み中...</p>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-base font-semibold">今週のランチ状況</h1>
        <p className="text-sm text-muted-foreground mt-0.5">月〜金の参加状況とグループを確認できます</p>
      </div>

      <div className="space-y-3">
        {dayStatuses.map((status) => {
          const myGroup = myGroupFor(status);
          const today = isToday(status.date);
          const cancellable = isCancellable(status.date);

          return (
            <Card key={status.date} className={cn(status.isRegistered && "ring-foreground/20")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span>{status.dayLabel}曜日</span>
                    <span className="text-xs font-normal text-muted-foreground">{status.date}</span>
                    {today && <Badge variant="secondary">今日</Badge>}
                  </CardTitle>
                  {status.isRegistered && (
                    <Badge variant="outline">参加予定</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!status.isConfirmed ? (
                  <p className="text-sm text-muted-foreground">
                    {status.participantCount > 0
                      ? `${status.participantCount}名が参加予定 — グループは前日20時に確定します`
                      : "登録者なし"}
                  </p>
                ) : status.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">参加者不足のため中止になりました</p>
                ) : (
                  <div className="space-y-2">
                    {status.groups.map((group, i) => {
                      const isMyGroup = myGroup?.id === group.id;
                      return (
                        <div
                          key={group.id}
                          className={cn(
                            "rounded-lg px-3 py-2.5 text-sm border",
                            isMyGroup
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs font-medium", isMyGroup ? "text-background/70" : "text-muted-foreground")}>
                              グループ {i + 1}
                              {isMyGroup && <span className="ml-1.5">— あなたのグループ</span>}
                            </span>
                          </div>
                          <p className="mt-1">{group.nicknames.join(" / ")}</p>
                        </div>
                      );
                    })}

                    {myGroup && status.isRegistered && cancellable && !today && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(status.date)}
                        disabled={cancelling === status.date}
                        className="text-muted-foreground hover:text-destructive mt-1 min-h-[44px]"
                      >
                        {cancelling === status.date ? "処理中..." : "辞退する"}
                      </Button>
                    )}

                    {today && (
                      <p className="text-sm text-muted-foreground mt-1">
                        今日のランチ、楽しんできてください。
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
          参加登録に戻る
        </a>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}
