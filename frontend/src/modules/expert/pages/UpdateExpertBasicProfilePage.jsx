import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ExpertLayout from "../../../components/layout/ExpertLayout";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";

const emptyForm = {
  fullName: "",
  avatarUrl: "",
  professionalTitle: "",
  bio: "",
  expectedProjectBudgetMin: "",
  expectedProjectBudgetMax: "",
  preferredProjectDurationDays: "",
  availableForWork: true,
};

export default function UpdateExpertBasicProfilePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  const formErrors = useMemo(() => validateForm(formData), [formData]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const profile = await expertProfileService.getMyExpertProfile();

      setFormData({
        fullName: profile?.fullName || "",
        avatarUrl: profile?.avatarUrl || "",
        professionalTitle: profile?.professionalTitle || "",
        bio: profile?.bio || "",
        expectedProjectBudgetMin: profile?.expectedProjectBudgetMin ?? "",
        expectedProjectBudgetMax: profile?.expectedProjectBudgetMax ?? "",
        preferredProjectDurationDays:
          profile?.preferredProjectDurationDays ?? "",
        availableForWork:
          profile?.availableForWork === undefined
            ? true
            : Boolean(profile.availableForWork),
      });
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setError("");
    setModal(null);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const markTouched = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const getFieldError = (name) => {
    if (!submitted && !touched[name]) return "";
    return formErrors[name] || "";
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError("");

      const imageUrl = await uploadService.uploadImage(file, "avatar");

      updateField("avatarUrl", imageUrl);
    } catch (err) {
      console.error("AVATAR UPLOAD ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setError("");
    setModal(null);

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);

      await expertProfileService.updateBasicExpertProfile(formData);

      updateLocalUserStatus("ACTIVE");

      setModal({
        title: "Basic profile updated",
        message:
          "Your basic profile was updated directly. AI review was not required.",
      });

      setTimeout(() => {
        navigate("/expert/profile", { replace: true });
      }, 900);
    } catch (err) {
      console.error("UPDATE BASIC ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ExpertLayout>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          Loading profile...
        </div>
      </ExpertLayout>
    );
  }

  return (
    <ExpertLayout>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Update Basic Profile
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Update basic information
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              This update is applied directly. It does not need AI review.
              Your account status stays ACTIVE.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-white/10 bg-[#151a22] p-6"
          >
            <section className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
              <div>
                <div className="mb-3 h-36 w-36 overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-cyan-300">
                      <span className="material-symbols-outlined text-6xl">
                        person
                      </span>
                    </div>
                  )}
                </div>

                <label className="inline-flex cursor-pointer rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black">
                  {uploadingAvatar ? "Uploading..." : "Upload Avatar"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <TextInput
                  label="Full Name"
                  required
                  value={formData.fullName}
                  onChange={(value) => updateField("fullName", value)}
                  onBlur={() => markTouched("fullName")}
                  error={getFieldError("fullName")}
                />

                <TextInput
                  label="Professional Title"
                  required
                  value={formData.professionalTitle}
                  onChange={(value) => updateField("professionalTitle", value)}
                  onBlur={() => markTouched("professionalTitle")}
                  error={getFieldError("professionalTitle")}
                />

                <TextArea
                  label="Bio"
                  required
                  value={formData.bio}
                  onChange={(value) => updateField("bio", value)}
                  onBlur={() => markTouched("bio")}
                  error={getFieldError("bio")}
                />
              </div>
            </section>

            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-4 text-lg font-bold text-white">
                Work Preferences
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NumberInput
                  label="Minimum Budget"
                  required
                  value={formData.expectedProjectBudgetMin}
                  onChange={(value) =>
                    updateField("expectedProjectBudgetMin", value)
                  }
                  onBlur={() => markTouched("expectedProjectBudgetMin")}
                  error={getFieldError("expectedProjectBudgetMin")}
                />

                <NumberInput
                  label="Maximum Budget"
                  required
                  value={formData.expectedProjectBudgetMax}
                  onChange={(value) =>
                    updateField("expectedProjectBudgetMax", value)
                  }
                  onBlur={() => markTouched("expectedProjectBudgetMax")}
                  error={getFieldError("expectedProjectBudgetMax")}
                />

                <NumberInput
                  label="Preferred Duration Days"
                  required
                  value={formData.preferredProjectDurationDays}
                  onChange={(value) =>
                    updateField("preferredProjectDurationDays", value)
                  }
                  onBlur={() => markTouched("preferredProjectDurationDays")}
                  error={getFieldError("preferredProjectDurationDays")}
                />
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.availableForWork}
                  onChange={(event) =>
                    updateField("availableForWork", event.target.checked)
                  }
                  className="h-4 w-4"
                />
                Available for work
              </label>
            </section>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => navigate("/expert/profile")}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Basic Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {modal && (
        <ResultModal
          title={modal.title}
          message={modal.message}
          onClose={() => navigate("/expert/profile", { replace: true })}
        />
      )}
    </ExpertLayout>
  );
}

