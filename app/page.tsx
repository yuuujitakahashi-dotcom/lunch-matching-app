"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Toast, useToast } from "./components/Toast";
import { getThisWeekLunchDates, toDateString } from "@/lib/dates";

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

    // ニックネームなしで初めて登録する場合、参加者レコードを作成
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
      show("登録しました！");
    }
  };

  if (!mounted) return null;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm p-8 mt-4">
        {nickname ? (
          <p className="text-gray-400 text-sm mb-4">こんにちは、<span className="text-orange-500 font-medium">{nickname}</span> さん 👋</p>
        ) : (
          <p className="text-gray-400 text-sm mb-4">参加したい曜日を選んでください</p>
        )}

        <div className="space-y-3 mb-6">
          {weekDates.map((date, i) => {
            const isChecked = registeredDates.includes(date);
            return (
              <button
                key={date}
                onClick={() => toggleDate(date)}
                disabled={loading}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition ${
                  isChecked
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-orange-200"
                }`}
              >
                <span className="font-semibold">
                  {DAY_KEYS[i]}曜日
                  <span className="ml-2 text-xs text-gray-400">{date}</span>
                </span>
                <span className="text-xl">{isChecked ? "✅" : "⬜️"}</span>
              </button>
            );
          })}
        </div>

        <a
          href="/status"
          className="block text-center text-sm text-orange-400 hover:text-orange-600 underline"
        >
          今週のランチ状況を確認する →
        </a>
      </div>

      {/* ニックネーム（任意） */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
        <p className="text-xs text-gray-400 mb-3">ニックネーム（任意）</p>

        {!editingNickname && !nickname && (
          <button
            onClick={() => setEditingNickname(true)}
            className="text-sm text-orange-400 hover:text-orange-600 underline"
          >
            + ニックネームを設定する
          </button>
        )}

        {!editingNickname && nickname && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{nickname}</span>
            <button
              onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
              className="text-xs text-gray-400 hover:text-orange-400 underline"
            >
              変更
            </button>
          </div>
        )}

        {editingNickname && (
          <div className="flex gap-2">
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNickname()}
              placeholder="例：田中涼子、りょうこ"
              maxLength={20}
              autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button
              onClick={saveNickname}
              disabled={loading || !nicknameInput.trim()}
              className="bg-orange-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition"
            >
              保存
            </button>
            <button
              onClick={() => { setEditingNickname(false); setNicknameInput(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </>
  );
}
