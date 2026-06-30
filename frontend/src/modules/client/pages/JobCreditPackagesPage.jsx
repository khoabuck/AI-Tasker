// src/modules/client/pages/JobCreditPackagesPage.jsx
//
// GET  /api/job-credit-packages              → danh sách gói trả phí (Basic/Pro/Business)
// POST /api/job-credit-packages/{id}/purchase → mua gói
// GET  /api/job-credit-packages/my-purchases  → lịch sử đã mua
//
// LƯU Ý: Gói "Free" không tồn tại trong BE — đây là gói mặc định mọi Client đã có
// sẵn lúc đăng ký, nên chỉ hiển thị cứng ở FE để client thấy đủ bảng giá, KHÔNG
// gọi mua qua API cho gói này (sẽ luôn báo lỗi nếu cố gọi vì BE không biết gói này).

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../../../components/layout/ClientLayout";
import axiosInstance from "../../../api/axiosInstance";

const FREE_PACKAGE = {
  jobCreditPackageId: null, // không có ID thật — không mua được qua API
  packageName: "Free",
  description: "Included by default for every Client account.",
  jobPostCredits: 1,
  aiGenerationCredits: 3,
  price: 0,
  currency: "VND",
  isFreeTier: true,
};

const cardStyle = {
  background: "rgba(16,19,25,0.85)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

function formatVND(amount) {
  return Number(amount || 0).toLocaleString("vi-VN") + " VND";
}

export default function JobCreditPackagesPage() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasingId, setPurchasingId] = useState(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseSuccess, setPurchaseSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pkgRes, purchaseRes] = await Promise.all([
        axiosInstance.get("/job-credit-packages"),
        axiosInstance.get("/job-credit-packages/my-purchases"),
      ]);

      const pkgRaw = pkgRes.data?.data ?? pkgRes.data;
      const pkgList = Array.isArray(pkgRaw) ? pkgRaw : pkgRaw?.items ?? [];
      // Sắp theo displayOrder BE trả về, rồi luôn chèn Free lên đầu danh sách.
      const sorted = [...pkgList].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setPackages([FREE_PACKAGE, ...sorted]);

      const purchaseRaw = purchaseRes.data?.data ?? purchaseRes.data;
      setPurchases(Array.isArray(purchaseRaw) ? purchaseRaw : purchaseRaw?.items ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the package list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePurchase = async (pkg) => {
    if (pkg.isFreeTier) return; // Free không gọi API mua — không có ID thật

    setPurchasingId(pkg.jobCreditPackageId);
    setPurchaseError("");
    setPurchaseSuccess("");

    try {
      await axiosInstance.post(`/job-credit-packages/${pkg.jobCreditPackageId}/purchase`);
      setPurchaseSuccess(`Successfully purchased the "${pkg.packageName}" package!`);
      await fetchData(); // refresh lại lịch sử mua
    } catch (err) {
      setPurchaseError(err?.response?.data?.message || `Failed to purchase the "${pkg.packageName}" package.`);
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div style={{ textAlign: "center", padding: "120px 0", color: "#8c90a0" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, display: "block", marginBottom: 16, animation: "spin 1s linear infinite", color: "#00F0FF" }}>autorenew</span>
          Loading packages...
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 32, fontWeight: 700, color: "#e1e2eb", marginBottom: 8 }}>
            Job Credit Packages
          </h1>
          <p style={{ color: "#8c90a0", fontSize: 15 }}>
            Purchase additional credits to post new jobs and use AI to assist in creating job posting content.
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {purchaseSuccess && (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 10, padding: "12px 16px", color: "#4ade80", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            {purchaseSuccess}
          </div>
        )}

        {purchaseError && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 20 }}>
            {purchaseError}
          </div>
        )}

        {/* Bảng các gói — giống bố cục Đề xuất bảng gói */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18, marginBottom: 32 }}>
        {packages.map((pkg) => {
            const isPopular = pkg.packageName === "Pro";

            return (
            <div
                key={pkg.jobCreditPackageId ?? "free"}
                style={{
                background: isPopular ? "linear-gradient(180deg, rgba(0,240,255,0.12), rgba(16,19,25,0.92))" : "rgba(16,19,25,0.9)",
                border: isPopular ? "1px solid rgba(0,240,255,0.45)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                padding: 22,
                boxShadow: isPopular ? "0 0 28px rgba(0,240,255,0.12)" : "0 8px 28px rgba(0,0,0,0.32)",
                position: "relative",
                }}
            >
                {isPopular && (
                <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, padding: "4px 9px", borderRadius: 999, color: "#00F0FF", border: "1px solid rgba(0,240,255,0.35)", background: "rgba(0,240,255,0.08)", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                    POPULAR
                </span>
                )}

                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 22, fontWeight: 800, color: "#e1e2eb", marginBottom: 8 }}>
                {pkg.packageName}
                </h3>

                <p style={{ minHeight: 42, color: "#8c90a0", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                {pkg.description}
                </p>

                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 24, fontWeight: 800, color: pkg.price === 0 ? "#c2c6d6" : "#00F0FF", marginBottom: 22 }}>
                {formatVND(pkg.price)}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#8c90a0", fontSize: 13 }}>Job credits</span>
                    <b style={{ color: "#e1e2eb", fontFamily: "JetBrains Mono, monospace" }}>{pkg.jobPostCredits}</b>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#8c90a0", fontSize: 13 }}>AI credits</span>
                    <b style={{ color: "#e1e2eb", fontFamily: "JetBrains Mono, monospace" }}>{pkg.aiGenerationCredits}</b>
                </div>
                </div>

                {pkg.isFreeTier ? (
                <button
                    disabled
                    style={{ width: "100%", padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "#8c90a0", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700 }}
                >
                    Included
                </button>
                ) : (
                <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasingId === pkg.jobCreditPackageId}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, background: purchasingId === pkg.jobCreditPackageId ? "#1d2026" : "#00F0FF", color: purchasingId === pkg.jobCreditPackageId ? "#8c90a0" : "#002022", border: "none", fontWeight: 800, cursor: purchasingId === pkg.jobCreditPackageId ? "not-allowed" : "pointer" }}
                >
                    {purchasingId === pkg.jobCreditPackageId ? "Processing..." : "Buy Package"}
                </button>
                )}
            </div>
            );
        })}
        </div>

        {/* Purchase History */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#e1e2eb", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            Purchase History
          </h3>

          {purchases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#8c90a0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#272a30", display: "block", marginBottom: 10 }}>receipt_long</span>
              <p style={{ fontSize: 14 }}>You haven't purchased any packages yet. Buy a package from the table above to get started.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {purchases.map((p, i) => (
                <div
                  key={p.jobCreditPackagePurchaseId ?? i}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, flexWrap: "wrap", gap: 8 }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#e1e2eb", margin: "0 0 2px" }}>
                      {p.packageNameSnapshot || "—"}
                    </p>

                    <p style={{ fontSize: 12, color: "#8c90a0", margin: 0 }}>
                      {p.purchasedAt ? new Date(p.purchasedAt).toLocaleString("vi-VN") : "—"}
                    </p>
                  </div>

                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, fontWeight: 700, color: "#00F0FF" }}>
                    {formatVND(p.pricePaid)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </ClientLayout>
  );
}