import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import { clientContractApi } from "../../../api/clientContract.api";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const getStatusClass = (status) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-500/10 text-green-400";

    case "CANCELLED":
      return "bg-red-500/10 text-red-400";

    case "PENDING":
      return "bg-yellow-500/10 text-yellow-400";

    default:
      return "bg-gray-500/10 text-gray-400";
  }
};

export default function ClientContractDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const proposalId = searchParams.get("proposalId");

  const [contract, setContract] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState(false);

  // guard
  useEffect(() => {
    if (!proposalId) setInvalid(true);
  }, [proposalId]);

  // fetch contract + milestones
  // code mới
  // fetch contract + milestones. silent=true dùng cho polling nền — không bật
  // spinner/không xóa error đang hiện, tránh nháy màn hình mỗi lần refetch.
  const fetchData = useCallback(async (silent = false) => {
    if (!proposalId) return;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      // 1. CONTRACT
      const res = await clientContractApi.getContractByProposal(proposalId);
      const data = res?.data?.data;

      if (!data) {
        setContract(null);
        setMilestones([]);
        return;
      }

      setContract(data);

      // 2. MILESTONES
      const contractId = data.contractId;

      if (contractId) {
        const milestoneRes = await clientContractApi.getMilestoneDrafts(contractId);
        setMilestones(milestoneRes?.data?.data || []);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.error("LOAD CONTRACT ERROR:", err);
      if (!silent) {
        setError(
        err?.response?.data?.message ||
        "Failed to load contract"
        );
        setContract(null);
        setMilestones([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự động làm mới hợp đồng + milestone mỗi 5s khi hợp đồng chưa CANCELLED —
  // để phát hiện thay đổi (đối phương ký, milestone được thêm...) mà không
  // cần Client tự F5. Dừng poll khi hợp đồng đã bị hủy vì lúc đó không còn gì
  // thay đổi thêm.
  useEffect(() => {
    if (!contract) return;

    const shouldStopPolling =
      contract.status === "CANCELLED" ||
      contract.projectStatus === "COMPLETED";

    if (shouldStopPolling) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [
    contract?.status,
    contract?.projectStatus,
    fetchData
  ]);

  // loading
  if (loading && !contract) {
    return (
      <ClientLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  // invalid
  if (invalid) {
    return (
      <ClientLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-red-400">
          Missing proposalId
        </div>
      </ClientLayout>
    );
  }

  // empty
  if (!loading && !contract) {
    return (
      <ClientLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <p className="text-red-400 text-lg font-semibold">
            {error || "Contract not found"}
          </p>

          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
          >
            Go back
          </button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex w-fit items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-400"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back
        </button>

        {/* HEADER */}
        <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-6">

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-white text-xl font-bold">
                Contract Detail
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Signed contract overview
              </p>
            </div>

            <span
              className={`px-3 py-1 text-xs rounded-full ${getStatusClass(contract?.status)}`}
            >
              {contract?.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-400 text-xs">Job</p>
              <p className="text-white font-medium">{contract?.jobTitle}</p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-400 text-xs">Client</p>
              <p className="text-white font-medium">{contract?.clientName}</p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-400 text-xs">Expert</p>
              <p className="text-white font-medium">{contract?.expertName}</p>
            </div>

          </div>
        </div>

        {/* FINANCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-gray-400 text-xs">Price</p>
            <p className="text-white text-xl font-bold">
              {formatCurrency(contract?.finalPrice)}
            </p>
          </div>

          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-gray-400 text-xs">Fee</p>
            <p className="text-white text-xl font-bold">
              {formatCurrency(contract?.platformFeeAmount)}
            </p>
          </div>

          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <p className="text-gray-400 text-xs">Total</p>
            <p className="text-emerald-400 text-xl font-bold">
              {formatCurrency(contract?.totalClientPayment)}
            </p>
          </div>

        </div>

        {/* CONTENT */}
        <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-6 space-y-6">

          <div>
            <h3 className="text-white font-semibold">Scope</h3>
            <p className="text-gray-400 text-sm mt-1">
              {contract?.projectScope}
            </p>
          </div>

          <div className="border-t border-white/10" />

          <div>
            <h3 className="text-white font-semibold">Deliverables</h3>
            <p className="text-gray-400 text-sm mt-1">
              {contract?.deliverables}
            </p>
          </div>

          <div className="border-t border-white/10" />

          <div>
            <h3 className="text-white font-semibold">Acceptance</h3>
            <p className="text-gray-400 text-sm mt-1">
              {contract?.acceptanceCriteria}
            </p>
          </div>

          <div className="border-t border-white/10" />

          <div>
            <h3 className="text-white font-semibold">Payment Terms</h3>
            <p className="text-gray-400 text-sm mt-1">
              {contract?.paymentTerms}
            </p>
          </div>

        </div>

        {/* MILESTONES */}
        <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-6">

          <h3 className="text-white font-semibold mb-4">
            Milestones
          </h3>

          {milestones.length === 0 ? (
            <p className="text-gray-500 text-sm">No milestones</p>
          ) : (
            milestones.map((m) => (
              <div
                key={m.contractMilestoneDraftId}
                className="flex justify-between p-4 bg-white/5 border border-white/10 rounded-xl mb-3"
              >
                <div>
                  <p className="text-white font-medium">{m.title}</p>
                  <p className="text-gray-500 text-xs">
                    {m.durationDays} days
                  </p>
                </div>

                <p className="text-cyan-400 font-semibold">
                  {formatCurrency(m.amount)}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </ClientLayout>
  );
}