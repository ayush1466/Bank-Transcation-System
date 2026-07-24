import { cn } from "@/lib/utils";

// A flipping gold-coin loader. `fullscreen` centers it in the viewport;
// otherwise it fills its parent. Pass an optional `label` beneath the coin.
export default function Loader({ fullscreen = false, label, className }) {
  return (
    <div
      className={cn(
        "grid place-items-center gap-4",
        fullscreen ? "min-h-screen" : "min-h-[240px] w-full py-16",
        className,
      )}
    >
      <div
        className="animate-coin-flip relative size-24 rounded-full"
        style={{
          backgroundColor: "#d4af37",
          boxShadow: "inset 0 0 5px rgba(0, 0, 0, 0.3)",
          backgroundImage:
            "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 80%)",
        }}
      >
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold"
          style={{
            color: "rgba(0, 0, 0, 0.5)",
            textShadow: "1px 1px 1px rgba(255, 255, 255, 0.5)",
          }}
        >
          $
        </span>
      </div>

      {label && <p className="text-sm text-white/50">{label}</p>}
    </div>
  );
}
