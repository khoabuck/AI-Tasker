import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import proposalCreditPackageService from "../../../services/proposalCreditPackage.service";
import expertWalletService from "../../../services/expertWallet.service";

export default function ProposalCreditPackagesPage() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [credits, setCredits] = useState(null);
  const [balance, setBalance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasingId, setPurchasingId] = useState("");

  const [confirmPackage, setConfirmPackage] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  const visiblePackages = useMemo(() => {
    return packages.filter((item) => item.isActive).slice(0, 4);
  }, [packages]);

  const paidCredits = getAvailableProposalCredits(credits);
  const freeSubmitRemaining = getFreeSubmitRemaining(credits);
  const remainingSubmissions = paidCredits + freeSubmitRemaining;
  const walletBalance = Number(balance?.availableBalance || 0);

  const loadPage = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [packageResult, creditResult, balanceResult] =
        await Promise.allSettled([
          proposalCreditPackageService.getAvailablePackages(),
          proposalCreditPackageService.getMyProposalCredits(),
          expertWalletService.getBalance(),
        ]);

      if (packageResult.status === "fulfilled") {
        setPackages(
          Array.isArray(packageResult.value) ? packageResult.value : []
        );
      } else {
        throw packageResult.reason;
      }

      if (creditResult.status === "fulfilled") {
        setCredits(creditResult.value);
      } else {
        setCredits(null);
      }

      if (balanceResult.status === "fulfilled") {
        setBalance(balanceResult.value);
      } else {
        setBalance(null);
      }
    } catch (err) {
      console.error(
        "LOAD PROPOSAL CREDIT PACKAGES ERROR:",
        err?.response?.data || err
      );

      setError(getFriendlyError(err, "Cannot load proposal credit packages."));
      setPackages([]);
      setCredits(null);
      setBalance(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePurchase = async (pkg) => {
    const packageId = pkg?.packageId;

    if (!packageId) {
      setError("Invalid package.");
      return;
    }

    if (!pkg.isActive) {
      setError("This package is not available.");
      return;
    }

    const packagePrice = Number(pkg.price || 0);

    if (packagePrice <= 0) {
      return;
    }

    if (packagePrice > walletBalance) {
      navigate("/expert/wallet", {
        state: {
          returnTo: "/expert/proposal-credit-packages",
          reason: "BUY_PROPOSAL_CREDITS",
          packageId,
          depositAmount: packagePrice,
          autoOpenDeposit: true,
        },
      });

      return;
    }

    setConfirmPackage(pkg);
  };

  const confirmPurchasePackage = async () => {
    if (!confirmPackage?.packageId) return;

    try {
      setPurchasingId(String(confirmPackage.packageId));
      setError("");
      setMessage("");

      await proposalCreditPackageService.purchasePackage(
        confirmPackage.packageId
      );

      setConfirmPackage(null);
      await loadPage({ silent: true });

      setMessage(
        "Package purchased successfully. Your proposal credits have been updated."
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(
        "PURCHASE PROPOSAL CREDIT PACKAGE ERROR:",
        err?.response?.data || err
      );

      const friendlyError = getFriendlyError(
        err,
        "Cannot purchase this package."
      );

      setError(friendlyError);

      if (isWalletError(friendlyError)) {
        navigate("/expert/wallet", {
          state: {
            returnTo: "/expert/proposal-credit-packages",
            reason: "BUY_PROPOSAL_CREDITS",
            packageId: confirmPackage.packageId,
            depositAmount: Number(confirmPackage.price || 0),
            autoOpenDeposit: true,
          },
        });
      }
    } finally {
      setPurchasingId("");
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading proposal credit packages...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111823] shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
            <div className="relative p-7 md:p-8">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#00F0FF]">
                    Proposal Credits
                  </p>

                  <h1 className="text-3xl font-black text-white md:text-4xl">
                    Choose your proposal package
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Buy credits to continue submitting proposals and apply for
                    more jobs.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AccountStat
                    label="Wallet Balance"
                    value={formatMoney(walletBalance)}
                    icon="account_balance_wallet"
                  />

                  <AccountStat
                    label="Submissions Left"
                    value={formatNumber(remainingSubmissions)}
                    icon="workspace_premium"
                  />
                </div>
              </div>
            </div>
          </section>

          {message && <Alert type="success" message={message} />}
          {error && <Alert type="danger" message={error} />}

          <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                Available Plans
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select one package to add proposal submissions to your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadPage({ silent: true })}
              disabled={refreshing}
              className="w-fit rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {visiblePackages.length === 0 ? (
            <EmptyPackages />
          ) : (
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {visiblePackages.map((pkg, index) => (
                <PackageCard
                  key={pkg.packageId || index}
                  pkg={pkg}
                  index={index}
                  walletBalance={walletBalance}
                  purchasing={String(purchasingId) === String(pkg.packageId)}
                  onPurchase={() => handlePurchase(pkg)}
                />
              ))}
            </section>
          )}
        </div>
      </div>

      {confirmPackage && Number(confirmPackage.price || 0) > 0 && (
        <PurchaseConfirmModal
          pkg={confirmPackage}
          purchasing={String(purchasingId) === String(confirmPackage.packageId)}
          onClose={() => setConfirmPackage(null)}
          onConfirm={confirmPurchasePackage}
        />
      )}
    </ExpertLayout>
  );
}

