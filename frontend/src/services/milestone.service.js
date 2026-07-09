import milestoneApi from "../api/milestone.api";
import { normalizeMilestone } from "./project.service";

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
    if (
      !milestoneId ||
      milestoneId === "undefined" ||
      milestoneId === "null"
    ) {
      throw new Error("Invalid milestone id.");
    }

    const response = await milestoneApi.getMilestoneById(milestoneId);

    console.log("GET MILESTONE DETAIL RESPONSE:", response?.data);

    return normalizeMilestone(unwrapData(response));
  },

  async updateMilestone(milestoneId, payload) {
    if (
      !milestoneId ||
      milestoneId === "undefined" ||
      milestoneId === "null"
    ) {
      throw new Error("Invalid milestone id.");
    }

    const response = await milestoneApi.updateMilestone(milestoneId, payload);

    console.log("UPDATE MILESTONE RESPONSE:", response?.data);

    return normalizeMilestone(unwrapData(response));
  },
};

export default milestoneService;