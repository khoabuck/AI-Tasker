import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import milestoneService from "../../../services/milestone.service";
import {
  canUpdateMilestone,
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABEL,
} from "../../../constants/projectStatus";

const STATUS_OPTIONS = [
  MILESTONE_STATUS.PENDING,
  MILESTONE_STATUS.ACTIVE,
  MILESTONE_STATUS.IN_PROGRESS,
  MILESTONE_STATUS.SUBMITTED,
  MILESTONE_STATUS.REVISION_REQUESTED,
  MILESTONE_STATUS.COMPLETED,
];

export default function MilestoneDetailPage() {
  const { milestoneId } = useParams();
  const navigate = useNavigate();

  const [milestone, setMilestone] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadMilestone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneId]);

  const loadMilestone = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await milestoneService.getMilestoneById(milestoneId);

      setMilestone(data);
      setFormData({
        title: data?.title || "",
        description: data?.description || "",
        dueDate: toDateInputValue(data?.dueDate),
        status: String(data?.status || "").toUpperCase(),
      });
    } catch (err) {
      console.error("LOAD MILESTONE DETAIL ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load milestone detail."));
      setMilestone(null);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setMessage("");
    setError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!milestone?.milestoneId) return;

    if (!formData.title.trim()) {
      setError("Milestone title is required.");
      return;
    }

    const ok = window.confirm("Do you want to update this milestone?");

    if (!ok) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const data = await milestoneService.updateMilestone(
        milestone.milestoneId,
        formData
      );

      if (data?.milestoneId) {
        setMilestone(data);
        setFormData({
          title: data?.title || "",
          description: data?.description || "",
          dueDate: toDateInputValue(data?.dueDate),
          status: String(data?.status || "").toUpperCase(),
        });
      } else {
        await loadMilestone();
      }

      setMessage("Milestone updated successfully.");
    } catch (err) {
      console.error("UPDATE MILESTONE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot update milestone."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading milestone detail...
        </div>
      </ExpertLayout>
    );
  }

  if (!milestone) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <Alert type="danger" title="Milestone not found" message={error} />

            <button
              type="button"
              onClick={() => navigate("/expert/projects")}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  const status = String(milestone.status || "").toUpperCase();
  const editable = canUpdateMilestone(status);

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              milestone.projectId
                ? navigate(`/expert/projects/${milestone.projectId}/milestones`)
                : navigate("/expert/projects")
            }
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to milestones
          </button>

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
                Milestone Detail
              </p>

              <h1 className="text-3xl font-bold text-white md:text-4xl">
                {milestone.title || "Untitled Milestone"}
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Milestone ID: #{milestone.milestoneId}
              </p>

              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {milestone.projectId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/expert/projects/${milestone.projectId}`)
                  }
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
                >
                  View Project
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  navigate(`/expert/milestones/${milestone.milestoneId}/deliverables`)
                }
                className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
              >
                View Deliverables
              </button>
            </div>
          </div>

          {message && (
            <Alert type="success" title="Success" message={message} />
          )}

          {error && (
            <Alert type="danger" title="Milestone error" message={error} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <Card title="Milestone Information">
                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {milestone.description || "No description."}
                </p>
              </Card>

              <Card title="Update Milestone">
                {!editable && (
                  <div className="mb-5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm text-yellow-200">
                    This milestone is final or cannot be updated in current
                    status.
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-5">
                  <Field label="Title">
                    <input
                      type="text"
                      value={formData.title}
                      disabled={!editable || saving}
                      onChange={(event) =>
                        updateField("title", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      rows={5}
                      value={formData.description}
                      disabled={!editable || saving}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Due Date">
                      <input
                        type="date"
                        value={formData.dueDate}
                        disabled={!editable || saving}
                        onChange={(event) =>
                          updateField("dueDate", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>

                    <Field label="Status">
                      <select
                        value={formData.status}
                        disabled={!editable || saving}
                        onChange={(event) =>
                          updateField("status", event.target.value)
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#151a22] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {MILESTONE_STATUS_LABEL[item] || item}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={loadMilestone}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white disabled:opacity-50"
                    >
                      Reset
                    </button>

                    <button
                      type="submit"
                      disabled={!editable || saving}
                      className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </Card>
            </main>

            <aside className="space-y-6">
              <Card title="Milestone Summary">
                <Info label="Amount" value={formatMoney(milestone.amount)} />
                <Info label="Due Date" value={formatDate(milestone.dueDate)} />
                <Info
                  label="Status"
                  value={MILESTONE_STATUS_LABEL[status] || status}
                />
                <Info label="Project ID" value={milestone.projectId ? `#${milestone.projectId}` : "N/A"} />
                <Info label="Created At" value={formatDate(milestone.createdAt)} />
                <Info label="Updated At" value={formatDate(milestone.updatedAt)} />
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
      <h2 className="mb-4 text-xl font-extrabold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "COMPLETED" || status === "APPROVED"
      ? "border-green-400/30 bg-green-400/10 text-green-300"
      : status === "REVISION_REQUESTED"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : status === "CANCELLED"
      ? "border-red-400/30 bg-red-400/10 text-red-300"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";

  return (
    <span
      className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider ${style}`}
    >
      {MILESTONE_STATUS_LABEL[status] || status}
    </span>
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

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return "$0";
  return `$${number.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
}

function getFriendlyError(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}