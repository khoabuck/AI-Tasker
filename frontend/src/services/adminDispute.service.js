import adminDisputeApi from "../api/adminDispute.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.dispute) return data.data.dispute;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;

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

const normalizeResolutionType = (value) => {
  const type = String(value || "").trim().toUpperCase();

  if (type === "RELEASE_TO_EXPERT") return "RELEASE_TO_EXPERT";
  if (type === "REFUND_TO_CLIENT") return "REFUND_TO_CLIENT";

  return "RELEASE_TO_EXPERT";
};

const normalizeEvidence = (evidence) => {
  if (!evidence) return null;

  const evidenceId = getValue(
    evidence.evidenceId,
    evidence.disputeEvidenceId,
    evidence.DisputeEvidenceId,
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
      evidence.description,
      evidence.Description,
      evidence.note,
      evidence.Note,
      evidence.text,
      evidence.Text,
      ""
    ),

    fileUrl: getValue(
      evidence.fileUrl,
      evidence.FileUrl,
      evidence.evidenceFileUrl,
      evidence.EvidenceFileUrl,
      evidence.url,
      evidence.Url,
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
      projectId ? `Project #${projectId}` : "Project"
    ),

    milestoneTitle: getValue(
      dispute.milestoneTitle,
      dispute.MilestoneTitle,
      dispute.milestone?.title,
      dispute.Milestone?.Title,
      milestoneId ? `Milestone #${milestoneId}` : ""
    ),

    clientName: getValue(
      dispute.clientName,
      dispute.ClientName,
      dispute.client?.fullName,
      dispute.Client?.FullName,
      "Client"
    ),

    expertName: getValue(
      dispute.expertName,
      dispute.ExpertName,
      dispute.expert?.fullName,
      dispute.Expert?.FullName,
      "Expert"
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
    description: getValue(dispute.description, dispute.Description, ""),

    evidenceText: getValue(
      dispute.evidenceText,
      dispute.EvidenceText,
      ""
    ),

    fileUrl: getValue(
      dispute.fileUrl,
      dispute.FileUrl,
      dispute.evidenceFileUrl,
      dispute.EvidenceFileUrl,
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

const buildResolvePayload = (formData) => {
  return {
    resolutionType: normalizeResolutionType(formData.resolutionType),
    adminDecision: trim(formData.adminDecision),
  };
};

const adminDisputeService = {
  async getAllDisputes() {
    const response = await adminDisputeApi.getAllDisputes();

    return unwrapListData(response).map(normalizeDispute).filter(Boolean);
  },

  async getDisputeById(disputeId) {
    if (!disputeId || disputeId === "undefined" || disputeId === "null") {
      throw new Error("Invalid dispute id.");
    }

    const response = await adminDisputeApi.getDisputeById(disputeId);

    return normalizeDispute(unwrapData(response));
  },

  async resolveDispute(disputeId, formData) {
    if (!disputeId || disputeId === "undefined" || disputeId === "null") {
      throw new Error("Invalid dispute id.");
    }

    const payload = buildResolvePayload(formData);

    const response = await adminDisputeApi.resolveDispute(disputeId, payload);

    return normalizeDispute(unwrapData(response));
  },

  normalizeDispute,
  normalizeEvidence,
};

export default adminDisputeService;