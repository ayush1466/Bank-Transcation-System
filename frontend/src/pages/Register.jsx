import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MailCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import OtpInput from "@/components/OtpInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <AuthLayout
      title={step === "details" ? "Create account" : "Verify your email"}
      subtitle={
        step === "details"
          ? "Register to open your bank account and start transacting."
          : `Enter the 6-digit code we sent to ${form.email}.`
      }
      footer={
        step === "details" ? (
          <>
            Already have an account?{" "}
            <Link to="/login" className="text-brand-400 hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <button
            onClick={() => setStep("details")}
            className="inline-flex items-center gap-1 text-brand-400 hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Change details
          </button>
        )
      }
    >
      {step === "details" ? (
        <form onSubmit={requestCode} className="space-y-4">
          {[
            { name: "name", label: "Full name", type: "text", placeholder: "Ada Lovelace" },
            { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { name: "password", label: "Password", type: "password", placeholder: "••••••••" },
          ].map((field, i) => (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="space-y-2"
            >
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={onChange}
                required
              />
            </motion.div>
          ))}

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {loading ? "Sending code…" : "Continue"}
          </Button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <MailCheck className="size-6 text-brand-400" />
          </div>

          <OtpInput value={code} onChange={setCode} onComplete={verifyCode} />

          <Button
            onClick={() => verifyCode()}
            disabled={code.length !== 6 || loading}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {loading ? "Verifying…" : "Verify & create account"}
          </Button>

          <button
            onClick={requestCode}
            disabled={loading}
            className="w-full text-center text-xs text-white/50 transition hover:text-white disabled:opacity-50"
          >
            Didn't get it? Resend code
          </button>
        </motion.div>
      )}
    </AuthLayout>
  );
}
