import adminSkillApi from "../api/adminSkill.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return fallback;
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.skill) return data.data.skill;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.skill) return data.skill;
  if (data?.item) return data.item;
  if (data?.result) return data.result;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.skills)) return data.skills;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.skills)) return data.data.skills;

  return [];
};

export const normalizeSkill = (item) => {
  if (!item) return null;

  const skillId = getValue(
    item.skillId,
    item.SkillId,
    item.skillID,
    item.SkillID,
    item.id,
    item.Id
  );

  return {
    skillId,
    id: skillId,

    skillName: getValue(
      item.skillName,
      item.SkillName,
      item.name,
      item.Name,
      "Unnamed Skill"
    ),

    description: getValue(item.description, item.Description, ""),

    category: getValue(
      item.category,
      item.Category,
      item.categoryName,
      item.CategoryName,
      ""
    ),

    isActive: toBoolean(
      getValue(item.isActive, item.IsActive, item.active, item.Active),
      true
    ),

    createdAt: getValue(item.createdAt, item.CreatedAt, ""),
    updatedAt: getValue(item.updatedAt, item.UpdatedAt, ""),

    raw: item,
  };
};

const buildCreatePayload = (formData = {}) => {
  return {
    skillName: String(formData.skillName || "").trim(),
    description: String(formData.description || "").trim(),
    category: String(formData.category || "").trim(),
  };
};

const buildUpdatePayload = (formData = {}) => {
  return {
    skillName: String(formData.skillName || "").trim(),
    description: String(formData.description || "").trim(),
    category: String(formData.category || "").trim(),
    isActive: toBoolean(formData.isActive, true),
  };
};

const adminSkillService = {
  async getSkills(params = {}) {
    const response = await adminSkillApi.getSkills({
      keyword: params.keyword || "",
      category: params.category || "",
      activeOnly:
        params.activeOnly === undefined || params.activeOnly === null
          ? true
          : params.activeOnly,
    });

    return unwrapListData(response)
      .map(normalizeSkill)
      .filter(Boolean)
      .sort((a, b) =>
        String(a.skillName || "").localeCompare(String(b.skillName || ""))
      );
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

  async deleteSkill(skillId) {
    const response = await adminSkillApi.deleteSkill(skillId);
    return response?.data;
  },

  async activateSkill(skillId) {
    const response = await adminSkillApi.activateSkill(skillId);
    return normalizeSkill(unwrapData(response)) || response?.data;
  },
};

export default adminSkillService;