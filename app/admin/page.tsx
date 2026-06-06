"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Toast, useToast } from "../components/Toast";
import { DayStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function AdminContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get("key") ?? "";
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast, show, hide } = useToast();

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    setDayStatuses(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runMatch = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/match?key=${adminKey}`, { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) return show(data.error ?? "エラーが発生しました", "error");
    show(data.message ?? "グループを確定しました");
    fetchStatus();
  };

  const runNotify = async (type: string) => {
    setActionLoading(true);
    const res = await fetch(`/api/notify?key=${adminKey}&type=${type}`, { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) return show(data.error ?? "エラーが発生しました", "error");
    show(data.message ?? "通知を送信しました");
  };

  if (!adminKey) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium">認証が必要です</p>
          <p className="text-sm text-muted-foreground mt-1">
            URLに <code className="bg-muted px-1 py-0.5 rounded text-xs">?key=管理者キー</code> を付けてアクセスしてください
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-base font-semibold">管理画面</h1>
        <Badge variant="outline">Admin</Badge>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-sm">操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runMatch} disabled={actionLoading}>
              グループを確定する
            </Button>
            <Button size="sm" variant="outline" onClick={() => runNotify("confirmed")} disabled={actionLoading}>
              Slack通知（確定）
            </Button>
            <Button size="sm" variant="outline" onClick={() => runNotify("reminder_morning")} disabled={actionLoading}>
              Slack通知（朝）
            </Button>
            <Button size="sm" variant="outline" onClick={() => runNotify("reminder_lunch")} disabled={actionLoading}>
              Slack通知（11:30）
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-5" />

      <h2 className="text-sm font-semibold mb-3">今週の参加登録状況</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center mt-8">読み込み中...</p>
      ) : (
        <div className="space-y-3">
          {dayStatuses.map((status) => (
            <Card key={status.date} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span>{status.dayLabel}曜日</span>
                    <span className="text-xs font-normal text-muted-foreground">{status.date}</span>
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">{status.participantCount}名</span>
                </div>
              </CardHeader>
              <CardContent>
                {status.isConfirmed && status.groups.length > 0 ? (
                  <div className="space-y-1.5">
                    {status.groups.map((group, i) => (
                      <div key={group.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm border border-border">
                        <span className="text-xs text-muted-foreground">グループ {i + 1}  </span>
                        <span>{group.nicknames.join(" / ")}</span>
                      </div>
                    ))}
                  </div>
                ) : status.isConfirmed && status.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">参加者不足のため中止</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {status.participantCount > 0 ? "グループ未確定" : "登録者なし"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground text-center mt-8">読み込み中...</p>}>
      <AdminContent />
    </Suspense>
  );
}
