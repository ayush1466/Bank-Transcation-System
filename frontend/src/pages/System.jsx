import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Database,
  Loader2,
  Users,
  Copy,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function System() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { accounts } = await api.getAllAccounts();
      setAccounts(accounts || []);
      setDenied(false);
    } catch (err) {
      if (err.status === 403) {
        setDenied(true);
      } else if (err.status === 401) {
        navigate("/login");
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-500/12 ring-1 ring-amber-500/30">
            <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">System console</p>
            <h1 className="text-lg font-semibold">{user?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link
            to="/dashboard"
            className={buttonVariants({ variant: "outline", className: "gap-2" })}
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </div>
      </motion.header>

      {denied ? (
        <AccessDenied />
      ) : (
        <div className="space-y-6">
          <SeedFundsCard accounts={accounts} onDone={loadAccounts} />
          <AllAccountsCard
            accounts={accounts}
            loading={loading}
            onRefresh={loadAccounts}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Seed initial funds ---------- */
function SeedFundsCard({ accounts, onDone }) {
  const [form, setForm] = useState({ toAccountId: "", amount: "" });
  const [sending, setSending] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.seedInitialFunds({
        toAccountId: form.toAccountId.trim(),
        amount: Number(form.amount),
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`Added ${form.amount} to the demo ledger`);
      setForm({ toAccountId: "", amount: "" });
      onDone?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel rounded-2xl bg-linear-to-br from-amber-500/12 via-amber-500/4 to-transparent p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <Database className="size-4 text-amber-600 dark:text-amber-400" />
        <h2 className="font-semibold">Add demo balance</h2>
        <Badge
          variant="outline"
          className="ml-auto border-amber-500/40 text-amber-700 dark:text-amber-300"
        >
          system only
        </Badge>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="toAccountId">Destination demo ledger ID</Label>
          <Input
            id="toAccountId"
            name="toAccountId"
            placeholder="Demo ledger ID"
            value={form.toAccountId}
            onChange={onChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={onChange}
            required
          />
        </div>
        <Button type="submit" disabled={sending} className="gap-2">
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Database className="size-4" />
          )}
          Seed
        </Button>
      </form>
    </motion.div>
  );
}

/* ---------- All accounts table ---------- */
function AllAccountsCard({ accounts, loading, onRefresh }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="panel rounded-2xl p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <h2 className="font-semibold">All demo ledgers</h2>
        <span className="text-sm text-muted-foreground">({accounts.length})</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto gap-2"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No demo ledgers yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-3 font-medium">Owner</th>
                <th className="pb-3 font-medium">Demo ledger ID</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, i) => (
                <motion.tr
                  key={acc._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-t border-border"
                >
                  <td className="py-3">
                    {acc.userId?.name || "—"}
                    <div className="text-xs text-muted-foreground">
                      {acc.userId?.email || ""}
                    </div>
                  </td>
                  <td className="py-3">
                    <AccountIdChip id={acc._id} />
                  </td>
                  <td className="py-3">
                    <Badge variant="outline" className="text-muted-foreground">
                      {acc.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-right font-medium">
                    {acc.currency}{" "}
                    {Number(acc.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Copyable account id ---------- */
function AccountIdChip({ id }) {
  async function copy() {
    await navigator.clipboard.writeText(id);
    toast.success("Demo ledger ID copied");
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
      title="Copy account ID"
    >
      {id.slice(0, 6)}…{id.slice(-4)}
      <Copy className="size-3" />
    </button>
  );
}

/* ---------- 403 state for non-system users ---------- */
function AccessDenied() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center"
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-red-500/12 ring-1 ring-red-500/30">
        <Lock className="size-7 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold">System access only</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This console is restricted to system users. Your account doesn't have
        those privileges.
      </p>
      <Link
        to="/dashboard"
        className={buttonVariants({ variant: "secondary", className: "mt-5" })}
      >
        Back to dashboard
      </Link>
    </motion.div>
  );
}
