import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, MailCheck, X } from "lucide-react";
import OtpInput from "@/components/OtpInput";

// A modal that collects a 6-digit email code and calls `onVerify(code)`.
// `onVerify` should throw on failure (the parent shows the toast); the parent
// closes the dialog on success by flipping `open` to false.
export default function OtpDialog({
  open,
  onClose,
  title = "Enter verification code",
  description,
  email,
  onVerify,
  onResend,
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setVerifying(false);
      setResending(false);
    }
  }, [open]);

  async function submit(value) {
    const finalCode = value || code;
    if (finalCode.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      await onVerify(finalCode);
    } catch {
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    try {
      await onResend?.();
      setCode("");
    } finally {
      setResending(false);
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
              <MailCheck className="size-7 text-primary" />
            </div>

            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              {description || (
                <>
                  We emailed a 6-digit code
                  {email ? (
                    <>
                      {" "}
                      to <span className="font-medium text-foreground">{email}</span>
                    </>
                  ) : null}
                  . Enter it below to continue.
                </>
              )}
            </p>

            <div className="mt-6">
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={submit}
                disabled={verifying}
              />
            </div>

            <button
              onClick={() => submit()}
              disabled={code.length !== 6 || verifying}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {verifying && <Loader2 className="size-4 animate-spin" />}
              {verifying ? "Verifying…" : "Verify & continue"}
            </button>

            <button
              onClick={resend}
              disabled={resending}
              className="mt-3 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              {resending ? "Sending…" : "Didn't get it? Resend code"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
