import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminTransactionService from "../../../services/adminTransaction.service";

export default function ManageTransactionPage() {
    const [transactions, setTransactions] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await adminTransactionService.getAllTransactions();
            setTransactions(data);
        } catch (err) {
            console.error(err);
            setError("Cannot load transactions. Please check backend API.");
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const getTransactionId = (transaction) => {
        return (
            transaction.id ||
            transaction.transactionId ||
            transaction.paymentTransactionId
        );
    };

    const getTitle = (transaction) => {
        return (
            transaction.title ||
            transaction.description ||
            transaction.type ||
            "Payment Transaction"
        );
    };

    const getType = (transaction) => {
        return transaction.type || transaction.transactionType || "PAYMENT";
    };

    const getStatus = (transaction) => {
        return transaction.status || "PENDING";
    };

    const getAmount = (transaction) => {
        return transaction.amount || transaction.totalAmount || 0;
    };

    const getPayerName = (transaction) => {
        return (
            transaction.payerName ||
            transaction.fromUserName ||
            transaction.clientName ||
            transaction.payer?.fullName ||
            "Payer"
        );
    };

    const getReceiverName = (transaction) => {
        return (
            transaction.receiverName ||
            transaction.toUserName ||
            transaction.expertName ||
            transaction.receiver?.fullName ||
            "Receiver"
        );
    };

    const getProjectTitle = (transaction) => {
        return (
            transaction.projectTitle ||
            transaction.project?.title ||
            transaction.jobTitle ||
            "No project"
        );
    };

    const getCreatedAt = (transaction) => {
        return transaction.createdAt || transaction.paidAt || transaction.date;
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

    const getStatusClass = (status) => {
        const value = String(status).toUpperCase();

        if (value === "SUCCESS" || value === "COMPLETED" || value === "PAID") {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        if (value === "PENDING" || value === "HELD") {
            return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
        }

        if (value === "FAILED" || value === "CANCELLED") {
            return "border-red-400/30 bg-red-400/10 text-red-300";
        }

        if (value === "REFUNDED") {
            return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
        }

        return "border-gray-400/30 bg-gray-400/10 text-gray-300";
    };

    const getTypeClass = (type) => {
        const value = String(type).toUpperCase();

        if (value === "ESCROW") {
            return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
        }

        if (value === "RELEASE") {
            return "border-green-400/30 bg-green-400/10 text-green-300";
        }

        if (value === "REFUND") {
            return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
        }

        return "border-gray-400/30 bg-gray-400/10 text-gray-300";
    };

    const filteredTransactions = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return transactions.filter((transaction) => {
            const id = String(getTransactionId(transaction) || "").toLowerCase();
            const title = getTitle(transaction).toLowerCase();
            const payer = getPayerName(transaction).toLowerCase();
            const receiver = getReceiverName(transaction).toLowerCase();
            const project = getProjectTitle(transaction).toLowerCase();
            const status = String(getStatus(transaction)).toUpperCase();
            const type = String(getType(transaction)).toUpperCase();

            const matchSearch =
                !keyword ||
                id.includes(keyword) ||
                title.includes(keyword) ||
                payer.includes(keyword) ||
                receiver.includes(keyword) ||
                project.includes(keyword);

            const matchStatus =
                statusFilter === "ALL" || status === statusFilter.toUpperCase();

            const matchType =
                typeFilter === "ALL" || type === typeFilter.toUpperCase();

            return matchSearch && matchStatus && matchType;
        });
    }, [transactions, searchText, statusFilter, typeFilter]);

    const handleUpdateStatus = async (transactionId, status) => {
        const confirmUpdate = window.confirm(
            `Are you sure you want to change this transaction status to ${status}?`
        );

        if (!confirmUpdate) return;

        try {
            setActionLoadingId(transactionId);
            setMessage("");
            setError("");

            await adminTransactionService.updateTransactionStatus(
                transactionId,
                status
            );

            setMessage("Transaction status updated successfully.");
            await loadTransactions();
        } catch (err) {
            console.error(err);
            setError("Cannot update transaction status. Please check backend API.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const cardStyle =
        "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

    const labelStyle =
        "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

    return (
        <AdminLayout>
            <div className="px-5 py-10 md:px-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                                Admin Transactions
                            </p>

                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Manage transactions
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                                View payment transactions, escrow records, refunds and released
                                payments.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadTransactions}
                            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
                            {message}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Filter */}
                    <section className={`${cardStyle} mb-6 p-6`}>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_180px_150px]">
                            <div>
                                <label className={labelStyle}>Search Transaction</label>

                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                                        search
                                    </span>

                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(event) => setSearchText(event.target.value)}
                                        placeholder="Search by ID, user, project..."
                                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Status</label>

                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                                >
                                    <option value="ALL">All status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="SUCCESS">Success</option>
                                    <option value="FAILED">Failed</option>
                                    <option value="REFUNDED">Refunded</option>
                                    <option value="HELD">Held</option>
                                </select>
                            </div>

                            <div>
                                <label className={labelStyle}>Type</label>

                                <select
                                    value={typeFilter}
                                    onChange={(event) => setTypeFilter(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                                >
                                    <option value="ALL">All types</option>
                                    <option value="PAYMENT">Payment</option>
                                    <option value="ESCROW">Escrow</option>
                                    <option value="RELEASE">Release</option>
                                    <option value="REFUND">Refund</option>
                                </select>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                    Total
                                </p>

                                <p className="mt-1 text-2xl font-bold text-white">
                                    {filteredTransactions.length}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Loading */}
                    {loading && (
                        <div className={`${cardStyle} p-12 text-center text-gray-400`}>
                            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                                hourglass_empty
                            </span>
                            Loading transactions...
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && filteredTransactions.length === 0 && (
                        <div className={`${cardStyle} p-12 text-center`}>
                            <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                                receipt_long
                            </span>

                            <h2 className="text-xl font-bold text-white">
                                No transactions found
                            </h2>

                            <p className="mt-2 text-sm text-gray-400">
                                There are no transactions that match your filter.
                            </p>
                        </div>
                    )}

                    {/* List */}
                    {!loading && filteredTransactions.length > 0 && (
                        <div className="grid grid-cols-1 gap-5">
                            {filteredTransactions.map((transaction) => {
                                const transactionId = getTransactionId(transaction);
                                const status = getStatus(transaction);
                                const type = getType(transaction);

                                return (
                                    <article
                                        key={transactionId}
                                        className={`${cardStyle} p-6 transition hover:border-cyan-400/40`}
                                    >
                                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex-1">
                                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                                            status
                                                        )}`}
                                                    >
                                                        {status}
                                                    </span>

                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getTypeClass(
                                                            type
                                                        )}`}
                                                    >
                                                        {type}
                                                    </span>

                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                        {formatDate(getCreatedAt(transaction))}
                                                    </span>
                                                </div>

                                                <h2 className="text-xl font-bold text-white">
                                                    {getTitle(transaction)}
                                                </h2>

                                                <p className="mt-2 text-sm text-gray-400">
                                                    Transaction ID:{" "}
                                                    <span className="text-cyan-300">
                                                        {transactionId}
                                                    </span>
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                        From: {getPayerName(transaction)}
                                                    </span>

                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                        To: {getReceiverName(transaction)}
                                                    </span>

                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                                                        Project: {getProjectTitle(transaction)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:w-80">
                                                <p className="text-xs uppercase tracking-wider text-gray-500">
                                                    Amount
                                                </p>

                                                <p className="mt-1 text-3xl font-bold text-white">
                                                    {formatMoney(getAmount(transaction))}
                                                </p>

                                                <div className="mt-5 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === transactionId}
                                                        onClick={() =>
                                                            handleUpdateStatus(transactionId, "SUCCESS")
                                                        }
                                                        className="rounded-lg border border-green-400/40 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Success
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === transactionId}
                                                        onClick={() =>
                                                            handleUpdateStatus(transactionId, "FAILED")
                                                        }
                                                        className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Failed
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === transactionId}
                                                        onClick={() =>
                                                            handleUpdateStatus(transactionId, "REFUNDED")
                                                        }
                                                        className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Refund
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={actionLoadingId === transactionId}
                                                        onClick={() =>
                                                            handleUpdateStatus(transactionId, "HELD")
                                                        }
                                                        className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:opacity-50"
                                                    >
                                                        Hold
                                                    </button>
                                                </div>

                                                {actionLoadingId === transactionId && (
                                                    <p className="mt-3 text-xs text-gray-500">
                                                        Updating transaction...
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}