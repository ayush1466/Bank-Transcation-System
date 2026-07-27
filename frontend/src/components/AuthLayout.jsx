import { motion } from "motion/react";
import {
  ArrowUpRight,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const EASE = [0.22, 1, 0.36, 1];

const HIGHLIGHTS = [
  {
    Icon: Zap,
    title: "Instant transfers",
    body: "Money reaches the other account in seconds, any hour of the day.",
  },
  {
    Icon: ShieldCheck,
    title: "Verified every time",
    body: "Email OTP and a transfer password guard every rupee that moves.",
  },
  {
    Icon: Wallet,
    title: "A ledger you can trust",
    body: "Every debit and credit reconciled, with full history on tap.",
  },
];

// Split-screen shell for Login / Register: an animated brand panel on the
// left (large screens only) and the form column on the right.
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  eyebrow = "Welcome back",
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.08fr_1fr]">
      {/* ---------------- brand panel ---------------- */}
      <aside className="brand-panel relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="brand-grid pointer-events-none absolute inset-0" />
        <div className="animate-orb pointer-events-none absolute -top-28 -left-20 size-80 rounded-full bg-aqua-400/35 blur-3xl" />
        <div className="animate-orb pointer-events-none absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-brand-400/35 blur-3xl [animation-delay:-9s]" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative flex items-center gap-3"
        >
          <div className="grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Landmark className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Bank Ledger</p>
            <p className="text-xs text-white/60">Secure transfers, settled instantly</p>
          </div>
        </motion.div>

        <div className="relative max-w-lg">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm"
          >
            <Sparkles className="size-3.5" />
            Money that moves at your speed
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.14, ease: EASE }}
            className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl"
          >
            Banking that feels
            <br />
            effortless.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
            className="mt-4 text-[15px] leading-relaxed text-white/70"
          >
            Send, request and track money across your accounts — with every
            transaction verified end to end.
          </motion.p>

          {/* Floating balance mock — pure decoration. */}
          <motion.div
            initial={{ opacity: 0, y: 26, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.75, delay: 0.28, ease: EASE }}
            className="mt-9 w-[19rem] rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-wide text-white/60 uppercase">
                Available balance
              </p>
              <span className="grid size-7 place-items-center rounded-full bg-white/15">
                <ArrowUpRight className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              ₹ 84,250.00
            </p>
            <div className="mt-4 h-px bg-white/15" />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-white/60">Last transfer</span>
              <span className="font-medium text-aqua-300">+ ₹ 2,400.00</span>
            </div>
          </motion.div>
        </div>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.4 } } }}
          className="relative grid gap-4"
        >
          {HIGHLIGHTS.map(({ Icon, title: t, body }) => (
            <motion.li
              key={t}
              variants={{
                hidden: { opacity: 0, x: -14 },
                show: { opacity: 1, x: 0 },
              }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t}</p>
                <p className="text-xs leading-relaxed text-white/60">{body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </aside>

      {/* ---------------- form column ---------------- */}
      <main className="relative flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:invisible">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/12 ring-1 ring-primary/25">
              <Landmark className="size-4 text-primary" />
            </div>
            <p className="text-sm font-semibold tracking-tight">Bank Ledger</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="w-full max-w-[26rem]"
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}

            <div className="auth-card mt-7 rounded-3xl p-6 sm:p-7">{children}</div>

            {footer && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {footer}
              </p>
            )}
          </motion.div>
        </div>

        <footer className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          256-bit encrypted · Your data never leaves the ledger
        </footer>
      </main>
    </div>
  );
}
