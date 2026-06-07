"use client";

import { useState, useEffect, useRef } from "react";
import { getPublicClient } from "@/lib/supabase";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

type ChatPanelProps = {
  lunchGroupId: string;
  anonymousId: string;
  nickname: string;
  onClose: () => void;
};

export function ChatPanel({ lunchGroupId, anonymousId, nickname, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/chat?lunch_group_id=${lunchGroupId}&anonymous_id=${anonymousId}`);
      if (!res.ok || cancelled) return;
      const data: ChatMessage[] = await res.json();
      if (!cancelled) setMessages(data);
    })();

    const channel = getPublicClient()
      .channel(`chat:${lunchGroupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `lunch_group_id=eq.${lunchGroupId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [lunchGroupId, anonymousId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lunch_group_id: lunchGroupId,
          anonymous_id: anonymousId,
          nickname: nickname || "Guest",
          message: trimmed,
        }),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl bg-card flex flex-col h-[70vh] sm:h-[32rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <p className="text-sm font-semibold text-foreground">グループチャット</p>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            閉じる
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-4">最初のメッセージを送ってみましょう</p>
          ) : (
            messages.map((m) => {
              const isSelf = m.anonymous_id === anonymousId;
              return (
                <div key={m.id} className={cn("flex flex-col max-w-[75%]", isSelf ? "self-end items-end" : "self-start items-start")}>
                  {!isSelf && <span className="text-[10px] text-muted-foreground mb-0.5">{m.nickname}</span>}
                  <span
                    className={cn(
                      "text-sm px-3 py-2 rounded-2xl whitespace-pre-line break-words",
                      isSelf ? "bg-foreground text-background rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {m.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
            }}
            placeholder="メッセージを入力"
            className="flex-1 h-9 rounded-lg bg-neutral-200 px-3 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-neutral-900"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
