const isEmpty = (value) => String(value || "").trim() === "";

export const validateProposalForm = (formData) => {
  const errors = {};

  const price = Number(formData.proposedPrice);
  const timeline = Number(formData.proposedTimelineDays);

  if (isEmpty(formData.coverLetter)) {
    errors.coverLetter = "Cover letter is required.";
  } else if (formData.coverLetter.trim().length < 30) {
    errors.coverLetter = "Cover letter must be at least 30 characters.";
  }

  if (isEmpty(formData.proposedPrice)) {
    errors.proposedPrice = "Proposed price is required.";
  } else if (Number.isNaN(price) || price <= 0) {
    errors.proposedPrice = "Proposed price must be greater than 0.";
  }

  if (isEmpty(formData.proposedTimelineDays)) {
    errors.proposedTimelineDays = "Proposed timeline is required.";
  } else if (
    Number.isNaN(timeline) ||
    timeline <= 0 ||
    !Number.isInteger(timeline)
  ) {
    errors.proposedTimelineDays =
      "Proposed timeline must be an integer greater than 0.";
  }

  if (isEmpty(formData.expectedOutputs)) {
    errors.expectedOutputs = "Expected outputs are required.";
  } else if (formData.expectedOutputs.trim().length < 20) {
    errors.expectedOutputs =
      "Expected outputs must be at least 20 characters.";
  }

  if (isEmpty(formData.workingApproach)) {
    errors.workingApproach = "Working approach is required.";
  } else if (formData.workingApproach.trim().length < 30) {
    errors.workingApproach =
      "Working approach must be at least 30 characters.";
  }

  return errors;
};