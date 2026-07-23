import adminReviewReportApi from "../api/adminReviewReport.api";

import { compareDateAsc, compareDateDesc } from "../utils/dateTime.utils";
const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data?.report) return data.data.report;
  if (data?.data !== undefined) return data.data;

  if (data?.item) return data.item;
  if (data?.result) return data.result;
  if (data?.report) return data.report;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.reports)) return data.reports;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.reports)) return data.data.reports;

  return [];
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const normalizeStatus = (value, fallback = "OPEN") => {
  return String(value || fallback)
    .trim()
    .toUpperCase();
};

const normalizeDeliverable = (deliverable) => {
  if (!deliverable) return null;

  const deliverableId = getValue(
    deliverable.deliverableId,
    deliverable.DeliverableId,
    deliverable.id,
    deliverable.Id
  );

  return {
    deliverableId,
    id: deliverableId,

    versionNumber: toNumber(
      getValue(deliverable.versionNumber, deliverable.VersionNumber, 0)
    ),

    status: normalizeStatus(deliverable.status, deliverable.Status),

    description: getValue(
      deliverable.description,
      deliverable.Description,
      ""
    ),

    clientFeedback: getValue(
      deliverable.clientFeedback,
      deliverable.ClientFeedback,
      ""
    ),

    submittedAt: getValue(
      deliverable.submittedAt,
      deliverable.SubmittedAt,
      ""
    ),

    reviewedAt: getValue(
      deliverable.reviewedAt,
      deliverable.ReviewedAt,
      ""
    ),

    raw: deliverable,
  };
};

