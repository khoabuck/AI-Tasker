// src/services/milestone.service.js
import milestoneApi from "../api/milestone.api";
import { normalizeMilestone } from "./project.service";

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null" ||
    Number.isNaN(Number(value)) ||
    Number(value) <= 0
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.milestone) return data.data.milestone;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;

  if (data?.data !== undefined) {
    return data.data;
  }

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

    const response = await milestoneApi.getMilestoneById(
      Number(milestoneId)
    );

    const milestone = unwrapData(response);

    if (!milestone) {
      throw new Error("Milestone data is unavailable.");
    }

    return normalizeMilestone(milestone);
  },
};

export default milestoneService;