function PackageCard({ pkg, index, walletBalance, purchasing, onPurchase }) {
  const packagePrice = Number(pkg.price || 0);
  const isFree = packagePrice <= 0;
  const notEnoughBalance = packagePrice > Number(walletBalance || 0);
  const isPopular =
    !isFree && (index === 1 || pkg.isPopular || pkg.popular);

  const pricePerCredit =
    Number(pkg.proposalCredits || 0) > 0 && !isFree
      ? packagePrice / Number(pkg.proposalCredits || 1)
      : 0;

  return (
    <article
      className={`relative flex min-h-[430px] flex-col overflow-hidden rounded-[1.8rem] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 ${isFree
          ? "border-green-400/35 bg-[#132019]"
          : isPopular
            ? "border-cyan-400/50 bg-[#14202b]"
            : "border-white/10 bg-[#151a22]"
        }`}
    >
      <div
        className={`absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl ${isFree ? "bg-green-400/10" : "bg-cyan-400/10"
          }`}
      />

      {isFree && (
        <div className="absolute right-5 top-5 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-300">
          Included
        </div>
      )}

      {isPopular && (
        <div className="absolute right-5 top-5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-300">
          Popular
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-6 pr-20">
          <h3 className="text-xl font-black text-white">{pkg.packageName}</h3>

          <p className="mt-2 min-h-[44px] text-sm leading-6 text-gray-400">
            {pkg.description ||
              (isFree
                ? "Free proposal submissions included with your account."
                : "Get more proposal submissions for your next opportunities.")}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-bold text-gray-500">Price</p>

          <p
            className={`mt-2 text-3xl font-black ${isFree ? "text-green-300" : "text-white"
              }`}
          >
            {isFree ? "Free" : formatMoney(pkg.price)}
          </p>

          {isFree ? (
            <p className="mt-2 text-xs font-bold text-green-200/70">
              No wallet payment is required
            </p>
          ) : (
            pricePerCredit > 0 && (
              <p className="mt-2 text-xs font-bold text-gray-500">
                About {formatMoney(pricePerCredit)} / submission
              </p>
            )
          )}
        </div>

        <div
          className={`mb-6 rounded-2xl border p-5 ${isFree
              ? "border-green-400/20 bg-green-400/[0.06]"
              : "border-white/10 bg-[#0f141d]"
            }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
            Includes
          </p>

          <div className="mt-3 flex items-end gap-2">
            <p
              className={`text-5xl font-black ${isFree ? "text-green-300" : "text-cyan-300"
                }`}
            >
              {formatNumber(pkg.proposalCredits)}
            </p>

            <p className="pb-2 text-sm font-bold text-gray-400">
              proposal submissions
            </p>
          </div>
        </div>

        <div className="mt-auto">
          {!isFree && (
            <button
              type="button"
              onClick={onPurchase}
              disabled={purchasing}
              className={`w-full rounded-2xl px-5 py-3.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${isPopular
                  ? "bg-cyan-400 text-black hover:bg-cyan-300"
                  : "border border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400 hover:text-black"
                }`}
            >
              {purchasing
                ? "Purchasing..."
                : notEnoughBalance
                  ? "Buy"
                  : "Buy"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PurchaseConfirmModal({ pkg, purchasing, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.5rem] border border-cyan-400/30 bg-[#111823] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.75)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
          Confirm Purchase
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Buy {pkg.packageName}?
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          This will use your wallet balance to add proposal submissions to your
          account.
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Price</span>
            <span className="font-black text-white">
              {formatMoney(pkg.price)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Credits</span>
            <span className="font-black text-cyan-300">
              {formatNumber(pkg.proposalCredits)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={purchasing}
            className="flex-1 rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={purchasing}
            className="flex-1 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {purchasing ? "Buying..." : "Confirm Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountStat({ label, value, icon }) {
  return (
    <article className="min-w-[230px] rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </article>
  );
}

function EmptyPackages() {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[#151a22] p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <span className="material-symbols-outlined mb-4 block text-6xl text-gray-600">
        inventory_2
      </span>

      <h3 className="text-xl font-black text-white">No packages available</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        Proposal credit packages are not available right now. Please come back
        later.
      </p>
    </div>
  );
}

function Alert({ type, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${style}`}>
      {message}
    </div>
  );
}

function getCreditRaw(credits) {
  return credits?.raw || credits?.Raw || credits || {};
}

function getAvailableProposalCredits(credits) {
  if (typeof credits === "number") return credits;

  const raw = getCreditRaw(credits);

  return toNumber(
    getValue(
      credits?.availableProposalSubmitCredits,
      credits?.AvailableProposalSubmitCredits,
      credits?.remainingCredits,
      credits?.RemainingCredits,
      credits?.availableCredits,
      credits?.AvailableCredits,
      credits?.proposalCredits,
      credits?.ProposalCredits,
      credits?.credits,
      credits?.Credits,
      credits?.balance,
      credits?.Balance,
      raw.availableProposalSubmitCredits,
      raw.AvailableProposalSubmitCredits,
      raw.remainingCredits,
      raw.RemainingCredits,
      raw.availableCredits,
      raw.AvailableCredits,
      raw.proposalCredits,
      raw.ProposalCredits,
      raw.credits,
      raw.Credits,
      raw.balance,
      raw.Balance,
      0
    ),
    0
  );
}

function getFreeSubmitRemaining(credits) {
  if (!credits || typeof credits === "number") return 0;

  const raw = getCreditRaw(credits);

  return toNumber(
    getValue(
      credits?.freeSubmitRemaining,
      credits?.FreeSubmitRemaining,
      credits?.freeSubmitsRemaining,
      credits?.FreeSubmitsRemaining,
      raw.freeSubmitRemaining,
      raw.FreeSubmitRemaining,
      raw.freeSubmitsRemaining,
      raw.FreeSubmitsRemaining,
      0
    ),
    0
  );
}

function getValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
}

function isWalletError(message) {
  const value = String(message || "").toLowerCase();

  return (
    value.includes("balance") ||
    value.includes("wallet") ||
    value.includes("insufficient") ||
    value.includes("not enough")
  );
}

function formatMoney(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}