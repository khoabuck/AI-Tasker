import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import expertProfileService from "../../../services/expertProfile.service";
import uploadService from "../../../services/upload.service";
import { useAuth } from "../../../context/AuthContext";

const SETUP_DRAFT_KEY = "aitasker_expert_profile_setup_draft";
const EDIT_DRAFT_KEY = "aitasker_expert_profile_edit_draft";

const createEmptyCertificate = () => ({
  certificateName: "",
  certificateIssuer: "",
  certificateUrl: "",
  issuedAt: "",
});

const numberFields = [
  "yearsOfExperience",
  "expectedProjectBudgetMin",
  "expectedProjectBudgetMax",
  "preferredProjectDurationDays",
];

const integerFields = ["yearsOfExperience", "preferredProjectDurationDays"];

const extractMessageFromData = (data) => {
  if (!data) return "";

  if (typeof data === "string") return data;

  if (data.message) return data.message;
  if (data.title) return data.title;
  if (data.reviewMessage) return data.reviewMessage;
  if (data.aiMessage) return data.aiMessage;
  if (data.certificateMessage) return data.certificateMessage;

  if (data.errors) {
    const allErrors = Object.values(data.errors).flat();
    if (allErrors.length > 0) return allErrors.join(" ");
  }

  return "";
};

const isTechnicalMessage = (message) => {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("sqlexception") ||
    text.includes("invalid object name") ||
    text.includes("system.") ||
    text.includes("stack trace") ||
    text.includes("at aitasker") ||
    text.includes("at microsoft") ||
    text.includes("exception") ||
    text.includes("object reference") ||
    text.includes("inner exception")
  );
};

const cleanMessage = (message, fallback) => {
  if (!message) return fallback;

  const text = String(message).trim();

  if (!text) return fallback;
  if (isTechnicalMessage(text)) return fallback;
  if (text.length > 280) return fallback;

  return text;
};

const normalizeSuggestionList = (value, fallback = []) => {
  if (!value) return fallback;

  if (Array.isArray(value)) {
    const result = value
      .flat()
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return result.length > 0 ? result : fallback;
  }

  if (typeof value === "object") {
    const result = Object.values(value)
      .flat()
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return result.length > 0 ? result : fallback;
  }

  const text = String(value || "").trim();

  return text ? [text] : fallback;
};

