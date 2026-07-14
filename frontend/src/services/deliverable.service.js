import deliverableApi from "../api/deliverable.api";

import { compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

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

  if (data?.data?.deliverable) return data.data.deliverable;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.deliverable) return data.deliverable;
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
  if (Array.isArray(data?.deliverables)) return data.deliverables;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.deliverables)) {
    return data.data.deliverables;
  }

  return [];
};

export const normalizeDeliverable = (deliverable) => {
  if (!deliverable) return null;

  const deliverableId = getValue(
    deliverable.deliverableId,
    deliverable.DeliverableId,
    deliverable.deliverableID,
    deliverable.DeliverableID,
    deliverable.id,
    deliverable.Id
  );

  const milestoneId = getValue(
    deliverable.milestoneId,
    deliverable.MilestoneId,
    deliverable.milestoneID,
    deliverable.MilestoneID,
    deliverable.projectMilestoneId,
    deliverable.ProjectMilestoneId,
    deliverable.milestone?.milestoneId,
    deliverable.Milestone?.MilestoneId,
    null
  );

  const projectId = getValue(
    deliverable.projectId,
    deliverable.ProjectId,
    deliverable.projectID,
    deliverable.ProjectID,
    deliverable.project?.projectId,
    deliverable.Project?.ProjectId,
    null
  );

  const status = String(
    getValue(
      deliverable.status,
      deliverable.Status,
      deliverable.deliverableStatus,
      deliverable.DeliverableStatus,
      "SUBMITTED"
    )
  )
    .trim()
    .toUpperCase();

  const milestoneStatus = String(
    getValue(deliverable.milestoneStatus, deliverable.MilestoneStatus, "")
  )
    .trim()
    .toUpperCase();

  return {
    deliverableId,
    id: deliverableId,

    milestoneId,
    projectId,

    milestoneTitle: getValue(
      deliverable.milestoneTitle,
      deliverable.MilestoneTitle,
      deliverable.milestone?.title,
      deliverable.Milestone?.Title,
      "Milestone"
    ),

    projectTitle: getValue(
      deliverable.projectTitle,
      deliverable.ProjectTitle,
      deliverable.project?.title,
      deliverable.Project?.Title,
      "Project"
    ),

    expertProfileId: getValue(
      deliverable.expertProfileId,
      deliverable.ExpertProfileId,
      null
    ),

    expertUserId: getValue(
      deliverable.expertUserId,
      deliverable.ExpertUserId,
      null
    ),

    expertName: getValue(
      deliverable.expertName,
      deliverable.ExpertName,
      "Expert"
    ),

    clientProfileId: getValue(
      deliverable.clientProfileId,
      deliverable.ClientProfileId,
      null
    ),

    clientUserId: getValue(
      deliverable.clientUserId,
      deliverable.ClientUserId,
      null
    ),

    clientName: getValue(
      deliverable.clientName,
      deliverable.ClientName,
      "Client"
    ),

    title: getValue(
      deliverable.title,
      deliverable.Title,
      deliverable.name,
      deliverable.Name,
      `Deliverable #${deliverableId || ""}`
    ),

    description: getValue(
      deliverable.description,
      deliverable.Description,
      ""
    ),

    fileUrl: getValue(deliverable.fileUrl, deliverable.FileUrl, ""),
    demoUrl: getValue(deliverable.demoUrl, deliverable.DemoUrl, ""),

    demoInstructions: getValue(
      deliverable.demoInstructions,
      deliverable.DemoInstructions,
      ""
    ),

    testResultUrl: getValue(
      deliverable.testResultUrl,
      deliverable.TestResultUrl,
      ""
    ),

    testSummary: getValue(
      deliverable.testSummary,
      deliverable.TestSummary,
      ""
    ),

    handoverNotes: getValue(
      deliverable.handoverNotes,
      deliverable.HandoverNotes,
      ""
    ),

    clientFeedback: getValue(
      deliverable.clientFeedback,
      deliverable.ClientFeedback,
      deliverable.feedback,
      deliverable.Feedback,
      ""
    ),

    versionNumber: Number(
      getValue(deliverable.versionNumber, deliverable.VersionNumber, 1)
    ),

    revisionUsed: Number(
      getValue(deliverable.revisionUsed, deliverable.RevisionUsed, 0)
    ),

    status,
    milestoneStatus,

    milestonePaymentStatus: String(
      getValue(
        deliverable.milestonePaymentStatus,
        deliverable.MilestonePaymentStatus,
        ""
      )
    )
      .trim()
      .toUpperCase(),

    submittedAt: getValue(
      deliverable.submittedAt,
      deliverable.SubmittedAt,
      deliverable.createdAt,
      deliverable.CreatedAt,
      ""
    ),

    reviewDeadlineAt: getValue(
      deliverable.reviewDeadlineAt,
      deliverable.ReviewDeadlineAt,
      ""
    ),

    reviewedAt: getValue(
      deliverable.reviewedAt,
      deliverable.ReviewedAt,
      ""
    ),

    createdAt: getValue(deliverable.createdAt, deliverable.CreatedAt, ""),
    updatedAt: getValue(deliverable.updatedAt, deliverable.UpdatedAt, ""),

    raw: deliverable,
  };
};

