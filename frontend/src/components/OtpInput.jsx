import { useRef } from "react";
import { cn } from "@/lib/utils";

// A 6-box one-time-code input. Controlled via `value` (string of digits)
// and `onChange`. Calls `onComplete` when all 6 digits are entered.
export default function OtpInput({
  value = "",
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
}) {
  const refs = useRef([]);
  const digits = value.split("").slice(0, length);

  function setAt(index, digit) {
    const chars = value.split("");
    chars[index] = digit;
    const next = chars.join("").slice(0, length);
    onChange(next);
    if (next.length === length && !next.includes("") && onComplete) {
      onComplete(next);
    }
    return next;
  }

  function handleChange(index, raw) {
    const digit = raw.replace(/\D/g, "").slice(-1); // last typed digit only
    if (!digit) return;
    setAt(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        setAt(index, "");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
    if (pasted.length === length && onComplete) onComplete(pasted);
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "auth-field size-12 rounded-xl border border-border text-center text-xl font-semibold text-foreground outline-none transition",
            "focus:border-primary focus:ring-4 focus:ring-primary/15",
            "disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
