import disputeApi from "../api/dispute.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;
  if (data?.data?.dispute) return data.data.dispute;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;
  if (data?.dispute) return data.dispute;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.disputes)) return data.disputes;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.disputes)) return data.data.disputes;

  return [];
};

const normalizeEvidence = (evidence) => {
  if (!evidence) return null;

  const evidenceId = getValue(
    evidence.evidenceId,
    evidence.EvidenceId,
    evidence.id,
    evidence.Id
  );

  return {
    evidenceId,
    id: evidenceId,
    disputeId: getValue(evidence.disputeId, evidence.DisputeId, null),
    uploadedByUserId: getValue(
      evidence.uploadedByUserId,
      evidence.UploadedByUserId,
      evidence.userId,
      evidence.UserId,
      null
    ),
    uploadedByName: getValue(
      evidence.uploadedByName,
      evidence.UploadedByName,
      evidence.userName,
      evidence.UserName,
      "User"
    ),
    evidenceText: getValue(
      evidence.evidenceText,
      evidence.EvidenceText,
      evidence.text,
      evidence.Text,
      ""
    ),
    fileUrl: getValue(
      evidence.fileUrl,
      evidence.FileUrl,
      evidence.evidenceFileUrl,
      evidence.EvidenceFileUrl,
      evidence.evidenceUrl,
      evidence.EvidenceUrl,
      ""
    ),
    imageUrl: getValue(
      evidence.imageUrl,
      evidence.ImageUrl,
      evidence.evidenceImageUrl,
      evidence.EvidenceImageUrl,
      ""
    ),
    createdAt: getValue(evidence.createdAt, evidence.CreatedAt, ""),
    raw: evidence,
  };
};

const normalizeDispute = (dispute) => {
  if (!dispute) return null;

  const disputeId = getValue(
    dispute.disputeId,
    dispute.DisputeId,
    dispute.id,
    dispute.Id
  );
  const projectId = getValue(dispute.projectId, dispute.ProjectId, null);
  const milestoneId = getValue(
    dispute.milestoneId,
    dispute.MilestoneId,
    null
  );
  const status = String(getValue(dispute.status, dispute.Status, "OPEN"))
    .trim()
    .toUpperCase();
  const evidencesRaw = getValue(
    dispute.evidences,
    dispute.Evidences,
    dispute.disputeEvidences,
    dispute.DisputeEvidences,
    []
  );

  return {
    disputeId,
    id: disputeId,
    projectId,
    milestoneId,
    projectTitle: getValue(
      dispute.projectTitle,
      dispute.ProjectTitle,
      dispute.project?.title,
      dispute.Project?.Title,
      "Project dispute"
    ),
    milestoneTitle: getValue(
      dispute.milestoneTitle,
      dispute.MilestoneTitle,
      dispute.milestone?.title,
      dispute.Milestone?.Title,
      milestoneId ? "Milestone dispute" : "Whole project"
    ),
    openedByUserId: getValue(
      dispute.openedByUserId,
      dispute.OpenedByUserId,
      null
    ),
    respondentUserId: getValue(
      dispute.respondentUserId,
      dispute.RespondentUserId,
      null
    ),
    openedByName: getValue(
      dispute.openedByName,
      dispute.OpenedByName,
      dispute.openedBy?.fullName,
      dispute.OpenedBy?.FullName,
      "User"
    ),
    respondentName: getValue(
      dispute.respondentName,
      dispute.RespondentName,
      dispute.respondent?.fullName,
      dispute.Respondent?.FullName,
      "Respondent"
    ),
    reason: getValue(dispute.reason, dispute.Reason, ""),
    evidenceText: getValue(dispute.evidenceText, dispute.EvidenceText, ""),
    fileUrl: getValue(
      dispute.fileUrl,
      dispute.FileUrl,
      dispute.evidenceFileUrl,
      dispute.EvidenceFileUrl,
      dispute.evidenceUrl,
      dispute.EvidenceUrl,
      ""
    ),
    imageUrl: getValue(
      dispute.imageUrl,
      dispute.ImageUrl,
      dispute.evidenceImageUrl,
      dispute.EvidenceImageUrl,
      ""
    ),
    disputedAmount: Number(
      getValue(dispute.disputedAmount, dispute.DisputedAmount, 0)
    ),
    status,
    resolutionType: getValue(
      dispute.resolutionType,
      dispute.ResolutionType,
      ""
    ),
    adminDecision: getValue(
      dispute.adminDecision,
      dispute.AdminDecision,
      ""
    ),
    createdAt: getValue(dispute.createdAt, dispute.CreatedAt, ""),
    resolvedAt: getValue(dispute.resolvedAt, dispute.ResolvedAt, ""),
    evidences: Array.isArray(evidencesRaw)
      ? evidencesRaw.map(normalizeEvidence).filter(Boolean)
      : [],
    raw: dispute,
  };
};

