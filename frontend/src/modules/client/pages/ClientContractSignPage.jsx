// src/modules/client/pages/ClientContractSignPage.jsx
//
// Trang ký hợp đồng riêng — tách ra từ ClientProposalDetailPage để:
// 1) Có đủ chỗ hiển thị toàn bộ field proposal + contract (giá phải trả, timeline,
//    cover letter, milestones...) mà không làm rối trang chi tiết proposal.
// 2) Cho phép "resume": nếu client rời trang này trước khi ký xong, quay lại từ
//    trang proposal detail (nút "Continue to Contract") sẽ về đúng đây, đọc lại
//    đúng trạng thái hợp đồng hiện tại từ BE (không đoán, luôn fetch mới).
//
// APIs dùng theo luồng mới:
// GET  /api/proposals/{proposalId}              → lấy proposal và contractId mới nhất
// GET  /api/contracts/{contractId}              → lấy/poll trạng thái contract thật từ BE
// POST /api/contracts/{contractId}/confirm      → Client ký contract
// POST /api/contracts/{contractId}/cancel-draft → Client hủy draft hiện tại, proposal vẫn ACCEPTED
// POST /api/contracts/{contractId}/decline-deal → Client bỏ deal với Expert, job được reopen
// GET  /api/wallets/balance                     → kiểm tra số dư ví trước khi ký
//
// Lưu ý quan trọng:
// - FE KHÔNG tự gọi tạo project.
// - FE KHÔNG tự lock escrow.
// - Khi Expert ký xong, BE tự:
//   Contract CONFIRMED → tạo Project → lock Escrow → Project ACTIVE.
// - FE chỉ poll contract, thấy project ACTIVE thì điều hướng sang Project.

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const cardStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  overflowWrap: "anywhere",

  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const sectionLabel = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#8c90a0",
  marginBottom: 8,
  display: "block",
};

// Enum status để tránh rải string nhiều nơi.
// Đây là status contract với BE, không phải hard-code dữ liệu.
const CONTRACT_STATUS = {
  DRAFT: "DRAFT",
  CANCELLED: "CANCELLED",
  CONFIRMED: "CONFIRMED",
  EXPIRED: "EXPIRED",
};

const PROJECT_STATUS = {
  ACTIVE: "ACTIVE",
};

function normalizeStatus(value) {
  return String(value ?? "").trim().toUpperCase();
}

function getContractId(contract) {
  return (
    contract?.contractId ??
    contract?.id ??
    contract?.projectContractId ??
    null
  );
}

function readContractSignState(contract) {
  const contractStatus = normalizeStatus(contract?.status);
  const projectStatus = normalizeStatus(contract?.projectStatus);

  // BE có cả boolean confirmed và thời điểm ký.
  // Dùng cả hai để UI không bị sai nếu một field bị thiếu.
  const clientSigned =
    contract?.clientConfirmed === true ||
    Boolean(contract?.clientSignedAt);

  const expertSigned =
    contract?.expertConfirmed === true ||
    Boolean(contract?.expertSignedAt);

  const bothSigned =
    contractStatus === CONTRACT_STATUS.CONFIRMED ||
    (clientSigned && expertSigned);

  // Luồng mới: Project ACTIVE do BE tự tạo và tự lock escrow.
  const projectActive =
    contractStatus === CONTRACT_STATUS.CONFIRMED &&
    projectStatus === PROJECT_STATUS.ACTIVE &&
    Boolean(contract?.projectId);

  const cancelled =
    contractStatus === CONTRACT_STATUS.CANCELLED ||
    contractStatus === CONTRACT_STATUS.EXPIRED;

  return {
    contractStatus,
    projectStatus,
    clientSigned,
    expertSigned,
    bothSigned,
    projectActive,
    cancelled,
  };
}

