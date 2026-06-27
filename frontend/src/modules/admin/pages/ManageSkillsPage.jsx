import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminSkillService from "../../../services/adminSkill.service";

const EMPTY_FORM = {
  skillName: "",
  description: "",
  category: "",
  isActive: true,
};

export default function ManageSkillsPage() {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async ({ keepMessage = false } = {}) => {
    try {
      setLoading(true);
      setError("");

      if (!keepMessage) {
        setMessage("");
      }

      const data = await adminSkillService.getSkills({
        activeOnly: false,
      });

      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD ADMIN SKILLS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set();

    skills.forEach((skill) => {
      if (skill.category) {
        set.add(skill.category);
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return skills.filter((skill) => {
      const skillName = String(skill.skillName || "").toLowerCase();
      const description = String(skill.description || "").toLowerCase();
      const category = String(skill.category || "").toLowerCase();
      const skillId = String(skill.skillId || "").toLowerCase();

      const matchSearch =
        !keyword ||
        skillName.includes(keyword) ||
        description.includes(keyword) ||
        category.includes(keyword) ||
        skillId.includes(keyword);

      const matchCategory =
        !categoryFilter || String(skill.category || "") === categoryFilter;

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && skill.isActive) ||
        (statusFilter === "INACTIVE" && !skill.isActive);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [skills, searchText, categoryFilter, statusFilter]);

  const summary = useMemo(() => {
    const active = skills.filter((item) => item.isActive);
    const inactive = skills.filter((item) => !item.isActive);

    return {
      total: skills.length,
      active: active.length,
      inactive: inactive.length,
      categories: categories.length,
    };
  }, [skills, categories]);

  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);

    setFormData({
      skillName: skill.skillName || "",
      description: skill.description || "",
      category: skill.category || "",
      isActive: Boolean(skill.isActive),
    });

    setMessage("");
    setError("");
  };

  const handleCreateNew = () => {
    setSelectedSkill(null);
    setFormData(EMPTY_FORM);
    setMessage("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!String(formData.skillName || "").trim()) {
      return "Skill name is required.";
    }

    if (String(formData.skillName || "").trim().length < 2) {
      return "Skill name must be at least 2 characters.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const validateError = validateForm();

    if (validateError) {
      setError(validateError);
      return;
    }

    try {
      setSaving(true);

      if (selectedSkill) {
        await adminSkillService.updateSkill(selectedSkill.skillId, {
          skillName: formData.skillName,
          description: formData.description,
          category: formData.category,
          isActive: formData.isActive,
        });

        setMessage("Skill updated successfully.");
      } else {
        await adminSkillService.createSkill({
          skillName: formData.skillName,
          description: formData.description,
          category: formData.category,
        });

        setMessage("Skill created successfully.");
      }

      setSelectedSkill(null);
      setFormData(EMPTY_FORM);

      await loadSkills({ keepMessage: true });
    } catch (err) {
      console.error("SAVE SKILL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (skill) => {
    if (!skill?.skillId) return;

    try {
      setChangingStatusId(skill.skillId);
      setMessage("");
      setError("");

      await adminSkillService.activateSkill(skill.skillId);

      setMessage("Skill activated successfully.");

      if (selectedSkill?.skillId === skill.skillId) {
        setSelectedSkill(null);
        setFormData(EMPTY_FORM);
      }

      await loadSkills({ keepMessage: true });
    } catch (err) {
      console.error("ACTIVATE SKILL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setChangingStatusId(null);
    }
  };

  const handleSetInactive = async (skill) => {
    if (!skill?.skillId) return;

    const confirmed = window.confirm(
      `Set skill "${skill.skillName}" to inactive? You can activate it again later.`
    );

    if (!confirmed) return;

    try {
      setChangingStatusId(skill.skillId);
      setMessage("");
      setError("");

      await adminSkillService.deleteSkill(skill.skillId);

      setMessage("Skill set to inactive successfully.");

      if (selectedSkill?.skillId === skill.skillId) {
        setSelectedSkill(null);
        setFormData(EMPTY_FORM);
      }

      await loadSkills({ keepMessage: true });
    } catch (err) {
      console.error("SET SKILL INACTIVE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setChangingStatusId(null);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  return (
    <AdminLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Admin Skills
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                Skills management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Manage system skills used by experts, jobs, recommendations,
                and matching features.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-xl border border-green-400/50 bg-green-400/10 px-5 py-3 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black"
              >
                New Skill
              </button>

              <button
                type="button"
                onClick={() => loadSkills()}
                disabled={loading}
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </section>

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

          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
            <SummaryCard
              icon="psychology"
              label="Total Skills"
              value={summary.total}
              tone="cyan"
            />

            <SummaryCard
              icon="check_circle"
              label="Active"
              value={summary.active}
              tone="green"
            />

            <SummaryCard
              icon="block"
              label="Inactive"
              value={summary.inactive}
              tone="red"
            />

            <SummaryCard
              icon="category"
              label="Categories"
              value={summary.categories}
              tone="yellow"
            />
          </section>

          <section className={`${cardStyle} mb-6 p-6`}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_220px_180px_150px]">
              <div>
                <label className={labelStyle}>Search</label>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    search
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search skill name, description, category..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>Category</label>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="">All Categories</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyle}>Status</label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Showing
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {filteredSkills.length}
                </p>
              </div>
            </div>
          </section>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading skills...
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_430px]">
              <section className="space-y-5">
                {filteredSkills.length === 0 && (
                  <div className={`${cardStyle} p-12 text-center`}>
                    <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
                      psychology
                    </span>

                    <h2 className="text-xl font-bold text-white">
                      No skills found
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Try changing search keyword or filters.
                    </p>
                  </div>
                )}

                {filteredSkills.map((skill) => {
                  const isSelected = selectedSkill?.skillId === skill.skillId;
                  const isChanging = changingStatusId === skill.skillId;

                  return (
                    <article
                      key={skill.skillId || skill.id}
                      onClick={() => handleSelectSkill(skill)}
                      className={`${cardStyle} cursor-pointer p-6 transition ${
                        isSelected
                          ? "border-cyan-400/50"
                          : "hover:border-cyan-400/40"
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <StatusBadge isActive={skill.isActive} />

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Skill #{skill.skillId || "N/A"}
                        </span>

                        {skill.category && (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                            {skill.category}
                          </span>
                        )}

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                          Created {formatDate(skill.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {skill.skillName}
                          </h2>

                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                            {skill.description || "No description."}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 md:w-36">
                          {skill.isActive ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSetInactive(skill);
                              }}
                              disabled={isChanging}
                              className="rounded-xl border border-red-400/50 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isChanging ? "Saving..." : "Set Inactive"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleActivate(skill);
                              }}
                              disabled={isChanging}
                              className="rounded-xl border border-green-400/50 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isChanging ? "Saving..." : "Activate"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              <aside>
                <form
                  onSubmit={handleSubmit}
                  className={`${cardStyle} sticky top-24 p-6`}
                >
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {selectedSkill ? "Edit Skill" : "Create Skill"}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedSkill
                          ? `Skill #${selectedSkill.skillId}`
                          : "Add a new system skill"}
                      </p>
                    </div>

                    {selectedSkill && (
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={labelStyle}>Skill Name *</label>

                      <input
                        type="text"
                        name="skillName"
                        value={formData.skillName}
                        onChange={handleChange}
                        placeholder="Example: React, ASP.NET Core, OpenAI API"
                        className={inputStyle}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Category</label>

                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        placeholder="Example: Frontend, Backend, AI"
                        list="skill-categories"
                        className={inputStyle}
                      />

                      <datalist id="skill-categories">
                        {categories.map((category) => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className={labelStyle}>Description</label>

                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="6"
                        placeholder="Short description for this skill..."
                        className={`${inputStyle} resize-none`}
                      />
                    </div>

                    {selectedSkill && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="h-4 w-4 accent-cyan-400"
                        />

                        <div>
                          <p className="text-sm font-bold text-white">
                            Active skill
                          </p>

                          <p className="text-xs text-gray-500">
                            Active skills can be used by experts and jobs.
                          </p>
                        </div>
                      </label>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : selectedSkill
                        ? "Update Skill"
                        : "Create Skill"}
                    </button>
                  </div>
                </form>
              </aside>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

function StatusBadge({ isActive }) {
  const style = isActive
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : "border-red-400/30 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {isActive ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFriendlyError(err) {
  const status = err?.response?.status;

  if (status === 401) {
    return "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return "Backend blocked this request because the current token does not have ADMIN permission.";
  }

  if (status === 404) {
    return "Skills API was not found. Please check backend route.";
  }

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();

    if (allErrors.length > 0) {
      return allErrors.join(" ");
    }
  }

  return err?.message || "Something went wrong. Please try again.";
}