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
  KeyRound,
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
import ThemeToggle from "@/components/ThemeToggle";
import TransferPasswordModal from "@/components/TransferPasswordModal";
import {
  currencySymbol,
  formatDate,
  formatMoney,
  greeting,
  initials,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// Shared shape for the circular icon buttons in the header.
const ICON_BUTTON =
  "grid size-9 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-border shadow-sm transition hover:bg-muted hover:text-foreground";

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [acctOtpOpen, setAcctOtpOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const hasTransferPassword = !!user?.hasTransferPassword;

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
      const [{ accounts }, txRes, meRes] = await Promise.all([
        api.getMyAccounts(),
        api.getTransactions().catch(() => ({ transactions: [] })),
        // Refresh the profile so we know whether a transfer password is set,
        // even for sessions that predate the feature.
        api.getMe().catch(() => null),
      ]);
      setAccount(accounts?.[0] || null);
      setTransactions(txRes?.transactions || []);
      if (meRes?.user) {
        updateUser({ hasTransferPassword: !!meRes.user.hasTransferPassword });
      }
    } catch (err) {
      if (!(await handleAuthError(err))) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, updateUser]);

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
            <SecurityCard
              hasTransferPassword={hasTransferPassword}
              onManage={() => setPwOpen(true)}
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
            hasTransferPassword={hasTransferPassword}
            onManagePassword={() => setPwOpen(true)}
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

      <TransferPasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        isChange={hasTransferPassword}
        onSaved={() => updateUser({ hasTransferPassword: true })}
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
      className="mb-6 flex items-center justify-between gap-3 sm:mb-8"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/25">
          {initials(user?.name)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{greeting()}</p>
          <h1 className="text-lg font-semibold">{user?.name}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle compact className="mr-1 hidden sm:inline-flex" />
        <button className={ICON_BUTTON} aria-label="Notifications">
          <Bell className="size-4" />
        </button>
        {user?.systemUser && (
          <button
            onClick={onSystem}
            className="flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-medium text-foreground/80 ring-1 ring-border shadow-sm transition hover:bg-muted"
          >
            <ShieldCheck className="size-4 text-amber-500 dark:text-amber-400" />
            System
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </div>
    </motion.header>
  );
}

/* ---------- Balance hero (brand gradient card) ---------- */
function BalanceHero({ account, onSend, onRequest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-600 to-aqua-500 p-6 text-white shadow-[0_24px_60px_-28px_rgba(30,80,224,0.75)] sm:p-8"
    >
      {/* soft decorative blobs */}
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-52 rounded-full bg-aqua-300/25 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-white/70">
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
            onClick={onSend}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90 active:translate-y-px"
          >
            <Send className="size-4" /> Send
          </button>
          <button
            onClick={onRequest}
            className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/25 active:translate-y-px"
          >
            <QrCode className="size-4" /> Request
          </button>
          <button
            onClick={onSend}
            className="grid size-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/25"
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
      label: "Received",
      value: stats.income,
      icon: TrendingUp,
      tint: "text-emerald-600 dark:text-emerald-400",
      ring: "bg-emerald-500/10 ring-emerald-500/20 dark:bg-emerald-400/10 dark:ring-emerald-400/20",
    },
    {
      label: "Sent",
      value: stats.spending,
      icon: TrendingDown,
      tint: "text-rose-600 dark:text-rose-400",
      ring: "bg-rose-500/10 ring-rose-500/20 dark:bg-rose-400/10 dark:ring-rose-400/20",
    },
    {
      label: "Net Flow",
      value: stats.net,
      icon: Wallet,
      tint: "text-primary",
      ring: "bg-primary/10 ring-primary/20",
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
        <div key={label} className="panel rounded-2xl p-4">
          <div
            className={cn("grid size-8 place-items-center rounded-lg ring-1", ring)}
          >
            <Icon className={cn("size-4", tint)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">
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
      className="panel rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Transactions</h2>
        <span className="text-xs text-muted-foreground">
          {transactions.length} total
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border py-10 text-center">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted">
            <Send className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Once you send or receive money, it will show up here.
          </p>
          <button
            onClick={onSend}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Send your first payment
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
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
            ? "bg-emerald-500/10 ring-emerald-500/20 dark:bg-emerald-400/10 dark:ring-emerald-400/20"
            : "bg-muted ring-border",
        )}
      >
        {isCredit ? (
          <ArrowDownLeft className="size-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowUpRight className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {isCredit ? "From " : "To "}
          {tx.counterpartyName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDate(tx.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
          )}
        >
          {isCredit ? "+" : "−"}
          {formatMoney(tx.amount, currency)}
        </p>
        {tx.status !== "COMPLETED" && (
          <p className="text-[10px] tracking-wide text-amber-600 uppercase dark:text-amber-400">
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
      className="panel rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Account</h2>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
          {account.status}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">Account ID</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm text-foreground/80">
          {account._id.slice(0, 10)}…{account._id.slice(-6)}
        </span>
        <button
          onClick={copy}
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"
          title="Copy full account ID"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="mt-0.5 text-sm font-medium">{account.currency}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Opened</p>
          <p className="mt-0.5 text-sm font-medium">
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        {refreshing ? "Refreshing…" : "Refresh balance"}
      </button>
    </motion.div>
  );
}

/* ---------- Transfer password (security) ---------- */
function SecurityCard({ hasTransferPassword, onManage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="panel rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Transfer password</h2>
        {hasTransferPassword ? (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-400">
            Set
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400">
            Not set
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/25">
          <KeyRound className="size-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {hasTransferPassword
            ? "You'll be asked for this password each time you send money."
            : "Set a password to protect your transfers. It's required before any money leaves your account."}
        </p>
      </div>

      <button
        onClick={onManage}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
      >
        <KeyRound className="size-4" />
        {hasTransferPassword ? "Change transfer password" : "Set transfer password"}
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
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/12 to-transparent p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full bg-primary/15 blur-2xl" />
      <ShieldCheck className="size-6 text-primary" />
      <h3 className="mt-3 font-semibold">Instant &amp; secure</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Every transfer is verified and double-entry recorded in the ledger.
      </p>
      <button
        onClick={onSend}
        className="mt-4 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
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
      className="grid place-items-center rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center"
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/25">
        <PlusCircle className="size-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">No account yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Open your bank account to start receiving and sending money.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
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
