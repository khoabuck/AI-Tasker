import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import expertProfileService from "../../../services/expertProfile.service";
import { useAuth } from "../../../context/AuthContext";

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

export default function SetupExpertProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const avatarInputRef = useRef(null);
  const { refreshUser, handleLogout } = useAuth();

  const isEditPage = location.pathname === "/expert/profile/edit";

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
  const [fetching, setFetching] = useState(isEditPage);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    if (isEditPage) {
      loadExistingProfile();
    } else {
      setFetching(false);
    }
  }, [isEditPage]);

  const handleSignOut = () => {
    handleLogout();
    navigate("/login", { replace: true });
  };

  const loadExistingProfile = async () => {
    try {
      setFetching(true);
      setGeneralError("");

      const data = await expertProfileService.getMyExpertProfile();

      setFormData({
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
                issuedAt: item.issuedAt
                  ? String(item.issuedAt).slice(0, 10)
                  : "",
              }))
            : [createEmptyCertificate()],
      });

      setAvatarPreview(data.avatarUrl || "");
    } catch (err) {
      console.error("LOAD EXPERT PROFILE ERROR:", err?.response?.data);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Cannot load expert profile.";

      setGeneralError(message);
    } finally {
      setFetching(false);
    }
  };

  const inputStyle =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[#00F0FF] focus:bg-white/[0.07]";

  const inputErrorStyle =
    "w-full rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-400";

  const cardStyle =
    "rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)] md:p-8";

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
    if (!value) return true;

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

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSubmitResult(null);
    setGeneralError("");
    setNotice("");

    if (numberFields.includes(name)) {
      if (integerFields.includes(name) && !isIntegerText(value)) {
        setFieldError(name, "Chỉ được nhập số nguyên. Không nhập chữ.");
      } else if (!integerFields.includes(name) && !isNumberText(value)) {
        setFieldError(name, "Chỉ được nhập số. Không nhập chữ.");
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

    setSubmitResult(null);
    setGeneralError("");
    setNotice("");

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

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSubmitResult(null);
    setGeneralError("");

    if (!file.type.startsWith("image/")) {
      setFieldError("avatarUrl", "File phải là ảnh.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFieldError("avatarUrl", "Ảnh không được lớn hơn 2MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageDataUrl = String(reader.result || "");

      setAvatarPreview(imageDataUrl);

      setFormData((prev) => ({
        ...prev,
        avatarUrl: "",
      }));

      clearFieldError("avatarUrl");
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
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
    setFormData((prev) => ({
      ...prev,
      certificates: [...prev.certificates, createEmptyCertificate()],
    }));
  };

  const removeCertificate = (index) => {
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

    if (!formData.professionalTitle.trim()) {
      errors.professionalTitle = "Professional title là bắt buộc.";
    }

    if (!formData.bio.trim()) {
      errors.bio = "Bio là bắt buộc.";
    }

    if (!formData.skills.trim()) {
      errors.skills = "Skills là bắt buộc.";
    }

    if (!formData.yearsOfExperience) {
      errors.yearsOfExperience = "Years of experience là bắt buộc.";
    } else if (!isIntegerText(formData.yearsOfExperience)) {
      errors.yearsOfExperience = "Years of experience chỉ được nhập số nguyên.";
    } else if (Number(formData.yearsOfExperience) < 0) {
      errors.yearsOfExperience = "Years of experience không được nhỏ hơn 0.";
    }

    if (!formData.expectedProjectBudgetMin) {
      errors.expectedProjectBudgetMin = "Budget min là bắt buộc.";
    } else if (!isNumberText(formData.expectedProjectBudgetMin)) {
      errors.expectedProjectBudgetMin = "Budget min chỉ được nhập số.";
    }

    if (!formData.expectedProjectBudgetMax) {
      errors.expectedProjectBudgetMax = "Budget max là bắt buộc.";
    } else if (!isNumberText(formData.expectedProjectBudgetMax)) {
      errors.expectedProjectBudgetMax = "Budget max chỉ được nhập số.";
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
        "Budget max phải lớn hơn hoặc bằng budget min.";
    }

    if (!formData.preferredProjectDurationDays) {
      errors.preferredProjectDurationDays =
        "Preferred duration days là bắt buộc.";
    } else if (!isIntegerText(formData.preferredProjectDurationDays)) {
      errors.preferredProjectDurationDays =
        "Preferred duration days chỉ được nhập số nguyên.";
    } else if (Number(formData.preferredProjectDurationDays) <= 0) {
      errors.preferredProjectDurationDays =
        "Preferred duration days phải lớn hơn 0.";
    }

    if (formData.portfolioUrl && !isValidHttpUrl(formData.portfolioUrl)) {
      errors.portfolioUrl = "Portfolio URL không hợp lệ.";
    }

    if (formData.linkedInUrl && !isValidHttpUrl(formData.linkedInUrl)) {
      errors.linkedInUrl = "LinkedIn URL không hợp lệ.";
    }

    if (formData.gitHubUrl && !isValidHttpUrl(formData.gitHubUrl)) {
      errors.gitHubUrl = "GitHub URL không hợp lệ.";
    }

    formData.certificates.forEach((certificate, index) => {
      const certificateName = String(certificate.certificateName || "").trim();
      const certificateUrl = String(certificate.certificateUrl || "").trim();

      if (certificateName && !certificateUrl) {
        errors[`certificate-${index}-certificateUrl`] =
          "Nhập tên chứng chỉ thì phải nhập link chứng chỉ.";
      }

      if (certificateUrl && !certificateName) {
        errors[`certificate-${index}-certificateName`] =
          "Nhập link chứng chỉ thì phải nhập tên chứng chỉ.";
      }

      if (certificateUrl && !isValidHttpUrl(certificateUrl)) {
        errors[`certificate-${index}-certificateUrl`] =
          "Certificate URL không hợp lệ. Link phải bắt đầu bằng http hoặc https.";
      }
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setGeneralError("Vui lòng kiểm tra lại các ô bị lỗi trước khi gửi.");
      return false;
    }

    return true;
  };

  const getBackendErrorMessage = (err) => {
    const data = err?.response?.data;

    if (!data) {
      return "Không thể gửi profile. Vui lòng kiểm tra backend API.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data.message) {
      return data.message;
    }

    if (data.title) {
      return data.title;
    }

    if (data.errors) {
      const allErrors = Object.values(data.errors).flat();

      if (allErrors.length > 0) {
        return allErrors.join(" ");
      }
    }

    return "Profile hoặc certificate link không hợp lệ.";
  };

  const buildSubmitResult = (responseData) => {
    const rawText = JSON.stringify(responseData || {}).toLowerCase();

    const backendMessage =
      responseData?.message ||
      responseData?.title ||
      responseData?.reviewMessage ||
      responseData?.aiMessage ||
      responseData?.certificateMessage ||
      "";

    const backendStatus =
      responseData?.status ||
      responseData?.profileStatus ||
      responseData?.reviewStatus ||
      responseData?.verificationStatus ||
      responseData?.certificateStatus ||
      "";

    const suggestions =
      responseData?.suggestions ||
      responseData?.reasons ||
      responseData?.issues ||
      responseData?.errors ||
      [];

    if (
      rawText.includes("need") ||
      rawText.includes("correction") ||
      rawText.includes("reject") ||
      rawText.includes("invalid") ||
      rawText.includes("fail")
    ) {
      return {
        type: "error",
        title: "Profile cần chỉnh sửa",
        message:
          backendMessage ||
          "AI/check chứng chỉ phát hiện hồ sơ chưa hợp lệ. Bạn cần kiểm tra lại nội dung profile và link chứng chỉ.",
        status: backendStatus || "NEEDS_CORRECTION",
        suggestions,
        shouldRedirect: false,
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
        title: "Profile đã gửi thành công",
        message:
          backendMessage ||
          "AI/check chứng chỉ đã xử lý xong. Profile của bạn đã được gửi thành công.",
        status: backendStatus || "SUBMITTED",
        suggestions,
        shouldRedirect: true,
      };
    }

    if (rawText.includes("pending") || rawText.includes("review")) {
      return {
        type: "warning",
        title: "Profile đang chờ duyệt",
        message:
          backendMessage ||
          "Profile của bạn đã được gửi và đang chờ hệ thống hoặc admin duyệt.",
        status: backendStatus || "PENDING_REVIEW",
        suggestions,
        shouldRedirect: true,
      };
    }

    return {
      type: "success",
      title: "Gửi profile thành công",
      message:
        backendMessage ||
        "Profile của bạn đã được gửi. Bạn sẽ được chuyển về Expert Dashboard.",
      status: backendStatus || "SUBMITTED",
      suggestions,
      shouldRedirect: true,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitResult(null);

    const isValid = validateForm();

    if (!isValid) return;

    try {
      setLoading(true);
      setGeneralError("");
      setNotice("Đang gửi profile và kiểm tra link chứng chỉ...");

      const responseData = isEditPage
        ? await expertProfileService.resubmitExpertProfile(formData)
        : await expertProfileService.createExpertProfile(formData);

      await refreshUser();

      const result = buildSubmitResult(responseData);

      setNotice("");
      setSubmitResult(result);

      if (result.shouldRedirect) {
        setTimeout(() => {
          navigate("/expert/dashboard", { replace: true });
        }, 2500);
      }
    } catch (err) {
      console.error("EXPERT PROFILE SUBMIT ERROR:", err?.response?.data);

      const message = getBackendErrorMessage(err);

      setNotice("");
      setSubmitResult({
        type: "error",
        title: "Gửi profile thất bại",
        message,
        status: "FAILED",
        suggestions: [
          "Kiểm tra lại các ô bắt buộc.",
          "Kiểm tra certificate URL có mở được hay không.",
          "Certificate URL nên bắt đầu bằng https://",
          "Nếu profile đã tồn tại, hãy vào Profile → Edit Profile để cập nhật.",
        ],
        shouldRedirect: false,
      });

      setGeneralError(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SetupOnlyLayout onSignOut={handleSignOut}>
        <div className="flex min-h-[70vh] items-center justify-center text-gray-400">
          <div className="text-center">
            <span className="material-symbols-outlined mb-3 block text-5xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading expert profile form...
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
              Các ô có dấu <span className="font-bold text-red-400">*</span> là
              bắt buộc. Link chứng chỉ nên là link public, mở được, bắt đầu bằng
              https://
            </p>
          </div>

          <form onSubmit={handleSubmit} className={cardStyle}>
            {isEditPage && (
              <AlertBox
                type="warning"
                title="Bạn đang sửa Expert Profile"
                message="Khi lưu lại, hệ thống sẽ gọi API resubmit và kiểm tra lại chứng chỉ."
              />
            )}

            {notice && (
              <AlertBox type="info" title="Đang xử lý" message={notice} />
            )}

            {submitResult && <SubmitResultBox result={submitResult} />}

            {generalError && !submitResult && (
              <AlertBox
                type="error"
                title="Có lỗi trong form"
                message={generalError}
              />
            )}

            <div className="mb-8">
              <RequiredLabel text="Avatar" required={false} />

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
                  className="group flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10 transition hover:border-cyan-300 hover:bg-cyan-400/20"
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

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="w-fit rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Không bắt buộc. Ảnh chỉ dùng để xem trước trên giao diện, không
                gửi lên backend.
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
                  placeholder="Introduce your experience, skills, and what you can help clients build..."
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
                    Không bắt buộc. Nhưng nếu nhập certificate name thì phải có
                    certificate URL hợp lệ.
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
                        <RequiredLabel
                          text="Certificate Name"
                          required={false}
                        />
                        <input
                          type="text"
                          name="certificateName"
                          value={certificate.certificateName}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          placeholder="Java Servlet Development: From Basics to Real-World Projects"
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
                        <RequiredLabel text="Issuer" required={false} />
                        <input
                          type="text"
                          name="certificateIssuer"
                          value={certificate.certificateIssuer}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          placeholder="Coursera"
                          className={inputStyle}
                        />
                      </div>

                      <div>
                        <RequiredLabel
                          text="Certificate URL"
                          required={false}
                        />
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
                        <RequiredLabel text="Issued At" required={false} />
                        <input
                          type="date"
                          name="issuedAt"
                          value={certificate.issuedAt}
                          onChange={(event) =>
                            handleCertificateChange(index, event)
                          }
                          className={inputStyle}
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
                disabled={loading}
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/10 px-6 py-3 text-sm font-bold text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.15)] transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Checking certificate links..."
                  : isEditPage
                  ? "Resubmit Profile"
                  : "Complete Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
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
      className={`mb-6 rounded-xl border px-5 py-4 text-sm ${
        styleMap[type] || styleMap.info
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

function SubmitResultBox({ result }) {
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
      className={`mb-6 rounded-xl border px-5 py-4 text-sm ${
        styleMap[type] || styleMap.info
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
              <p className="mb-2 font-bold">Bạn nên làm gì?</p>

              <ul className="list-disc space-y-1 pl-5">
                {suggestions.map((item, index) => (
                  <li key={index}>{String(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {result.shouldRedirect && (
            <p className="mt-3 text-xs font-semibold opacity-80">
              Đang chuyển về Expert Dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}