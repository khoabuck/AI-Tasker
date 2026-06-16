import reviewApi from "../api/review.api";

const reviewService = {
  async getMyReviews(params = {}) {
    const response = await reviewApi.getMyReviews(params);
    const data = unwrap(response);
    const list = unwrapList(data);

    return list.map(normalizeReview);
  },

  async getExpertReviews(expertProfileId, params = {}) {
    if (!expertProfileId) {
      throw new Error("expertProfileId is required.");
    }

    const response = await reviewApi.getExpertReviews(expertProfileId, params);
    const data = unwrap(response);
    const list = unwrapList(data);

    return list.map(normalizeReview);
  },

  async getProjectReview(projectId) {
    if (!projectId) {
      throw new Error("projectId is required.");
    }

    const response = await reviewApi.getProjectReview(projectId);
    const data = unwrap(response);

    if (!data) return null;

    return normalizeReview(data);
  },

  async createProjectReview(projectId, payload) {
    if (!projectId) {
      throw new Error("projectId is required.");
    }

    const request = buildCreateReviewPayload(payload);
    const response = await reviewApi.createProjectReview(projectId, request);

    return unwrap(response);
  },
};

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.Reviews)) return data.Reviews;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;

  return [];
}

function normalizeReview(item) {
  const reviewId =
    item?.reviewId ??
    item?.ReviewId ??
    item?.id ??
    item?.Id ??
    item?.projectReviewId ??
    item?.ProjectReviewId;

  const projectId = item?.projectId ?? item?.ProjectId ?? null;

  const rating = Number(item?.rating ?? item?.Rating ?? item?.score ?? item?.Score ?? 0);

  return {
    reviewId,
    id: reviewId,
    projectId,
    expertProfileId:
      item?.expertProfileId ??
      item?.ExpertProfileId ??
      item?.expertId ??
      item?.ExpertId ??
      null,
    reviewerUserId:
      item?.reviewerUserId ??
      item?.ReviewerUserId ??
      item?.clientUserId ??
      item?.ClientUserId ??
      null,
    reviewerName:
      item?.reviewerName ||
      item?.ReviewerName ||
      item?.clientName ||
      item?.ClientName ||
      item?.createdByName ||
      item?.CreatedByName ||
      "Client",
    reviewerAvatarUrl:
      item?.reviewerAvatarUrl ||
      item?.ReviewerAvatarUrl ||
      item?.clientAvatarUrl ||
      item?.ClientAvatarUrl ||
      "",
    projectTitle:
      item?.projectTitle ||
      item?.ProjectTitle ||
      item?.projectName ||
      item?.ProjectName ||
      item?.jobTitle ||
      item?.JobTitle ||
      "Project",
    rating: Number.isNaN(rating) ? 0 : rating,
    comment:
      item?.comment ||
      item?.Comment ||
      item?.feedback ||
      item?.Feedback ||
      item?.content ||
      item?.Content ||
      "",
    createdAt:
      item?.createdAt ||
      item?.CreatedAt ||
      item?.reviewedAt ||
      item?.ReviewedAt ||
      item?.createdDate ||
      item?.CreatedDate ||
      null,
  };
}

function buildCreateReviewPayload(payload = {}) {
  return {
    rating: Number(payload.rating || 0),
    comment: String(payload.comment || "").trim(),
  };
}

export default reviewService;