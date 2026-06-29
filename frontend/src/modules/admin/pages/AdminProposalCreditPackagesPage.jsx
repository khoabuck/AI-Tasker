import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminProposalCreditPackageService from "../../../services/adminProposalCreditPackage.service";

const EMPTY_FORM = {
  packageName: "",
  description: "",
  proposalSubmitCredits: 1,
  price: 0,
  currency: "VND",
  isActive: true,
  displayOrder: 0,
  reason: "",
};

export default function AdminProposalCreditPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return packages.filter((item) => {
      const matchSearch =
        !search ||
        item.packageName.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);

      const matchStatus =
        status === "ALL" ||
        (status === "ACTIVE" && item.isActive) ||
        (status === "INACTIVE" && !item.isActive);

      return matchSearch && matchStatus;
    });
  }, [packages, keyword, status]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminProposalCreditPackageService.getPackages();
      setPackages(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot load proposal credit packages.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingItem(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      packageName: item.packageName,
      description: item.description,
      proposalSubmitCredits: item.proposalSubmitCredits,
      price: item.price,
      currency: item.currency,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
      reason: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validate = () => {
    if (!form.packageName.trim()) return "Package name is required.";
    if (!form.description.trim()) return "Description is required.";
    if (Number(form.proposalSubmitCredits) <= 0) return "Credits must be greater than 0.";
    if (Number(form.price) < 0) return "Price cannot be negative.";
    if (editingItem && !form.reason.trim()) return "Reason is required when updating.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingItem) {
        await adminProposalCreditPackageService.updatePackage(editingItem.packageId, form);
        setMessage("Proposal credit package updated successfully.");
      } else {
        await adminProposalCreditPackageService.createPackage(form);
        setMessage("Proposal credit package created successfully.");
      }

      resetForm();
      await loadPackages();
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot save package.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    const reason = window.prompt(
      item.isActive
        ? "Reason for deactivating this package:"
        : "Reason for activating this package:"
    );

    if (!reason?.trim()) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (item.isActive) {
        await adminProposalCreditPackageService.deactivatePackage(item.packageId, reason);
        setMessage("Package deactivated successfully.");
      } else {
        await adminProposalCreditPackageService.activatePackage(item.packageId, reason);
        setMessage("Package activated successfully.");
      }

      await loadPackages();
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot update package status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            Admin / Proposal Credits
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">
            Proposal Credit Packages
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Quản lý các gói credit để Expert mua và dùng khi submit proposal.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-black text-white">
            {editingItem ? "Edit Package" : "Create Package"}
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Package Name" name="packageName" value={form.packageName} onChange={handleChange} />
            <Input label="Currency" name="currency" value={form.currency} onChange={handleChange} />
            <Input label="Proposal Submit Credits" name="proposalSubmitCredits" type="number" value={form.proposalSubmitCredits} onChange={handleChange} />
            <Input label="Price" name="price" type="number" value={form.price} onChange={handleChange} />
            <Input label="Display Order" name="displayOrder" type="number" value={form.displayOrder} onChange={handleChange} />

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Status
              </span>
              <div className="flex h-[46px] items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1117] px-4 text-sm font-semibold text-gray-300">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 accent-cyan-400"
                />
                Active package
              </div>
            </label>
          </div>

          <div className="mt-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                Description
              </span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </label>
          </div>

          {editingItem && (
            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                  Reason
                </span>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
                  placeholder="Reason for audit log"
                />
              </label>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingItem ? "Save Changes" : "Create Package"}
            </button>

            {editingItem && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search package..."
              className="w-full rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50 md:max-w-md"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-400/50"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/[0.04]">
                  <tr>
                    <Th>Package</Th>
                    <Th>Credits</Th>
                    <Th>Price</Th>
                    <Th>Status</Th>
                    <Th>Order</Th>
                    <Th>Updated By</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filteredPackages.map((item) => (
                    <tr key={item.packageId} className="hover:bg-white/[0.03]">
                      <Td>
                        <div>
                          <p className="font-bold text-white">{item.packageName}</p>
                          <p className="mt-1 max-w-md text-xs text-gray-500">{item.description}</p>
                        </div>
                      </Td>
                      <Td>{item.proposalSubmitCredits}</Td>
                      <Td>{Number(item.price).toLocaleString("vi-VN")} {item.currency}</Td>
                      <Td>
                        <span className={item.isActive ? "text-emerald-300" : "text-gray-400"}>
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </Td>
                      <Td>{item.displayOrder}</Td>
                      <Td>{item.updatedByAdminFullName || item.updatedByAdminEmail || "-"}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/10"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/10"
                          >
                            {item.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredPackages.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-400">
                  No proposal credit packages found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50"
      />
    </label>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-gray-500">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-5 py-4 text-sm text-gray-300">{children}</td>;
}