import adminUserApi from "../api/adminUser.api";
import { compareDateDesc } from "../utils/dateTime.utils";

const getValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const trim = (value) => String(value || "").trim();

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "verified", "confirmed", "active"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "unverified", "pending"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const isInvalidId = (value) =>
  !value || value === "undefined" || value === "null";

const unwrapData = (response) => {
  const data = response?.data;
  if (!data) return null;
  if (data?.data?.user) return data.data.user;
  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data !== undefined) return data.data;
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

const getEmailVerified = (user) => {
  const directValue = getValue(
    user.isEmailVerified, user.IsEmailVerified,
    user.emailVerified, user.EmailVerified,
    user.emailConfirmed, user.EmailConfirmed,
    user.isEmailConfirmed, user.IsEmailConfirmed, null
  );

  if (directValue !== null) return toBoolean(directValue, false);

  const status = getValue(
    user.emailVerificationStatus, user.EmailVerificationStatus,
    user.verificationStatus, user.VerificationStatus, ""
  );

  if (status) {
    return ["VERIFIED", "CONFIRMED", "APPROVED", "ACTIVE"].includes(
      String(status).trim().toUpperCase()
    );
  }

  return Boolean(getValue(
    user.emailVerifiedAt, user.EmailVerifiedAt,
    user.emailConfirmedAt, user.EmailConfirmedAt,
    user.verifiedAt, user.VerifiedAt, null
  ));
};

export const normalizeAdminUser = (user) => {
  if (!user) return null;

  const userId = getValue(user.userId, user.UserId, user.id, user.Id);
  const role = String(getValue(user.role, user.Role, "USER")).trim().toUpperCase();
  const status = String(getValue(user.status, user.Status, "ACTIVE")).trim().toUpperCase();

  return {
    userId,
    id: userId,
    email: getValue(user.email, user.Email, ""),
    fullName: getValue(
      user.fullName, user.FullName, user.name, user.Name,
      user.displayName, user.DisplayName, "Unknown User"
    ),
    phoneNumber: getValue(user.phoneNumber, user.PhoneNumber, ""),
    avatarUrl: getValue(user.avatarUrl, user.AvatarUrl, ""),
    role,
    status,
    authProvider: getValue(
      user.authProvider, user.AuthProvider, user.provider, user.Provider, ""
    ),
    isEmailVerified: getEmailVerified(user),
    banReason: getValue(user.banReason, user.BanReason, ""),
    bannedAt: getValue(user.bannedAt, user.BannedAt, null),
    lockReason: getValue(user.lockReason, user.LockReason, ""),
    lockoutCount: toNumber(getValue(user.lockoutCount, user.LockoutCount, 0)),
    lockoutEnd: getValue(user.lockoutEnd, user.LockoutEnd, null),
    lastLockedAt: getValue(user.lastLockedAt, user.LastLockedAt, null),
    statusBeforeSuspension: getValue(
      user.statusBeforeSuspension, user.StatusBeforeSuspension, ""
    ),
    expertProfileId: getValue(
      user.expertProfileId, user.ExpertProfileId,
      user.expertProfile?.expertProfileId,
      user.ExpertProfile?.ExpertProfileId, null
    ),
    clientProfileId: getValue(
      user.clientProfileId, user.ClientProfileId,
      user.clientProfile?.clientProfileId,
      user.ClientProfile?.ClientProfileId, null
    ),
    createdAt: getValue(user.createdAt, user.CreatedAt, ""),
    updatedAt: getValue(user.updatedAt, user.UpdatedAt, ""),
    lastLoginAt: getValue(user.lastLoginAt, user.LastLoginAt, null),
    raw: user,
  };
};

const buildLockPayload = (formData = {}) => ({
  durationMinutes: toNumber(
    getValue(
      formData.durationMinutes,
      formData.lockDurationMinutes,
      formData.minutes,
      60
    ),
    60
  ),
  reason: trim(getValue(formData.reason, formData.lockReason, formData.message)),
});

const buildUnlockPayload = (formData = {}) => ({
  reason:
    trim(getValue(formData.reason, formData.unlockReason, formData.message)) ||
    "Unlock user account.",
});

const buildBanPayload = (formData = {}) => ({
  reason: trim(getValue(formData.reason, formData.banReason, formData.message)),
});

const adminUserService = {
  async getAllUsers(params = {}) {
    const response = await adminUserApi.getAllUsers(params);

    return unwrapListData(response)
      .map(normalizeAdminUser)
      .filter(Boolean)
      .sort((a, b) =>
        compareDateDesc(
          a.updatedAt || a.lastLoginAt || a.createdAt,
          b.updatedAt || b.lastLoginAt || b.createdAt
        )
      );
  },

  async getUserById(userId) {
    if (isInvalidId(userId)) throw new Error("Invalid user id.");
    const response = await adminUserApi.getUserById(userId);
    return normalizeAdminUser(unwrapData(response));
  },

  async lockUser(userId, formData = {}) {
    if (isInvalidId(userId)) throw new Error("Invalid user id.");
    const response = await adminUserApi.lockUser(userId, buildLockPayload(formData));
    return normalizeAdminUser(unwrapData(response));
  },

  async unlockUser(userId, formData = {}) {
    if (isInvalidId(userId)) throw new Error("Invalid user id.");
    const response = await adminUserApi.unlockUser(userId, buildUnlockPayload(formData));
    return normalizeAdminUser(unwrapData(response));
  },

  async banUser(userId, formData = {}) {
    if (isInvalidId(userId)) throw new Error("Invalid user id.");
    const response = await adminUserApi.banUser(userId, buildBanPayload(formData));
    return normalizeAdminUser(unwrapData(response));
  },

  async updateUserStatus() {
    throw new Error("This backend no longer supports admin user status update.");
  },

  async updateUserRole() {
    throw new Error("This backend no longer supports admin user role update.");
  },
};

export default adminUserService;
