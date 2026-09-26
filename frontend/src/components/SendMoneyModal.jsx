import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Delete,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

// A phone-keypad style transfer flow, matching the mockup's "Send Money" screen
// but sized for the web. Amount is built up digit by digit, then the user
// confirms with the transfer password they set in their profile.
export default function SendMoneyModal({
  account,
  open,
  onClose,
  onDone,
  hasTransferPassword,
  onManagePassword,
}) {
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState(""); // raw string, e.g. "450.5"
  const [sending, setSending] = useState(false);
  const [view, setView] = useState("amount"); // "amount" | "password" | "success"
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const balance = Number(account?.balance) || 0;
  const numericAmount = Number(amount) || 0;
  const overBalance = numericAmount > balance;
  const canContinue =
    !sending &&
    toAccountId.trim().length > 0 &&
    numericAmount > 0 &&
    !overBalance;

  // Reset the form whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setToAccountId("");
      setAmount("");
      setSending(false);
      setView("amount");
      setPassword("");
      setShowPassword(false);
    }
  }, [open]);

  const press = useCallback((key) => {
    setAmount((prev) => {
      if (key === "del") return prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : (prev || "0") + ".";
      // Guard against silly precision / length.
      if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
      if (prev.replace(".", "").length >= 12) return prev;
      if (prev === "0" && key !== ".") return key; // no leading zeros
      return prev + key;
    });
  }, []);

  // Physical keyboard support for the keypad while entering the amount.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") return onClose();
      if (view !== "amount") return;
      // Don't hijack keystrokes when the user is typing in a field
      // (e.g. the recipient account ID input).
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) {
        return;
      }
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === ".") press(".");
      else if (e.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, press, onClose]);

  // Auto-dismiss the success screen after a few seconds (like Paytm/GPay).
  useEffect(() => {
    if (view !== "success") return;
    const t = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(t);
  }, [view, onClose]);

  // Step 1: move to the password step (or nudge the user to set one first).
  function proceed() {
    if (!canContinue) return;
    if (!hasTransferPassword) {
      toast.error("Set a demo password before recording an entry");
      onClose();
      onManagePassword?.();
      return;
    }
    setPassword("");
    setShowPassword(false);
    setView("password");
  }

  // Step 2: verify with the transfer password and perform the transfer.
  async function confirmTransfer() {
    if (!password || sending) return;
    setSending(true);
    try {
      await api.transfer({
        fromAccountId: account._id,
        toAccountId: toAccountId.trim(),
        amount: numericAmount,
        transferPassword: password,
        // A fresh key per send makes each transfer safely retryable.
        idempotencyKey: crypto.randomUUID(),
      });
      // Refresh balances/history in the background, then show the success tick.
      onDone?.();
      setView("success");
    } catch (err) {
      toast.error(err.message);
      setPassword("");
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="scrim absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-popover p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view === "password" && (
                  <button
                    onClick={() => setView("amount")}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                )}
                <h2 className="text-base font-semibold">
                  {view === "amount"
                    ? "Add demo entry"
                    : view === "password"
                      ? "Confirm demo entry"
                      : ""}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {view === "amount" ? (
              <>
                {/* Recipient */}
                <div className="mb-6">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Recipient demo ledger ID
                  </label>
                  <input
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    placeholder="Paste recipient demo ledger ID"
                    className="auth-field w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>

                {/* Amount display */}
                <div className="mb-1 text-center">
                  <div
                    className={cn(
                      "text-5xl font-bold tracking-tight tabular-nums transition-colors",
                      overBalance ? "text-red-600 dark:text-red-400" : "text-foreground",
                    )}
                  >
                    <span className="text-muted-foreground">$</span>
                    {amount || "0"}
                  </div>
                </div>
                <p
                  className={cn(
                    "mb-6 text-center text-xs",
                    overBalance ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                  )}
                >
                  {overBalance
                    ? "Amount exceeds the practice balance"
                    : `Practice balance: ${formatMoney(balance, account?.currency)}`}
                </p>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => press(key)}
                      className="grid h-14 place-items-center rounded-2xl text-2xl font-semibold text-foreground transition hover:bg-muted active:scale-95"
                    >
                      {key === "del" ? <Delete className="size-6" /> : key}
                    </button>
                  ))}
                </div>

                {/* Continue → password step */}
                <button
                  onClick={proceed}
                  disabled={!canContinue}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="size-4" />
                  Continue
                </button>
              </>
            ) : view === "password" ? (
              <>
                {/* Password confirmation */}
                <div className="auth-field mb-5 rounded-2xl border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Practice entry amount</p>
                  <p className="mt-0.5 text-2xl font-bold">
                    {formatMoney(numericAmount, account?.currency)}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    to {toAccountId.trim()}
                  </p>
                </div>

                <div className="mb-4 flex flex-col items-center gap-1 text-center">
                  <Lock className="size-6 text-primary" />
                  <p className="text-xs text-muted-foreground">
                    Enter your demo password to record this practice entry.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmTransfer()}
                    autoFocus
                    autoComplete="off"
                    placeholder="Demo password"
                    className="auth-field w-full rounded-xl border border-border px-3.5 py-3 pr-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                <button
                  onClick={confirmTransfer}
                  disabled={!password || sending}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {sending ? "Recording…" : "Confirm demo entry"}
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <ShieldAlert className="size-3" />
                  Never reuse a real password in this demo.
                </p>
              </>
            ) : (
              <SuccessView
                amount={formatMoney(numericAmount, account?.currency)}
                to={toAccountId.trim()}
                onDone={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ---------- Paytm-style success screen with an animated tick ---------- */
function SuccessView({ amount, to, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-4 text-center"
    >
      <div className="relative mx-auto grid size-24 place-items-center">
        {/* expanding pulse rings */}
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute size-20 rounded-full bg-emerald-400/25"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}

        {/* green disc that pops in */}
        <motion.div
          className="relative grid size-20 place-items-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          {/* checkmark that draws itself */}
          <motion.svg width="42" height="42" viewBox="0 0 52 52" fill="none">
            <motion.path
              d="M14 27l8 8 16-18"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-5 text-lg font-semibold"
      >
        Demo entry recorded
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="mt-1 text-3xl font-bold tracking-tight"
      >
        {amount}
      </motion.p>

      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">to {to}</p>

      <button
        onClick={onDone}
        className="mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        Done
      </button>
    </motion.div>
  );
}
