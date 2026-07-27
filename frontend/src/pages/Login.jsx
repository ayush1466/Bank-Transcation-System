import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import FloatingField from "@/components/FloatingField";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "ledger.remembered-email";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prefill the email box when the user asked us to remember it last time.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((f) => ({ ...f, email: saved }));
      setRemember(true);
    }
  }, []);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (remember) localStorage.setItem(REMEMBER_KEY, form.email);
      else localStorage.removeItem(REMEMBER_KEY);
      toast.success(`Welcome back, ${user.name}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      name: "email",
      label: "Email address",
      type: "email",
      icon: Mail,
      autoComplete: "email",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      icon: Lock,
      autoComplete: "current-password",
    },
  ];

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Access your balances and move money in a couple of taps."
      footer={
        <>
          New to Bank Ledger?{" "}
          <Link
            to="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((field, i) => (
          <motion.div
            key={field.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <FloatingField
              id={field.name}
              name={field.name}
              type={field.type}
              label={field.label}
              icon={field.icon}
              autoComplete={field.autoComplete}
              value={form[field.name]}
              onChange={onChange}
              disabled={loading}
              required
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between pt-0.5"
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember((v) => !v)}
            className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span
              className={cn(
                "grid size-[18px] place-items-center rounded-[6px] border transition-all duration-200",
                remember
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border group-hover:border-primary/50",
              )}
            >
              <motion.span
                initial={false}
                animate={{ scale: remember ? 1 : 0, opacity: remember ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            </span>
            Remember me
          </button>

          <button
            type="button"
            onClick={() =>
              toast.info("Password reset isn't wired up yet — contact support.")
            }
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        </motion.div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? undefined : { scale: 1.015 }}
          whileTap={loading ? undefined : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className={cn(
            "cta-sheen group relative mt-2 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl",
            "bg-linear-to-r from-brand-600 via-brand-500 to-aqua-500 text-[15px] font-semibold text-white",
            "shadow-[0_14px_34px_-12px_rgba(47,107,255,0.75)] transition-shadow duration-200",
            "hover:shadow-[0_18px_40px_-10px_rgba(47,107,255,0.85)]",
            "focus-visible:ring-4 focus-visible:ring-primary/35 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing you in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Protected by OTP
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Transfers are confirmed with an email code and your transfer password —
        so a stolen login alone can never move your money.
      </p>
    </AuthLayout>
  );
}
