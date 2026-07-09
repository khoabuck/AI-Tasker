import adminSkillApi from "../api/adminSkill.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data !== undefined) return data.data;
  if (data?.result !== undefined) return data.result;
  if (data?.item !== undefined) return data.item;

  return data;
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;

  return [];
};

const normalizeSkill = (item) => {
  if (!item) return null;

  const skillId = getValue(item.skillId, item.SkillId, item.id, item.Id);

  return {
    skillId,
    id: skillId,

    skillName: getValue(
      item.skillName,
      item.SkillName,
      item.name,
      item.Name,
      ""
    ),

    description: getValue(item.description, item.Description, ""),

    category: getValue(item.category, item.Category, ""),

    isActive: Boolean(getValue(item.isActive, item.IsActive, true)),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),

    raw: item,
  };
};

const buildCreatePayload = (formData) => {
  return {
    skillName: String(formData.skillName || "").trim(),
    description: String(formData.description || "").trim() || null,
    category: String(formData.category || "").trim() || null,
  };
};

const buildUpdatePayload = (formData) => {
  return {
    skillName: String(formData.skillName || "").trim(),
    description: String(formData.description || "").trim() || null,
    category: String(formData.category || "").trim() || null,
    isActive: Boolean(formData.isActive),
  };
};

const adminSkillService = {
  async getSkills(filters = {}) {
    const response = await adminSkillApi.getSkills(filters);
    const raw = unwrapData(response);

    return normalizeArray(raw).map(normalizeSkill).filter(Boolean);
  },

  async getSkillById(skillId) {
    const response = await adminSkillApi.getSkillById(skillId);
    return normalizeSkill(unwrapData(response));
  },

  async createSkill(formData) {
    const response = await adminSkillApi.createSkill(
      buildCreatePayload(formData)
    );

    return normalizeSkill(unwrapData(response));
  },

  async updateSkill(skillId, formData) {
    const response = await adminSkillApi.updateSkill(
      skillId,
      buildUpdatePayload(formData)
    );

    return normalizeSkill(unwrapData(response));
  },

  async deactivateSkill(skillId) {
    const response = await adminSkillApi.deactivateSkill(skillId);
    return unwrapData(response);
  },

  async activateSkill(skillId) {
    const response = await adminSkillApi.activateSkill(skillId);
    return unwrapData(response);
  },
};

export default adminSkillService;