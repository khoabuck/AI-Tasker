import proposalCreditPackageApi from "../api/proposalCreditPackage.api";

const getValue = (...values) => {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return fallback;
};

const isInvalidId = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  );
};

const unwrapData = (response) => {
  const data = response?.data;

  if (!data) return null;

  if (data?.data?.item) return data.data.item;
  if (data?.data?.result) return data.data.result;
  if (data?.data?.package) return data.data.package;
  if (data?.data?.proposalCreditPackage) {
    return data.data.proposalCreditPackage;
  }
  if (data?.data?.purchase) return data.data.purchase;
  if (data?.data) return data.data;

  if (data?.item) return data.item;
  if (data?.result) return data.result;
  if (data?.package) return data.package;
  if (data?.proposalCreditPackage) return data.proposalCreditPackage;
  if (data?.purchase) return data.purchase;

  return data;
};

const unwrapListData = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.packages)) return data.packages;
  if (Array.isArray(data?.proposalCreditPackages)) {
    return data.proposalCreditPackages;
  }
  if (Array.isArray(data?.purchases)) return data.purchases;
  if (Array.isArray(data?.myPurchases)) return data.myPurchases;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.result)) return data.data.result;
  if (Array.isArray(data?.data?.packages)) return data.data.packages;
  if (Array.isArray(data?.data?.proposalCreditPackages)) {
    return data.data.proposalCreditPackages;
  }
  if (Array.isArray(data?.data?.purchases)) return data.data.purchases;
  if (Array.isArray(data?.data?.myPurchases)) return data.data.myPurchases;

  return [];
};

