import milestoneApi from "../api/milestone.api";
import { normalizeMilestone } from "./project.service";

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

  if (data?.data?.milestone) return data.data.milestone;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.milestone) return data.milestone;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const milestoneService = {
  async getMilestoneById(milestoneId) {
    if (isInvalidId(milestoneId)) {
      throw new Error("Invalid milestone id.");
    }

    const response = await milestoneApi.getMilestoneById(milestoneId);

    return normalizeMilestone(unwrapData(response));
  },

  async updateMilestone(milestoneId, payload) {
    if (isInvalidId(milestoneId)) {
      throw new Error("Invalid milestone id.");
    }

    const response = await milestoneApi.updateMilestone(milestoneId, payload);

    return normalizeMilestone(unwrapData(response));
  },
};

export default milestoneService;