export default function SetupExpertProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const avatarInputRef = useRef(null);
  const { refreshUser, handleLogout } = useAuth();

  const isEditPage = location.pathname === "/expert/profile/edit";
  const currentDraftKey = isEditPage ? EDIT_DRAFT_KEY : SETUP_DRAFT_KEY;

  const [formData, setFormData] = useState({
    avatarUrl: "",
    professionalTitle: "",
    bio: "",
    skills: "",
    yearsOfExperience: "",
    expectedProjectBudgetMin: "",
    expectedProjectBudgetMax: "",
    preferredProjectDurationDays: "",
    availableForWork: true,
    portfolioUrl: "",
    linkedInUrl: "",
    gitHubUrl: "",
    certificates: [createEmptyCertificate()],
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [fetching, setFetching] = useState(isEditPage);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [submitResult, setSubmitResult] = useState(null);
  const [correctionModal, setCorrectionModal] = useState(null);

  useEffect(() => {
    if (isEditPage) {
      loadExistingProfile();
    } else {
      loadDraft(SETUP_DRAFT_KEY);
      setFetching(false);
    }
  }, [isEditPage]);

  useEffect(() => {
    if (fetching) return;

    localStorage.setItem(currentDraftKey, JSON.stringify(formData));
  }, [formData, fetching, currentDraftKey]);

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const inputErrorStyle =
    "w-full rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-400";

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] md:p-8";

  const getSavedDraft = (key) => {
    const savedDraft = localStorage.getItem(key);

    if (!savedDraft) return null;

    try {
      return JSON.parse(savedDraft);
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  };

  const loadDraft = (key) => {
    const parsedDraft = getSavedDraft(key);

    if (!parsedDraft) return;

    setFormData((prev) => ({
      ...prev,
      ...parsedDraft,
      certificates:
        parsedDraft.certificates && parsedDraft.certificates.length > 0
          ? parsedDraft.certificates
          : [createEmptyCertificate()],
    }));

    setAvatarPreview(parsedDraft.avatarUrl || "");
  };

  const mapProfileToForm = (data) => ({
    avatarUrl: data.avatarUrl || "",
    professionalTitle: data.professionalTitle || "",
    bio: data.bio || "",
    skills: data.skills || "",
    yearsOfExperience: data.yearsOfExperience ?? "",
    expectedProjectBudgetMin: data.expectedProjectBudgetMin ?? "",
    expectedProjectBudgetMax: data.expectedProjectBudgetMax ?? "",
    preferredProjectDurationDays: data.preferredProjectDurationDays ?? "",
    availableForWork: Boolean(data.availableForWork),
    portfolioUrl: data.portfolioUrl || "",
    linkedInUrl: data.linkedInUrl || "",
    gitHubUrl: data.gitHubUrl || "",
    certificates:
      data.certificates && data.certificates.length > 0
        ? data.certificates.map((item) => ({
          certificateName: item.certificateName || "",
          certificateIssuer: item.certificateIssuer || "",
          certificateUrl: item.certificateUrl || "",
          issuedAt: item.issuedAt ? String(item.issuedAt).slice(0, 10) : "",
        }))
        : [createEmptyCertificate()],
  });

  const handleSignOut = () => {
    handleLogout();
    localStorage.removeItem(SETUP_DRAFT_KEY);
    localStorage.removeItem(EDIT_DRAFT_KEY);
    navigate("/login", { replace: true });
  };

  const loadExistingProfile = async () => {
    try {
      setFetching(true);
      setGeneralError("");

      const data = await expertProfileService.getMyExpertProfile();
      const serverForm = mapProfileToForm(data);
      const editDraft = getSavedDraft(EDIT_DRAFT_KEY);

      const nextForm = editDraft
        ? {
          ...serverForm,
          ...editDraft,
          certificates:
            editDraft.certificates && editDraft.certificates.length > 0
              ? editDraft.certificates
              : serverForm.certificates,
        }
        : serverForm;

      setFormData(nextForm);
      setAvatarPreview(nextForm.avatarUrl || "");
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data);

      setGeneralError(
        getFriendlyBackendError(err).message ||
        "We could not load your expert profile. Please try again."
      );
    } finally {
      setFetching(false);
    }
  };

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setFieldError = (name, message) => {
    setFieldErrors((prev) => ({
      ...prev,
      [name]: message,
    }));
  };

  const isValidHttpUrl = (value) => {
    if (!value) return false;

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isNumberText = (value) => {
    if (value === "") return true;
    return /^\d+(\.\d+)?$/.test(String(value));
  };

  const isIntegerText = (value) => {
    if (value === "") return true;
    return /^\d+$/.test(String(value));
  };

  const getInputClass = (name) => {
    return fieldErrors[name] ? inputErrorStyle : inputStyle;
  };

  const resetMessagesOnEdit = () => {
    setSubmitResult(null);
    setGeneralError("");
    setNotice("");
    setCorrectionModal(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    resetMessagesOnEdit();

    if (numberFields.includes(name)) {
      if (integerFields.includes(name) && !isIntegerText(value)) {
        setFieldError(name, "Please enter a whole number.");
      } else if (!integerFields.includes(name) && !isNumberText(value)) {
        setFieldError(name, "Please enter a valid number.");
      } else {
        clearFieldError(name);
      }
    } else {
      clearFieldError(name);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCertificateChange = (index, event) => {
    const { name, value } = event.target;

    resetMessagesOnEdit();

    setFormData((prev) => {
      const newCertificates = [...prev.certificates];

      newCertificates[index] = {
        ...newCertificates[index],
        [name]: value,
      };

      return {
        ...prev,
        certificates: newCertificates,
      };
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`certificate-${index}-${name}`];
      return next;
    });
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    resetMessagesOnEdit();

    if (!file.type.startsWith("image/")) {
      setFieldError("avatarUrl", "Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFieldError("avatarUrl", "Image size must be less than 2MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);

    try {
      setImageUploading(true);
      setFieldError("avatarUrl", "Uploading avatar...");

      const imageUrl = await uploadService.uploadImage(file, "avatar");

      setFormData((prev) => ({
        ...prev,
        avatarUrl: imageUrl,
      }));

      setAvatarPreview(imageUrl);
      clearFieldError("avatarUrl");
      setNotice("Avatar uploaded successfully.");
    } catch (err) {
      console.error("UPLOAD AVATAR ERROR:", err?.response?.data || err);

      setFormData((prev) => ({
        ...prev,
        avatarUrl: "",
      }));

      setFieldError(
        "avatarUrl",
        getFriendlyBackendError(err).message ||
        "We could not upload your avatar. Please try another image."
      );
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    resetMessagesOnEdit();

    setAvatarPreview("");

    setFormData((prev) => ({
      ...prev,
      avatarUrl: "",
    }));

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }

    clearFieldError("avatarUrl");
  };

  const addCertificate = () => {
    resetMessagesOnEdit();

    setFormData((prev) => ({
      ...prev,
      certificates: [...prev.certificates, createEmptyCertificate()],
    }));
  };

  const removeCertificate = (index) => {
    resetMessagesOnEdit();

    setFormData((prev) => {
      const newCertificates = prev.certificates.filter(
        (_, certIndex) => certIndex !== index
      );

      return {
        ...prev,
        certificates:
          newCertificates.length > 0
            ? newCertificates
            : [createEmptyCertificate()],
      };
    });
  };

  const validateForm = () => {
    const errors = {};

    if (imageUploading) {
      errors.avatarUrl = "Your avatar is still uploading. Please wait.";
    }

    if (!formData.avatarUrl) {
      errors.avatarUrl = "Please upload your avatar.";
    } else if (!isValidHttpUrl(formData.avatarUrl)) {
      errors.avatarUrl = "Please upload your avatar again.";
    }

    if (!formData.professionalTitle.trim()) {
      errors.professionalTitle = "Please enter your professional title.";
    }

    if (!formData.bio.trim()) {
      errors.bio = "Please write a short bio about your experience.";
    }

    if (!formData.skills.trim()) {
      errors.skills = "Please enter at least one skill.";
    }

    if (!formData.yearsOfExperience) {
      errors.yearsOfExperience = "Please enter your years of experience.";
    } else if (!isIntegerText(formData.yearsOfExperience)) {
      errors.yearsOfExperience = "Years of experience must be a whole number.";
    } else if (Number(formData.yearsOfExperience) < 0) {
      errors.yearsOfExperience = "Years of experience cannot be negative.";
    }

    if (!formData.expectedProjectBudgetMin) {
      errors.expectedProjectBudgetMin = "Please enter your minimum budget.";
    } else if (!isNumberText(formData.expectedProjectBudgetMin)) {
      errors.expectedProjectBudgetMin = "Minimum budget must be a valid number.";
    }

    if (!formData.expectedProjectBudgetMax) {
      errors.expectedProjectBudgetMax = "Please enter your maximum budget.";
    } else if (!isNumberText(formData.expectedProjectBudgetMax)) {
      errors.expectedProjectBudgetMax = "Maximum budget must be a valid number.";
    }

    if (
      isNumberText(formData.expectedProjectBudgetMin) &&
      isNumberText(formData.expectedProjectBudgetMax) &&
      formData.expectedProjectBudgetMin &&
      formData.expectedProjectBudgetMax &&
      Number(formData.expectedProjectBudgetMin) >
      Number(formData.expectedProjectBudgetMax)
    ) {
      errors.expectedProjectBudgetMax =
        "Maximum budget must be greater than or equal to minimum budget.";
    }

    if (!formData.preferredProjectDurationDays) {
      errors.preferredProjectDurationDays =
        "Please enter your preferred project duration.";
    } else if (!isIntegerText(formData.preferredProjectDurationDays)) {
      errors.preferredProjectDurationDays =
        "Preferred duration must be a whole number.";
    } else if (Number(formData.preferredProjectDurationDays) <= 0) {
      errors.preferredProjectDurationDays =
        "Preferred duration must be greater than 0.";
    }

    const portfolioUrl = formData.portfolioUrl.trim();
    const linkedInUrl = formData.linkedInUrl.trim();
    const gitHubUrl = formData.gitHubUrl.trim();

    const hasAtLeastOneProfileLink = portfolioUrl || linkedInUrl || gitHubUrl;

    if (!hasAtLeastOneProfileLink) {
      const message =
        "Please provide at least one public link: Portfolio, LinkedIn, or GitHub.";

      errors.portfolioUrl = message;
      errors.linkedInUrl = message;
      errors.gitHubUrl = message;
    }

    if (portfolioUrl && !isValidHttpUrl(portfolioUrl)) {
      errors.portfolioUrl =
        "Please enter a valid Portfolio URL starting with http:// or https://.";
    }

    if (linkedInUrl && !isValidHttpUrl(linkedInUrl)) {
      errors.linkedInUrl =
        "Please enter a valid LinkedIn URL starting with http:// or https://.";
    }

    if (gitHubUrl && !isValidHttpUrl(gitHubUrl)) {
      errors.gitHubUrl =
        "Please enter a valid GitHub URL starting with http:// or https://.";
    }

    formData.certificates.forEach((certificate, index) => {
      const certificateName = String(certificate.certificateName || "").trim();
      const certificateIssuer = String(
        certificate.certificateIssuer || ""
      ).trim();
      const certificateUrl = String(certificate.certificateUrl || "").trim();
      const issuedAt = String(certificate.issuedAt || "").trim();

      if (!certificateName) {
        errors[`certificate-${index}-certificateName`] =
          "Please enter the certificate name.";
      }

      if (!certificateIssuer) {
        errors[`certificate-${index}-certificateIssuer`] =
          "Please enter the certificate issuer.";
      }

      if (!certificateUrl) {
        errors[`certificate-${index}-certificateUrl`] =
          "Please enter a public certificate URL.";
      } else if (!isValidHttpUrl(certificateUrl)) {
        errors[`certificate-${index}-certificateUrl`] =
          "Certificate URL must start with http:// or https://.";
      }

      if (!issuedAt) {
        errors[`certificate-${index}-issuedAt`] =
          "Please select the issued date.";
      }
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const hasUrlError = Object.values(errors).some((message) =>
        String(message).toLowerCase().includes("url")
      );

      setGeneralError(
        hasUrlError
          ? "Some links are not valid. Please check the highlighted URL fields."
          : "Please complete the highlighted fields before submitting."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return false;
    }

    setGeneralError("");
    return true;
  };

  const getFriendlyBackendError = (err) => {
    const statusCode = err?.response?.status;
    const data = err?.response?.data;
    const rawMessage = extractMessageFromData(data);
    const lowerMessage = String(rawMessage || "").toLowerCase();

    if (!err?.response) {
      return {
        message:
          "We could not connect to the server. Please check your internet connection and try again.",
        isAlreadyExists: false,
      };
    }

    if (statusCode === 401) {
      return {
        message: "Your session has expired. Please sign in again.",
        isAlreadyExists: false,
      };
    }

    if (statusCode === 403) {
      return {
        message: "You do not have permission to perform this action.",
        isAlreadyExists: false,
      };
    }

    if (statusCode === 404) {
      return {
        message:
          "We could not find your expert profile. Please create your profile first.",
        isAlreadyExists: false,
      };
    }

    if (
      statusCode === 409 ||
      lowerMessage.includes("already") ||
      lowerMessage.includes("exists")
    ) {
      return {
        message:
          "Your expert profile already exists. Please edit and resubmit your current profile instead.",
        isAlreadyExists: true,
      };
    }

    if (
      statusCode >= 500 ||
      isTechnicalMessage(rawMessage) ||
      lowerMessage.includes("database")
    ) {
      return {
        message:
          "Something went wrong while saving your profile. Please try again later or contact support.",
        isAlreadyExists: false,
      };
    }

    return {
      message: cleanMessage(
        rawMessage,
        "We could not submit your profile. Please check your information and try again."
      ),
      isAlreadyExists: false,
    };
  };

  const buildSubmitResult = (responseData) => {
    const payload = responseData?.data || responseData || {};
    const rawText = JSON.stringify(payload).toLowerCase();

    const backendMessage =
      payload?.message ||
      payload?.title ||
      payload?.reviewMessage ||
      payload?.aiMessage ||
      payload?.certificateMessage ||
      "";

    const backendStatus =
      payload?.status ||
      payload?.profileStatus ||
      payload?.reviewStatus ||
      payload?.verificationStatus ||
      payload?.certificateStatus ||
      "";

    const suggestions =
      payload?.suggestions ||
      payload?.reasons ||
      payload?.issues ||
      payload?.errors ||
      [];

    const normalizedStatus = String(backendStatus || "").toUpperCase();

    const isNeedsCorrection =
      normalizedStatus === "NEEDS_CORRECTION" ||
      rawText.includes("needs_correction") ||
      rawText.includes("need correction") ||
      rawText.includes("needs correction") ||
      rawText.includes("correction required") ||
      rawText.includes("rejected");

    if (isNeedsCorrection) {
      return {
        type: "warning",
        title: "Your profile needs a few changes",
        message: cleanMessage(
          backendMessage,
          "Your profile was saved, but it needs a few changes before it can be approved."
        ),
        status: "NEEDS_CORRECTION",
        suggestions: normalizeSuggestionList(suggestions, [
          "Review your profile information.",
          "Make sure your certificate link is public and can be opened.",
          "Make sure your public profile links are correct.",
          "After fixing the issues, submit your profile again.",
        ]),
        shouldRedirect: false,
        showModal: true,
        primaryLabel: isEditPage ? "Continue Editing" : "Fix and Resubmit",
        actionPath: isEditPage ? "" : "/expert/profile/edit",
      };
    }

    if (
      rawText.includes("approve") ||
      rawText.includes("active") ||
      rawText.includes("verified") ||
      rawText.includes("success") ||
      rawText.includes("pass")
    ) {
      return {
        type: "success",
        title: "Profile submitted successfully",
        message: cleanMessage(
          backendMessage,
          "Your expert profile has been submitted successfully."
        ),
        status: normalizedStatus || "SUBMITTED",
        suggestions: normalizeSuggestionList(suggestions, []),
        shouldRedirect: true,
        showModal: false,
      };
    }

    if (rawText.includes("pending") || rawText.includes("review")) {
      return {
        type: "warning",
        title: "Profile is under review",
        message: cleanMessage(
          backendMessage,
          "Your profile has been submitted and is waiting for review."
        ),
        status: normalizedStatus || "PENDING_REVIEW",
        suggestions: normalizeSuggestionList(suggestions, []),
        shouldRedirect: true,
        showModal: false,
      };
    }

    return {
      type: "success",
      title: "Profile submitted",
      message: cleanMessage(
        backendMessage,
        "Your profile has been submitted successfully."
      ),
      status: normalizedStatus || "SUBMITTED",
      suggestions: normalizeSuggestionList(suggestions, []),
      shouldRedirect: true,
      showModal: false,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitResult(null);
    setCorrectionModal(null);

    const isValid = validateForm();

    if (!isValid) return;

    try {
      setLoading(true);
      setGeneralError("");
      setNotice("Submitting your profile for review...");

      const responseData = isEditPage
        ? await expertProfileService.resubmitExpertProfile(formData)
        : await expertProfileService.createExpertProfile(formData);

      await refreshUser();

      const result = buildSubmitResult(responseData);

      setNotice("");
      setSubmitResult(result);

      if (result.showModal) {
        setCorrectionModal(result);
      }

      if (result.status !== "NEEDS_CORRECTION") {
        localStorage.removeItem(currentDraftKey);
      }

      if (result.shouldRedirect) {
        setTimeout(() => {
          navigate("/expert/dashboard", { replace: true });
        }, 1800);
      }
    } catch (err) {
      console.error("EXPERT PROFILE SUBMIT ERROR:", err?.response?.data);

      const friendlyError = getFriendlyBackendError(err);

      setNotice("");

      setSubmitResult({
        type: "error",
        title: friendlyError.isAlreadyExists
          ? "Profile already exists"
          : "Profile submission failed",
        message: friendlyError.message,
        status: friendlyError.isAlreadyExists ? "PROFILE_EXISTS" : "FAILED",
        suggestions: friendlyError.isAlreadyExists
          ? [
            "Open your existing profile.",
            "Review the information.",
            "Submit again using the resubmit flow.",
          ]
          : [
            "Check all highlighted fields.",
            "Make sure every link is public.",
            "Make sure every URL starts with http:// or https://.",
            "Try again after checking your information.",
          ],
        shouldRedirect: false,
        showModal: false,
        primaryLabel: friendlyError.isAlreadyExists ? "Go to Edit Profile" : "",
        actionPath: friendlyError.isAlreadyExists ? "/expert/profile/edit" : "",
      });

      setGeneralError(friendlyError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectionPrimaryAction = () => {
    if (correctionModal?.actionPath) {
      navigate(correctionModal.actionPath, { replace: true });
      return;
    }

    setCorrectionModal(null);
  };

  if (fetching) {
    return (
      <SetupOnlyLayout onSignOut={handleSignOut}>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading profile form...
          </div>
        </div>
      </SetupOnlyLayout>
    );
  }

  return (
    <SetupOnlyLayout onSignOut={handleSignOut}>
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Expert Profile
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              {isEditPage
                ? "Edit your expert profile"
                : "Complete your expert profile"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Fields marked with{" "}
              <span className="font-bold text-red-400">*</span> are required.
              For profile links, please provide at least one public link.
              Your draft is saved automatically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cardStyle}>
            {isEditPage && (
              <AlertBox
                type="warning"
                title="Editing mode"
                message="Update your information and submit again for review."
              />
            )}

            {notice && (
              <AlertBox type="info" title="Processing" message={notice} />
            )}

            {submitResult && (
              <SubmitResultBox
                result={submitResult}
                onAction={(path) => navigate(path, { replace: true })}
              />
            )}

            {generalError && !submitResult && (
              <AlertBox
                type="error"
                title="Please review your form"
                message={generalError}
              />
            )}

            <div className="mb-8">
              <RequiredLabel text="Avatar" required />

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />

              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={imageUploading}
                  className="group flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10 transition hover:border-cyan-300 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="material-symbols-outlined block text-5xl text-cyan-300">
                        add_a_photo
                      </span>
                      <span className="mt-2 block text-xs font-bold text-cyan-300">
                        Choose image
                      </span>
                    </div>
                  )}
                </button>

                <div className="flex flex-col gap-3">
                  {imageUploading && (
                    <p className="text-sm font-semibold text-cyan-300">
                      Uploading avatar...
                    </p>
                  )}

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={imageUploading}
                      className="w-fit rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Upload a clear profile image. Maximum size: 2MB.
              </p>

              <FieldError message={fieldErrors.avatarUrl} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <RequiredLabel text="Professional Title" required />
                <input
                  type="text"
                  name="professionalTitle"
                  value={formData.professionalTitle}
                  onChange={handleChange}
                  placeholder="AI Chatbot & Java Backend Developer"
                  className={getInputClass("professionalTitle")}
                />
                <FieldError message={fieldErrors.professionalTitle} />
              </div>

              <div className="md:col-span-2">
                <RequiredLabel text="Bio" required />
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Introduce your experience, skills, and what you can help clients build."
                  className={`${getInputClass("bio")} resize-none`}
                />
                <FieldError message={fieldErrors.bio} />
              </div>

              <div className="md:col-span-2">
                <RequiredLabel text="Skills" required />
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="Java, Java Servlet, SQL Server, API Integration, AI API Integration"
                  className={getInputClass("skills")}
                />
                <FieldError message={fieldErrors.skills} />
              </div>

              <div>
                <RequiredLabel text="Years Of Experience" required />
                <input
                  type="text"
                  inputMode="numeric"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  placeholder="1"
                  className={getInputClass("yearsOfExperience")}
                />
                <FieldError message={fieldErrors.yearsOfExperience} />
              </div>

              <div>
                <RequiredLabel text="Preferred Duration Days" required />
                <input
                  type="text"
                  inputMode="numeric"
                  name="preferredProjectDurationDays"
                  value={formData.preferredProjectDurationDays}
                  onChange={handleChange}
                  placeholder="14"
                  className={getInputClass("preferredProjectDurationDays")}
                />
                <FieldError message={fieldErrors.preferredProjectDurationDays} />
              </div>

              <div>
                <RequiredLabel text="Budget Min" required />
                <input
                  type="text"
                  inputMode="decimal"
                  name="expectedProjectBudgetMin"
                  value={formData.expectedProjectBudgetMin}
                  onChange={handleChange}
                  placeholder="100"
                  className={getInputClass("expectedProjectBudgetMin")}
                />
                <FieldError message={fieldErrors.expectedProjectBudgetMin} />
              </div>

              <div>
                <RequiredLabel text="Budget Max" required />
                <input
                  type="text"
                  inputMode="decimal"
                  name="expectedProjectBudgetMax"
                  value={formData.expectedProjectBudgetMax}
                  onChange={handleChange}
                  placeholder="500"
                  className={getInputClass("expectedProjectBudgetMax")}
                />
                <FieldError message={fieldErrors.expectedProjectBudgetMax} />
              </div>

              <div>
                <RequiredLabel text="Portfolio URL" required={false} />
                <input
                  type="text"
                  name="portfolioUrl"
                  value={formData.portfolioUrl}
                  onChange={handleChange}
                  placeholder="https://your-portfolio.com"
                  className={getInputClass("portfolioUrl")}
                />
                <FieldError message={fieldErrors.portfolioUrl} />
              </div>

              <div>
                <RequiredLabel text="LinkedIn URL" required={false} />
                <input
                  type="text"
                  name="linkedInUrl"
                  value={formData.linkedInUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/your-name"
                  className={getInputClass("linkedInUrl")}
                />
                <FieldError message={fieldErrors.linkedInUrl} />
              </div>

              <div className="md:col-span-2">
                <RequiredLabel text="GitHub URL" required={false} />
                <input
                  type="text"
                  name="gitHubUrl"
                  value={formData.gitHubUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/your-name"
                  className={getInputClass("gitHubUrl")}
                />
                <FieldError message={fieldErrors.gitHubUrl} />

                <p className="mt-2 text-xs text-gray-500">
                  Please provide at least one public link: Portfolio, LinkedIn,
                  or GitHub.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <input
                    type="checkbox"
                    name="availableForWork"
                    checked={formData.availableForWork}
                    onChange={handleChange}
                    className="h-4 w-4 accent-cyan-400"
                  />

                  <span className="text-sm font-semibold text-gray-300">
                    Available for work
                  </span>
                </label>
              </div>
            </div>

            <div className="my-8 border-t border-white/10" />

            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Certificates
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add at least one public certificate link for review.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCertificate}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
                >
                  Add
                </button>
              </div>

              <div className="space-y-5">
                {formData.certificates.map((certificate, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-bold text-white">
                        Certificate {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeCertificate(index)}
                        className="text-sm font-bold text-red-400 transition hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <RequiredLabel text="Certificate Name" required />
                        <input
                          type="text"
                          name="certificateName"
                          value={certificate.certificateName}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          placeholder="Java Servlet Development"
                          className={getInputClass(
                            `certificate-${index}-certificateName`
                          )}
                        />
                        <FieldError
                          message={
                            fieldErrors[`certificate-${index}-certificateName`]
                          }
                        />
                      </div>

                      <div>
                        <RequiredLabel text="Issuer" required />
                        <input
                          type="text"
                          name="certificateIssuer"
                          value={certificate.certificateIssuer}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          placeholder="Coursera"
                          className={getInputClass(
                            `certificate-${index}-certificateIssuer`
                          )}
                        />
                        <FieldError
                          message={
                            fieldErrors[
                            `certificate-${index}-certificateIssuer`
                            ]
                          }
                        />
                      </div>

                      <div>
                        <RequiredLabel text="Certificate URL" required />
                        <input
                          type="text"
                          name="certificateUrl"
                          value={certificate.certificateUrl}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          placeholder="https://coursera.org/share/..."
                          className={getInputClass(
                            `certificate-${index}-certificateUrl`
                          )}
                        />
                        <FieldError
                          message={
                            fieldErrors[`certificate-${index}-certificateUrl`]
                          }
                        />
                      </div>

                      <div>
                        <RequiredLabel text="Issued At" required />
                        <input
                          type="date"
                          name="issuedAt"
                          value={certificate.issuedAt}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          className={getInputClass(
                            `certificate-${index}-issuedAt`
                          )}
                        />
                        <FieldError
                          message={fieldErrors[`certificate-${index}-issuedAt`]}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(isEditPage ? "/expert/profile" : "/expert/dashboard")
                }
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-gray-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || imageUploading}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.15)] transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting profile..."
                  : imageUploading
                    ? "Uploading avatar..."
                    : isEditPage
                      ? "Resubmit Profile"
                      : "Complete Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {correctionModal && (
        <CorrectionModal
          result={correctionModal}
          isEditPage={isEditPage}
          onClose={() => setCorrectionModal(null)}
          onPrimary={handleCorrectionPrimaryAction}
        />
      )}
    </SetupOnlyLayout>
  );
}

function SetupOnlyLayout({ children, onSignOut }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-white/10 bg-[#0d1117]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="inline-flex items-center text-xl font-extrabold tracking-tight">
            <span className="text-[#00F0FF]">AI</span>
            <span className="ml-1 text-white">Tasker</span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
            Sign out
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function RequiredLabel({ text, required }) {
  return (
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
      {text}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return (
    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-300">
      <span className="material-symbols-outlined text-[16px]">error</span>
      {message}
    </p>
  );
}

function AlertBox({ type, title, message }) {
  const styleMap = {
    info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    warning: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    success: "border-green-400/30 bg-green-400/10 text-green-300",
  };

  const iconMap = {
    info: "info",
    warning: "warning",
    error: "error",
    success: "check_circle",
  };

  return (
    <div
      className={`mb-6 rounded-xl border px-5 py-4 text-sm ${styleMap[type] || styleMap.info
        }`}
    >
      <div className="flex gap-3">
        <span className="material-symbols-outlined text-[22px]">
          {iconMap[type] || iconMap.info}
        </span>

        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

function SubmitResultBox({ result, onAction }) {
  const type = result?.type || "info";

  const styleMap = {
    success: "border-green-400/30 bg-green-400/10 text-green-300",
    warning: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  };

  const iconMap = {
    success: "check_circle",
    warning: "pending",
    error: "error",
    info: "info",
  };

  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions
    : [];

  return (
    <div
      className={`mb-6 rounded-xl border px-5 py-4 text-sm ${styleMap[type] || styleMap.info
        }`}
    >
      <div className="flex gap-3">
        <span className="material-symbols-outlined text-[24px]">
          {iconMap[type] || iconMap.info}
        </span>

        <div className="flex-1">
          <p className="font-bold">{result.title}</p>

          <p className="mt-1 leading-6">{result.message}</p>

          {result.status && (
            <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80">
              Status: {result.status}
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-4 rounded-lg bg-black/20 p-3">
              <p className="mb-2 font-bold">Suggested actions</p>

              <ul className="list-disc space-y-1 pl-5">
                {suggestions.map((item, index) => (
                  <li key={index}>{String(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {result.actionPath && result.primaryLabel && (
            <button
              type="button"
              onClick={() => onAction(result.actionPath)}
              className="mt-4 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
            >
              {result.primaryLabel}
            </button>
          )}

          {result.shouldRedirect && (
            <p className="mt-3 text-xs font-semibold opacity-80">
              Redirecting to Expert Dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CorrectionModal({ result, isEditPage, onClose, onPrimary }) {
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-yellow-400/30 bg-[#151a22] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-300">
              <span className="material-symbols-outlined text-3xl">
                rule
              </span>
            </div>

            <div>
              <p className="text-lg font-extrabold text-white">
                Profile needs revision
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                {isEditPage
                  ? "Your updated profile still needs a few changes before review."
                  : "Your profile was saved, but it needs a few changes before it can be approved."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold text-yellow-200">
            What happened?
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-300">
            {result.message}
          </p>

          {result.status && (
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-yellow-300/80">
              Status: {result.status}
            </p>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-sm font-bold text-white">
              Please check these items:
            </p>

            <ul className="space-y-2">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm text-gray-300"
                >
                  <span className="material-symbols-outlined mt-[1px] text-[18px] text-yellow-300">
                    check_circle
                  </span>
                  <span>{String(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/20 hover:text-white"
          >
            Stay here
          </button>

          <button
            type="button"
            onClick={onPrimary}
            className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
          >
            {result.primaryLabel || "Continue Editing"}
          </button>
        </div>
      </div>
    </div>
  );
}