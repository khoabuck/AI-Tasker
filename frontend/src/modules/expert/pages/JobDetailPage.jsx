import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import ExpertLayout from "../../../components/layout/ExpertLayout";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadJobDetail();
  }, [jobId]);

  const loadJobDetail = async () => {
    try {
      setLoading(true);
      setError("");

      if (!jobId || jobId === "undefined" || jobId === "null") {
        throw new Error("Invalid job id.");
      }

      const response = await axiosInstance.get(`/jobs/${jobId}`);

      console.log("GET JOB DETAIL RAW:", response?.data);

      const data = unwrapDetailData(response);
      const normalizedJob = normalizeJob(data);

      console.log("GET JOB DETAIL NORMALIZED:", normalizedJob);

      if (!normalizedJob?.id) {
        throw new Error("Job detail does not have a valid id.");
      }

      setJob(normalizedJob);
    } catch (err) {
      console.error("LOAD JOB DETAIL ERROR:", err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Cannot load job detail right now."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading job detail...
        </div>
      </ExpertLayout>
    );
  }

  if (error) {
    return (
      <ExpertLayout>
        <div className="px-5 py-10 md:px-8">
          <div className="mx-auto max-w-5xl">
            <BackButton onClick={() => navigate("/expert/jobs")} />

            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-red-300">
              <h2 className="text-xl font-bold text-white">
                Cannot load job detail
              </h2>

              <p className="mt-2 text-sm">{error}</p>

              <button
                type="button"
                onClick={loadJobDetail}
                className="mt-6 rounded-xl border border-red-400/40 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400 hover:text-black"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-7xl">
          <BackButton onClick={() => navigate("/expert/jobs")} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <main className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Badge>{job.status || "OPEN"}</Badge>
                  <Badge>{job.category || "General"}</Badge>
                  {job.complexity && <Badge>{job.complexity}</Badge>}
                </div>

                <h1 className="text-3xl font-extrabold text-white md:text-5xl">
                  {job.title}
                </h1>

                <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-7 text-gray-400 md:text-base">
                  {job.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/expert/jobs/${job.id}/proposal`}
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    Apply for this job
                  </Link>

                  <button
                    type="button"
                    onClick={() => navigate("/expert/jobs")}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    Back to Jobs
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <h2 className="mb-4 text-xl font-extrabold text-white">
                  Job Description
                </h2>

                <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {job.description}
                </p>
              </section>

              {job.aiGeneratedDescription && (
                <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                  <h2 className="mb-4 text-xl font-extrabold text-white">
                    AI Generated Description
                  </h2>

                  <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                    {job.aiGeneratedDescription}
                  </p>
                </section>
              )}

              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <h2 className="mb-4 text-xl font-extrabold text-white">
                  Required Skills
                </h2>

                {job.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No skills listed.</p>
                )}
              </section>

              {job.expectedDeliverables && (
                <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                  <h2 className="mb-4 text-xl font-extrabold text-white">
                    Expected Deliverables
                  </h2>

                  <p className="whitespace-pre-line text-sm leading-7 text-gray-300">
                    {job.expectedDeliverables}
                  </p>
                </section>
              )}
            </main>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-white/10 bg-[#151a22] p-6">
                <h2 className="mb-5 text-lg font-extrabold text-white">
                  Job Summary
                </h2>

                <div className="space-y-4">
                  <SummaryItem
                    label="Budget"
                    value={formatBudget(job.budgetMin, job.budgetMax)}
                  />

                  <SummaryItem
                    label="Duration"
                    value={
                      job.durationDays ? `${job.durationDays} days` : "Flexible"
                    }
                  />

                  <SummaryItem
                    label="Deadline"
                    value={formatDate(job.deadline)}
                  />

                  <SummaryItem
                    label="Posted"
                    value={formatDate(job.createdAt)}
                  />

                  <SummaryItem label="Client" value={job.clientName} />

                  <SummaryItem label="Job ID" value={job.id} />
                </div>
              </section>

              <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6">
                <h2 className="text-lg font-extrabold text-white">
                  Ready to apply?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Write a clear proposal and explain your plan, timeline, and
                  price.
                </p>

                <Link
                  to={`/expert/jobs/${job.id}/proposal`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Submit Proposal
                </Link>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </ExpertLayout>
  );
}

function unwrapDetailData(response) {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.job) return data.data.job;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.job) return data.job;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
}

function normalizeJob(job) {
  if (!job) return null;

  const id = getValue(
    job.id,
    job.Id,
    job.ID,
    job.jobPostingId,
    job.JobPostingId,
    job.jobPostingID,
    job.JobPostingID,
    job.jobId,
    job.JobId,
    job.JobID
  );

  return {
    id,
    jobPostingId: id,

    title: getValue(
      job.title,
      job.Title,
      job.jobTitle,
      job.JobTitle,
      job.projectTitle,
      job.ProjectTitle,
      job.name,
      job.Name,
      "Untitled job"
    ),

    description: getValue(
      job.description,
      job.Description,
      job.jobDescription,
      job.JobDescription,
      job.requirements,
      job.Requirements,
      "No description provided."
    ),

    aiGeneratedDescription: getValue(
      job.aiGeneratedDescription,
      job.AiGeneratedDescription,
      ""
    ),

    status: getValue(job.status, job.Status, "OPEN"),

    category: getValue(
      job.categoryName,
      job.CategoryName,
      job.category,
      job.Category,
      job.projectType,
      job.ProjectType,
      "General"
    ),

    complexity: getValue(job.complexity, job.Complexity, ""),

    expectedDeliverables: getValue(
      job.expectedDeliverables,
      job.ExpectedDeliverables,
      ""
    ),

    skills: toArray(
      getValue(
        job.skills,
        job.Skills,
        job.requiredSkills,
        job.RequiredSkills,
        job.skillNames,
        job.SkillNames,
        job.tags,
        job.Tags,
        ""
      )
    ),

    budgetMin: Number(
      getValue(
        job.budgetMin,
        job.BudgetMin,
        job.expectedBudgetMin,
        job.ExpectedBudgetMin,
        job.minBudget,
        job.MinBudget,
        0
      )
    ),

    budgetMax: Number(
      getValue(
        job.budgetMax,
        job.BudgetMax,
        job.expectedBudgetMax,
        job.ExpectedBudgetMax,
        job.maxBudget,
        job.MaxBudget,
        job.budget,
        job.Budget,
        0
      )
    ),

    durationDays: Number(
      getValue(
        job.durationDays,
        job.DurationDays,
        job.projectDurationDays,
        job.ProjectDurationDays,
        job.preferredProjectDurationDays,
        job.PreferredProjectDurationDays,
        0
      )
    ),

    deadline: getValue(job.deadline, job.Deadline, job.dueDate, job.DueDate, ""),

    createdAt: getValue(
      job.createdAt,
      job.CreatedAt,
      job.postedAt,
      job.PostedAt,
      ""
    ),

    clientName: getValue(
      job.clientName,
      job.ClientName,
      job.clientFullName,
      job.ClientFullName,
      job.ownerName,
      job.OwnerName,
      "Client"
    ),

    raw: job,
  };
}

function getValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return getValue(
            item.name,
            item.Name,
            item.skillName,
            item.SkillName,
            item.title,
            item.Title
          );
        }

        return item;
      })
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-cyan-300"
    >
      ← Back to jobs
    </button>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
      {children}
    </span>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-white">{value || "N/A"}</p>
    </div>
  );
}

function formatBudget(min, max) {
  const minValue = Number(min || 0);
  const maxValue = Number(max || 0);

  if (!minValue && !maxValue) return "Negotiable";
  if (minValue && !maxValue) return `From $${minValue}`;
  if (!minValue && maxValue) return `Up to $${maxValue}`;

  return `$${minValue} - $${maxValue}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}