export default function ClientContractSignPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialContract = location.state?.contract ?? null;
  const initialContractId = getContractId(initialContract);

  const [proposal, setProposal] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pageError, setPageError] = useState("");

  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null);
  // "sign" | "cancelDraft" | "declineDeal"

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Modal riêng cho Decline Deal.
  // Decline Deal khác Cancel Draft:
  // - Cancel Draft: hủy draft hiện tại, proposal vẫn ACCEPTED.
  // - Decline Deal: bỏ Expert đã chọn, job được reopen cho proposal khác.
  const [showDeclineDealModal, setShowDeclineDealModal] =
    useState(false);
  const [declineDealReason, setDeclineDealReason] =
    useState("");
  const [declineDealError, setDeclineDealError] =
    useState("");

  const pollRef = useRef(null);

  const fetchAll = useCallback(
    async (signal, silent = false) => {
      if (!silent) {
        setLoading(true);
        setLoadError("");
        setPageError("");
      }

      try {
        // Luôn lấy proposal trước để biết contractId mới nhất.
        // Sau Create Contract Again, proposal.contractId sẽ trỏ tới contract mới.
        const proposalRes = await axiosInstance.get(
          `/proposals/${proposalId}`,
          { signal }
        );

        const rawProposal =
          proposalRes.data?.data ??
          proposalRes.data ??
          null;

        const proposalData = Array.isArray(rawProposal)
          ? rawProposal[0] ?? null
          : rawProposal;

        if (!proposalData) {
          setProposal(null);
          setContract(null);

          if (!silent) {
            setLoadError("Proposal not found.");
          }

          return;
        }

        setProposal(proposalData);

        const latestContractId =
          proposalData?.contractId ??
          initialContractId ??
          null;

        // ACCEPTED nhưng chưa Create Contract là trạng thái hợp lệ.
        // Trang này chỉ dùng để ký nên nếu chưa có contract thì quay lại Proposal.
        if (!latestContractId) {
          setContract(null);

          if (!silent) {
            setLoadError(
              "Contract has not been created for this proposal yet."
            );
          }

          return;
        }

        // Luồng mới: dùng contractId thật từ proposal để lấy contract mới nhất.
        const contractRes = await axiosInstance.get(
          `/contracts/${latestContractId}`,
          { signal }
        );

        const contractData =
          contractRes.data?.data ??
          contractRes.data ??
          null;

        if (!contractData || !getContractId(contractData)) {
          setContract(null);

          if (!silent) {
            setLoadError("Contract not found.");
          }

          return;
        }

        setContract(contractData);
      } catch (err) {
        if (
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError"
        ) {
          return;
        }

        if (!silent) {
          const status = err?.response?.status;
          const apiMessage =
            err?.response?.data?.message;

          if (status === 404) {
            setLoadError(
              apiMessage ||
              "Contract not found."
            );
          } else if (status === 403) {
            setLoadError(
              apiMessage ||
              "You do not have permission to view this contract."
            );
          } else {
            setLoadError(
              apiMessage ||
              err?.message ||
              "Failed to load contract."
            );
          }
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [proposalId, initialContractId]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchAll(controller.signal);

    return () => controller.abort();
  }, [fetchAll, location.key]);

  useEffect(() => {
    const fetchWallet = async () => {
      setWalletLoading(true);

      try {
        const res = await axiosInstance.get("/wallets/balance");

        setWalletBalance(
          Number(res.data?.balance ?? 0)
        );
      } catch {
        // Không chặn trang nếu ví lỗi.
        // Khi user bấm ký, API /confirm vẫn trả message BE nếu không đủ tiền.
        setWalletBalance(0);
      } finally {
        setWalletLoading(false);
      }
    };

    fetchWallet();
  }, []);

 

  const pollContract = useCallback(async () => {
    const contractId = getContractId(contract);

    if (!contractId) {
      return;
    }

    try {
      const res = await axiosInstance.get(
        `/contracts/${contractId}`
      );

      const latest =
        res.data?.data ??
        res.data ??
        null;

      if (latest) {
        setContract(latest);
      }
    } catch {
      // Polling nền lỗi thì giữ contract hiện tại.
      // Không hiện lỗi đỏ để tránh làm phiền user khi đang chờ Expert ký.
    }
  }, [contract]);

  useEffect(() => {
    pollRef.current = pollContract;
  }, [pollContract]);

  // Poll mỗi 3s sau khi Client đã ký nhưng Expert chưa ký.
// Khi Expert ký xong, BE sẽ trả contract CONFIRMED + project ACTIVE.
  useEffect(() => {
    if (!contract) {
      return;
    }

    const {
      clientSigned,
      expertSigned,
      projectActive,
      cancelled,
    } = readContractSignState(contract);

    if (
      !clientSigned ||
      expertSigned ||
      projectActive ||
      cancelled
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      pollRef.current?.();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [contract]);

  const handleSignContract = async () => {
    if (actionLoading) {
      return;
    }

    const contractId = getContractId(contract);

    if (!contractId) {
      setPageError("Contract not found.");
      return;
    }

    const { contractStatus, clientSigned, cancelled } =
      readContractSignState(contract);

    if (cancelled) {
      setPageError("This contract is no longer available for signing.");
      return;
    }

    if (contractStatus !== CONTRACT_STATUS.DRAFT) {
      setPageError("Only a draft contract can be signed.");
      return;
    }

    if (clientSigned) {
      setPageError("You have already signed this contract.");
      return;
    }

    if (walletLoading) {
      setPageError("Wallet balance is still loading. Please try again.");
      return;
    }

    if (!hasEnoughWallet) {
      navigate("/client/wallet");
      return;
    }

    setActionLoading("sign");
    setPageError("");

    try {
      const confirmRes = await axiosInstance.post(
        `/contracts/${contractId}/confirm`
      );

      const confirmedContract =
        confirmRes.data?.data ??
        confirmRes.data ??
        null;

      if (confirmedContract) {
        setContract(confirmedContract);
      } else {
        await fetchAll(undefined, true);
      }
    } catch (err) {
      const status = err?.response?.status;

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Sign contract failed.";

      const shouldRefresh =
        status === 400 ||
        status === 409 ||
        status === 410 ||
        /expire|expired|deadline|cancelled/i.test(message);

      if (shouldRefresh) {
        // BE có thể đã đổi trạng thái contract, ví dụ hết hạn ký hoặc ví không đủ.
        // Refetch để UI không giữ trạng thái cũ.
        await fetchAll(undefined, true);
      }

      // Luôn hiện message thật từ BE nếu có.
      setPageError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelModal = () => {
    setCancelReason("");
    setCancelError("");
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (actionLoading === "cancelDraft") {
      return;
    }

    setShowCancelModal(false);
    setCancelReason("");
    setCancelError("");
  };

  // Mở modal Decline Deal.
// Dùng khi Client không muốn tiếp tục với Expert/proposal đã accept.
const openDeclineDealModal = () => {
  setDeclineDealReason("");
  setDeclineDealError("");
  setShowDeclineDealModal(true);
};

const closeDeclineDealModal = () => {
  if (actionLoading === "declineDeal") {
    return;
  }

  setShowDeclineDealModal(false);
  setDeclineDealReason("");
  setDeclineDealError("");
};

  // Client hủy bản nháp contract hiện tại.
  // Luồng mới: cancel-draft chỉ hủy Contract DRAFT.
  // Proposal vẫn ACCEPTED, Client có thể Create Contract Again ở Proposal Detail.
  const handleCancelDraft = async () => {
    if (actionLoading) {
      return;
    }

    const contractId = getContractId(contract);

    if (!contractId) {
      setCancelError("Contract not found.");
      return;
    }

    const { contractStatus, clientSigned, cancelled } =
      readContractSignState(contract);

    if (cancelled) {
      setCancelError("This contract has already been cancelled.");
      return;
    }

    if (contractStatus !== CONTRACT_STATUS.DRAFT) {
      setCancelError("Only a draft contract can be cancelled.");
      return;
    }

    // Sau khi Client đã ký, không cho hủy draft ở FE để tránh sai nghiệp vụ.
    // Nếu BE cho phép hủy deal sau ký, sẽ làm bằng API decline-deal riêng.
    if (clientSigned) {
      setCancelError(
        "You have already signed this contract. Draft cancellation is no longer available."
      );
      return;
    }

    const trimmedReason = cancelReason.trim();

    if (!trimmedReason) {
      setCancelError("Cancellation reason is required.");
      return;
    }

    setActionLoading("cancelDraft");
    setCancelError("");
    setPageError("");

    try {
      const response = await axiosInstance.post(
        `/contracts/${contractId}/cancel-draft`,
        {
          reason: trimmedReason,
        }
      );

      const cancelledContract =
        response.data?.data ??
        response.data ??
        null;

      if (cancelledContract) {
        setContract(cancelledContract);
      } else {
        await fetchAll(undefined, true);
      }

      setShowCancelModal(false);
      setCancelReason("");

      // Proposal vẫn ACCEPTED, quay về Proposal Detail để hiện Create Contract Again.
      window.dispatchEvent(new Event("jobs:refresh"));

      navigate(`/client/proposals/${proposalId}`, {
        replace: true,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to cancel contract draft.";

      setCancelError(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Client bỏ deal với Expert đã accept.
// API này khác cancel-draft:
// - cancel-draft chỉ hủy bản nháp contract, proposal vẫn ACCEPTED.
// - decline-deal hủy deal, BE reopen job để Client chọn proposal khác.
const handleDeclineDeal = async () => {
  if (actionLoading) {
    return;
  }

  const contractId = getContractId(contract);

  if (!contractId) {
    setDeclineDealError("Contract not found.");
    return;
  }

  const { contractStatus, clientSigned, cancelled } =
    readContractSignState(contract);

  if (cancelled) {
    setDeclineDealError("This deal has already been cancelled.");
    return;
  }

  if (contractStatus !== CONTRACT_STATUS.DRAFT) {
    setDeclineDealError("Only a draft contract deal can be declined.");
    return;
  }

  /*
   * Hiện tại API đã test thành công ở trạng thái Client chưa ký.
   * Sau khi Client đã ký thì chưa test decline-deal, nên FE không cho bấm
   * để tránh sai nghiệp vụ hoặc kẹt tiền escrow.
   */
  if (clientSigned) {
    setDeclineDealError(
      "You have already signed this contract. Decline deal is no longer available here."
    );
    return;
  }

  const trimmedReason = declineDealReason.trim();

  if (!trimmedReason) {
    setDeclineDealError("Decline reason is required.");
    return;
  }

  setActionLoading("declineDeal");
  setDeclineDealError("");
  setPageError("");

  try {
    const response = await axiosInstance.post(
      `/contracts/${contractId}/decline-deal`,
      {
        reason: trimmedReason,
      }
    );

    const declinedContract =
      response.data?.data ??
      response.data ??
      null;

    if (declinedContract) {
      setContract(declinedContract);
    } else {
      await fetchAll(undefined, true);
    }

    setShowDeclineDealModal(false);
    setDeclineDealReason("");

    // BE đã test trả: "The job was reopened for another proposal."
    window.dispatchEvent(new Event("jobs:refresh"));
    window.dispatchEvent(new Event("projects:refresh"));

    navigate("/client/jobs?status=OPEN", {
      replace: true,
      state: {
        dealDeclined: true,
        jobId:
          declinedContract?.jobId ??
          proposal?.jobId ??
          null,
      },
    });
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Failed to decline deal.";

    setDeclineDealError(message);
  } finally {
    setActionLoading(null);
  }
};

 

  // Luồng mới:
  // FE không tạo Project và không lock Escrow.
  // Khi Expert ký xong, BE tự trả:
  // status = CONFIRMED, projectId != null, projectStatus = ACTIVE.
  // Lúc đó Client chỉ cần chuyển sang Project.
  useEffect(() => {
    if (!contract) {
      return;
    }

    const { projectActive } =
      readContractSignState(contract);

    if (!projectActive) {
      return;
    }

    window.dispatchEvent(new Event("jobs:refresh"));
    window.dispatchEvent(new Event("projects:refresh"));

    navigate(`/client/projects/${contract.projectId}`, {
      replace: true,
    });
  }, [contract, navigate]);

  if (loading) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 82px)",
          margin: 0,
          padding: "100px 24px 40px",
          boxSizing: "border-box",
          overflowX: "clip",
          background: "#0b0e14",
          color: "#8c90a0",
          textAlign: "center",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 48,
            display: "block",
            marginBottom: 16,
            animation: "spin 1s linear infinite",
            color: "#00F0FF",
          }}
        >
          autorenew
        </span>

        Loading contract...

        <style>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </ClientLayout>
  );
}

  if (loadError && !loading) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 82px)",
          margin: 0,
          padding: "100px 24px 40px",
          boxSizing: "border-box",
          overflowX: "clip",
          background: "#0b0e14",
          color: "#8c90a0",
          textAlign: "center",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            display: "block",
            marginBottom: 16,
            fontSize: 48,
            color: "#00F0FF",
          }}
        >
          cloud_sync
        </span>

        <p
          style={{
            margin: "0 0 8px",
            color: "#c2c6d6",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Unable to load contract information.
        </p>

        <p
          style={{
            margin: "0 0 24px",
            color: "#8c90a0",
            fontSize: 13,
          }}
        >
          {loadError}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => fetchAll(undefined, false)}
            style={{
              padding: "10px 24px",
              background: "rgba(0,240,255,0.08)",
              color: "#00F0FF",
              border: "1px solid rgba(0,240,255,0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Retry
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(`/client/proposals/${proposalId}`, {
                replace: true,
              })
            }
            style={{
              padding: "10px 24px",
              background: "transparent",
              color: "#c2c6d6",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to Proposal
          </button>
        </div>
      </div>
    </ClientLayout>
  );
}

    if (!proposal || !contract) {
  return (
    <ClientLayout>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          minHeight: "calc(100vh - 82px)",
          margin: 0,
          padding: "100px 24px 40px",
          boxSizing: "border-box",
          overflowX: "clip",
          background: "#0b0e14",
          color: "#8c90a0",
          textAlign: "center",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            display: "block",
            marginBottom: 16,
            fontSize: 48,
            color: "#00F0FF",
            animation: "spin 1s linear infinite",
          }}
        >
          autorenew
        </span>

        <p
          style={{
            margin: "0 0 8px",
            color: "#c2c6d6",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Loading contract information...
        </p>

        <p
          style={{
            margin: "0 0 24px",
            color: "#8c90a0",
            fontSize: 13,
          }}
        >
          The server may need a little more time to respond.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => fetchAll(undefined, false)}
            style={{
              padding: "10px 24px",
              background: "rgba(0,240,255,0.08)",
              color: "#00F0FF",
              border: "1px solid rgba(0,240,255,0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Retry
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(`/client/proposals/${proposalId}`, {
                replace: true,
              })
            }
            style={{
              padding: "10px 24px",
              background: "transparent",
              color: "#c2c6d6",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to Proposal
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </ClientLayout>
  );
}

  const {
    contractStatus,
    clientSigned,
    expertSigned,
    bothSigned,
    projectActive,
    cancelled,
  } = readContractSignState(contract);

  const isCancelled = cancelled;
  const isActive = projectActive;

  const isDraft =
    contractStatus === CONTRACT_STATUS.DRAFT;

  const isSigning =
    actionLoading === "sign";

  const isCancelling =
    actionLoading === "cancelDraft";

  const isDecliningDeal =
    actionLoading === "declineDeal";

  const expertName =
    proposal.expertName ||
    proposal.fullName ||
    contract?.expertName ||
    "Expert";

  const proposedPrice = Number(
    proposal.proposedPrice ||
    proposal.bidAmount ||
    0
  );

  const platformFeeRate = Number(
    contract?.platformFeeRate ?? 0
  );

  // Client phải trả totalClientPayment từ BE.
  // Không tự tính từ finalPrice + fee ở FE.
  const requiredDeposit = Number(
    contract?.totalClientPayment ?? 0
  );

  const walletAmount = Number(
    walletBalance ?? 0
  );

  const hasEnoughWallet =
    !walletLoading &&
    walletAmount >= requiredDeposit;

  return (
  <ClientLayout>
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 860,
        minWidth: 0,
        margin: "0 auto",
        padding: "40px 24px",
        boxSizing: "border-box",
        overflowX: "clip",
      }}
    >

        <button onClick={() => navigate(`/client/proposals/${proposalId}`, {
          replace: true,
        })}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Proposal
        </button>

        <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#e1e2eb", marginBottom: 24 }}>
          Sign Contract
        </h1>

        {isCancelled && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 22,
                color: "#f87171",
              }}
            >
              cancel
            </span>

            <h3
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#f87171",
                margin: 0,
              }}
            >
              Contract Cancelled
            </h3>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "#c2c6d6",
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            This contract is no longer available for signing. Return to the
            proposal page to review the current proposal status.
          </p>
        </div>
      )}

        {isActive && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 22,
                color: "#22c55e",
              }}
            >
              verified
            </span>

            <h3
              style={{
                fontFamily: "Hanken Grotesk, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#22c55e",
                margin: 0,
              }}
            >
              Project Active
            </h3>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "#c2c6d6",
              margin: "0 0 16px",
            }}
          >
            Both sides have signed. The backend created the project and locked escrow automatically.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(`/client/projects/${contract.projectId}`)
            }
            style={{
              padding: "11px 20px",
              background: "#22c55e",
              color: "#002022",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go to Project
          </button>
        </div>
      )}

        {!isCancelled && !isActive && clientSigned && !expertSigned && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(0,240,255,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#00F0FF", animation: "spin 1.5s linear infinite" }}>autorenew</span>
              <p style={{ fontSize: 14, color: "#00F0FF", fontWeight: 600, margin: 0 }}>
                You already signed. Waiting for {expertName} to sign...
              </p>
            </div>
          </div>
        )}

        {/* Contract summary — đủ field từ contract + proposal */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {contract?.jobTitle || "Contract Summary"}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}><strong>Expert:</strong> {expertName}</p>
            <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0 }}><strong>Timeline:</strong> {contract?.finalTimelineDays ?? proposal.proposedTimelineDays ?? proposal.estimatedDays} days</p>
            {contract?.projectScope && (
              <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                <strong>Scope:</strong> {contract.projectScope}
              </p>
            )}
            {contract?.acceptanceCriteria && (
              <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0, lineHeight: 1.8 }}>
                <strong>Acceptance Criteria:</strong> {contract.acceptanceCriteria}
              </p>
            )}
            {contract?.paymentTerms && (
              <p style={{ color: "#c2c6d6", fontSize: 14, margin: 0, lineHeight: 1.8 }}>
                <strong>Payment Terms:</strong> {contract.paymentTerms}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <span style={sectionLabel}>Final Price</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#00F0FF" }}>
                {formatCurrency(contract?.finalPrice ?? proposedPrice)}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Platform Fee ({platformFeeRate}%)</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#e1e2eb" }}>
                {formatCurrency(contract?.platformFeeAmount ?? 0)}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Total You Pay</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#facc15" }}>
                {formatCurrency(requiredDeposit)}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: hasEnoughWallet ? "rgba(34,197,94,0.08)" : "rgba(250,204,21,0.08)",
              border: `1px solid ${hasEnoughWallet ? "rgba(34,197,94,0.25)" : "rgba(250,204,21,0.25)"}`,
              color: hasEnoughWallet ? "#22c55e" : "#facc15",
              fontSize: 13,
            }}
          >
            Wallet balance:{" "}
            {walletLoading
              ? "Loading..."
              : formatCurrency(walletAmount)}
            {" "}
            — Required: {formatCurrency(requiredDeposit)}
          </div>
        </div>

        {/* Proposal-only fields */}
        {proposal.coverLetter && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Cover Letter
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {proposal.coverLetter}
            </p>
          </div>
        )}

        {proposal.expectedOutputs && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Expected Outputs
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {proposal.expectedOutputs}
            </p>
          </div>
        )}

        {proposal.workingApproach && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              Working Approach
            </h3>
            <p style={{ fontSize: 14, color: "#c2c6d6", lineHeight: 1.9, whiteSpace: "pre-line", margin: 0 }}>
              {proposal.workingApproach}
            </p>
          </div>
        )}

        {proposal.milestones?.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(192,193,255,0.15)", background: "rgba(192,193,255,0.02)" }}>
            <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 15, fontWeight: 700, color: "#c0c1ff", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(192,193,255,0.1)" }}>
              Milestone Drafts
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {proposal.milestones.map((m, index) => (
                <div key={m.proposalMilestoneDraftId ?? index}
                  style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      gap: 16,
                      alignItems: "center",
                      padding: 16,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                  <div
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    <p
                      style={{
                        color: "#e1e2eb",
                        fontWeight: 700,
                        margin: "0 0 4px",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {index + 1}. {m.title}
                    </p>
                    <p style={{ color: "#8c90a0", fontSize: 13, margin: 0 }}>Duration: {m.durationDays} days</p>
                  </div>
                  <span style={{ color: "#00F0FF", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>
                    {formatCurrency(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pageError && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13 }}>
            {pageError}
          </div>
        )}

        {!isCancelled && !isActive && isDraft && !bothSigned && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {!clientSigned &&
          (walletLoading ? (
            <button
              type="button"
              disabled
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                background: "rgba(0,240,255,0.08)",
                color: "#00F0FF",
                border: "1px solid rgba(0,240,255,0.35)",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "not-allowed",
                opacity: 0.7,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                hourglass_empty
              </span>

              Checking Wallet...
            </button>
          ) : hasEnoughWallet ? (
            <button
              type="button"
              onClick={handleSignContract}
              disabled={isSigning || isCancelling || isDecliningDeal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                background: isSigning
                  ? "rgba(0,240,255,0.08)"
                  : "#00F0FF",
                color: isSigning ? "#00F0FF" : "#002022",
                border: "1px solid rgba(0,240,255,0.5)",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor:
                  isSigning || isCancelling
                    ? "not-allowed"
                    : "pointer",
                opacity: isCancelling ? 0.6 : 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                {isSigning ? "hourglass_empty" : "draw"}
              </span>

              {isSigning ? "Signing..." : "Sign Contract"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/client/wallet")}
              disabled={isCancelling || isDecliningDeal}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 28px",
                background: "rgba(250,204,21,0.12)",
                color: "#facc15",
                border: "1px solid rgba(250,204,21,0.35)",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor:
                isSigning || isCancelling || isDecliningDeal
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isCancelling || isDecliningDeal
                  ? 0.6
                  : 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                account_balance_wallet
              </span>

              Deposit Wallet to Continue
            </button>
          ))}

          <button
            type="button"
            onClick={openCancelModal}
            disabled={
              isSigning ||
              isCancelling ||
              isDecliningDeal ||
              clientSigned
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 28px",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor:
                isSigning ||
                isCancelling ||
                isDecliningDeal ||
                clientSigned
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isSigning ||
                isDecliningDeal ||
                clientSigned
                  ? 0.6
                  : 1,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              {isCancelling ? "hourglass_empty" : "cancel"}
            </span>

            {isCancelling
              ? "Cancelling..."
              : "Cancel Draft"}
          </button>

          <button
            type="button"
            onClick={openDeclineDealModal}
            disabled={
              isSigning ||
              isCancelling ||
              isDecliningDeal ||
              clientSigned
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 28px",
              background: "rgba(248,113,113,0.14)",
              color: "#fb7185",
              border: "1px solid rgba(248,113,113,0.45)",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor:
                isSigning ||
                isCancelling ||
                isDecliningDeal ||
                clientSigned
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isSigning ||
                isCancelling ||
                clientSigned
                  ? 0.6
                  : 1,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              {isDecliningDeal
                ? "hourglass_empty"
                : "block"}
            </span>

            {isDecliningDeal
              ? "Declining..."
              : "Decline Deal"}
          </button>
        </div>
      )}
      </div>

     {showCancelModal && (
  <div
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeCancelModal();
      }
    }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-contract-title"
      style={{
        width: "100%",
        maxWidth: 480,
        padding: 24,
        boxSizing: "border-box",
        borderRadius: 16,
        background: "#11151d",
        border: "1px solid rgba(239,68,68,0.3)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 23,
                color: "#f87171",
              }}
            >
              warning
            </span>
          </div>

          <div>
            <h2
              id="cancel-contract-title"
              style={{
                margin: "0 0 5px",
                color: "#f1f5f9",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              Cancel Contract Draft
            </h2>

            <p
              style={{
                margin: 0,
                color: "#8c90a0",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              This only cancels the current draft. The accepted proposal will remain valid.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeCancelModal}
          disabled={isCancelling}
          aria-label="Close cancel contract dialog"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            padding: 0,
            flexShrink: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#8c90a0",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: isCancelling ? "not-allowed" : "pointer",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 19 }}
          >
            close
          </span>
        </button>
      </div>

      <label
        htmlFor="cancel-contract-reason"
        style={{
          display: "block",
          marginBottom: 8,
          color: "#c2c6d6",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Draft cancellation reason
      </label>

      <textarea
        id="cancel-contract-reason"
        value={cancelReason}
        onChange={(event) => {
          setCancelReason(event.target.value);

          if (cancelError) {
            setCancelError("");
          }
        }}
        disabled={isCancelling}
        rows={4}
        maxLength={500}
        placeholder="Enter the reason for cancelling this contract draft..."
        style={{
          width: "100%",
          minHeight: 110,
          padding: "12px 14px",
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          color: "#e1e2eb",
          border: cancelError
            ? "1px solid rgba(239,68,68,0.7)"
            : "1px solid rgba(255,255,255,0.12)",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />

      <div
        style={{
          marginTop: 6,
          color: "#686d7d",
          fontSize: 11,
          textAlign: "right",
        }}
      >
        {cancelReason.length}/500
      </div>

      {cancelError && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171",
            fontSize: 13,
          }}
        >
          {cancelError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 22,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={closeCancelModal}
          disabled={isCancelling}
          style={{
            padding: "11px 18px",
            borderRadius: 9,
            background: "transparent",
            color: "#c2c6d6",
            border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 14,
            fontWeight: 700,
            cursor: isCancelling ? "not-allowed" : "pointer",
          }}
        >
          Keep Contract
        </button>

        <button
          type="button"
          onClick={handleCancelDraft}
          disabled={isCancelling || !cancelReason.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            minWidth: 155,
            padding: "11px 18px",
            borderRadius: 9,
            background:
              isCancelling || !cancelReason.trim()
                ? "rgba(239,68,68,0.12)"
                : "#ef4444",
            color:
              isCancelling || !cancelReason.trim()
                ? "#f87171"
                : "#ffffff",
            border: "1px solid rgba(239,68,68,0.45)",
            fontSize: 14,
            fontWeight: 800,
            cursor:
              isCancelling || isDecliningDeal
                ? "not-allowed"
                : "pointer",
            opacity:
              isCancelling || isDecliningDeal
                ? 0.6
                : 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18 }}
          >
            {isCancelling ? "hourglass_empty" : "cancel"}
          </span>

          {isCancelling
          ? "Cancelling..."
          : "Confirm Cancel Draft"}
        </button>
      </div>
    </div>
  </div>
)}

      {showDeclineDealModal && (
  <div
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeDeclineDealModal();
      }
    }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(6px)",
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decline-deal-title"
      style={{
        width: "100%",
        maxWidth: 500,
        padding: 24,
        boxSizing: "border-box",
        borderRadius: 16,
        background: "#11151d",
        border: "1px solid rgba(248,113,113,0.35)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.28)",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 23,
                color: "#fb7185",
              }}
            >
              block
            </span>
          </div>

          <div>
            <h2
              id="decline-deal-title"
              style={{
                margin: "0 0 5px",
                color: "#f1f5f9",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              Decline Deal
            </h2>

            <p
              style={{
                margin: 0,
                color: "#8c90a0",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              This will cancel the deal with this expert and reopen the job for another proposal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeDeclineDealModal}
          disabled={isDecliningDeal}
          aria-label="Close decline deal dialog"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            padding: 0,
            flexShrink: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#8c90a0",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: isDecliningDeal
              ? "not-allowed"
              : "pointer",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 19 }}
          >
            close
          </span>
        </button>
      </div>

      <label
        htmlFor="decline-deal-reason"
        style={{
          display: "block",
          marginBottom: 8,
          color: "#c2c6d6",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Decline reason
      </label>

      <textarea
        id="decline-deal-reason"
        value={declineDealReason}
        onChange={(event) => {
          setDeclineDealReason(event.target.value);

          if (declineDealError) {
            setDeclineDealError("");
          }
        }}
        disabled={isDecliningDeal}
        rows={4}
        maxLength={500}
        placeholder="Enter the reason for declining this deal..."
        style={{
          width: "100%",
          minHeight: 110,
          padding: "12px 14px",
          boxSizing: "border-box",
          resize: "vertical",
          outline: "none",
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          color: "#e1e2eb",
          border: declineDealError
            ? "1px solid rgba(248,113,113,0.75)"
            : "1px solid rgba(255,255,255,0.12)",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      />

      <div
        style={{
          marginTop: 6,
          color: "#686d7d",
          fontSize: 11,
          textAlign: "right",
        }}
      >
        {declineDealReason.length}/500
      </div>

      {declineDealError && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "#fb7185",
            fontSize: 13,
          }}
        >
          {declineDealError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 22,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={closeDeclineDealModal}
          disabled={isDecliningDeal}
          style={{
            padding: "11px 18px",
            borderRadius: 9,
            background: "transparent",
            color: "#c2c6d6",
            border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 14,
            fontWeight: 700,
            cursor: isDecliningDeal
              ? "not-allowed"
              : "pointer",
          }}
        >
          Keep Deal
        </button>

        <button
          type="button"
          onClick={handleDeclineDeal}
          disabled={
            isDecliningDeal ||
            !declineDealReason.trim()
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            minWidth: 155,
            padding: "11px 18px",
            borderRadius: 9,
            background:
              isDecliningDeal || !declineDealReason.trim()
                ? "rgba(248,113,113,0.12)"
                : "#ef4444",
            color:
              isDecliningDeal || !declineDealReason.trim()
                ? "#fb7185"
                : "#ffffff",
            border: "1px solid rgba(248,113,113,0.45)",
            fontSize: 14,
            fontWeight: 800,
            cursor:
              isDecliningDeal || !declineDealReason.trim()
                ? "not-allowed"
                : "pointer",
            opacity: !declineDealReason.trim() ? 0.6 : 1,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18 }}
          >
            {isDecliningDeal
              ? "hourglass_empty"
              : "block"}
          </span>

          {isDecliningDeal
            ? "Declining..."
            : "Confirm Decline"}
        </button>
      </div>
    </div>
  </div>
)}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}