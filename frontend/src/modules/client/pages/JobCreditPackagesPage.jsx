// src/modules/client/pages/JobCreditPackagesPage.jsx
//
// GET  /api/job-credit-packages
//      → danh sách tất cả gói từ BE, bao gồm Free/Basic/Pro/Business
//
// POST /api/job-credit-packages/{id}/purchase
//      → mua gói trả phí
//
// GET  /api/job-credit-packages/my-purchases
//      → lịch sử mua gói của Client
//
// Gói Free do BE trả về với:
// - isFreeTier: true
// - isPurchasable: false
// - jobCreditPackageId: null
//
// FE không tự tạo dữ liệu gói Free và không gọi API mua gói Free.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

function formatCurrency(amount, currency = "VND") {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toLocaleString("vi-VN")} ${currency}`;
  }
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
      const [packageResult, purchaseResult] =
        await Promise.allSettled([
          axiosInstance.get("/job-credit-packages"),
          axiosInstance.get(
            "/job-credit-packages/my-purchases"
          ),
        ]);

      if (packageResult.status === "fulfilled") {
        const pkgRaw =
          packageResult.value.data?.data ??
          packageResult.value.data;

        const pkgList = Array.isArray(pkgRaw)
          ? pkgRaw
          : pkgRaw?.items ?? [];

        const sorted = [...pkgList]
          .filter((pkg) => pkg.isActive !== false)
          .sort(
            (a, b) =>
              Number(a.displayOrder ?? 0) -
              Number(b.displayOrder ?? 0)
          );

        setPackages(sorted);
      } else {
        setPackages([]);

        setError(
          packageResult.reason?.response?.data?.message ||
            "Unable to load the package list. Please try again."
        );
      }

      if (purchaseResult.status === "fulfilled") {
        const purchaseRaw =
          purchaseResult.value.data?.data ??
          purchaseResult.value.data;

        setPurchases(
          Array.isArray(purchaseRaw)
            ? purchaseRaw
            : purchaseRaw?.items ?? []
        );
      } else {
        setPurchases([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePurchase = async (pkg) => {
    if (
      pkg.isFreeTier === true ||
      pkg.isPurchasable !== true ||
      pkg.jobCreditPackageId == null
    ) {
      return;
    }

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
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            marginBottom: 32,
          }}
        >
        {packages.map((pkg) => {
            const isPopular = pkg.isPopular === true;
            return (
            <div
                key={
                  pkg.jobCreditPackageId ??
                  `${pkg.packageName}-${pkg.displayOrder}`
                }
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

                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 24, fontWeight: 800, color: pkg.isFreeTier ? "#c2c6d6" : "#00F0FF", marginBottom: 22 }}>
                {formatCurrency(pkg.price, pkg.currency)}
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

                {pkg.isFreeTier === true ? (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    color: "#8c90a0",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontWeight: 700,
                    cursor: "not-allowed",
                  }}
                >
                  Included
                </button>
              ) : pkg.isPurchasable !== true ? (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    color: "#8c90a0",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontWeight: 700,
                    cursor: "not-allowed",
                  }}
                >
                  Unavailable
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasingId === pkg.jobCreditPackageId}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    background:
                      purchasingId === pkg.jobCreditPackageId
                        ? "#1d2026"
                        : "#00F0FF",
                    color:
                      purchasingId === pkg.jobCreditPackageId
                        ? "#8c90a0"
                        : "#002022",
                    border: "none",
                    fontWeight: 800,
                    cursor:
                      purchasingId === pkg.jobCreditPackageId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {purchasingId === pkg.jobCreditPackageId
                    ? "Processing..."
                    : "Buy Package"}
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
                    {formatCurrency(
                      p.pricePaid,
                      p.currencySnapshot ?? p.currency ?? "VND"
                    )}
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