export const normalizeProposalCreditPackage = (item) => {
  if (!item) return null;

  const raw = item.raw || item.Raw || item;

  const packageId = getValue(
    item.packageId,
    item.PackageId,
    item.proposalCreditPackageId,
    item.ProposalCreditPackageId,
    item.id,
    item.Id,
    raw.packageId,
    raw.PackageId,
    raw.proposalCreditPackageId,
    raw.ProposalCreditPackageId,
    raw.id,
    raw.Id,
    ""
  );

  const packageName = getValue(
    item.packageName,
    item.PackageName,
    item.name,
    item.Name,
    item.title,
    item.Title,
    raw.packageName,
    raw.PackageName,
    raw.name,
    raw.Name,
    raw.title,
    raw.Title,
    "Proposal Credit Package"
  );

  const proposalCredits = toNumber(
    getValue(
      item.proposalCredits,
      item.ProposalCredits,
      item.proposalSubmitCredits,
      item.ProposalSubmitCredits,
      item.availableProposalSubmitCredits,
      item.AvailableProposalSubmitCredits,
      item.credits,
      item.Credits,
      item.creditAmount,
      item.CreditAmount,
      item.submitCredits,
      item.SubmitCredits,
      item.numberOfCredits,
      item.NumberOfCredits,

      raw.proposalCredits,
      raw.ProposalCredits,
      raw.proposalSubmitCredits,
      raw.ProposalSubmitCredits,
      raw.availableProposalSubmitCredits,
      raw.AvailableProposalSubmitCredits,
      raw.credits,
      raw.Credits,
      raw.creditAmount,
      raw.CreditAmount,
      raw.submitCredits,
      raw.SubmitCredits,
      raw.numberOfCredits,
      raw.NumberOfCredits,
      0
    ),
    0
  );

  const price = toNumber(
    getValue(
      item.price,
      item.Price,
      item.amount,
      item.Amount,
      item.packagePrice,
      item.PackagePrice,
      raw.price,
      raw.Price,
      raw.amount,
      raw.Amount,
      raw.packagePrice,
      raw.PackagePrice,
      0
    ),
    0
  );

  const isActive = toBoolean(
    getValue(
      item.isActive,
      item.IsActive,
      item.active,
      item.Active,
      raw.isActive,
      raw.IsActive,
      raw.active,
      raw.Active,
      true
    ),
    true
  );

  return {
    packageId,
    id: packageId,

    packageName,

    description: getValue(
      item.description,
      item.Description,
      raw.description,
      raw.Description,
      ""
    ),

    proposalCredits,
    credits: proposalCredits,
    proposalSubmitCredits: proposalCredits,

    price,
    currency: getValue(
      item.currency,
      item.Currency,
      raw.currency,
      raw.Currency,
      "VND"
    ),

    isActive,

    isPopular: toBoolean(
      getValue(
        item.isPopular,
        item.IsPopular,
        item.popular,
        item.Popular,
        raw.isPopular,
        raw.IsPopular,
        raw.popular,
        raw.Popular,
        false
      ),
      false
    ),

    displayOrder: toNumber(
      getValue(
        item.displayOrder,
        item.DisplayOrder,
        raw.displayOrder,
        raw.DisplayOrder,
        0
      ),
      0
    ),

    createdAt: getValue(
      item.createdAt,
      item.CreatedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    updatedAt: getValue(
      item.updatedAt,
      item.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),

    raw: item,
  };
};

export const normalizeProposalCreditPurchase = (item) => {
  if (!item) return null;

  const raw = item.raw || item.Raw || item;

  const nestedPackage = getValue(
    item.package,
    item.Package,
    item.proposalCreditPackage,
    item.ProposalCreditPackage,
    raw.package,
    raw.Package,
    raw.proposalCreditPackage,
    raw.ProposalCreditPackage,
    null
  );

  const normalizedPackage = nestedPackage
    ? normalizeProposalCreditPackage(nestedPackage)
    : null;

  const purchaseId = getValue(
    item.purchaseId,
    item.PurchaseId,
    item.packagePurchaseId,
    item.PackagePurchaseId,
    item.proposalCreditPackagePurchaseId,
    item.ProposalCreditPackagePurchaseId,
    item.id,
    item.Id,
    raw.purchaseId,
    raw.PurchaseId,
    raw.packagePurchaseId,
    raw.PackagePurchaseId,
    raw.proposalCreditPackagePurchaseId,
    raw.ProposalCreditPackagePurchaseId,
    raw.id,
    raw.Id,
    ""
  );

  const packageId = getValue(
    item.packageId,
    item.PackageId,
    item.proposalCreditPackageId,
    item.ProposalCreditPackageId,
    normalizedPackage?.packageId,
    raw.packageId,
    raw.PackageId,
    raw.proposalCreditPackageId,
    raw.ProposalCreditPackageId,
    ""
  );

  const packageName = getValue(
    item.packageName,
    item.PackageName,
    item.name,
    item.Name,
    normalizedPackage?.packageName,
    raw.packageName,
    raw.PackageName,
    raw.name,
    raw.Name,
    "Proposal Credit Package"
  );

  const proposalCredits = toNumber(
    getValue(
      item.proposalCredits,
      item.ProposalCredits,
      item.proposalSubmitCredits,
      item.ProposalSubmitCredits,
      item.credits,
      item.Credits,
      item.creditAmount,
      item.CreditAmount,
      normalizedPackage?.proposalCredits,

      raw.proposalCredits,
      raw.ProposalCredits,
      raw.proposalSubmitCredits,
      raw.ProposalSubmitCredits,
      raw.credits,
      raw.Credits,
      raw.creditAmount,
      raw.CreditAmount,
      0
    ),
    0
  );

  const price = toNumber(
    getValue(
      item.price,
      item.Price,
      item.amount,
      item.Amount,
      normalizedPackage?.price,
      raw.price,
      raw.Price,
      raw.amount,
      raw.Amount,
      0
    ),
    0
  );

  return {
    purchaseId,
    id: purchaseId,

    packageId,
    packageName,

    proposalCredits,
    credits: proposalCredits,
    proposalSubmitCredits: proposalCredits,

    price,
    amount: price,

    currency: getValue(
      item.currency,
      item.Currency,
      normalizedPackage?.currency,
      raw.currency,
      raw.Currency,
      "VND"
    ),

    status: String(
      getValue(item.status, item.Status, raw.status, raw.Status, "SUCCESS")
    ).toUpperCase(),

    purchasedAt: getValue(
      item.purchasedAt,
      item.PurchasedAt,
      item.createdAt,
      item.CreatedAt,
      raw.purchasedAt,
      raw.PurchasedAt,
      raw.createdAt,
      raw.CreatedAt,
      ""
    ),

    expiredAt: getValue(
      item.expiredAt,
      item.ExpiredAt,
      item.expiresAt,
      item.ExpiresAt,
      raw.expiredAt,
      raw.ExpiredAt,
      raw.expiresAt,
      raw.ExpiresAt,
      ""
    ),

    raw: item,
  };
};

export const normalizeProposalCredits = (item) => {
  if (item === undefined || item === null) {
    return {
      remainingCredits: 0,
      availableCredits: 0,
      availableProposalSubmitCredits: 0,
      totalPurchasedCredits: 0,
      usedCredits: 0,
      freeSubmitUsed: false,
      freeSubmitEnabled: true,
      freeSubmitRemaining: 0,
      freeSubmitsRemaining: 0,
      canSubmitNewProposal: false,
      reason: "",
      raw: null,
    };
  }

  if (typeof item === "number") {
    return {
      remainingCredits: item,
      availableCredits: item,
      availableProposalSubmitCredits: item,
      totalPurchasedCredits: item,
      usedCredits: 0,
      freeSubmitUsed: false,
      freeSubmitEnabled: item > 0,
      freeSubmitRemaining: 0,
      freeSubmitsRemaining: 0,
      canSubmitNewProposal: item > 0,
      reason: "",
      raw: item,
    };
  }

  const raw = item.raw || item.Raw || item;

  const availableProposalSubmitCredits = toNumber(
    getValue(
      item.availableProposalSubmitCredits,
      item.AvailableProposalSubmitCredits,
      item.remainingProposalSubmitCredits,
      item.RemainingProposalSubmitCredits,
      item.proposalSubmitCredits,
      item.ProposalSubmitCredits,
      item.remainingCredits,
      item.RemainingCredits,
      item.availableCredits,
      item.AvailableCredits,
      item.proposalCredits,
      item.ProposalCredits,
      item.creditBalance,
      item.CreditBalance,
      item.proposalCreditBalance,
      item.ProposalCreditBalance,
      item.credits,
      item.Credits,
      item.balance,
      item.Balance,

      raw.availableProposalSubmitCredits,
      raw.AvailableProposalSubmitCredits,
      raw.remainingProposalSubmitCredits,
      raw.RemainingProposalSubmitCredits,
      raw.proposalSubmitCredits,
      raw.ProposalSubmitCredits,
      raw.remainingCredits,
      raw.RemainingCredits,
      raw.availableCredits,
      raw.AvailableCredits,
      raw.proposalCredits,
      raw.ProposalCredits,
      raw.creditBalance,
      raw.CreditBalance,
      raw.proposalCreditBalance,
      raw.ProposalCreditBalance,
      raw.credits,
      raw.Credits,
      raw.balance,
      raw.Balance,
      0
    ),
    0
  );

  const freeSubmitRemaining = toNumber(
    getValue(
      item.freeSubmitRemaining,
      item.FreeSubmitRemaining,
      item.freeSubmitsRemaining,
      item.FreeSubmitsRemaining,
      item.remainingFreeSubmits,
      item.RemainingFreeSubmits,
      item.freeSubmissionsLeft,
      item.FreeSubmissionsLeft,
      item.freeSubmitsLeft,
      item.FreeSubmitsLeft,

      raw.freeSubmitRemaining,
      raw.FreeSubmitRemaining,
      raw.freeSubmitsRemaining,
      raw.FreeSubmitsRemaining,
      raw.remainingFreeSubmits,
      raw.RemainingFreeSubmits,
      raw.freeSubmissionsLeft,
      raw.FreeSubmissionsLeft,
      raw.freeSubmitsLeft,
      raw.FreeSubmitsLeft,
      0
    ),
    0
  );

  const freeSubmitUsed = toBoolean(
    getValue(
      item.freeSubmitUsed,
      item.FreeSubmitUsed,
      raw.freeSubmitUsed,
      raw.FreeSubmitUsed,
      freeSubmitRemaining <= 0
    ),
    freeSubmitRemaining <= 0
  );

  const canSubmitNewProposal = toBoolean(
    getValue(
      item.canSubmitNewProposal,
      item.CanSubmitNewProposal,
      raw.canSubmitNewProposal,
      raw.CanSubmitNewProposal,
      availableProposalSubmitCredits > 0 || freeSubmitRemaining > 0
    ),
    availableProposalSubmitCredits > 0 || freeSubmitRemaining > 0
  );

  const usedCredits = toNumber(
    getValue(
      item.usedCredits,
      item.UsedCredits,
      item.usedProposalCredits,
      item.UsedProposalCredits,
      item.consumedCredits,
      item.ConsumedCredits,

      raw.usedCredits,
      raw.UsedCredits,
      raw.usedProposalCredits,
      raw.UsedProposalCredits,
      raw.consumedCredits,
      raw.ConsumedCredits,
      0
    ),
    0
  );

  const totalPurchasedCredits = toNumber(
    getValue(
      item.totalPurchasedCredits,
      item.TotalPurchasedCredits,
      item.purchasedCredits,
      item.PurchasedCredits,
      item.totalCredits,
      item.TotalCredits,
      item.totalProposalCredits,
      item.TotalProposalCredits,

      raw.totalPurchasedCredits,
      raw.TotalPurchasedCredits,
      raw.purchasedCredits,
      raw.PurchasedCredits,
      raw.totalCredits,
      raw.TotalCredits,
      raw.totalProposalCredits,
      raw.TotalProposalCredits,
      availableProposalSubmitCredits + usedCredits
    ),
    availableProposalSubmitCredits + usedCredits
  );

  return {
    expertProfileId: getValue(
      item.expertProfileId,
      item.ExpertProfileId,
      raw.expertProfileId,
      raw.ExpertProfileId,
      ""
    ),

    remainingCredits: availableProposalSubmitCredits,
    availableCredits: availableProposalSubmitCredits,
    availableProposalSubmitCredits,

    totalPurchasedCredits,
    usedCredits,

    freeSubmitUsed,
    freeSubmitEnabled: freeSubmitRemaining > 0,
    freeSubmitRemaining,
    freeSubmitsRemaining: freeSubmitRemaining,

    canSubmitNewProposal,

    reason: getValue(item.reason, item.Reason, raw.reason, raw.Reason, ""),

    updatedAt: getValue(
      item.updatedAt,
      item.UpdatedAt,
      raw.updatedAt,
      raw.UpdatedAt,
      ""
    ),

    raw: item,
  };
};

const sortPackages = (packages) => {
  return [...packages].sort((a, b) => {
    const orderA = Number(a.displayOrder || 0);
    const orderB = Number(b.displayOrder || 0);

    if (orderA !== orderB) return orderA - orderB;

    return Number(a.price || 0) - Number(b.price || 0);
  });
};

const sortPurchases = (purchases) => {
  return [...purchases].sort((a, b) => {
    const dateA = new Date(a.purchasedAt || 0).getTime();
    const dateB = new Date(b.purchasedAt || 0).getTime();

    return dateB - dateA;
  });
};

const proposalCreditPackageService = {
  async getPackages() {
    const response = await proposalCreditPackageApi.getPackages();

    return sortPackages(
      unwrapListData(response)
        .map(normalizeProposalCreditPackage)
        .filter(Boolean)
    );
  },

  async getPackagesForMe() {
    const response = await proposalCreditPackageApi.getPackagesForMe();

    return sortPackages(
      unwrapListData(response)
        .map(normalizeProposalCreditPackage)
        .filter(Boolean)
    );
  },

  async getAvailablePackages() {
    try {
      return await this.getPackagesForMe();
    } catch {
      return this.getPackages();
    }
  },

  async purchasePackage(packageId) {
    if (isInvalidId(packageId)) {
      throw new Error("Invalid package id.");
    }

    const response = await proposalCreditPackageApi.purchasePackage(packageId);
    return unwrapData(response);
  },

  async getMyPurchases() {
    const response = await proposalCreditPackageApi.getMyPurchases();

    return sortPurchases(
      unwrapListData(response)
        .map(normalizeProposalCreditPurchase)
        .filter(Boolean)
    );
  },

  async getMyProposalCredits() {
    const response = await proposalCreditPackageApi.getMyProposalCredits();
    return normalizeProposalCredits(unwrapData(response));
  },
};

export default proposalCreditPackageService;