import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Tall, rounded text field with a label that floats into the top of the box
// once the input is focused or filled — the pattern Paytm/GPay use. Password
// fields get a reveal toggle for free.
export default function FloatingField({
  id,
  name,
  type = "text",
  label,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  inputMode,
  required = false,
  disabled = false,
  className,
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && reveal ? "text" : type;

  // Both the focused and the filled state raise the label; keep them
  // identical so the transition never half-applies.
  const floated =
    "peer-focus:translate-y-[calc(-50%-11px)] peer-focus:scale-[0.76] " +
    "peer-[:not(:placeholder-shown)]:translate-y-[calc(-50%-11px)] " +
    "peer-[:not(:placeholder-shown)]:scale-[0.76]";

  return (
    <div className={cn("group relative", className)}>
      {Icon && (
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
      )}

      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        placeholder=" "
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={cn(
          "peer auth-field h-14 w-full rounded-2xl border border-border px-4 pt-5 pb-1 text-[15px] font-medium text-foreground outline-none",
          "transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent",
          "hover:border-primary/45",
          "focus:border-primary focus:ring-4 focus:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-60",
          Icon && "pl-11",
          isPassword && "pr-12",
        )}
      />

      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute top-1/2 origin-left -translate-y-1/2 text-[15px] font-medium text-muted-foreground",
          "transition-[transform,color] duration-200 ease-out",
          "peer-focus:text-primary",
          Icon ? "left-11" : "left-4",
          floated,
        )}
      >
        {label}
      </label>

      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2.5 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {reveal ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      )}
    </div>
  );
}
