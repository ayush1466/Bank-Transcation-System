import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Copy,
  Check,
  Loader2,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CountUp from "@/components/CountUp";
import Loader from "@/components/Loader";
import SendMoneyModal from "@/components/SendMoneyModal";
import RequestModal from "@/components/RequestModal";
import OtpDialog from "@/components/OtpDialog";
import {
  currencySymbol,
  formatDate,
  formatMoney,
  greeting,
  initials,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [acctOtpOpen, setAcctOtpOpen] = useState(false);

  const handleAuthError = useCallback(
    async (err) => {
      if (err.status === 401) {
        toast.error("Session expired — please sign in again");
        await logout();
        navigate("/login");
        return true;
      }
      return false;
    },
    [logout, navigate],
  );

  const loadAll = useCallback(async () => {
    try {
      const [{ accounts }, txRes] = await Promise.all([
        api.getMyAccounts(),
        api.getTransactions().catch(() => ({ transactions: [] })),
      ]);
      setAccount(accounts?.[0] || null);
      setTransactions(txRes?.transactions || []);
    } catch (err) {
      if (!(await handleAuthError(err))) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function refresh() {
    if (!account) return;
    setRefreshing(true);
    try {
      const [{ balance }, txRes] = await Promise.all([
        api.getBalance(account._id),
        api.getTransactions().catch(() => ({ transactions: [] })),
      ]);
      setAccount((a) => ({ ...a, balance }));
      setTransactions(txRes?.transactions || []);
    } catch (err) {
      if (!(await handleAuthError(err))) toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  // Step 1: email a code, then open the OTP dialog.
  async function startCreateAccount() {
    setCreating(true);
    try {
      await api.requestAccountOtp();
      toast.success("We emailed you a verification code");
      setAcctOtpOpen(true);
    } catch (err) {
      if (!(await handleAuthError(err))) toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Step 2: verify the code and create the account.
  async function confirmCreateAccount(code) {
    try {
      await api.createAccount({ otp: code });
      toast.success("Account created");
      setAcctOtpOpen(false);
      await loadAll();
    } catch (err) {
      if (!(await handleAuthError(err))) toast.error(err.message);
      throw err; // let the dialog clear the input
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  // Income vs. spending derived from the real transaction history.
  const stats = useMemo(() => {
    let income = 0;
    let spending = 0;
    for (const t of transactions) {
      if (t.direction === "CREDIT") income += t.amount;
      else spending += t.amount;
    }
    return { income, spending, net: income - spending };
  }, [transactions]);

  const currency = account?.currency || "INR";

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Header
        user={user}
        onLogout={handleLogout}
        onSystem={() => navigate("/system")}
      />

      {loading ? (
        <Loader label="Loading your account…" />
      ) : account ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <BalanceHero
              account={account}
              onSend={() => setSendOpen(true)}
              onRequest={() => setRequestOpen(true)}
            />
            <StatsRow stats={stats} currency={currency} />
            <TransactionsCard
              transactions={transactions}
              currency={currency}
              onSend={() => setSendOpen(true)}
            />
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <AccountCard
              account={account}
              refreshing={refreshing}
              onRefresh={refresh}
            />
            <PromoCard onSend={() => setSendOpen(true)} />
          </div>
        </div>
      ) : (
        <NoAccount creating={creating} onCreate={startCreateAccount} />
      )}

      {account && (
        <>
          <SendMoneyModal
            account={account}
            open={sendOpen}
            onClose={() => setSendOpen(false)}
            onDone={refresh}
          />
          <RequestModal
            account={account}
            user={user}
            open={requestOpen}
            onClose={() => setRequestOpen(false)}
          />
        </>
      )}

      <OtpDialog
        open={acctOtpOpen}
        onClose={() => setAcctOtpOpen(false)}
        title="Confirm new account"
        email={user?.email}
        onVerify={confirmCreateAccount}
        onResend={async () => {
          await api.requestAccountOtp();
          toast.success("New code sent");
        }}
      />
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ user, onLogout, onSystem }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center justify-between sm:mb-8"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20">
          {initials(user?.name)}
        </div>
        <div>
          <p className="text-xs text-white/45">{greeting()}</p>
          <h1 className="text-lg font-semibold text-white">{user?.name}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="grid size-9 place-items-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white">
          <Bell className="size-4" />
        </button>
        {user?.systemUser && (
          <button
            onClick={onSystem}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <ShieldCheck className="size-4 text-amber-400" /> System
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </motion.header>
  );
}

/* ---------- Balance hero (light card) ---------- */
function BalanceHero({ account, onSend, onRequest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-slate-200 p-6 text-slate-900 shadow-xl sm:p-8"
    >
      {/* soft decorative blobs */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-52 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-slate-500">
          <Wallet className="size-4" />
          <span className="text-sm font-medium">Total Balance</span>
        </div>

        <div className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          <CountUp
            value={account.balance}
            prefix={currencySymbol(account.currency)}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onRequest}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:translate-y-px"
          >
            <QrCode className="size-4" /> Request
          </button>
          <button
            onClick={onSend}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50 active:translate-y-px"
          >
            <Send className="size-4" /> Send
          </button>
          <button
            onClick={onSend}
            className="grid size-11 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-50"
            title="More"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Income / spending / net ---------- */
function StatsRow({ stats, currency }) {
  const items = [
    {
      label: "Money In",
      value: stats.income,
      icon: TrendingUp,
      tint: "text-emerald-400",
      ring: "ring-emerald-400/20 bg-emerald-400/10",
    },
    {
      label: "Money Out",
      value: stats.spending,
      icon: TrendingDown,
      tint: "text-rose-400",
      ring: "ring-rose-400/20 bg-rose-400/10",
    },
    {
      label: "Net Flow",
      value: stats.net,
      icon: Wallet,
      tint: "text-brand-400",
      ring: "ring-brand-400/20 bg-brand-400/10",
    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-3 gap-3"
    >
      {items.map(({ label, value, icon: Icon, tint, ring }) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div
            className={cn("grid size-8 place-items-center rounded-lg ring-1", ring)}
          >
            <Icon className={cn("size-4", tint)} />
          </div>
          <p className="mt-3 text-xs text-white/45">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white sm:text-base">
            {formatMoney(value, currency)}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

/* ---------- Transactions ---------- */
function TransactionsCard({ transactions, currency, onSend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-white">Transactions</h2>
        <span className="text-xs text-white/40">
          {transactions.length} total
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-white/10 py-10 text-center">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-white/5">
            <Send className="size-5 text-white/40" />
          </div>
          <p className="text-sm font-medium text-white/70">No transactions yet</p>
          <p className="mt-1 max-w-xs text-xs text-white/40">
            Once you send or receive money, it will show up here.
          </p>
          <button
            onClick={onSend}
            className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90"
          >
            Send your first payment
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {transactions.map((t) => (
            <TransactionRow key={t.id} tx={t} currency={currency} />
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function TransactionRow({ tx, currency }) {
  const isCredit = tx.direction === "CREDIT";
  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full ring-1",
          isCredit
            ? "bg-emerald-400/10 ring-emerald-400/20"
            : "bg-white/5 ring-white/10",
        )}
      >
        {isCredit ? (
          <ArrowDownLeft className="size-5 text-emerald-400" />
        ) : (
          <ArrowUpRight className="size-5 text-white/70" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {isCredit ? "From " : "To "}
          {tx.counterpartyName}
        </p>
        <p className="truncate text-xs text-white/40">
          {formatDate(tx.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isCredit ? "text-emerald-400" : "text-white",
          )}
        >
          {isCredit ? "+" : "−"}
          {formatMoney(tx.amount, currency)}
        </p>
        {tx.status !== "COMPLETED" && (
          <p className="text-[10px] uppercase tracking-wide text-amber-400/80">
            {tx.status}
          </p>
        )}
      </div>
    </li>
  );
}

/* ---------- Account details (side) ---------- */
function AccountCard({ account, refreshing, onRefresh }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(account._id);
      setCopied(true);
      toast.success("Account ID copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy account ID");
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-white">Account</h2>
        <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-400/20">
          {account.status}
        </span>
      </div>

      <p className="text-xs text-white/40">Account ID</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm text-white/80">
          {account._id.slice(0, 10)}…{account._id.slice(-6)}
        </span>
        <button
          onClick={copy}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Copy full account ID"
        >
          {copied ? (
            <Check className="size-4 text-emerald-400" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
        <div>
          <p className="text-xs text-white/40">Currency</p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {account.currency}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/40">Opened</p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {account.createdAt
              ? new Date(account.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        {refreshing ? "Refreshing…" : "Refresh balance"}
      </button>
    </motion.div>
  );
}

/* ---------- Small promo / security note ---------- */
function PromoCard({ onSend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-600/25 to-transparent p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-brand-500/20 blur-2xl" />
      <ShieldCheck className="size-6 text-brand-300" />
      <h3 className="mt-3 font-semibold text-white">Instant & secure</h3>
      <p className="mt-1 text-sm text-white/60">
        Every transfer is verified and double-entry recorded in the ledger.
      </p>
      <button
        onClick={onSend}
        className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
      >
        <Send className="size-4" /> Send money
      </button>
    </motion.div>
  );
}

/* ---------- No-account empty state ---------- */
function NoAccount({ creating, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center"
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-500/15 ring-1 ring-brand-500/30">
        <PlusCircle className="size-7 text-brand-400" />
      </div>
      <h2 className="text-lg font-semibold text-white">No account yet</h2>
      <p className="mt-1 max-w-sm text-sm text-white/60">
        Open your bank account to start receiving and sending money.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="mt-5 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      >
        {creating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PlusCircle className="size-4" />
        )}
        Create account
      </button>
    </motion.div>
  );
}
