"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Toast, useToast } from "./components/Toast";
import { getThisWeekLunchDates, toDateString } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const DAY_KEYS = ["月", "火", "水", "木", "金"];

export default function HomePage() {
  const [anonymousId, setAnonymousId] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [registeredDates, setRegisteredDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast, show, hide } = useToast();

  const weekDates = getThisWeekLunchDates().map(toDateString);

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
    const data = await res.json();
    const registered = data
      .filter((d: { isRegistered: boolean }) => d.isRegistered)
      .map((d: { date: string }) => d.date);
    setRegisteredDates(registered);
  }, []);

  useEffect(() => {
    if (anonymousId) fetchRegistrations(anonymousId);
  }, [anonymousId, fetchRegistrations]);

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return show("ニックネームを入力してください", "error");
    setLoading(true);
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous_id: anonymousId, nickname: trimmed }),
    });
    setLoading(false);
    if (!res.ok) return show("保存に失敗しました", "error");
    localStorage.setItem("nickname", trimmed);
    setNickname(trimmed);
    setNicknameInput("");
    setEditingNickname(false);
    show("ニックネームを保存しました");
  };

  const toggleDate = async (date: string) => {
    if (!anonymousId) return;
    const isRegistered = registeredDates.includes(date);
    setLoading(true);

    if (!isRegistered && !nickname) {
      await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymous_id: anonymousId, nickname: "匿名" }),
      });
    }

    const res = await fetch("/api/registrations", {
      method: isRegistered ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous_id: anonymousId, lunch_date: date }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return show(body.error ?? "処理に失敗しました", "error");
    }
    if (isRegistered) {
      setRegisteredDates((prev) => prev.filter((d) => d !== date));
      show("キャンセルしました");
    } else {
      setRegisteredDates((prev) => [...prev, date]);
      show("登録しました");
    }
  };

  if (!mounted) return null;

  return (
    <>
      <div className="mb-6">
        {nickname ? (
          <p className="text-sm text-muted-foreground">こんにちは、<span className="text-foreground font-medium">{nickname}</span></p>
        ) : (
          <p className="text-sm text-muted-foreground">参加したい曜日を選んでください</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>今週のランチ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {weekDates.map((date, i) => {
            const isChecked = registeredDates.includes(date);
            return (
              <button
                key={date}
                onClick={() => toggleDate(date)}
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-between px-4 min-h-[44px] py-3 transition-colors text-left",
                  "hover:bg-muted/50 disabled:opacity-50",
                  i !== weekDates.length - 1 && "border-b border-border",
                  isChecked && "bg-muted/30"
                )}
              >
                <span className="text-sm font-medium">
                  {DAY_KEYS[i]}曜日
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{date}</span>
                </span>
                <span
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    isChecked
                      ? "bg-foreground border-foreground"
                      : "border-border bg-background"
                  )}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-4 text-center">
        <a href="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
          今週のランチ状況を確認する
        </a>
      </div>

      <Separator className="my-6" />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground font-normal">ニックネーム（任意）</CardTitle>
        </CardHeader>
        <CardContent>
          {!editingNickname && !nickname && (
            <Button variant="outline" size="sm" onClick={() => setEditingNickname(true)}>
              設定する
            </Button>
          )}
          {!editingNickname && nickname && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{nickname}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
              >
                変更
              </Button>
            </div>
          )}
          {editingNickname && (
            <div className="flex gap-2">
              <Input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                placeholder="例：田中涼子"
                maxLength={20}
                autoFocus
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={saveNickname} disabled={loading || !nicknameInput.trim()}>
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditingNickname(false); setNicknameInput(""); }}
              >
                キャンセル
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}