const normalizeMilestone = (milestone) => {
  if (!milestone) return null;

  const milestoneId = getValue(
    milestone.milestoneId,
    milestone.MilestoneId,
    milestone.id,
    milestone.Id
  );

  const deliverablesRaw = getValue(
    milestone.deliverables,
    milestone.Deliverables,
    []
  );

  return {
    milestoneId,
    id: milestoneId,

    title: getValue(milestone.title, milestone.Title, "Untitled milestone"),

    amount: toNumber(getValue(milestone.amount, milestone.Amount, 0)),

    orderIndex: toNumber(
      getValue(milestone.orderIndex, milestone.OrderIndex, 0)
    ),

    status: normalizeStatus(milestone.status, milestone.Status),

    paymentStatus: normalizeStatus(
      milestone.paymentStatus,
      milestone.PaymentStatus,
      ""
    ),

    deadline: getValue(milestone.deadline, milestone.Deadline, ""),

    deliverableCount: toNumber(
      getValue(milestone.deliverableCount, milestone.DeliverableCount, 0)
    ),

    submittedDeliverableCount: toNumber(
      getValue(
        milestone.submittedDeliverableCount,
        milestone.SubmittedDeliverableCount,
        0
      )
    ),

    approvedDeliverableCount: toNumber(
      getValue(
        milestone.approvedDeliverableCount,
        milestone.ApprovedDeliverableCount,
        0
      )
    ),

    revisionRequestedDeliverableCount: toNumber(
      getValue(
        milestone.revisionRequestedDeliverableCount,
        milestone.RevisionRequestedDeliverableCount,
        0
      )
    ),

    deliverables: Array.isArray(deliverablesRaw)
      ? deliverablesRaw
          .map(normalizeDeliverable)
          .filter(Boolean)
          .sort((a, b) =>
            compareDateDesc(
              a.reviewedAt || a.submittedAt,
              b.reviewedAt || b.submittedAt
            )
          )
      : [],

    raw: milestone,
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

  return {
    disputeId,
    id: disputeId,

    milestoneId: getValue(dispute.milestoneId, dispute.MilestoneId, null),

    reason: getValue(dispute.reason, dispute.Reason, ""),

    disputedAmount: toNumber(
      getValue(dispute.disputedAmount, dispute.DisputedAmount, 0)
    ),

    status: normalizeStatus(dispute.status, dispute.Status),

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

    raw: dispute,
  };
};

export const normalizeReviewReport = (report) => {
  if (!report) return null;

  const reviewReportId = getValue(
    report.reviewReportId,
    report.ReviewReportId,
    report.id,
    report.Id
  );

  const milestonesRaw = getValue(report.milestones, report.Milestones, []);
  const disputesRaw = getValue(report.disputes, report.Disputes, []);

  return {
    reviewReportId,
    id: reviewReportId,

    reviewId: getValue(report.reviewId, report.ReviewId, null),

    projectId: getValue(report.projectId, report.ProjectId, null),

    projectTitle: getValue(
      report.projectTitle,
      report.ProjectTitle,
      "Untitled project"
    ),

    expertUserId: getValue(report.expertUserId, report.ExpertUserId, null),

    expertName: getValue(report.expertName, report.ExpertName, "Expert"),

    clientUserId: getValue(report.clientUserId, report.ClientUserId, null),

    clientName: getValue(report.clientName, report.ClientName, "Client"),

    rating: toNumber(getValue(report.rating, report.Rating, 0)),

    reviewComment: getValue(
      report.reviewComment,
      report.ReviewComment,
      ""
    ),

    reviewStatus: normalizeStatus(
      getValue(report.reviewStatus, report.ReviewStatus, "VISIBLE")
    ),

    reason: getValue(report.reason, report.Reason, ""),

    status: normalizeStatus(getValue(report.status, report.Status, "OPEN")),

    adminDecision: getValue(
      report.adminDecision,
      report.AdminDecision,
      ""
    ),

    resolvedByAdminId: getValue(
      report.resolvedByAdminId,
      report.ResolvedByAdminId,
      null
    ),

    createdAt: getValue(report.createdAt, report.CreatedAt, ""),

    resolvedAt: getValue(report.resolvedAt, report.ResolvedAt, ""),

    contractFinalPrice: toNumber(
      getValue(report.contractFinalPrice, report.ContractFinalPrice, 0)
    ),

    expertReceivableAmount: toNumber(
      getValue(
        report.expertReceivableAmount,
        report.ExpertReceivableAmount,
        0
      )
    ),

    projectStatus: normalizeStatus(
      getValue(report.projectStatus, report.ProjectStatus, "")
    ),

    projectStartDate: getValue(
      report.projectStartDate,
      report.ProjectStartDate,
      ""
    ),

    projectEndDate: getValue(
      report.projectEndDate,
      report.ProjectEndDate,
      ""
    ),

    milestones: Array.isArray(milestonesRaw)
      ? milestonesRaw
          .map(normalizeMilestone)
          .filter(Boolean)
          .sort((a, b) => compareDateAsc(a.deadline, b.deadline))
      : [],

    disputes: Array.isArray(disputesRaw)
      ? disputesRaw
          .map(normalizeDispute)
          .filter(Boolean)
          .sort((a, b) =>
            compareDateDesc(
              a.resolvedAt || a.createdAt,
              b.resolvedAt || b.createdAt
            )
          )
      : [],

    raw: report,
  };
};

const normalizeDecision = (value) => {
  const decision = String(value || "").trim().toUpperCase();

  if (decision === "ACCEPT") return "ACCEPT";
  if (decision === "REJECT") return "REJECT";

  return "";
};

const buildResolvePayload = (formData = {}) => {
  const decision = normalizeDecision(formData.decision);
  const adminDecision = String(
    getValue(formData.adminDecision, formData.reason, formData.note, "")
  ).trim();

  if (!decision) {
    throw new Error("Decision must be ACCEPT or REJECT.");
  }

  if (!adminDecision) {
    throw new Error("Admin decision note is required.");
  }

  return {
    decision,
    adminDecision,
  };
};

const adminReviewReportService = {
  async getReports(params = {}) {
    const response = await adminReviewReportApi.getReports({
      status: params.status && params.status !== "ALL" ? params.status : undefined,
      take: params.take || 100,
    });

    return unwrapListData(response)
      .map(normalizeReviewReport)
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a.resolvedAt || a.createdAt,
          b.resolvedAt || b.createdAt
        )
      );
  },

  async getReportById(reviewReportId) {
    if (!reviewReportId || reviewReportId === "undefined" || reviewReportId === "null") {
      throw new Error("Invalid review report id.");
    }

    const response = await adminReviewReportApi.getReportById(reviewReportId);
    return normalizeReviewReport(unwrapData(response));
  },

  async resolveReport(reviewReportId, formData) {
    if (!reviewReportId || reviewReportId === "undefined" || reviewReportId === "null") {
      throw new Error("Invalid review report id.");
    }

    const payload = buildResolvePayload(formData);
    const response = await adminReviewReportApi.resolveReport(
      reviewReportId,
      payload
    );

    return normalizeReviewReport(unwrapData(response));
  },

  normalizeReviewReport,
};

export default adminReviewReportService;