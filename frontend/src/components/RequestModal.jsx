import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, Copy, QrCode, X } from "lucide-react";

// Requesting money = sharing your account ID so someone can transfer to you.
// (There's no dedicated "payment request" backend, so this is the honest,
// useful version of the mockup's "Request" action.)
export default function RequestModal({ account, user, open, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(account._id);
      setCopied(true);
      toast.success("Account ID copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — please copy it manually");
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
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-ink-900 p-6 text-center shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30">
              <QrCode className="size-7 text-brand-400" />
            </div>

            <h2 className="text-lg font-semibold text-white">Request money</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-white/55">
              Share your account ID with {user?.name ? "friends" : "anyone"} so
              they can send money straight to your account.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-1 text-xs font-medium text-white/40">
                Your account ID
              </p>
              <p className="break-all font-mono text-sm text-white">
                {account._id}
              </p>
            </div>

            <button
              onClick={copy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copy account ID
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
