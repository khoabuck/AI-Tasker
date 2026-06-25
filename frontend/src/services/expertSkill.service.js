import skillApi from "../api/skill.api";
import expertSkillApi from "../api/expertSkill.api";

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
  if (data?.data) return data.data;

  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;

  if (Array.isArray(data?.skills)) return data.skills;
  if (Array.isArray(data?.Skills)) return data.Skills;
  if (Array.isArray(data?.expertSkills)) return data.expertSkills;
  if (Array.isArray(data?.ExpertSkills)) return data.ExpertSkills;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.Items)) return data.data.Items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.Result)) return data.data.Result;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.Results)) return data.data.Results;

  if (Array.isArray(data?.data?.skills)) return data.data.skills;
  if (Array.isArray(data?.data?.Skills)) return data.data.Skills;
  if (Array.isArray(data?.data?.expertSkills)) return data.data.expertSkills;
  if (Array.isArray(data?.data?.ExpertSkills)) return data.data.ExpertSkills;

  return [];
};

const normalizeSkill = (item) => {
  if (!item) return null;

  const skillId = getValue(item.skillId, item.SkillId, item.id, item.Id);

  return {
    skillId,
    id: skillId,

    name: getValue(
      item.name,
      item.Name,
      item.skillName,
      item.SkillName,
      "Unnamed Skill"
    ),

    description: getValue(item.description, item.Description, ""),

    category: getValue(
      item.category,
      item.Category,
      item.group,
      item.Group,
      "General"
    ),

    isActive: Boolean(getValue(item.isActive, item.IsActive, true)),

    raw: item,
  };
};

const normalizeExpertSkill = (item) => {
  if (!item) return null;

  const skillId = getValue(
    item.skillId,
    item.SkillId,
    item.id,
    item.Id,
    item.skill?.skillId,
    item.Skill?.SkillId,
    item.skill?.id,
    item.Skill?.Id
  );

  const expertSkillId = getValue(
    item.expertSkillId,
    item.ExpertSkillId,
    item.id,
    item.Id
  );

  const skillName = getValue(
    item.skillName,
    item.SkillName,
    item.name,
    item.Name,
    item.skill?.name,
    item.Skill?.Name,
    item.skill?.skillName,
    item.Skill?.SkillName,
    "Skill"
  );

  return {
    expertSkillId,
    id: expertSkillId || skillId,

    skillId,

    skillName,
    name: skillName,

    level: getValue(
      item.level,
      item.Level,
      item.proficiencyLevel,
      item.ProficiencyLevel,
      "INTERMEDIATE"
    ),

    yearsOfExperience: Number(
      getValue(
        item.yearsOfExperience,
        item.YearsOfExperience,
        item.years,
        item.Years,
        item.experienceYears,
        item.ExperienceYears,
        0
      )
    ),

    isPrimary: Boolean(
      getValue(item.isPrimary, item.IsPrimary, item.primary, item.Primary, false)
    ),

    raw: item,
  };
};

const buildUpdateMySkillsPayload = (skills = []) => {
  const items = skills
    .map((item) => ({
      skillId: getValue(item.skillId, item.id),
      level: String(getValue(item.level, "INTERMEDIATE")).trim(),
      yearsOfExperience: Number(getValue(item.yearsOfExperience, 0)),
      isPrimary: Boolean(getValue(item.isPrimary, false)),
    }))
    .filter((item) => item.skillId);

  return {
    skills: items,
    expertSkills: items,
    items,
  };
};

const expertSkillService = {
  async getAllSkills(params = {}) {
    const response = await skillApi.getSkills(params);

    return unwrapListData(response).map(normalizeSkill).filter(Boolean);
  },

  async getMySkills() {
    const response = await expertSkillApi.getMySkills();

    return unwrapListData(response).map(normalizeExpertSkill).filter(Boolean);
  },

  async updateMySkills(skills) {
    const payload = buildUpdateMySkillsPayload(skills);
    const response = await expertSkillApi.updateMySkills(payload);

    const list = unwrapListData(response);

    if (list.length > 0) {
      return list.map(normalizeExpertSkill).filter(Boolean);
    }

    return unwrapData(response);
  },

  async getExpertSkills(expertProfileId) {
    if (!expertProfileId) {
      throw new Error("expertProfileId is required.");
    }

    const response = await expertSkillApi.getExpertSkills(expertProfileId);

    return unwrapListData(response).map(normalizeExpertSkill).filter(Boolean);
  },

  normalizeSkill,
  normalizeExpertSkill,
};

export default expertSkillService;