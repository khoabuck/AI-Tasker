// src/modules/client/pages/ClientProfileSetupPage.jsx
// Trang điền thông tin Client sau khi đăng ký lần đầu
// 2 loại: Company hoặc Individual — toggle hiện/ẩn form tương ứng

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";

// ─── Component: Radio Card chọn loại Client ───────────
function TypeCard({ value, icon, title, desc, selected, onChange }) {
  return (
    <label
      className={`relative cursor-pointer border rounded-2xl p-6 transition-all
                  flex flex-col items-center text-center gap-4 group
                  ${selected
                    ? "border-cyan-400 bg-cyan-400/5 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                    : "border-white/10 hover:bg-white/5"
                  }`}
    >
      <input
        type="radio"
        name="clientType"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="sr-only"
      />

      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center
                      group-hover:scale-110 transition-transform">
        <span className={`material-symbols-outlined text-3xl
                          ${selected ? "text-cyan-400" : "text-gray-400"}`}>
          {icon}
        </span>
      </div>

      {/* Text */}
      <div>
        <p className="font-bold text-base text-white mb-1">{title}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>

      {/* Check icon khi selected */}
      {selected && (
        <span className="absolute top-4 right-4 material-symbols-outlined text-cyan-400">
          check_circle
        </span>
      )}
    </label>
  );
}

// ─── Component: Input field ───────────────────────────
function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-xs uppercase tracking-widest text-gray-400 block">
        {label}
      </label>
      {children}
    </div>
  );
}

// class dùng chung cho input/select/textarea
const inputClass = `w-full bg-white/5 border border-white/10 rounded-xl
                    py-4 px-5 text-white placeholder:text-gray-600
                    focus:outline-none focus:border-blue-400
                    focus:shadow-[0_0_0_1px_#adc6ff,0_0_12px_rgba(173,198,255,0.2)]
                    transition-all`;

// ─── Section: Company Form ─────────────────────────────
function CompanyForm({ data, onChange }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-blue-400">domain</span>
        <h3 className="text-lg font-bold text-white">Business Profile</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Phone Number">
          <input
            type="tel"
            name="phoneNumber"
            placeholder="0901 234 567"
            value={data.phoneNumber}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <Field label="Tax Code">
          <input
            type="text"
            name="taxCode"
            placeholder="0101248149"
            value={data.taxCode}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <Field label="Industry">
          <input
            type="text"
            name="industry"
            placeholder="Technology"
            value={data.industry}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <Field label="Business Email">
          <input
            type="email"
            name="businessEmail"
            placeholder="company@gmail.com"
            value={data.businessEmail}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <Field label="Business Phone">
          <input
            type="tel"
            name="businessPhone"
            placeholder="0246255678"
            value={data.businessPhone}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Address">
            <textarea
              name="address"
              placeholder="Enter address..."
              value={data.address}
              onChange={onChange}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Individual Form ──────────────────────────
function IndividualForm({ data, onChange }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-blue-400">fingerprint</span>
        <h3 className="text-lg font-bold text-white">Individual Profile</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Phone Number">
          <input
            type="tel"
            name="phoneNumber"
            placeholder="0901 234 567"
            value={data.phoneNumber}
            onChange={onChange}
            className={inputClass}
          />
        </Field>

        <Field label="Address">
          <input
            type="text"
            name="address"
            placeholder="Enter your address..."
            value={data.address}
            onChange={onChange}
            className={inputClass}
          />
        </Field>
      </div>
    </section>
  );
}