const appendIfHasValue = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images.filter((image) => image instanceof File);
};

const buildCreateDisputeFormData = (projectId, formData = {}) => {
  const payload = new FormData();
  const resolvedProjectId = toNumberOrNull(projectId || formData.projectId);
  const milestoneId = toNumberOrNull(formData.milestoneId);
  const respondentUserId = toNumberOrNull(formData.respondentUserId);
  const disputedAmount = toNumberOrNull(formData.disputedAmount);

  appendIfHasValue(payload, "ProjectId", resolvedProjectId);
  appendIfHasValue(payload, "MilestoneId", milestoneId);
  appendIfHasValue(payload, "RespondentUserId", respondentUserId);
  appendIfHasValue(payload, "DisputedAmount", disputedAmount);
  appendIfHasValue(payload, "Reason", trim(formData.reason));
  appendIfHasValue(payload, "EvidenceText", trim(formData.evidenceText));
  appendIfHasValue(
    payload,
    "EvidenceFileUrl",
    trim(formData.evidenceFileUrl)
  );
  appendIfHasValue(
    payload,
    "EvidenceImageUrl",
    trim(formData.evidenceImageUrl)
  );

  normalizeImages(formData.images).forEach((image) => {
    payload.append("Images", image);
  });

  return payload;
};

const buildEvidencePayload = (formData = {}) => ({
  evidenceText: trim(formData.evidenceText) || null,
  fileUrl: trim(formData.fileUrl) || null,
  imageUrl: trim(formData.imageUrl) || null,
  imageUrls: Array.isArray(formData.imageUrls)
    ? formData.imageUrls.map(trim).filter(Boolean)
    : [],
});

const buildEvidenceImageFormData = (formData = {}) => {
  const payload = new FormData();

  appendIfHasValue(payload, "EvidenceText", trim(formData.evidenceText));

  normalizeImages(formData.images).forEach((image) => {
    payload.append("Images", image);
  });

  return payload;
};

const disputeService = {
  async createDispute(projectId, formData) {
    const payload = buildCreateDisputeFormData(projectId, formData);
    const response = await disputeApi.createDispute(payload);
    return normalizeDispute(unwrapData(response));
  },

  async getMyDisputes() {
    const response = await disputeApi.getMyDisputes();
    return unwrapListData(response).map(normalizeDispute).filter(Boolean);
  },

  async getDisputesByProject(projectId) {
    const disputes = await this.getMyDisputes();
    return disputes.filter(
      (item) => String(item.projectId) === String(projectId)
    );
  },

  async getDisputeById(disputeId) {
    if (!disputeId || disputeId === "undefined" || disputeId === "null") {
      throw new Error("Invalid dispute id.");
    }

    const response = await disputeApi.getDisputeById(disputeId);
    return normalizeDispute(unwrapData(response));
  },

  async addDisputeEvidence(disputeId, formData) {
    if (!disputeId || disputeId === "undefined" || disputeId === "null") {
      throw new Error("Invalid dispute id.");
    }

    const response = await disputeApi.addDisputeEvidence(
      disputeId,
      buildEvidencePayload(formData)
    );

    return normalizeDispute(unwrapData(response));
  },

  async addDisputeImageEvidence(disputeId, formData) {
    if (!disputeId || disputeId === "undefined" || disputeId === "null") {
      throw new Error("Invalid dispute id.");
    }

    const response = await disputeApi.addDisputeImageEvidence(
      disputeId,
      buildEvidenceImageFormData(formData)
    );

    return normalizeDispute(unwrapData(response));
  },

  normalizeDispute,
  normalizeEvidence,
};

export default disputeService;