function validateForm(data) {
  const errors = {};

  if (isEmpty(data.fullName)) errors.fullName = "Full name is required.";

  if (isEmpty(data.professionalTitle)) {
    errors.professionalTitle = "Professional title is required.";
  }

  if (isEmpty(data.bio)) {
    errors.bio = "Bio is required.";
  } else if (String(data.bio).trim().length < 50) {
    errors.bio = "Bio must be at least 50 characters.";
  }

  if (isEmpty(data.expectedProjectBudgetMin)) {
    errors.expectedProjectBudgetMin = "Minimum budget is required.";
  }

  if (isEmpty(data.expectedProjectBudgetMax)) {
    errors.expectedProjectBudgetMax = "Maximum budget is required.";
  }

  if (isEmpty(data.preferredProjectDurationDays)) {
    errors.preferredProjectDurationDays = "Preferred duration is required.";
  }

  const minBudget = Number(data.expectedProjectBudgetMin || 0);
  const maxBudget = Number(data.expectedProjectBudgetMax || 0);
  const duration = Number(data.preferredProjectDurationDays || 0);

  if (minBudget < 0) {
    errors.expectedProjectBudgetMin = "Minimum budget must be 0 or higher.";
  }

  if (maxBudget < 0) {
    errors.expectedProjectBudgetMax = "Maximum budget must be 0 or higher.";
  }

  if (minBudget && maxBudget && minBudget > maxBudget) {
    errors.expectedProjectBudgetMax =
      "Maximum budget must be greater than minimum budget.";
  }

  if (duration <= 0) {
    errors.preferredProjectDurationDays =
      "Preferred duration must be greater than 0.";
  }

  return errors;
}

function TextInput({ label, value, onChange, onBlur, required, error }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
      />

      <FieldError message={error} />
    </div>
  );
}

function NumberInput(props) {
  return (
    <TextInput
      {...props}
      onChange={(value) => {
        if (/^\d*$/.test(value)) props.onChange(value);
      }}
    />
  );
}

function TextArea({ label, value, onChange, onBlur, required, error }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-300">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        rows={5}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-[#00F0FF]"
      />

      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function ResultModal({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151a22] p-6 text-center shadow-2xl">
        <span className="material-symbols-outlined text-5xl text-green-300">
          check_circle
        </span>

        <h3 className="mt-4 text-xl font-extrabold text-white">{title}</h3>

        <p className="mt-3 text-sm leading-6 text-gray-300">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-xl border border-green-300/50 bg-green-300/10 px-5 py-3 text-sm font-bold text-green-200 transition hover:bg-green-300 hover:text-black"
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
}

function updateLocalUserStatus(status) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...user,
        role: "EXPERT",
        status,
      })
    );
  } catch (error) {
    console.error("UPDATE LOCAL USER STATUS ERROR:", error);
  }
}

function isEmpty(value) {
  return String(value || "").trim() === "";
}

function getFriendlyError(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.title ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}