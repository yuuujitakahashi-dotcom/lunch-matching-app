"use client";

type SplashProps = {
  visible: boolean;
};

const TEXT = "Let's Lunch 🍐";

export function Splash({ visible }: SplashProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <p
        className="animate-splash-in text-3xl font-medium tracking-normal text-foreground"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {Array.from(TEXT).map((char, i) => (
          <span
            key={i}
            className="animate-letter-bounce"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </p>
    </div>
  );
}
