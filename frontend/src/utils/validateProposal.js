const isEmpty = (value) => String(value ?? "").trim() === "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const hasAnyMilestoneValue = (milestone = {}) => {
  return (
    !isEmpty(milestone.title) ||
    !isEmpty(milestone.amount) ||
    !isEmpty(milestone.durationDays)
  );
};

export const validateProposalMilestones = (milestones = []) => {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return [{ title: "At least one milestone is required." }];
  }

  return milestones.map((milestone, index) => {
    const errors = {};

    if (!hasAnyMilestoneValue(milestone)) {
      errors.title = `Milestone ${index + 1} is empty. Please fill or remove it.`;
      return errors;
    }

    const title = String(milestone.title || "").trim();
    const amount = Number(milestone.amount);
    const durationDays = Number(milestone.durationDays);

    if (!title) {
      errors.title = "Milestone title is required.";
    }

    if (isEmpty(milestone.amount)) {
      errors.amount = "Milestone amount is required.";
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "Milestone amount must be greater than 0.";
    }

    if (isEmpty(milestone.durationDays)) {
      errors.durationDays = "Milestone duration is required.";
    } else if (
      !Number.isFinite(durationDays) ||
      durationDays <= 0 ||
      !Number.isInteger(durationDays)
    ) {
      errors.durationDays =
        "Milestone duration must be a whole number greater than 0.";
    }

    return errors;
  });
};

export const hasMilestoneErrors = (milestoneErrors = []) => {
  return milestoneErrors.some(
    (item) => item && Object.keys(item).length > 0
  );
};

export const validateProposalForm = (formData = {}, options = {}) => {
  const errors = {};
  const price = toNumber(formData.proposedPrice);
  const timeline = toNumber(formData.proposedTimelineDays);
  const maxMilestones = Number(
    options.maxMilestones ?? options.proposalMilestoneLimit ?? 0
  );
  const resubmitNoteMaxLength = Number(options.resubmitNoteMaxLength ?? 0);

  if (isEmpty(formData.coverLetter)) {
    errors.coverLetter = "Cover letter is required.";
  }

  if (isEmpty(formData.proposedPrice)) {
    errors.proposedPrice = "Proposed price is required.";
  } else if (price <= 0) {
    errors.proposedPrice = "Proposed price must be greater than 0.";
  }

  if (isEmpty(formData.proposedTimelineDays)) {
    errors.proposedTimelineDays = "Proposed timeline is required.";
  } else if (timeline <= 0 || !Number.isInteger(timeline)) {
    errors.proposedTimelineDays =
      "Proposed timeline must be a whole number greater than 0.";
  }

  if (isEmpty(formData.expectedOutputs)) {
    errors.expectedOutputs = "Expected outputs are required.";
  }

  if (isEmpty(formData.workingApproach)) {
    errors.workingApproach = "Working approach is required.";
  }

  const milestones = Array.isArray(formData.milestones)
    ? formData.milestones
    : [];
  const milestoneErrors = validateProposalMilestones(milestones);

  if (Number.isFinite(maxMilestones) && maxMilestones > 0) {
    if (milestones.length > maxMilestones) {
      errors.milestonesLimit = `A proposal cannot have more than ${maxMilestones} milestones.`;
    }
  }

  if (hasMilestoneErrors(milestoneErrors)) {
    errors.milestones = milestoneErrors;
  }

  const milestoneTotal = milestones.reduce(
    (total, milestone) => total + Math.max(toNumber(milestone.amount), 0),
    0
  );
  const milestoneDuration = milestones.reduce(
    (total, milestone) => total + Math.max(toNumber(milestone.durationDays), 0),
    0
  );

  if (
    options.checkMilestoneTotal !== false &&
    price > 0 &&
    milestoneTotal > 0 &&
    Math.abs(price - milestoneTotal) > 0.01
  ) {
    errors.proposedPrice =
      "Proposed price must match the total milestone amount.";
  }

  if (
    options.checkMilestoneDuration !== false &&
    timeline > 0 &&
    milestoneDuration > timeline
  ) {
    errors.proposedTimelineDays =
      "The total milestone duration cannot exceed the proposed timeline.";
  }

  if (
    options.isResubmit &&
    Number.isFinite(resubmitNoteMaxLength) &&
    resubmitNoteMaxLength > 0 &&
    String(formData.resubmitNote || "").trim().length > resubmitNoteMaxLength
  ) {
    errors.resubmitNote = `Resubmit note cannot exceed ${resubmitNoteMaxLength} characters.`;
  }

  return errors;
};