import disputeApi from "../api/dispute.api";
import { compareDateAsc, compareDateDesc } from "../utils/dateTime.utils";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return fallback;
};

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

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
      evidence.evidenceUrl,
      evidence.EvidenceUrl,
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
  const milestoneId = getValue(dispute.milestoneId, dispute.MilestoneId, null);

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
    deliverableId: getValue(dispute.deliverableId, dispute.DeliverableId, null),
    deliverableVersionNumber: getValue(
      dispute.deliverableVersionNumber,
      dispute.DeliverableVersionNumber,
      null
    ),
    deliverableStatus: getValue(
      dispute.deliverableStatus,
      dispute.DeliverableStatus,
      ""
    ),

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

    clientProfileId: getValue(
      dispute.clientProfileId,
      dispute.ClientProfileId,
      null
    ),
    clientUserId: getValue(dispute.clientUserId, dispute.ClientUserId, null),
    clientName: getValue(
      dispute.clientName,
      dispute.ClientName,
      dispute.client?.fullName,
      dispute.Client?.FullName,
      "Client"
    ),
    expertProfileId: getValue(
      dispute.expertProfileId,
      dispute.ExpertProfileId,
      null
    ),
    expertUserId: getValue(dispute.expertUserId, dispute.ExpertUserId, null),
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

    disputedAmount: toNumber(
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

    requiresClientDecision: toBoolean(
      getValue(
        dispute.requiresClientDecision,
        dispute.RequiresClientDecision,
        false
      )
    ),
    postResolutionDecision: getValue(
      dispute.postResolutionDecision,
      dispute.PostResolutionDecision,
      ""
    ),
    postResolutionDecisionAt: getValue(
      dispute.postResolutionDecisionAt,
      dispute.PostResolutionDecisionAt,
      ""
    ),
    postResolutionDecisionByUserId: getValue(
      dispute.postResolutionDecisionByUserId,
      dispute.PostResolutionDecisionByUserId,
      null
    ),

    evidences: Array.isArray(evidencesRaw)
      ? evidencesRaw
          .map(normalizeEvidence)
          .filter(Boolean)
          .sort((a, b) => compareDateAsc(a.createdAt, b.createdAt))
      : [],
    raw: dispute,
  };
};

const appendIfHasValue = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const buildCreateDisputeFormData = (projectId, formData = {}) => {
  const payload = new FormData();

  appendIfHasValue(payload, "ProjectId", Number(projectId || formData.projectId));

  if (formData.milestoneId) {
    appendIfHasValue(payload, "MilestoneId", Number(formData.milestoneId));
  }

  if (formData.deliverableId) {
    appendIfHasValue(payload, "DeliverableId", Number(formData.deliverableId));
  }

  if (formData.respondentUserId) {
    appendIfHasValue(
      payload,
      "RespondentUserId",
      Number(formData.respondentUserId)
    );
  }

  const disputedAmount = toNumberOrNull(formData.disputedAmount);
  if (disputedAmount !== null) {
    appendIfHasValue(payload, "DisputedAmount", disputedAmount);
  }

  appendIfHasValue(payload, "Reason", trim(formData.reason));
  appendIfHasValue(payload, "EvidenceText", trim(formData.evidenceText));
  appendIfHasValue(
    payload,
    "EvidenceFileUrl",
    trim(formData.evidenceFileUrl || formData.fileUrl)
  );
  appendIfHasValue(
    payload,
    "EvidenceImageUrl",
    trim(formData.evidenceImageUrl || formData.imageUrl)
  );

  const images = Array.isArray(formData.images)
    ? formData.images
    : formData.image instanceof File
    ? [formData.image]
    : [];

  images.forEach((image) => {
    if (image instanceof File) {
      payload.append("Images", image);
    }
  });

  return payload;
};

const buildEvidencePayload = (formData = {}) => {
  const payload = {
    evidenceText: trim(formData.evidenceText),
    fileUrl: trim(formData.fileUrl) || null,
    imageUrl: trim(formData.imageUrl) || null,
  };

  if (Array.isArray(formData.imageUrls)) {
    payload.imageUrls = formData.imageUrls
      .map((url) => trim(url))
      .filter(Boolean);
  }

  return payload;
};

const buildEvidenceImageFormData = (formData = {}) => {
  const payload = new FormData();

  appendIfHasValue(payload, "EvidenceText", trim(formData.evidenceText));

  const images = Array.isArray(formData.images)
    ? formData.images
    : formData.image instanceof File
    ? [formData.image]
    : [];

  images.forEach((image) => {
    if (image instanceof File) {
      payload.append("Images", image);
    }
  });

  return payload;
};

const ensureId = (id, message) => {
  if (isInvalidId(id)) {
    throw new Error(message);
  }
};

const disputeService = {
  async createDispute(projectId, formData) {
    ensureId(projectId || formData?.projectId, "Invalid project id.");

    const payload = buildCreateDisputeFormData(projectId, formData);
    const response = await disputeApi.createDispute(payload);

    return normalizeDispute(unwrapData(response));
  },

  async getMyDisputes() {
    const response = await disputeApi.getMyDisputes();

    return unwrapListData(response)
      .map(normalizeDispute)
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a?.resolvedAt || a?.createdAt,
          b?.resolvedAt || b?.createdAt
        )
      );
  },

  async getDisputesByProject(projectId) {
    ensureId(projectId, "Invalid project id.");

    const disputes = await this.getMyDisputes();

    return disputes.filter(
      (item) => String(item.projectId) === String(projectId)
    );
  },

  async getDisputeById(disputeId) {
    ensureId(disputeId, "Invalid dispute id.");

    const response = await disputeApi.getDisputeById(disputeId);
    return normalizeDispute(unwrapData(response));
  },

  async addDisputeEvidence(disputeId, formData) {
    ensureId(disputeId, "Invalid dispute id.");

    const payload = buildEvidencePayload(formData);
    const response = await disputeApi.addDisputeEvidence(disputeId, payload);

    return normalizeDispute(unwrapData(response));
  },

  async addDisputeImageEvidence(disputeId, formData) {
    ensureId(disputeId, "Invalid dispute id.");

    const images = Array.isArray(formData?.images)
      ? formData.images.filter((image) => image instanceof File)
      : formData?.image instanceof File
      ? [formData.image]
      : [];

    if (images.length === 0) {
      throw new Error("At least one evidence image is required.");
    }

    const payload = buildEvidenceImageFormData({
      ...formData,
      images,
    });

    const response = await disputeApi.addDisputeImageEvidence(
      disputeId,
      payload
    );

    return normalizeDispute(unwrapData(response));
  },

  normalizeDispute,
  normalizeEvidence,
};

export default disputeService;