// ─── Page chính ───────────────────────────────────────
export default function ClientProfileSetupPage() {
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  // State loại client: "company" hoặc "individual"
  const [clientType, setClientType] = useState("company");

  // State data company form
  const [companyData, setCompanyData] = useState({
  phoneNumber: "",
  address: "",
  taxCode: "",
  industry: "",
  businessEmail: "",
  businessPhone: "",
});

  // State data individual form
  const [individualData, setIndividualData] = useState({
    phoneNumber: "",
    address: "",
  });

  // Handler chung cho input — cập nhật đúng state theo clientType
  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIndividualChange = (e) => {
    const { name, value } = e.target;
    setIndividualData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    if (clientType === "individual") {
      await axiosInstance.post("/client-profiles/individual", {
        phoneNumber: individualData.phoneNumber.trim(),
        address: individualData.address.trim(),
      });
    } else {
      await axiosInstance.post("/client-profiles/business", {
        phoneNumber: companyData.phoneNumber.trim(),
        address: companyData.address.trim(),
        taxCode: companyData.taxCode.trim(),
        industry: companyData.industry.trim(),
        businessEmail: companyData.businessEmail.trim(),
        businessPhone: companyData.businessPhone.trim(),
      });
    }

    navigate("/client/dashboard");
  } catch (err) {
    alert(err?.response?.data?.message || "Create profile failed.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#101319] text-white font-body"
         style={{ background: "radial-gradient(circle at 50% -20%, rgba(23,114,235,0.15) 0%, transparent 70%), #101319" }}>

      {/* Navbar đơn giản */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-cyan-400">AI</span> Tasker
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/client/dashboard"
            className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium">
            Dashboard
          </Link>
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10
                          flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-16 pb-12 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                          bg-blue-400/10 border border-blue-400/20 text-blue-400
                          text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
            Protocol Initiation
          </div>
          <h1 className="text-5xl font-black mb-4 text-white tracking-tight">
            Synthesize Your Infrastructure
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Define your profile to initialize the AI technology ecosystem
            tailored specifically for your operational scale.
          </p>
        </div>
      </header>

      {/* Form container */}
      <main className="max-w-[800px] mx-auto px-4 pb-24">
        <div className="bg-[#1d2026]/60 backdrop-blur-2xl border border-white/10
                        rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">

            {/* ── Section 0: Client Type ── */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-blue-400">badge</span>
                <h3 className="text-lg font-bold text-white">Client Classification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TypeCard
                  value="company"
                  icon="corporate_fare"
                  title="Business/Company"
                  desc="Corporate infrastructure & team workflows"
                  selected={clientType === "company"}
                  onChange={setClientType}
                />
                <TypeCard
                  value="individual"
                  icon="person"
                  title="Individual"
                  desc="Personal assistant & solo developer tools"
                  selected={clientType === "individual"}
                  onChange={setClientType}
                />
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* ── Section 1: Form theo loại ── */}
            {clientType === "company" ? (
              <CompanyForm data={companyData} onChange={handleCompanyChange} />
            ) : (
              <IndividualForm data={individualData} onChange={handleIndividualChange} />
            )}

            {/* ── Submit ── */}
            <div className="pt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-400 text-gray-900 font-bold text-lg py-5 rounded-xl
                           flex justify-center items-center gap-3
                           hover:brightness-110 active:scale-[0.99] transition-all
                           shadow-lg shadow-blue-400/20
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Processing Architecture...
                  </>
                ) : (
                  <>
                    Finalize Profile
                    <span className="material-symbols-outlined">rocket_launch</span>
                  </>
                )}
              </button>
              <p className="text-center mt-6 text-gray-400 text-sm">
                By proceeding, you agree to our{" "}
                <a href="#" className="text-blue-400 hover:underline">Enterprise Agreement</a>.
              </p>
            </div>

          </form>
        </div>

        {/* Footer */}
        <footer className="mt-16 flex flex-col md:flex-row justify-between items-center
                           gap-4 text-gray-600 text-xs font-mono uppercase tracking-widest">
          <span>© 2026 AI Tasker | The Digital Workbench</span>
          <div className="flex gap-6">
            {["Privacy Protocol", "Security Standards", "Support"].map((l) => (
              <a key={l} href="#" className="hover:text-blue-400 transition-colors">{l}</a>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}