function buildSubmitPayload(formData = {}) {
  const fileUrl = trim(formData.fileUrl);
  const demoUrl = trim(formData.demoUrl);
  const demoInstructions = trim(formData.demoInstructions);
  const testResultUrl = trim(formData.testResultUrl);
  const testSummary = trim(formData.testSummary);
  const description = trim(formData.description);
  const handoverNotes = trim(formData.handoverNotes);

  if (!description) {
    throw new Error("Deliverable description is required.");
  }

  if (!fileUrl) {
    throw new Error(
      "A public file or repository URL is required for this deliverable."
    );
  }

  if (testResultUrl && !testSummary) {
    throw new Error(
      "Test summary is required when a test result URL is provided."
    );
  }

  return {
    fileUrl,
    demoUrl: demoUrl || null,
    demoInstructions: demoInstructions || null,
    testResultUrl: testResultUrl || null,
    testSummary: testSummary || null,
    description,
    handoverNotes: handoverNotes || null,
  };
}

function buildGenericSubmitPayload(milestoneId, formData = {}) {
  return {
    milestoneId: Number(milestoneId),
    ...buildSubmitPayload(formData),
  };
}

function buildRevisionRequestPayload(formData = {}) {
  const feedback = trim(formData.feedback || formData.reason || formData.note);

  if (!feedback) {
    throw new Error("Revision feedback is required.");
  }

  return {
    feedback,
  };
}

const deliverableService = {
  async getDeliverablesByMilestone(milestoneId) {
    if (isInvalidId(milestoneId)) {
      throw new Error("Invalid milestone id.");
    }

    const response = await deliverableApi.getDeliverablesByMilestone(
      milestoneId
    );

    return unwrapListData(response)
      .map(normalizeDeliverable)
      .filter(Boolean)
      .sort((a, b) => {
        const bySubmittedTime = compareDateDesc(
          a.submittedAt || a.createdAt,
          b.submittedAt || b.createdAt
        );

        if (bySubmittedTime !== 0) return bySubmittedTime;

        return Number(b.versionNumber || 0) - Number(a.versionNumber || 0);
      });
  },

  async submitDeliverable(milestoneId, formData) {
    if (isInvalidId(milestoneId)) {
      throw new Error("Invalid milestone id.");
    }

    const payload = buildSubmitPayload(formData);

    const response = await deliverableApi.submitDeliverableToMilestone(
      milestoneId,
      payload
    );

    return normalizeDeliverable(unwrapData(response));
  },

  async submitDeliverableGeneric(milestoneId, formData) {
    if (isInvalidId(milestoneId)) {
      throw new Error("Invalid milestone id.");
    }

    const payload = buildGenericSubmitPayload(milestoneId, formData);

    const response = await deliverableApi.submitDeliverable(payload);

    return normalizeDeliverable(unwrapData(response));
  },

  async getDeliverableById(deliverableId) {
    if (isInvalidId(deliverableId)) {
      throw new Error("Invalid deliverable id.");
    }

    const response = await deliverableApi.getDeliverableById(deliverableId);

    return normalizeDeliverable(unwrapData(response));
  },

  // Client-side action. Keep only if client pages still use it.
  async approveDeliverable(deliverableId) {
    if (isInvalidId(deliverableId)) {
      throw new Error("Invalid deliverable id.");
    }

    const response = await deliverableApi.approveDeliverable(deliverableId);

    return normalizeDeliverable(unwrapData(response));
  },

  // Client-side action. Keep only if client pages still use it.
  async requestRevision(deliverableId, formData) {
    if (isInvalidId(deliverableId)) {
      throw new Error("Invalid deliverable id.");
    }

    const payload = buildRevisionRequestPayload(formData);

    const response = await deliverableApi.requestRevision(
      deliverableId,
      payload
    );

    return normalizeDeliverable(unwrapData(response));
  },

  // Client-side legacy action. Keep only for backward compatibility.
  async requestRevisionLegacy(deliverableId, formData) {
    if (isInvalidId(deliverableId)) {
      throw new Error("Invalid deliverable id.");
    }

    const payload = buildRevisionRequestPayload(formData);

    const response = await deliverableApi.requestRevisionLegacy(
      deliverableId,
      payload
    );

    return normalizeDeliverable(unwrapData(response));
  },

  normalizeDeliverable,
};

export default deliverableService;