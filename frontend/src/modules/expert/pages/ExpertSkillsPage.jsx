import { useEffect, useMemo, useState } from "react";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertSkillService from "../../../services/expertSkill.service";

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
];

export default function ExpertSkillsPage() {
  const [allSkills, setAllSkills] = useState([]);
  const [mySkills, setMySkills] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const selectedSkillIds = useMemo(() => {
    return new Set(mySkills.map((item) => String(item.skillId)));
  }, [mySkills]);

  const availableSkills = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return allSkills
      .filter((skill) => !selectedSkillIds.has(String(skill.skillId)))
      .filter((skill) => {
        if (!q) return true;

        return (
          skill.name.toLowerCase().includes(q) ||
          skill.category.toLowerCase().includes(q)
        );
      });
  }, [allSkills, keyword, selectedSkillIds]);

  const groupedMySkills = useMemo(() => {
    return [...mySkills].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;

      return String(a.name).localeCompare(String(b.name));
    });
  }, [mySkills]);

  const primaryCount = useMemo(() => {
    return mySkills.filter((item) => item.isPrimary).length;
  }, [mySkills]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [skills, expertSkills] = await Promise.all([
        expertSkillService.getAllSkills(),
        expertSkillService.getMySkills(),
      ]);

      setAllSkills(Array.isArray(skills) ? skills : []);
      setMySkills(Array.isArray(expertSkills) ? expertSkills : []);
    } catch (err) {
      console.error("LOAD EXPERT SKILLS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot load skills."));
      setAllSkills([]);
      setMySkills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (!selectedSkillId) return;

    const skill = allSkills.find(
      (item) => String(item.skillId) === String(selectedSkillId)
    );

    if (!skill) return;

    setMessage("");
    setError("");

    setMySkills((prev) => [
      ...prev,
      {
        skillId: skill.skillId,
        skillName: skill.name,
        name: skill.name,
        level: "INTERMEDIATE",
        yearsOfExperience: 0,
        isPrimary: false,
      },
    ]);

    setSelectedSkillId("");
    setKeyword("");
  };

  const updateSkill = (skillId, field, value) => {
    setMessage("");
    setError("");

    setMySkills((prev) =>
      prev.map((item) => {
        if (String(item.skillId) !== String(skillId)) return item;

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const removeSkill = (skillId) => {
    setMessage("");
    setError("");

    setMySkills((prev) =>
      prev.filter((item) => String(item.skillId) !== String(skillId))
    );
  };

  const handleSave = async () => {
    const validationError = validateSkills(mySkills);

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await expertSkillService.updateMySkills(mySkills);

      setMessage("Skills updated successfully.");

      const latest = await expertSkillService.getMySkills();
      setMySkills(Array.isArray(latest) ? latest : []);
    } catch (err) {
      console.error("SAVE EXPERT SKILLS ERROR:", err?.response?.data || err);

      setError(getFriendlyError(err, "Cannot update skills."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#151a22] shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
            <div className="relative p-5 md:p-7">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#00F0FF]">
                    Expert Skills
                  </p>

                  <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white md:text-4xl">
                    Showcase your strongest skills
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
                    Keep your expertise accurate for better project matches.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={loadData}
                    disabled={loading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      refresh
                    </span>
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    {saving ? "Saving..." : "Save Skills"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Skills error" message={error} />
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#151a22] p-12 text-center text-gray-400">
              Loading skills...
            </div>
          ) : (
            <>
              <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                <StatCard
                  icon="psychology"
                  label="My skills"
                  value={mySkills.length}
                  description="Added to your profile"
                  tone="cyan"
                />

                <StatCard
                  icon="workspace_premium"
                  label="Featured"
                  value={primaryCount}
                  description="Shown first to clients"
                  tone="green"
                />

                <StatCard
                  icon="category"
                  label="Skill catalog"
                  value={allSkills.length}
                  description="Available platform skills"
                  tone="purple"
                />
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[390px_1fr]">
                <aside className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <h2 className="text-xl font-extrabold text-white">
                    Add Skill
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Choose skills that match the services you offer.
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500">
                        search
                      </span>

                      <input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Search skills..."
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]"
                      />
                    </div>

                    <select
                      value={selectedSkillId}
                      onChange={(event) => setSelectedSkillId(event.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#151a22] px-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
                    >
                      <option value="">Select a skill</option>

                      {availableSkills.map((skill) => (
                        <option key={skill.skillId} value={skill.skillId}>
                          {skill.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={!selectedSkillId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        add
                      </span>
                      Add Skill
                    </button>
                  </div>
                </aside>

                <main className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-white">
                        My Skills
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Set proficiency, experience, and featured skills.
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400">
                      {mySkills.length} skill(s)
                    </span>
                  </div>

                  {groupedMySkills.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="space-y-4">
                      {groupedMySkills.map((skill) => (
                        <SkillRow
                          key={skill.skillId}
                          skill={skill}
                          onChange={updateSkill}
                          onRemove={removeSkill}
                        />
                      ))}
                    </div>
                  )}
                </main>
              </div>
            </>
          )}
        </div>
      </div>
    </ExpertLayout>
  );
}

function SkillRow({ skill, onChange, onRemove }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-extrabold text-white">
              {skill.name || skill.skillName}
            </h3>

            {skill.isPrimary && (
              <span className="rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-300">
                Primary
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500">
            
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(skill.skillId)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400 hover:text-black"
        >
          <span className="material-symbols-outlined text-[16px]">
            delete
          </span>
          Remove
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Level
          </span>

          <select
            value={skill.level || "INTERMEDIATE"}
            onChange={(event) =>
              onChange(skill.skillId, "level", event.target.value)
            }
            className="h-11 w-full rounded-xl border border-white/10 bg-[#151a22] px-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
          >
            {LEVEL_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
            Years Experience
          </span>

          <input
            type="number"
            min="0"
            value={skill.yearsOfExperience ?? 0}
            onChange={(event) =>
              onChange(
                skill.skillId,
                "yearsOfExperience",
                Number(event.target.value)
              )
            }
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
          />
        </label>

        <label className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(skill.isPrimary)}
            onChange={(event) =>
              onChange(skill.skillId, "isPrimary", event.target.checked)
            }
            className="h-4 w-4 accent-cyan-400"
          />
          Primary
        </label>
      </div>
    </article>
  );
}

function StatCard({ icon, label, value, description, tone }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-400/10 text-green-300"
      : tone === "purple"
      ? "border-purple-400/20 bg-purple-400/10 text-purple-300"
      : "border-cyan-400/20 bg-cyan-400/10 text-[#00F0FF]";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151a22] p-5">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${toneClass}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function Alert({ type, title, message }) {
  const style =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${style}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-gray-500">
        psychology
      </span>

      <h3 className="font-bold text-white">No skills selected</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Add skills that match the work you want.
      </p>
    </div>
  );
}

function validateSkills(skills) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return "Please add at least one skill.";
  }

  const hasInvalidYears = skills.some((item) => {
    const years = Number(item.yearsOfExperience || 0);

    return Number.isNaN(years) || years < 0;
  });

  if (hasInvalidYears) {
    return "Years of experience must be 0 or greater.";
  }

  return "";
}

function getFriendlyError(err, fallback) {
  const data = err?.response?.data;

  if (typeof data === "string") return data;

  return data?.message || data?.title || err?.message || fallback;
}