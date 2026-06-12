import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminTransactionService from "../../../services/adminTransaction.service";

export default function ManageTransactionPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [updatingId, setUpdatingId] = useState(null);
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
      transaction.paymentTransactionId ||
      transaction.walletTransactionId
    );
  };

  const getTransactionType = (transaction) => {
    return transaction.type || transaction.transactionType || "PAYMENT";
  };

  const getTransactionStatus = (transaction) => {
    return transaction.status || transaction.transactionStatus || "PENDING";
  };

  const getTransactionAmount = (transaction) => {
    return transaction.amount || transaction.totalAmount || transaction.value || 0;
  };

  const getPayerName = (transaction) => {
    return (
      transaction.payerName ||
      transaction.senderName ||
      transaction.fromUserName ||
      transaction.payer?.fullName ||
      transaction.sender?.fullName ||
      "Unknown"
    );
  };

  const getReceiverName = (transaction) => {
    return (
      transaction.receiverName ||
      transaction.toUserName ||
      transaction.receiver?.fullName ||
      transaction.expertName ||
      "Unknown"
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

  const getCreatedDate = (transaction) => {
    return (
      transaction.createdAt ||
      transaction.paidAt ||
      transaction.updatedAt ||
      transaction.date
    );
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

    if (
      value === "SUCCESS" ||
      value === "COMPLETED" ||
      value === "PAID" ||
      value === "RELEASED"
    ) {
      return "border-green-400/30 bg-green-400/10 text-green-300";
    }

    if (value === "PENDING" || value === "PROCESSING" || value === "HELD") {
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-300";
    }

    if (
      value === "FAILED" ||
      value === "CANCELLED" ||
      value === "REJECTED"
    ) {
      return "border-red-400/30 bg-red-400/10 text-red-300";
    }

    if (value === "REFUNDED") {
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
    }

    return "border-gray-400/30 bg-gray-400/10 text-gray-300";
  };

  const filteredTransactions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const status = String(getTransactionStatus(transaction)).toUpperCase();
      const type = String(getTransactionType(transaction)).toUpperCase();

      const matchStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const matchType =
        typeFilter === "ALL" || type === typeFilter.toUpperCase();

      const searchableText = [
        getTransactionId(transaction),
        getTransactionType(transaction),
        getTransactionStatus(transaction),
        getPayerName(transaction),
        getReceiverName(transaction),
        getProjectTitle(transaction),
      ]
        .join(" ")
        .toLowerCase();

      const matchSearch = !keyword || searchableText.includes(keyword);

      return matchStatus && matchType && matchSearch;
    });
  }, [transactions, search, statusFilter, typeFilter]);

  const handleUpdateStatus = async (transactionId, newStatus) => {
    try {
      setUpdatingId(transactionId);
      setMessage("");
      setError("");

      await adminTransactionService.updateTransactionStatus(
        transactionId,
        newStatus
      );

      setMessage("Transaction status updated successfully.");
      await loadTransactions();
    } catch (err) {
      console.error(err);
      setError("Cannot update transaction status. Please check backend API.");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, transaction) => {
      return sum + Number(getTransactionAmount(transaction) || 0);
    }, 0);
  }, [filteredTransactions]);

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Management
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Manage Transactions
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                View payment transactions, escrow records, refunds and withdraw
                requests in the system.
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

          {message && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className={`${cardStyle} p-5`}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <span className="material-symbols-outlined text-[#00F0FF]">
                  receipt_long
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Transactions
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {filteredTransactions.length}
              </p>
            </div>

            <div className={`${cardStyle} p-5`}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/10">
                <span className="material-symbols-outlined text-green-300">
                  payments
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Total Amount
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {formatMoney(totalAmount)}
              </p>
            </div>

            <div className={`${cardStyle} p-5`}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10">
                <span className="material-symbols-outlined text-yellow-300">
                  schedule
                </span>
              </div>

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {
                  transactions.filter(
                    (item) =>
                      String(getTransactionStatus(item)).toUpperCase() ===
                      "PENDING"
                  ).length
                }
              </p>
            </div>
          </section>

          <section className={`${cardStyle} p-5 md:p-6`}>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_180px]">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by user, project, type, status..."
                className={inputStyle}
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputStyle}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="COMPLETED">Completed</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={inputStyle}
              >
                <option value="ALL">All Type</option>
                <option value="PAYMENT">Payment</option>
                <option value="ESCROW">Escrow</option>
                <option value="WITHDRAW">Withdraw</option>
                <option value="REFUND">Refund</option>
                <option value="RELEASE">Release</option>
              </select>
            </div>

            {loading && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-gray-400">
                <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                  hourglass_empty
                </span>
                Loading transactions...
              </div>
            )}

            {!loading && filteredTransactions.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
                <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                  receipt_long
                </span>

                <h3 className="font-bold text-white">No transactions found</h3>

                <p className="mt-2 text-sm text-gray-500">
                  Try changing search keyword or filter.
                </p>
              </div>
            )}

            {!loading && filteredTransactions.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] border-collapse">
                    <thead className="bg-white/[0.04]">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Transaction
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Project
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          From / To
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Amount
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Status
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Date
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10">
                      {filteredTransactions.map((transaction) => {
                        const transactionId = getTransactionId(transaction);
                        const status = getTransactionStatus(transaction);

                        return (
                          <tr
                            key={transactionId}
                            className="transition hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-4">
                              <p className="text-sm font-bold text-white">
                                #{transactionId}
                              </p>

                              <p className="mt-1 text-xs uppercase tracking-wider text-cyan-300">
                                {getTransactionType(transaction)}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="max-w-[220px] truncate text-sm text-gray-300">
                                {getProjectTitle(transaction)}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm text-gray-300">
                                From: {getPayerName(transaction)}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                To: {getReceiverName(transaction)}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-base font-bold text-white">
                                {formatMoney(getTransactionAmount(transaction))}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClass(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm text-gray-400">
                                {formatDate(getCreatedDate(transaction))}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <select
                                value={status}
                                disabled={updatingId === transactionId}
                                onChange={(event) =>
                                  handleUpdateStatus(
                                    transactionId,
                                    event.target.value
                                  )
                                }
                                className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-xs font-bold text-gray-300 outline-none transition focus:border-cyan-400"
                              >
                                <option value={status}>Change Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="SUCCESS">Success</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="REFUNDED">Refunded</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}