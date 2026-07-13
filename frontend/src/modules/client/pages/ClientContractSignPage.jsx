// src/modules/client/pages/ClientContractSignPage.jsx
//
// Trang ký hợp đồng riêng — tách ra từ ClientProposalDetailPage để:
// 1) Có đủ chỗ hiển thị toàn bộ field proposal + contract (giá phải trả, timeline,
//    cover letter, milestones...) mà không làm rối trang chi tiết proposal.
// 2) Cho phép "resume": nếu client rời trang này trước khi ký xong, quay lại từ
//    trang proposal detail (nút "Continue to Contract") sẽ về đúng đây, đọc lại
//    đúng trạng thái hợp đồng hiện tại từ BE (không đoán, luôn fetch mới).
//
// APIs dùng (đều đã xác nhận hoạt động qua Swagger trước đó):
// GET  /api/proposals/{proposalId}                → chi tiết proposal
// GET  /api/proposals/{proposalId}/contract        → hợp đồng đã tạo cho proposal này
// GET  /api/contracts/{contractId}                 → poll trạng thái hợp đồng
// POST /api/contracts/{contractId}/confirm          → client ký
// POST /api/projects/from-contract/{contractId}     → tạo project khi cả 2 đã ký
// POST /api/escrows/projects/{projectId}/lock        → lock escrow, kích hoạt project
// GET  /api/wallets/balance                          → số dư ví

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const cardStyle = {
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

function readContractSignState(contract) {
  const clientSigned = contract?.clientConfirmed === true;
  const expertSigned = contract?.expertConfirmed === true;
  const contractStatus = (contract?.status || "").toUpperCase();
  const bothSigned =
    (clientSigned && expertSigned) || contractStatus === "CONFIRMED";
  return { clientSigned, expertSigned, bothSigned };
}

function getContractId(contract) {
  return contract?.contractId ?? contract?.id ?? contract?.projectContractId ?? null;
}

export default function ClientContractSignPage() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialContract = location.state?.contract ?? null;

  const [proposal, setProposal] = useState(null);
  const [contract, setContract] = useState(initialContract);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pageError, setPageError] = useState("");

  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null); // "sign" | "lockEscrow"


  const pollRef = useRef(null);

  // code mới
  const fetchAll = useCallback(async (signal, silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const proposalRes = await axiosInstance.get(
      `/proposals/${proposalId}`,
      { signal }
    );

    const proposalData =
      proposalRes.data?.data ?? proposalRes.data;

    setProposal(
      Array.isArray(proposalData)
        ? proposalData[0] ?? null
        : proposalData
    );

    if (!initialContract) {
      const contractRes = await axiosInstance.get(
        `/proposals/${proposalId}/contract`,
        { signal }
      );

      const contractData =
        contractRes.data?.data ??
        contractRes.data ??
        null;

      setContract(contractData);
    }
    } catch (err) {
      if (err?.code === "ERR_CANCELED") return;
      if (!silent) {
        if (err?.response?.status === 404) {
          setLoadError("");
        } else {
          setLoadError(err?.response?.data?.message || "Failed to load contract.");
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [proposalId, initialContract]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [fetchAll]);

  useEffect(() => {
    const fetchWallet = async () => {
      setWalletLoading(true);
      try {
        const res = await axiosInstance.get("/wallets/balance");
        setWalletBalance(Number(res.data?.balance ?? 0));
      } catch {
        setWalletBalance(0);
      } finally {
        setWalletLoading(false);
      }
    };
    fetchWallet();
  }, []);

 

  const pollContract = useCallback(async () => {
    const contractId = getContractId(contract);
    if (!contractId) return;

    try {
      const res = await axiosInstance.get(`/contracts/${contractId}`);
      const latest = res.data?.data ?? res.data;
      setContract(latest);
    } catch (err) {
      console.error("Poll contract failed:", err);
    }
  }, [contract]);

  useEffect(() => {
    pollRef.current = pollContract;
  }, [pollContract]);

  // Poll mỗi 3s khi client đã ký nhưng expert chưa ký, để tự phát hiện khi
  // expert ký xong mà không cần user tự bấm refresh.
  useEffect(() => {
    if (!contract) return;
    const { clientSigned, bothSigned } = readContractSignState(contract);
    if (!clientSigned || bothSigned) return;

    const intervalId = setInterval(() => {
      pollRef.current?.();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [contract]);

  const handleSignContract = async () => {
    const contractId = getContractId(contract);
    if (!contractId) {
      setPageError("Contract not found.");
      return;
    }

    if (!hasEnoughWallet) {
      navigate("/client/wallet");
      return;
    }

    setActionLoading("sign");
    setPageError("");

    try {
      const confirmRes = await axiosInstance.post(`/contracts/${contractId}/confirm`);
      const confirmedContract = confirmRes.data?.data ?? confirmRes.data;
      setContract(confirmedContract);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "Sign contract failed.";
      const isExpired = /expire|expired|deadline|cancelled/i.test(message);

      if (isExpired || status === 410 || status === 400) {
        // Contract có thể đã bị BE hủy do quá hạn ký — refetch để lấy đúng
        // trạng thái mới nhất (status: CANCELLED) thay vì chỉ báo lỗi suông.
        await fetchAll(undefined, true);
      }
      setPageError(message);
    } finally {
      setActionLoading(null);
    }
  };

 

  // Tạo project ngay khi phát hiện bothSigned qua polling (không chỉ lúc mới ký),
  // để trường hợp resume trang cũng tự tạo project nếu chưa có.
  useEffect(() => {
  if (!contract) return;

  const { bothSigned } = readContractSignState(contract);
  if (!bothSigned) return;

  const contractId = getContractId(contract);
  if (!contractId) return;

  if (contract.projectEscrowLockedAt) {
    navigate("/client/projects?status=ACTIVE");
    return;
  }

  const activateProject = async () => {
    setActionLoading("autoEscrow");
    setPageError("");

    try {
      let projectId =
        contract.projectId ??
        contract.project?.projectId ??
        contract.project?.id;

      if (!projectId) {
        const projectRes = await axiosInstance.post(`/projects/from-contract/${contractId}`);
        const projectData = projectRes.data?.data ?? projectRes.data;

        projectId =
          projectData?.projectId ??
          projectData?.id ??
          projectData?.project?.projectId ??
          projectData?.project?.id;
      }

      if (!projectId) {
        const latestContractRes = await axiosInstance.get(`/contracts/${contractId}`);
        const latestContract = latestContractRes.data?.data ?? latestContractRes.data;

        projectId =
          latestContract?.projectId ??
          latestContract?.project?.projectId ??
          latestContract?.project?.id;
      }

      if (!projectId) {
        await fetchAll(undefined, true);
        setPageError("Project was created but projectId was not returned by API.");
        return;
      }

      await axiosInstance.post(`/escrows/projects/${projectId}/lock`);

      window.dispatchEvent(new Event("jobs:refresh"));
      window.dispatchEvent(new Event("projects:refresh"));

      navigate("/client/projects?status=ACTIVE", { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || "";

      if (status === 409 || message.toLowerCase().includes("already")) {
        navigate("/client/projects?status=ACTIVE", { replace: true });
        return;
      }

      setPageError(message || "Failed to activate project.");
    } finally {
      setActionLoading(null);
    }
  };

  activateProject();
}, [contract, fetchAll, navigate]);

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ minHeight: "100vh", background: "#0b0e14", textAlign: "center", paddingTop: "120px", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading contract...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  if (loadError && !loading) {
    return (
      <ClientLayout>
        <div style={{ minHeight: "100vh", background: "#0b0e14", textAlign: "center", paddingTop: "120px", paddingLeft: 24, paddingRight: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f87171", display: "block", marginBottom: 12 }}>error_outline</span>
          <p style={{ color: "#f87171", fontSize: 15, marginBottom: 20 }}>{loadError || "Contract not found."}</p>
          <button onClick={() => navigate(`/client/proposals/${proposalId}`)}
            style={{ padding: "10px 24px", background: "#00F0FF", color: "#002022", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
            Back to Proposal
          </button>
        </div>
      </ClientLayout>
    );
  }

    if (!proposal || !contract) {
      return (
        <ClientLayout>
          <div style={{ minHeight: "100vh", background: "#0b0e14", textAlign: "center", paddingTop: "120px", color: "#8c90a0" }}>
            Loading contract...
          </div>
        </ClientLayout>
      );
    }

  const { clientSigned, expertSigned, bothSigned } = readContractSignState(contract);
  const isCancelled = (contract?.status || "").toUpperCase() === "CANCELLED";
  const isActive = bothSigned && !!contract?.projectEscrowLockedAt;
  const isSigning = actionLoading === "sign";

  const expertName = proposal.expertName || proposal.fullName || contract?.expertName || "Expert";
  const proposedPrice = Number(proposal.proposedPrice || proposal.bidAmount || 0);

  const platformFeeRate = Number(contract?.platformFeeRate ?? 0);
  const requiredDeposit = Number(contract?.totalClientPayment ?? proposedPrice);
  const hasEnoughWallet = !walletLoading && Number(walletBalance ?? 0) >= requiredDeposit;

  return (
    <ClientLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        <button onClick={() => navigate(`/client/proposals/${proposalId}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8c90a0", cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Proposal
        </button>

        <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: "#e1e2eb", marginBottom: 24 }}>
          Sign Contract
        </h1>

        {isCancelled && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#f87171" }}>schedule</span>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#f87171", margin: 0 }}>
                Contract Expired
              </h3>
            </div>
            <p style={{ fontSize: 14, color: "#c2c6d6", margin: 0, lineHeight: 1.7 }}>
              The signing deadline has passed. This contract was cancelled and the job has been reopened.
              Please contact the expert or submit a new agreement if you'd still like to proceed.
            </p>
          </div>
        )}

        {isActive && (
          <div style={{ ...cardStyle, marginBottom: 20, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#22c55e" }}>verified</span>
              <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#22c55e", margin: 0 }}>
                Project Active
              </h3>
            </div>
            <p style={{ fontSize: 14, color: "#c2c6d6", margin: "0 0 16px" }}>
              Both sides have signed and escrow is locked. Your project is now active.
            </p>
            <button onClick={() => navigate(`/client/projects/${contract.projectId}`)}
              style={{ padding: "11px 20px", background: "#22c55e", color: "#002022", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
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
                ${Number(contract?.finalPrice ?? proposedPrice).toLocaleString()}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Platform Fee ({platformFeeRate}%)</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#e1e2eb" }}>
                ${Number(contract?.platformFeeAmount ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <span style={sectionLabel}>Total You Pay</span>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 20, fontWeight: 700, color: "#facc15" }}>
                ${requiredDeposit.toLocaleString()}
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
            Wallet balance: ${Number(walletBalance ?? 0).toLocaleString()} — Required: ${requiredDeposit.toLocaleString()}
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
                  style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <p style={{ color: "#e1e2eb", fontWeight: 700, margin: "0 0 4px" }}>{index + 1}. {m.title}</p>
                    <p style={{ color: "#8c90a0", fontSize: 13, margin: 0 }}>Duration: {m.durationDays} days</p>
                  </div>
                  <span style={{ color: "#00F0FF", fontWeight: 800, fontFamily: "JetBrains Mono, monospace" }}>
                    ${Number(m.amount || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {actionLoading === "autoEscrow" && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.25)", color: "#00F0FF", fontSize: 13 }}>
            Both sides signed. Activating project and locking escrow automatically...
          </div>
        )}


        {pageError && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13 }}>
            {pageError}
          </div>
        )}

        {!isCancelled && !isActive && !clientSigned && (
          hasEnoughWallet ? (
            <button onClick={handleSignContract} disabled={isSigning}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", background: isSigning ? "rgba(0,240,255,0.08)" : "#00F0FF", color: isSigning ? "#00F0FF" : "#002022", border: "1px solid rgba(0,240,255,0.5)", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: isSigning ? "not-allowed" : "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isSigning ? "hourglass_empty" : "draw"}</span>
              {isSigning ? "Signing..." : "Sign Contract"}
            </button>
          ) : (
            <button onClick={() => navigate("/client/wallet")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", background: "rgba(250,204,21,0.12)", color: "#facc15", border: "1px solid rgba(250,204,21,0.35)", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>account_balance_wallet</span>
              Deposit Wallet to Continue
            </button>
          )
        )}
      </div>

     

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </ClientLayout>
  );
}