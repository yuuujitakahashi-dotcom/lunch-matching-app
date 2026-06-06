"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
};

export function Toast({ message, type = "success", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg border",
        type === "success"
          ? "bg-foreground text-background border-foreground"
          : "bg-destructive text-white border-destructive"
      )}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const show = (message: string, type: "success" | "error" = "success") => setToast({ message, type });
  const hide = () => setToast(null);
  return { toast, show, hide };
}
