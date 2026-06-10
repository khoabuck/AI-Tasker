import { useEffect, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import escrowService from "../../../services/escrow.service";

export default function ExpertWalletPage() {
    const [wallet, setWallet] = useState(null);
    const [escrows, setEscrows] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadWalletData();
    }, []);

    const loadWalletData = async () => {
        try {
            setLoading(true);
            setError("");

            const [walletData, escrowData, transactionData] = await Promise.all([
                escrowService.getMyWalletSummary(),
                escrowService.getMyEscrows(),
                escrowService.getMyTransactions(),
            ]);

            setWallet(walletData);
            setEscrows(escrowData);
            setTransactions(transactionData);
        } catch (err) {
            console.error(err);
            setError("Cannot load wallet data. Please check backend API.");
            setWallet(null);
            setEscrows([]);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (value) => {
        const number = Number(value || 0);

        return `$${number.toLocaleString("en-US")}`;
    };

    const formatDate = (value) => {
        if (!value) return "No date";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "No date";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const getAvailableBalance = () => {
        return (
            wallet?.availableBalance ||
            wallet?.balance ||
            wallet?.availableAmount ||
            0
        );
    };

    const getPendingAmount = () => {
        return wallet?.pendingAmount || wallet?.pendingBalance || 0;
    };

    const getEscrowAmount = () => {
        return wallet?.escrowAmount || wallet?.lockedAmount || 0;
    };

    const getTotalEarned = () => {
        return wallet?.totalEarned || wallet?.totalIncome || 0;
    };

    const getEscrowId = (escrow) => {
        return escrow.id || escrow.escrowId || escrow.escrowID;
    };

    const getEscrowProjectTitle = (escrow) => {
        return (
            escrow.projectTitle ||
            escrow.project?.title ||
            escrow.jobTitle ||
            "Untitled Project"
        );
    };

    const getEscrowAmountItem = (escrow) => {
        return escrow.amount || escrow.escrowAmount || escrow.lockedAmount || 0;
    };

    const getEscrowStatus = (escrow) => {
        return escrow.status || "HELD";
    };

    const getTransactionId = (transaction) => {
        return (
            transaction.id ||
            transaction.transactionId ||
            transaction.paymentTransactionId
        );
    };

    const getTransactionTitle = (transaction) => {
        return (
            transaction.title ||
            transaction.description ||
            transaction.type ||
            "Payment Transaction"
        );
    };

    const getTransactionAmount = (transaction) => {
        return transaction.amount || transaction.totalAmount || 0;
    };

    const getTransactionStatus = (transaction) => {
        return transaction.status || "PENDING";
    };

    const getTransactionDate = (transaction) => {
        return transaction.createdAt || transaction.paidAt || transaction.date;
    };

    const getStatusClass = (status) => {
        const value = String(status).toUpperCase();

        if (
            value === "RELEASED" ||
            value === "PAID" ||
            value === "COMPLETED" ||
            value === "SUCCESS"
        ) {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        if (value === "HELD" || value === "PENDING") {
            return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
        }

        if (value === "REFUNDED" || value === "FAILED" || value === "CANCELLED") {
            return "border-red-400/30 bg-red-400/10 text-red-300";
        }

        return "border-gray-400/30 bg-gray-400/10 text-gray-300";
    };

    const cardStyle =
        "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

    return (
        <ExpertLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                                Expert Wallet
                            </p>

                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Wallet & payments
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                                Track your earnings, escrow money, released payments and
                                transaction history.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadWalletData}
                            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                        >
                            Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {loading && (
                        <div className={`${cardStyle} p-12 text-center text-gray-400`}>
                            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                                hourglass_empty
                            </span>
                            Loading wallet data...
                        </div>
                    )}

                    {!loading && (
                        <>
                            {/* Summary cards */}
                            <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
                                <div className={`${cardStyle} p-6`}>
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/10">
                                        <span className="material-symbols-outlined text-green-300">
                                            account_balance_wallet
                                        </span>
                                    </div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Available Balance
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {formatMoney(getAvailableBalance())}
                                    </p>
                                </div>

                                <div className={`${cardStyle} p-6`}>
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10">
                                        <span className="material-symbols-outlined text-yellow-300">
                                            lock
                                        </span>
                                    </div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        In Escrow
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {formatMoney(getEscrowAmount())}
                                    </p>
                                </div>

                                <div className={`${cardStyle} p-6`}>
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                                        <span className="material-symbols-outlined text-[#00F0FF]">
                                            schedule
                                        </span>
                                    </div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Pending
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {formatMoney(getPendingAmount())}
                                    </p>
                                </div>

                                <div className={`${cardStyle} p-6`}>
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                                        <span className="material-symbols-outlined text-[#00F0FF]">
                                            trending_up
                                        </span>
                                    </div>

                                    <p className="text-xs uppercase tracking-wider text-gray-500">
                                        Total Earned
                                    </p>

                                    <p className="mt-2 text-3xl font-bold text-white">
                                        {formatMoney(getTotalEarned())}
                                    </p>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
                                {/* Transactions */}
                                <section className={`${cardStyle} p-6 md:p-8`}>
                                    <div className="mb-6 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-white">
                                                Transaction History
                                            </h2>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Payments and wallet activities.
                                            </p>
                                        </div>

                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                            {transactions.length} items
                                        </span>
                                    </div>

                                    {transactions.length === 0 && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                                            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                                receipt_long
                                            </span>

                                            <h3 className="font-bold text-white">
                                                No transactions yet
                                            </h3>

                                            <p className="mt-2 text-sm text-gray-500">
                                                Your payment history will appear here.
                                            </p>
                                        </div>
                                    )}

                                    {transactions.length > 0 && (
                                        <div className="space-y-3">
                                            {transactions.map((transaction) => (
                                                <div
                                                    key={getTransactionId(transaction)}
                                                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                                                >
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                                                        getTransactionStatus(transaction)
                                                                    )}`}
                                                                >
                                                                    {getTransactionStatus(transaction)}
                                                                </span>

                                                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                                    {formatDate(getTransactionDate(transaction))}
                                                                </span>
                                                            </div>

                                                            <h3 className="text-sm font-bold text-white">
                                                                {getTransactionTitle(transaction)}
                                                            </h3>
                                                        </div>

                                                        <p className="text-lg font-bold text-white">
                                                            {formatMoney(getTransactionAmount(transaction))}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* Escrow list */}
                                <aside className={`${cardStyle} p-6 md:p-8`}>
                                    <div className="mb-6">
                                        <h2 className="text-lg font-bold text-white">
                                            Escrow Records
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Money currently held or released by project.
                                        </p>
                                    </div>

                                    {escrows.length === 0 && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                                            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                                lock_open
                                            </span>

                                            <h3 className="font-bold text-white">No escrow data</h3>

                                            <p className="mt-2 text-sm text-gray-500">
                                                Escrow money will appear after a project starts.
                                            </p>
                                        </div>
                                    )}

                                    {escrows.length > 0 && (
                                        <div className="space-y-3">
                                            {escrows.map((escrow) => (
                                                <div
                                                    key={getEscrowId(escrow)}
                                                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                                                >
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                                                getEscrowStatus(escrow)
                                                            )}`}
                                                        >
                                                            {getEscrowStatus(escrow)}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-sm font-bold text-white">
                                                        {getEscrowProjectTitle(escrow)}
                                                    </h3>

                                                    <p className="mt-2 text-xl font-bold text-white">
                                                        {formatMoney(getEscrowAmountItem(escrow))}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </aside>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </ExpertLayout>
    );
}