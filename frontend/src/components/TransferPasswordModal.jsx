import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Lock, X } from "lucide-react";
import { api } from "@/lib/api";

// Set or change the transfer password used to authorise money transfers.
// Re-authenticates with the account (login) password before saving.
export default function TransferPasswordModal({
  open,
  onClose,
  onSaved,
  isChange, // true when the user already has a transfer password
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [transferPassword, setTransferPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword("");
      setTransferPassword("");
      setConfirm("");
      setSaving(false);
      setShow(false);
    }
  }, [open]);

  const mismatch = confirm.length > 0 && confirm !== transferPassword;
  const canSave =
    !saving &&
    currentPassword.length > 0 &&
    transferPassword.length >= 4 &&
    confirm === transferPassword;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.setTransferPassword({ currentPassword, transferPassword });
      toast.success(
        isChange
          ? "Transfer password updated"
          : "Transfer password set — you can now send money",
      );
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-popover p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                  <KeyRound className="size-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold">
                  {isChange ? "Change transfer password" : "Set transfer password"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mb-5 text-xs text-muted-foreground">
              This password is required every time you send money. Keep it
              different from your account password and don't share it.
            </p>

            <div className="space-y-3">
              <Field
                label="Account password"
                value={currentPassword}
                onChange={setCurrentPassword}
                show={show}
                placeholder="Your login password"
              />
              <Field
                label={isChange ? "New transfer password" : "Transfer password"}
                value={transferPassword}
                onChange={setTransferPassword}
                show={show}
                placeholder="At least 4 characters"
              />
              <div>
                <Field
                  label="Confirm transfer password"
                  value={confirm}
                  onChange={setConfirm}
                  show={show}
                  placeholder="Re-enter to confirm"
                  onEnter={save}
                />
                {mismatch && (
                  <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                    Passwords don't match.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              {show ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {show ? "Hide passwords" : "Show passwords"}
            </button>

            <button
              onClick={save}
              disabled={!canSave}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              {saving ? "Saving…" : isChange ? "Update password" : "Set password"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Field({ label, value, onChange, show, placeholder, onEnter }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        autoComplete="off"
        placeholder={placeholder}
        className="auth-field w-full rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
      />
    </div>
  );
}
