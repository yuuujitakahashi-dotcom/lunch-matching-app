"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Toast, useToast } from "../components/Toast";
import { DayStatus } from "@/types";

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
      <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">認証が必要です</p>
        <p className="text-sm">URLに <code className="bg-gray-100 px-1 rounded">?key=管理者キー</code> を付けてアクセスしてください</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-700">管理画面</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">Admin</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="font-bold text-gray-600 mb-4">操作</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runMatch}
            disabled={actionLoading}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition"
          >
            グループを確定する
          </button>
          <button
            onClick={() => runNotify("confirmed")}
            disabled={actionLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
          >
            Slack通知（確定）
          </button>
          <button
            onClick={() => runNotify("reminder_morning")}
            disabled={actionLoading}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition"
          >
            Slack通知（朝）
          </button>
          <button
            onClick={() => runNotify("reminder_lunch")}
            disabled={actionLoading}
            className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition"
          >
            Slack通知（11:30）
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 mt-8">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-600">今週の参加登録状況</h3>
          {dayStatuses.map((status) => (
            <div key={status.date} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-gray-700">{status.dayLabel}曜日</span>
                  <span className="ml-2 text-sm text-gray-400">{status.date}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {status.participantCount}名
                </span>
              </div>

              {status.isConfirmed && status.groups.length > 0 ? (
                <div className="space-y-2">
                  {status.groups.map((group, i) => (
                    <div key={group.id} className="bg-orange-50 rounded-xl px-4 py-2 text-sm">
                      <span className="font-medium text-orange-600">グループ{i + 1}</span>
                      <span className="text-gray-700 ml-2">{group.nicknames.join("、")}</span>
                    </div>
                  ))}
                </div>
              ) : status.isConfirmed && status.groups.length === 0 ? (
                <p className="text-sm text-gray-400">😔 参加者不足のため中止</p>
              ) : (
                <p className="text-sm text-gray-400">
                  {status.participantCount > 0
                    ? "グループ未確定"
                    : "登録者なし"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 mt-16">読み込み中...</div>}>
      <AdminContent />
    </Suspense>
  );
}
