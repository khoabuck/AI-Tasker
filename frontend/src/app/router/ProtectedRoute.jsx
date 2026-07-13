import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ROUTES = {
  LOGIN: "/login",
  SELECT_ROLE: "/select-role",
  UNAUTHORIZED: "/unauthorized",
  CLIENT_SETUP: "/setup-profile",
  EXPERT_SETUP: "/expert/setup-profile",
  EXPERT_EDIT: "/expert/profile/edit",
  EXPERT_LOCKED: "/expert/profile-locked",
  EXPERT_DASHBOARD: "/expert/dashboard",
  CLIENT_DASHBOARD: "/client/dashboard",
  ADMIN_DASHBOARD: "/admin/dashboard",
};

const ACCOUNT_BLOCKED_STATUSES = new Set([
  "LOCKED",
  "BANNED",
  "SUSPENDED",
  "INACTIVE",
  "DISABLED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_BANNED",
  "ACCOUNT_SUSPENDED",
]);

const LEGACY_PROFILE_STATUSES = new Set([
  "PENDING_PROFILE",
  "EXPERT_PROFILE_LOCKED",
  "PROFILE_PENDING",
  "PROFILE_REJECTED",
  "PROFILE_LOCKED",
]);

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const role = normalizeStatus(user?.role);
  const legacyStatus = normalizeStatus(user?.status);

  const accountStatus = normalizeStatus(
    user?.accountStatus ||
      user?.AccountStatus ||
      user?.userStatus ||
      user?.UserStatus ||
      (LEGACY_PROFILE_STATUSES.has(legacyStatus)
        ? "ACTIVE"
        : legacyStatus)
  );

  const expertProfileStatus = normalizeStatus(
    user?.expertProfileStatus ||
      user?.ExpertProfileStatus ||
      user?.profileStatus ||
      user?.ProfileStatus ||
      (LEGACY_PROFILE_STATUSES.has(legacyStatus)
        ? legacyStatus
        : "")
  );

  const pathname = location.pathname;

  const isClientSetupPage =
    pathname === ROUTES.CLIENT_SETUP;

  const isExpertSetupPage =
    pathname === ROUTES.EXPERT_SETUP;

  const isExpertEditPage =
    pathname === ROUTES.EXPERT_EDIT;

  const isExpertLockedPage =
    pathname === ROUTES.EXPERT_LOCKED;

  const isExpertProfileReviewPage = [
    ROUTES.EXPERT_SETUP,
    ROUTES.EXPERT_EDIT,
    ROUTES.EXPERT_LOCKED,
  ].includes(pathname);

  if (
    legacyStatus === "PENDING_ROLE" ||
    accountStatus === "PENDING_ROLE"
  ) {
    if (pathname === ROUTES.SELECT_ROLE) {
      return children;
    }

    return (
      <Navigate
        to={ROUTES.SELECT_ROLE}
        replace
      />
    );
  }

  if (ACCOUNT_BLOCKED_STATUSES.has(accountStatus)) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{
          accountRestricted: true,
          accountStatus,
          from: pathname,
        }}
      />
    );
  }

  if (
    role === "CLIENT" &&
    isPendingProfileStatus(
      expertProfileStatus,
      legacyStatus
    )
  ) {
    if (isClientSetupPage) {
      return children;
    }

    return (
      <Navigate
        to={ROUTES.CLIENT_SETUP}
        replace
      />
    );
  }

  if (role === "EXPERT") {
    if (
      isExpertLockedStatus(
        expertProfileStatus,
        legacyStatus
      )
    ) {
      if (isExpertProfileReviewPage) {
        return children;
      }

      return (
        <Navigate
          to={ROUTES.EXPERT_LOCKED}
          replace
        />
      );
    }

    if (
      isPendingProfileStatus(
        expertProfileStatus,
        legacyStatus
      )
    ) {
      if (isExpertSetupPage || isExpertEditPage) {
        return children;
      }

      return (
        <Navigate
          to={ROUTES.EXPERT_SETUP}
          replace
        />
      );
    }

    if (
      isRejectedProfileStatus(
        expertProfileStatus
      )
    ) {
      if (isExpertEditPage || isExpertSetupPage) {
        return children;
      }

      return (
        <Navigate
          to={ROUTES.EXPERT_EDIT}
          replace
        />
      );
    }

    if (
      isApprovedProfileStatus(
        expertProfileStatus
      ) &&
      isExpertProfileReviewPage &&
      !isExpertLockedPage
    ) {
      return (
        <Navigate
          to={ROUTES.EXPERT_DASHBOARD}
          replace
        />
      );
    }
  }

  if (
    role === "ADMIN" &&
    legacyStatus === "PENDING_PROFILE"
  ) {
    return (
      <Navigate
        to={ROUTES.ADMIN_DASHBOARD}
        replace
      />
    );
  }

  const normalizedRoles = Array.isArray(allowedRoles)
    ? allowedRoles
        .map(normalizeStatus)
        .filter(Boolean)
    : [];

  if (
    normalizedRoles.length > 0 &&
    !normalizedRoles.includes(role)
  ) {
    if (role === "CLIENT") {
      return (
        <Navigate
          to={ROUTES.CLIENT_DASHBOARD}
          replace
        />
      );
    }

    if (role === "EXPERT") {
      return (
        <Navigate
          to={ROUTES.EXPERT_DASHBOARD}
          replace
        />
      );
    }

    if (role === "ADMIN") {
      return (
        <Navigate
          to={ROUTES.ADMIN_DASHBOARD}
          replace
        />
      );
    }

    return (
      <Navigate
        to={ROUTES.UNAUTHORIZED}
        replace
      />
    );
  }

  return children;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function isPendingProfileStatus(
  profileStatus,
  legacyStatus
) {
  return [
    "PENDING_PROFILE",
    "PROFILE_PENDING",
    "PENDING",
    "PENDING_REVIEW",
    "UNDER_REVIEW",
    "NOT_CREATED",
  ].includes(profileStatus || legacyStatus);
}

function isRejectedProfileStatus(profileStatus) {
  return [
    "REJECTED",
    "PROFILE_REJECTED",
    "NEEDS_CORRECTION",
    "REVISION_REQUIRED",
    "RESUBMIT_REQUIRED",
  ].includes(profileStatus);
}

function isExpertLockedStatus(
  profileStatus,
  legacyStatus
) {
  return [
    "EXPERT_PROFILE_LOCKED",
    "PROFILE_LOCKED",
    "LOCKED_FOR_REVIEW",
    "REVIEW_LOCKED",
  ].includes(profileStatus || legacyStatus);
}

function isApprovedProfileStatus(profileStatus) {
  return [
    "APPROVED",
    "ACTIVE",
    "VERIFIED",
  ].includes(profileStatus);
}