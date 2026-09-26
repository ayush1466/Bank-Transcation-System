import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Check, Copy, QrCode, X } from "lucide-react";

// Requesting money = sharing your account ID so someone can transfer to you.
// (There's no dedicated "payment request" backend, so this is the honest,
// useful version of the mockup's "Request" action.)
export default function RequestModal({ account, open, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(account._id);
      setCopied(true);
      toast.success("Demo ledger ID copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy the demo ledger ID — please copy it manually");
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
            className="scrim absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-popover p-6 text-center shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/25">
              <QrCode className="size-7 text-primary" />
            </div>

            <h2 className="text-lg font-semibold">Share demo ledger ID</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Share this demo ledger ID with a test participant to record a
              fictional practice entry.
            </p>

            <div className="auth-field mt-5 rounded-2xl border border-border p-4">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Your demo ledger ID
              </p>
              <p className="break-all font-mono text-sm">
                {account._id}
              </p>
            </div>

            <button
              onClick={copy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              {copied ? (
                <>
                  <Check className="size-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Copy demo ledger ID
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
