import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

// Segmented light/dark switch. `compact` drops the text labels so it can sit
// on tight bars; `onPanel` restyles it for the dark brand gradient.
export default function ThemeToggle({ compact = false, onPanel = false, className }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-full p-1",
        onPanel
          ? "border border-white/20 bg-white/10 backdrop-blur-md"
          : "border border-border/70 bg-card/70 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              compact && "px-2",
              active
                ? onPanel
                  ? "text-[#0a2a7d]"
                  : "text-primary-foreground"
                : onPanel
                  ? "text-white/65 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-thumb"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "absolute inset-0 -z-10 rounded-full",
                  onPanel ? "bg-white" : "bg-primary shadow-sm",
                )}
              />
            )}
            <motion.span
              key={`${value}-${active}`}
              initial={{ rotate: active ? -90 : 0, scale: active ? 0.6 : 1 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="grid place-items-center"
            >
              <Icon className="size-3.5" />
            </motion.span>
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
