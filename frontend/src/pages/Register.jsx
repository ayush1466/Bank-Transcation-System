import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import FloatingField from "@/components/FloatingField";
import OtpInput from "@/components/OtpInput";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1];

// Shared look for the primary call to action on both auth screens.
const CTA_CLASS = cn(
  "cta-sheen group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl",
  "bg-linear-to-r from-brand-600 via-brand-500 to-aqua-500 text-[15px] font-semibold text-white",
  "shadow-[0_14px_34px_-12px_rgba(47,107,255,0.75)] transition-shadow duration-200",
  "hover:shadow-[0_18px_40px_-10px_rgba(47,107,255,0.85)]",
  "focus-visible:ring-4 focus-visible:ring-primary/35 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none",
);

export default function Register() {
  const { registerRequest, registerVerify } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [step, setStep] = useState("details"); // "details" | "verify"
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Step 1 — send the verification code.
  async function requestCode(e) {
    e?.preventDefault();
    setLoading(true);
    try {
      await registerRequest(form.name, form.email, form.password);
      toast.success(`We emailed a code to ${form.email}`);
      setCode("");
      setStep("verify");
    } catch (err) {
      toast.error(err.message || "Couldn't send verification code");
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify the code, which creates the account and signs in.
  async function verifyCode(value) {
    const finalCode = value || code;
    if (finalCode.length !== 6 || loading) return;
    setLoading(true);
    try {
      const user = await registerVerify(form.email, finalCode);
      toast.success(`Account created — welcome, ${user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Verification failed");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "name", label: "Full name", type: "text", icon: User, autoComplete: "name" },
    { name: "email", label: "Email address", type: "email", icon: Mail, autoComplete: "email" },
    {
      name: "password",
      label: "Password",
      type: "password",
      icon: Lock,
      autoComplete: "new-password",
    },
  ];

  return (
    <AuthLayout
      eyebrow={step === "details" ? "Get started" : "Almost there"}
      title={step === "details" ? "Create your account" : "Verify your email"}
      subtitle={
        step === "details"
          ? "Open a Bank Ledger account and start transacting in minutes."
          : `Enter the 6-digit code we sent to ${form.email}.`
      }
      footer={
        step === "details" ? (
          <>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <button
            onClick={() => setStep("details")}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Change details
          </button>
        )
      }
    >
      {step === "details" ? (
        <form onSubmit={requestCode} className="space-y-4">
          {fields.map((field, i) => (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08, duration: 0.45, ease: EASE }}
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

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? undefined : { scale: 1.015 }}
            whileTap={loading ? undefined : { scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={cn(CTA_CLASS, "mt-2")}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending code…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/12 ring-1 ring-primary/25">
            <MailCheck className="size-6 text-primary" />
          </div>

          <OtpInput value={code} onChange={setCode} onComplete={verifyCode} />

          <motion.button
            onClick={() => verifyCode()}
            disabled={code.length !== 6 || loading}
            whileHover={loading ? undefined : { scale: 1.015 }}
            whileTap={loading ? undefined : { scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={CTA_CLASS}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                Verify &amp; create account
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>

          <button
            onClick={requestCode}
            disabled={loading}
            className="w-full text-center text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Didn't get it? Resend code
          </button>
        </motion.div>
      )}
    </AuthLayout>
  );
}
