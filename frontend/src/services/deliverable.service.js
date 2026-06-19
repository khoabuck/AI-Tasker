import deliverableApi from "../api/deliverable.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

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
  if (Array.isArray(data?.data?.deliverables)) return data.data.deliverables;

  return [];
};

const normalizeDeliverable = (deliverable) => {
  if (!deliverable) return null;

  const deliverableId = getValue(
    deliverable.deliverableId,
    deliverable.DeliverableId,
    deliverable.id,
    deliverable.Id
  );

  const milestoneId = getValue(
    deliverable.milestoneId,
    deliverable.MilestoneId,
    deliverable.milestone?.milestoneId,
    deliverable.Milestone?.MilestoneId,
    null
  );

  const projectId = getValue(
    deliverable.projectId,
    deliverable.ProjectId,
    deliverable.project?.projectId,
    deliverable.Project?.ProjectId,
    null
  );

  const status = String(
    getValue(deliverable.status, deliverable.Status, "SUBMITTED")
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

    testResultUrl: getValue(
      deliverable.testResultUrl,
      deliverable.TestResultUrl,
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

    status,

    submittedAt: getValue(
      deliverable.submittedAt,
      deliverable.SubmittedAt,
      deliverable.createdAt,
      deliverable.CreatedAt,
      ""
    ),

    createdAt: getValue(deliverable.createdAt, deliverable.CreatedAt, ""),
    updatedAt: getValue(deliverable.updatedAt, deliverable.UpdatedAt, ""),

    raw: deliverable,
  };
};

const buildSubmitPayload = (formData) => ({
  fileUrl: trim(formData.fileUrl) || null,
  demoUrl: trim(formData.demoUrl) || null,
  testResultUrl: trim(formData.testResultUrl) || null,
  description: trim(formData.description),
  handoverNotes: trim(formData.handoverNotes) || null,
});

const buildGenericSubmitPayload = (milestoneId, formData) => ({
  milestoneId: Number(milestoneId),
  ...buildSubmitPayload(formData),
});

const buildRevisionPayload = (formData) => ({
  feedback:
    trim(formData.feedback) ||
    trim(formData.handoverNotes) ||
    "Revision submitted by expert.",
  fileUrl: trim(formData.fileUrl) || null,
  demoUrl: trim(formData.demoUrl) || null,
  testResultUrl: trim(formData.testResultUrl) || null,
  description: trim(formData.description),
  handoverNotes: trim(formData.handoverNotes) || null,
});

const deliverableService = {
  async getDeliverablesByMilestone(milestoneId) {
    if (!milestoneId || milestoneId === "undefined" || milestoneId === "null") {
      throw new Error("Invalid milestone id.");
    }

    const response = await deliverableApi.getDeliverablesByMilestone(
      milestoneId
    );

    console.log("GET DELIVERABLES BY MILESTONE RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeDeliverable).filter(Boolean);
  },

  async submitDeliverable(milestoneId, formData) {
    if (!milestoneId || milestoneId === "undefined" || milestoneId === "null") {
      throw new Error("Invalid milestone id.");
    }

    const payload = buildSubmitPayload(formData);

    console.log("SUBMIT DELIVERABLE PAYLOAD:", payload);

    const response = await deliverableApi.submitDeliverableToMilestone(
      milestoneId,
      payload
    );

    console.log("SUBMIT DELIVERABLE RESPONSE:", response?.data);

    return normalizeDeliverable(unwrapData(response));
  },

  async submitDeliverableGeneric(milestoneId, formData) {
    if (!milestoneId || milestoneId === "undefined" || milestoneId === "null") {
      throw new Error("Invalid milestone id.");
    }

    const payload = buildGenericSubmitPayload(milestoneId, formData);

    console.log("SUBMIT GENERIC DELIVERABLE PAYLOAD:", payload);

    const response = await deliverableApi.submitDeliverable(payload);

    console.log("SUBMIT GENERIC DELIVERABLE RESPONSE:", response?.data);

    return normalizeDeliverable(unwrapData(response));
  },

  async getDeliverableById(deliverableId) {
    if (
      !deliverableId ||
      deliverableId === "undefined" ||
      deliverableId === "null"
    ) {
      throw new Error("Invalid deliverable id.");
    }

    const response = await deliverableApi.getDeliverableById(deliverableId);

    console.log("GET DELIVERABLE DETAIL RESPONSE:", response?.data);

    return normalizeDeliverable(unwrapData(response));
  },

  async submitRevision(deliverableId, formData) {
    if (
      !deliverableId ||
      deliverableId === "undefined" ||
      deliverableId === "null"
    ) {
      throw new Error("Invalid deliverable id.");
    }

    const payload = buildRevisionPayload(formData);

    console.log("SUBMIT DELIVERABLE REVISION PAYLOAD:", payload);

    const response = await deliverableApi.submitRevision(deliverableId, payload);

    console.log("SUBMIT DELIVERABLE REVISION RESPONSE:", response?.data);

    return normalizeDeliverable(unwrapData(response));
  },

  normalizeDeliverable,
};

export default deliverableService;