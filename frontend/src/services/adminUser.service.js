import adminUserApi from "../api/adminUser.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const trim = (value) => String(value || "").trim();

const isInvalidId = (value) => {
  return !value || value === "undefined" || value === "null";
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.user) return data.data.user;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data) return data.data;

  if (data?.user) return data.user;
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
  if (Array.isArray(data?.users)) return data.users;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.users)) return data.data.users;

  return [];
};

export const normalizeAdminUser = (user) => {
  if (!user) return null;

  const userId = getValue(user.userId, user.UserId, user.id, user.Id);

  const role = String(getValue(user.role, user.Role, "USER"))
    .trim()
    .toUpperCase();

  const status = String(getValue(user.status, user.Status, "ACTIVE"))
    .trim()
    .toUpperCase();

  const lockoutCount = Number(
    getValue(user.lockoutCount, user.LockoutCount, 0)
  );

  return {
    userId,
    id: userId,

    email: getValue(user.email, user.Email, ""),
    fullName: getValue(
      user.fullName,
      user.FullName,
      user.name,
      user.Name,
      user.displayName,
      user.DisplayName,
      "Unknown User"
    ),

    phoneNumber: getValue(user.phoneNumber, user.PhoneNumber, ""),
    avatarUrl: getValue(user.avatarUrl, user.AvatarUrl, ""),

    role,
    status,

    authProvider: getValue(
      user.authProvider,
      user.AuthProvider,
      user.provider,
      user.Provider,
      ""
    ),

    isEmailVerified: Boolean(
      getValue(user.isEmailVerified, user.IsEmailVerified, user.emailVerified, false)
    ),

    // Lock / Ban fields from new backend
    banReason: getValue(user.banReason, user.BanReason, ""),
    bannedAt: getValue(user.bannedAt, user.BannedAt, null),

    lockReason: getValue(user.lockReason, user.LockReason, ""),
    lockoutCount,
    lockoutEnd: getValue(user.lockoutEnd, user.LockoutEnd, null),
    lastLockedAt: getValue(user.lastLockedAt, user.LastLockedAt, null),

    statusBeforeSuspension: getValue(
      user.statusBeforeSuspension,
      user.StatusBeforeSuspension,
      ""
    ),

    expertProfileId: getValue(
      user.expertProfileId,
      user.ExpertProfileId,
      user.expertProfile?.expertProfileId,
      user.ExpertProfile?.ExpertProfileId,
      null
    ),

    clientProfileId: getValue(
      user.clientProfileId,
      user.ClientProfileId,
      user.clientProfile?.clientProfileId,
      user.ClientProfile?.ClientProfileId,
      null
    ),

    createdAt: getValue(user.createdAt, user.CreatedAt, ""),
    updatedAt: getValue(user.updatedAt, user.UpdatedAt, ""),
    lastLoginAt: getValue(user.lastLoginAt, user.LastLoginAt, null),

    raw: user,
  };
};

const buildLockPayload = (formData = {}) => {
  return {
    reason: trim(
      getValue(formData.reason, formData.lockReason, formData.message)
    ),
    lockoutEnd: getValue(
      formData.lockoutEnd,
      formData.lockUntil,
      formData.until,
      null
    ),
  };
};

const buildBanPayload = (formData = {}) => {
  return {
    reason: trim(getValue(formData.reason, formData.banReason, formData.message)),
  };
};

const adminUserService = {
  async getAllUsers(params = {}) {
    const response = await adminUserApi.getAllUsers(params);

    console.log("ADMIN USERS RESPONSE:", response?.data);

    return unwrapListData(response).map(normalizeAdminUser).filter(Boolean);
  },

  async getUserById(userId) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const response = await adminUserApi.getUserById(userId);

    console.log("ADMIN USER DETAIL RESPONSE:", response?.data);

    return normalizeAdminUser(unwrapData(response));
  },

  async lockUser(userId, formData = {}) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const payload = buildLockPayload(formData);

    console.log("LOCK USER PAYLOAD:", payload);

    const response = await adminUserApi.lockUser(userId, payload);

    console.log("LOCK USER RESPONSE:", response?.data);

    return normalizeAdminUser(unwrapData(response));
  },

  async unlockUser(userId) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const response = await adminUserApi.unlockUser(userId);

    console.log("UNLOCK USER RESPONSE:", response?.data);

    return normalizeAdminUser(unwrapData(response));
  },

  async banUser(userId, formData = {}) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const payload = buildBanPayload(formData);

    console.log("BAN USER PAYLOAD:", payload);

    const response = await adminUserApi.banUser(userId, payload);

    console.log("BAN USER RESPONSE:", response?.data);

    return normalizeAdminUser(unwrapData(response));
  },

  // Legacy methods giữ để ManageUsersPage cũ chưa vỡ.
  // Nếu backend mới đã bỏ /status và /role thì page mới sẽ không dùng 2 hàm này nữa.
  async updateUserStatus(userId, status) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const payload = {
      status,
    };

    const response = await adminUserApi.updateUserStatus(userId, payload);
    return normalizeAdminUser(unwrapData(response));
  },

  async updateUserRole(userId, role) {
    if (isInvalidId(userId)) {
      throw new Error("Invalid user id.");
    }

    const payload = {
      role,
    };

    const response = await adminUserApi.updateUserRole(userId, payload);
    return normalizeAdminUser(unwrapData(response));
  },
};

export default adminUserService;