import { motion } from "motion/react";
import { Landmark } from "lucide-react";

// Shared shell for the Login / Register screens: centered glass card
// with an animated entrance.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Landmark className="size-5 text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Bank Ledger</p>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
          {subtitle && (
            <p className="mb-5 text-sm text-white/60">{subtitle}</p>
          )}
          {children}
        </div>

        {footer && (
          <p className="mt-5 text-center text-sm text-white/50">{footer}</p>
        )}
      </motion.div>
    </div>
  );
}
