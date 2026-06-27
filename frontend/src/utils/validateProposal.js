const isEmpty = (value) => String(value || "").trim() === "";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const hasAnyMilestoneValue = (milestone = {}) => {
  return (
    !isEmpty(milestone.title) ||
    !isEmpty(milestone.amount) ||
    !isEmpty(milestone.durationDays)
  );
};

export const validateProposalMilestones = (milestones = []) => {
  const milestoneErrors = [];

  if (!Array.isArray(milestones) || milestones.length === 0) {
    return [
      {
        title: "At least one milestone is required.",
      },
    ];
  }

  milestones.forEach((milestone, index) => {
    const errors = {};

    if (!hasAnyMilestoneValue(milestone)) {
      errors.title = `Milestone ${index + 1} is empty. Please fill or remove it.`;
      milestoneErrors[index] = errors;
      return;
    }

    const amount = Number(milestone.amount);
    const durationDays = Number(milestone.durationDays);

    if (isEmpty(milestone.title)) {
      errors.title = "Milestone title is required.";
    } else if (milestone.title.trim().length < 3) {
      errors.title = "Milestone title must be at least 3 characters.";
    }

    if (isEmpty(milestone.amount)) {
      errors.amount = "Milestone amount is required.";
    } else if (Number.isNaN(amount) || amount <= 0) {
      errors.amount = "Milestone amount must be greater than 0.";
    }

    if (isEmpty(milestone.durationDays)) {
      errors.durationDays = "Milestone duration days is required.";
    } else if (
      Number.isNaN(durationDays) ||
      durationDays <= 0 ||
      !Number.isInteger(durationDays)
    ) {
      errors.durationDays =
        "Milestone duration days must be an integer greater than 0.";
    }

    milestoneErrors[index] = errors;
  });

  return milestoneErrors;
};

export const hasMilestoneErrors = (milestoneErrors = []) => {
  return milestoneErrors.some((item) => item && Object.keys(item).length > 0);
};

export const validateProposalForm = (formData, options = {}) => {
  const errors = {};

  const price = toNumber(formData.proposedPrice);
  const timeline = toNumber(formData.proposedTimelineDays);

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
    errors.expectedOutputs = "Expected outputs must be at least 20 characters.";
  }

  if (isEmpty(formData.workingApproach)) {
    errors.workingApproach = "Working approach is required.";
  } else if (formData.workingApproach.trim().length < 30) {
    errors.workingApproach = "Working approach must be at least 30 characters.";
  }

  if (isEmpty(formData.preliminaryMilestonePlan)) {
    errors.preliminaryMilestonePlan = "Preliminary milestone plan is required.";
  } else if (formData.preliminaryMilestonePlan.trim().length < 20) {
    errors.preliminaryMilestonePlan =
      "Preliminary milestone plan must be at least 20 characters.";
  }

  const milestoneErrors = validateProposalMilestones(formData.milestones || []);

  if (hasMilestoneErrors(milestoneErrors)) {
    errors.milestones = milestoneErrors;
  }

  if (options.checkMilestoneTotal) {
    const milestoneTotal = (formData.milestones || []).reduce(
      (total, milestone) => {
        const amount = Number(milestone.amount || 0);
        return total + (Number.isNaN(amount) ? 0 : amount);
      },
      0
    );

    if (price > 0 && milestoneTotal > 0 && Math.abs(price - milestoneTotal) > 0.01) {
      errors.proposedPrice =
        "Proposed price should match the total milestone amount.";
    }
  }

  if (options.isResubmit) {
    if (isEmpty(formData.resubmitNote)) {
      errors.resubmitNote = "Resubmit note is required.";
    } else if (formData.resubmitNote.trim().length < 10) {
      errors.resubmitNote = "Resubmit note must be at least 10 characters.";
    }
  }

  return errors;
};