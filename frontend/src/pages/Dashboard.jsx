import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Landmark,
  LogOut,
  RefreshCw,
  Send,
  Wallet,
  PlusCircle,
  Copy,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CountUp from "@/components/CountUp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const { accounts } = await api.getMyAccounts();
      setAccount(accounts?.[0] || null);
    } catch (err) {
      if (err.status === 401) {
        toast.error("Session expired — please sign in again");
        await logout();
        navigate("/login");
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoadingAccount(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  async function refreshBalance() {
    if (!account) return;
    setRefreshing(true);
    try {
      const { balance } = await api.getBalance(account._id);
      setAccount((a) => ({ ...a, balance }));
      toast.success("Balance updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function createAccount() {
    setCreating(true);
    try {
      await api.createAccount();
      toast.success("Account created");
      await loadAccount();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
            <Landmark className="size-5 text-brand-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Welcome back</p>
            <h1 className="text-lg font-semibold text-white">{user?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.systemUser && (
            <Button
              variant="secondary"
              onClick={() => navigate("/system")}
              className="gap-2"
            >
              <ShieldCheck className="size-4 text-amber-400" /> System
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2 text-white/70"
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </motion.header>

      {loadingAccount ? (
        <BalanceSkeleton />
      ) : account ? (
        <div className="grid gap-6 md:grid-cols-2">
          <BalanceCard
            account={account}
            refreshing={refreshing}
            onRefresh={refreshBalance}
          />
          <TransferCard account={account} onDone={refreshBalance} />
        </div>
      ) : (
        <NoAccount creating={creating} onCreate={createAccount} />
      )}
    </div>
  );
}

/* ---------- Balance card with animated count-up ---------- */
function BalanceCard({ account, refreshing, onRefresh }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/30 via-brand-500/10 to-transparent p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/70">
          <Wallet className="size-4" />
          <span className="text-sm">Available balance</span>
        </div>
        <Badge variant="outline" className="border-white/20 text-white/70">
          {account.status}
        </Badge>
      </div>

      <div className="text-4xl font-bold tracking-tight text-white">
        <CountUp value={account.balance} prefix={`${account.currency} `} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <AccountIdChip id={account._id} />
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </motion.div>
  );
}

/* ---------- Transfer money form ---------- */
function TransferCard({ account, onDone }) {
  const [form, setForm] = useState({ toAccountId: "", amount: "" });
  const [sending, setSending] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.transfer({
        fromAccountId: account._id,
        toAccountId: form.toAccountId.trim(),
        amount: Number(form.amount),
        // A fresh key per send makes each transfer safely retryable.
        idempotencyKey: crypto.randomUUID(),
      });
      toast.success(`Sent ${account.currency} ${form.amount}`);
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
      transition={{ delay: 0.12 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="mb-5 flex items-center gap-2 text-white">
        <Send className="size-4 text-brand-400" />
        <h2 className="font-semibold">Transfer money</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="toAccountId">To account ID</Label>
          <Input
            id="toAccountId"
            name="toAccountId"
            placeholder="Recipient account _id"
            value={form.toAccountId}
            onChange={onChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({account.currency})</Label>
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
        <Button type="submit" disabled={sending} className="w-full gap-2">
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {sending ? "Sending…" : "Send money"}
        </Button>
      </form>
    </motion.div>
  );
}

/* ---------- No-account empty state ---------- */
function NoAccount({ creating, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center"
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30">
        <PlusCircle className="size-7 text-brand-400" />
      </div>
      <h2 className="text-lg font-semibold text-white">No account yet</h2>
      <p className="mt-1 max-w-sm text-sm text-white/60">
        Open your bank account to start receiving and sending money.
      </p>
      <Button onClick={onCreate} disabled={creating} className="mt-5 gap-2">
        {creating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PlusCircle className="size-4" />
        )}
        Create account
      </Button>
    </motion.div>
  );
}

/* ---------- Copyable account id ---------- */
function AccountIdChip({ id }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("Account ID copied");
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs text-white/60 transition hover:text-white"
      title="Copy account ID"
    >
      <span className="font-mono">
        {id.slice(0, 6)}…{id.slice(-4)}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={copied ? "yes" : "no"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <Copy className="size-3.5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ---------- Loading skeleton ---------- */
function BalanceSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
        />
      ))}
    </div>
  );
}
