import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import expertProfileService from "../../../services/expertProfile.service";

export default function ExpertProfilePage() {
  const [formData, setFormData] = useState({
    avatarUrl: "",
    professionalTitle: "",
    bio: "",
    skills: "",
    yearsOfExperience: "",
    portfolioUrl: "",
    githubUrl: "",
    linkedInUrl: "",
    expectedProjectBudgetMin: "",
    expectedProjectBudgetMax: "",
    preferredProjectDurationDays: "",
    availableForWork: true,
  });

  const [certificates, setCertificates] = useState([]);

  const [certificateForm, setCertificateForm] = useState({
    certificateName: "",
    certificateIssuer: "",
    certificateUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadExpertProfile();
  }, []);

  const loadExpertProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const profile = await expertProfileService.getMyProfile();

      setFormData({
        avatarUrl: profile.avatarUrl || "",
        professionalTitle: profile.professionalTitle || "",
        bio: profile.bio || "",
        skills: profile.skills || "",
        yearsOfExperience: profile.yearsOfExperience || "",
        portfolioUrl: profile.portfolioUrl || "",
        githubUrl: profile.githubUrl || "",
        linkedInUrl: profile.linkedInUrl || "",
        expectedProjectBudgetMin: profile.expectedProjectBudgetMin || "",
        expectedProjectBudgetMax: profile.expectedProjectBudgetMax || "",
        preferredProjectDurationDays:
          profile.preferredProjectDurationDays || "",
        availableForWork:
          profile.availableForWork === undefined
            ? true
            : profile.availableForWork,
      });

      if (Array.isArray(profile.certificates)) {
        setCertificates(profile.certificates);
      } else if (profile.certificateName || profile.certificateUrl) {
        setCertificates([
          {
            certificateName: profile.certificateName || "",
            certificateIssuer: profile.certificateIssuer || "",
            certificateUrl: profile.certificateUrl || "",
          },
        ]);
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.log("Expert profile not found or backend API not ready", err);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        avatarUrl: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleCertificateChange = (event) => {
    const { name, value } = event.target;

    setCertificateForm({
      ...certificateForm,
      [name]: value,
    });
  };

  const addCertificate = () => {
    if (!certificateForm.certificateName.trim()) {
      setError("Certificate name is required.");
      return;
    }

    if (!certificateForm.certificateUrl.trim()) {
      setError("Certificate URL is required.");
      return;
    }

    setCertificates([
      ...certificates,
      {
        certificateName: certificateForm.certificateName.trim(),
        certificateIssuer: certificateForm.certificateIssuer.trim(),
        certificateUrl: certificateForm.certificateUrl.trim(),
      },
    ]);

    setCertificateForm({
      certificateName: "",
      certificateIssuer: "",
      certificateUrl: "",
    });

    setError("");
  };

  const removeCertificate = (index) => {
    setCertificates(certificates.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const yearsOfExperience = Number(formData.yearsOfExperience);
    const budgetMin = Number(formData.expectedProjectBudgetMin);
    const budgetMax = Number(formData.expectedProjectBudgetMax);
    const durationDays = Number(formData.preferredProjectDurationDays);

    if (!formData.professionalTitle.trim()) {
      return "Professional title is required.";
    }

    if (!formData.bio.trim()) {
      return "Bio is required.";
    }

    if (!formData.skills.trim()) {
      return "Skills are required.";
    }

    if (formData.yearsOfExperience === "") {
      return "Years of experience is required.";
    }

    if (Number.isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      return "Years of experience must be 0 or greater.";
    }

    if (!formData.portfolioUrl.trim()) {
      return "Portfolio URL is required.";
    }

    if (formData.expectedProjectBudgetMin === "") {
      return "Budget Min is required.";
    }

    if (Number.isNaN(budgetMin) || budgetMin < 0) {
      return "Budget Min must be 0 or greater.";
    }

    if (formData.expectedProjectBudgetMax === "") {
      return "Budget Max is required.";
    }

    if (Number.isNaN(budgetMax) || budgetMax < 0) {
      return "Budget Max must be 0 or greater.";
    }

    if (budgetMax < budgetMin) {
      return "Budget Max must be greater than or equal to Budget Min.";
    }

    if (formData.preferredProjectDurationDays === "") {
      return "Duration Days is required.";
    }

    if (
      Number.isNaN(durationDays) ||
      durationDays < 1 ||
      !Number.isInteger(durationDays)
    ) {
      return "Duration Days must be an integer and at least 1 day.";
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

      await expertProfileService.saveProfile(formData, certificates);

      setMessage("Expert profile saved successfully.");
    } catch (err) {
      console.error(err);
      setError("Cannot save expert profile. Please check backend API.");
    } finally {
      setSaving(false);
    }
  };

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/90 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl";

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const labelStyle =
    "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400";

  const sectionHeader = (icon, title, description) => (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
        <span className="material-symbols-outlined text-xl text-[#00F0FF]">
          {icon}
        </span>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e1e2eb]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101319]/95 px-6 py-5 backdrop-blur-xl md:px-12">
        <Link
          to="/"
          className="inline-flex items-center text-2xl font-extrabold tracking-tight no-underline"
        >
          <span className="text-[#00F0FF]">AI</span>
          <span className="ml-1 text-white">Tasker</span>
        </Link>
      </header>

      <main className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Expert Setup
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Complete your expert profile
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Add your skills, experience, portfolio, certificate and work
              preference so clients can find the right expert.
            </p>
          </div>

          <div className={`${cardStyle} mb-6 p-6 md:p-8`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <label className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_35px_rgba(0,240,255,0.25)]">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Expert avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-cyan-300">
                    <span className="material-symbols-outlined text-5xl">
                      person
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
                  <span className="material-symbols-outlined text-3xl text-white">
                    add_a_photo
                  </span>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {formData.professionalTitle || "Expert Title"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {formData.skills || "No skills added yet"}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Click avatar to upload profile image. This is optional.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                    {formData.yearsOfExperience || 0} years
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      formData.availableForWork
                        ? "border-green-400/30 bg-green-400/10 text-green-300"
                        : "border-red-400/30 bg-red-400/10 text-red-300"
                    }`}
                  >
                    {formData.availableForWork
                      ? "Available"
                      : "Not Available"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Min Budget
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    ${formData.expectedProjectBudgetMin || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Max Budget
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    ${formData.expectedProjectBudgetMax || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className={`${cardStyle} p-12 text-center text-gray-400`}>
              <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
                hourglass_empty
              </span>
              Loading expert profile...
            </div>
          )}

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

          {!loading && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "badge",
                  "Basic Information",
                  "Professional title only. Avatar is optional and uploaded above."
                )}

                <div>
                  <label className={labelStyle}>Professional Title</label>
                  <input
                    type="text"
                    name="professionalTitle"
                    value={formData.professionalTitle}
                    onChange={handleChange}
                    placeholder="AI Automation Engineer"
                    className={inputStyle}
                  />
                </div>
              </section>

              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "description",
                  "Bio & Skills",
                  "Describe your expertise and main skills."
                )}

                <div className="space-y-5">
                  <div>
                    <label className={labelStyle}>Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows="5"
                      placeholder="I help small businesses build AI chatbots..."
                      className={`${inputStyle} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Skills</label>
                    <textarea
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      rows="3"
                      placeholder="C#, .NET, Python, OpenAI API, LangChain, SQL Server"
                      className={`${inputStyle} resize-none`}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Separate skills by comma.
                    </p>
                  </div>
                </div>
              </section>

              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "work_history",
                  "Experience & Availability",
                  "Your working experience and current availability."
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelStyle}>Years Of Experience</label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      min="0"
                      placeholder="3"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Available For Work</label>

                    <label className="flex h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        name="availableForWork"
                        checked={formData.availableForWork}
                        onChange={handleChange}
                        className="h-4 w-4 accent-cyan-400"
                      />
                      I am available for new projects
                    </label>
                  </div>
                </div>
              </section>

              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "link",
                  "Portfolio Links",
                  "Links that help clients check your past work."
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelStyle}>Portfolio URL</label>
                    <input
                      type="text"
                      name="portfolioUrl"
                      value={formData.portfolioUrl}
                      onChange={handleChange}
                      placeholder="https://portfolio.example.com"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>GitHub URL</label>
                    <input
                      type="text"
                      name="githubUrl"
                      value={formData.githubUrl}
                      onChange={handleChange}
                      placeholder="https://github.com/example"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>LinkedIn URL</label>
                    <input
                      type="text"
                      name="linkedInUrl"
                      value={formData.linkedInUrl}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/example"
                      className={inputStyle}
                    />
                  </div>
                </div>
              </section>

              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "workspace_premium",
                  "Certificates",
                  "Add many certificates for checking and verification."
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelStyle}>Certificate Name</label>
                    <input
                      type="text"
                      name="certificateName"
                      value={certificateForm.certificateName}
                      onChange={handleCertificateChange}
                      placeholder="Microsoft Azure AI Fundamentals"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Certificate Issuer</label>
                    <input
                      type="text"
                      name="certificateIssuer"
                      value={certificateForm.certificateIssuer}
                      onChange={handleCertificateChange}
                      placeholder="Microsoft"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Certificate URL</label>
                    <input
                      type="text"
                      name="certificateUrl"
                      value={certificateForm.certificateUrl}
                      onChange={handleCertificateChange}
                      placeholder="https://learn.microsoft.com/..."
                      className={inputStyle}
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={addCertificate}
                    className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                  >
                    + Add Certificate
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {certificates.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No certificates added yet.
                    </p>
                  )}

                  {certificates.map((cert, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {cert.certificateName}
                          </h3>

                          <p className="mt-1 text-xs text-gray-400">
                            Issuer:{" "}
                            {cert.certificateIssuer || "Not provided"}
                          </p>

                          {cert.certificateUrl && (
                            <a
                              href={cert.certificateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                            >
                              Check certificate
                              <span className="material-symbols-outlined text-sm">
                                open_in_new
                              </span>
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                          className="text-left text-sm text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`${cardStyle} p-6 md:p-8`}>
                {sectionHeader(
                  "payments",
                  "Project Preference",
                  "Budget range and preferred project duration."
                )}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className={labelStyle}>Budget Min</label>
                    <input
                      type="number"
                      name="expectedProjectBudgetMin"
                      value={formData.expectedProjectBudgetMin}
                      onChange={handleChange}
                      min="0"
                      placeholder="300"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Budget Max</label>
                    <input
                      type="number"
                      name="expectedProjectBudgetMax"
                      value={formData.expectedProjectBudgetMax}
                      onChange={handleChange}
                      min="0"
                      placeholder="2000"
                      className={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Duration Days</label>
                    <input
                      type="number"
                      name="preferredProjectDurationDays"
                      value={formData.preferredProjectDurationDays}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      placeholder="21"
                      className={inputStyle}
                    />
                  </div>
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-8 py-3 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.15)] transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}