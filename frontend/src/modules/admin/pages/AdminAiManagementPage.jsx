import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import adminAiManagementService from "../../../services/adminAiManagement.service";

const EMPTY_SETTINGS_FORM = {
  model: "",
  isEnabled: true,
  jobAssistantMaxTokens: "3000",
  expertSkillMaxTokens: "1500",
  profileReviewMaxTokens: "2000",
  skillValidatorMaxTokens: "1200",
  temperature: "0.1",
  jsonObjectResponse: true,
  monthlyTokenLimit: "1000000",
  monthlyRequestLimit: "50000",
  dailyRequestLimitPerUser: "50",
  reason: "",
};

const EMPTY_MODEL_FORM = {
  model: "",
  displayName: "",
  isEnabled: true,
  supportsJsonObjectResponse: true,
  maxOutputTokens: "4096",
  notes: "",
  reason: "",
};

const EMPTY_TEST_FORM = {
  model: "",
  message: "",
  jsonObjectResponse: true,
  maxTokens: "1000",
  temperature: "0.1",
};

const TABS = [
  { key: "SETTINGS", label: "AI Settings", icon: "tune" },
  { key: "MODELS", label: "Allowed Models", icon: "view_module" },
  { key: "TEST", label: "Test AI", icon: "science" },
  { key: "USAGE", label: "Usage Monitor", icon: "monitoring" },
];

const SETTINGS_NUMBER_FIELDS = [
  "jobAssistantMaxTokens",
  "expertSkillMaxTokens",
  "profileReviewMaxTokens",
  "skillValidatorMaxTokens",
  "monthlyTokenLimit",
  "monthlyRequestLimit",
  "dailyRequestLimitPerUser",
];

export default function AdminAiManagementPage() {
  const [activeTab, setActiveTab] = useState("SETTINGS");

  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState(EMPTY_SETTINGS_FORM);
  const [settingsErrors, setSettingsErrors] = useState({});

  const [models, setModels] = useState([]);
  const [modelForm, setModelForm] = useState(EMPTY_MODEL_FORM);
  const [modelErrors, setModelErrors] = useState({});
  const [modelModalError, setModelModalError] = useState("");
  const [editingModel, setEditingModel] = useState(null);
  const [showModelModal, setShowModelModal] = useState(false);

  const [testForm, setTestForm] = useState(EMPTY_TEST_FORM);
  const [testErrors, setTestErrors] = useState({});
  const [testResult, setTestResult] = useState(null);

  const [usageDays, setUsageDays] = useState("30");
  const [usageSummary, setUsageSummary] = useState(null);
  const [usageByFeature, setUsageByFeature] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [testing, setTesting] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const enabledModels = useMemo(() => {
    return models.filter((item) => item.isEnabled);
  }, [models]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setSettingsErrors({});
      setTestErrors({});

      const days = normalizePositiveInteger(usageDays, 30);

      const [
        settingsResult,
        modelsResult,
        summaryResult,
        featureResult,
        logsResult,
      ] = await Promise.allSettled([
        adminAiManagementService.getSettings(),
        adminAiManagementService.getModels(),
        adminAiManagementService.getUsageSummary(days),
        adminAiManagementService.getUsageByFeature(days),
        adminAiManagementService.getUsageLogs(100, days),
      ]);

      const loadedSettings =
        settingsResult.status === "fulfilled" ? settingsResult.value : null;

      if (settingsResult.status === "fulfilled") {
        applySettings(settingsResult.value);
      }

      if (modelsResult.status === "fulfilled") {
        const list = Array.isArray(modelsResult.value) ? modelsResult.value : [];
        setModels(list);
        syncTestModel(list, loadedSettings);
      }

      if (summaryResult.status === "fulfilled") {
        setUsageSummary(summaryResult.value);
      }

      if (featureResult.status === "fulfilled") {
        setUsageByFeature(
          Array.isArray(featureResult.value) ? featureResult.value : []
        );
      }

      if (logsResult.status === "fulfilled") {
        setUsageLogs(Array.isArray(logsResult.value) ? logsResult.value : []);
      }

      const failed = [
        settingsResult.status === "rejected" ? "settings" : "",
        modelsResult.status === "rejected" ? "models" : "",
        summaryResult.status === "rejected" ? "usage summary" : "",
        featureResult.status === "rejected" ? "usage by feature" : "",
        logsResult.status === "rejected" ? "usage logs" : "",
      ].filter(Boolean);

      if (failed.length > 0) {
        setError(
          `Some AI management sections could not be loaded: ${failed.join(
            ", "
          )}.`
        );
      }
    } catch (err) {
      console.error("LOAD AI MANAGEMENT ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load AI management data."));
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (data) => {
    setSettings(data || null);

    setSettingsForm({
      model: data?.model || "",
      isEnabled: data?.isEnabled ?? true,
      jobAssistantMaxTokens: String(data?.jobAssistantMaxTokens ?? 3000),
      expertSkillMaxTokens: String(data?.expertSkillMaxTokens ?? 1500),
      profileReviewMaxTokens: String(data?.profileReviewMaxTokens ?? 2000),
      skillValidatorMaxTokens: String(data?.skillValidatorMaxTokens ?? 1200),
      temperature: String(data?.temperature ?? 0.1),
      jsonObjectResponse: data?.jsonObjectResponse ?? true,
      monthlyTokenLimit: String(data?.monthlyTokenLimit ?? 1000000),
      monthlyRequestLimit: String(data?.monthlyRequestLimit ?? 50000),
      dailyRequestLimitPerUser: String(data?.dailyRequestLimitPerUser ?? 50),
      reason: "",
    });
  };

  const syncTestModel = (modelList, currentSettings) => {
    const currentModel = currentSettings?.model;
    const firstModel =
      modelList.find((item) => item.isEnabled)?.model ||
      modelList[0]?.model ||
      "";

    setTestForm((prev) => ({
      ...prev,
      model: prev.model || currentModel || firstModel,
    }));
  };

  const loadUsage = async () => {
    try {
      const daysText = String(usageDays ?? "").trim();

      if (!daysText) {
        setError("Days is required.");
        return;
      }

      if (!/^\d+$/.test(daysText) || Number(daysText) <= 0) {
        setError("Days must be a whole number greater than 0.");
        return;
      }

      setUsageLoading(true);
      setError("");
      setSuccess("");

      const days = Number(daysText);

      const [summary, byFeature, logs] = await Promise.all([
        adminAiManagementService.getUsageSummary(days),
        adminAiManagementService.getUsageByFeature(days),
        adminAiManagementService.getUsageLogs(100, days),
      ]);

      setUsageSummary(summary);
      setUsageByFeature(Array.isArray(byFeature) ? byFeature : []);
      setUsageLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error("LOAD AI USAGE ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot load AI usage data."));
    } finally {
      setUsageLoading(false);
    }
  };

  const updateSettingsField = (name, value) => {
    setError("");
    setSuccess("");
    setSettingsErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setSettingsForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateModelField = (name, value) => {
    setModelModalError("");
    setModelErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setModelForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateTestField = (name, value) => {
    setError("");
    setSuccess("");
    setTestErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setTestForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveSettings = async () => {
    const validation = validateSettings(settingsForm);

    if (!validation.valid) {
      setSettingsErrors(validation.errors);
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      setSavingSettings(true);
      setError("");
      setSuccess("");
      setSettingsErrors({});

      const payload = buildSettingsPayload(settingsForm);
      const updated = await adminAiManagementService.updateSettings(payload);

      applySettings(
        updated || {
          ...settings,
          ...payload,
          reason: "",
        }
      );

      setSuccess("AI settings have been updated successfully.");
      await loadInitialData();
    } catch (err) {
      console.error("SAVE AI SETTINGS ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot save AI settings."));
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreateModelModal = () => {
    setEditingModel(null);
    setModelForm(EMPTY_MODEL_FORM);
    setModelErrors({});
    setModelModalError("");
    setShowModelModal(true);
    setError("");
    setSuccess("");
  };

  const openEditModelModal = (model) => {
    setEditingModel(model);
    setModelForm({
      model: model?.model || "",
      displayName: model?.displayName || "",
      isEnabled: model?.isEnabled ?? true,
      supportsJsonObjectResponse: model?.supportsJsonObjectResponse ?? true,
      maxOutputTokens: String(model?.maxOutputTokens ?? 4096),
      notes: model?.notes || "",
      reason: "",
    });
    setModelErrors({});
    setModelModalError("");
    setShowModelModal(true);
    setError("");
    setSuccess("");
  };

  const closeModelModal = () => {
    if (savingModel) return;

    setShowModelModal(false);
    setEditingModel(null);
    setModelForm(EMPTY_MODEL_FORM);
    setModelErrors({});
    setModelModalError("");
  };

  const handleSaveModel = async () => {
    const validation = validateModel(modelForm, Boolean(editingModel));

    if (!validation.valid) {
      setModelErrors(validation.errors);
      setModelModalError("Please fix the highlighted fields.");
      return;
    }

    try {
      setSavingModel(true);
      setModelModalError("");
      setModelErrors({});
      setError("");
      setSuccess("");

      const payload = buildModelPayload(modelForm);

      if (editingModel) {
        await adminAiManagementService.updateModel(
          editingModel.aiAllowedModelId,
          payload
        );
        setSuccess("AI model has been updated successfully.");
      } else {
        await adminAiManagementService.createModel(payload);
        setSuccess("AI model has been created successfully.");
      }

      closeModelModal();

      const updatedModels = await adminAiManagementService.getModels();
      setModels(Array.isArray(updatedModels) ? updatedModels : []);
    } catch (err) {
      console.error("SAVE AI MODEL ERROR:", err?.response?.data || err);
      setModelModalError(getFriendlyError(err, "Cannot save AI model."));
    } finally {
      setSavingModel(false);
    }
  };

  const handleTestAi = async () => {
    const validation = validateTest(testForm);

    if (!validation.valid) {
      setTestErrors(validation.errors);
      setError("Please fix the highlighted fields before running the test.");
      return;
    }

    try {
      setTesting(true);
      setError("");
      setSuccess("");
      setTestErrors({});
      setTestResult(null);

      const result = await adminAiManagementService.testAi(buildTestPayload(testForm));

      setTestResult(result);
      setSuccess("AI test completed.");
      await loadUsage();
    } catch (err) {
      console.error("TEST AI ERROR:", err?.response?.data || err);
      setError(getFriendlyError(err, "Cannot test AI model."));
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00F0FF]">
              Admin AI Management
            </p>

            <h1 className="text-3xl font-bold text-white md:text-4xl">
              AI control center
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Manage global AI settings, allowed models, test model responses,
              and monitor token usage across the platform.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInitialData}
            disabled={loading || savingSettings || savingModel || testing}
            className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <Alert
            type="danger"
            title="Please check your input"
            message={error}
            onClose={() => setError("")}
          />
        )}

        {success && (
          <Alert
            type="success"
            title="Success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-12 text-center text-gray-400">
            <span className="material-symbols-outlined mb-3 block text-4xl text-[#00F0FF]">
              hourglass_empty
            </span>
            Loading AI management...
          </div>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon="smart_toy"
                label="AI Status"
                value={settingsForm.isEnabled ? "Enabled" : "Disabled"}
                description={settings?.provider || "Global AI availability"}
                tone={settingsForm.isEnabled ? "green" : "red"}
              />

              <StatCard
                icon="memory"
                label="Current Model"
                value={settingsForm.model || "N/A"}
                description="Primary model for AI features"
                tone="cyan"
              />

              <StatCard
                icon="token"
                label="Monthly Tokens"
                value={formatNumber(usageSummary?.totalTokens || 0)}
                description={`${formatPercent(
                  usageSummary?.tokenUsagePercent
                )} used`}
                tone="purple"
              />

              <StatCard
                icon="receipt_long"
                label="Requests"
                value={formatNumber(usageSummary?.totalRequests || 0)}
                description={`${formatNumber(
                  usageSummary?.successfulRequests || 0
                )} success · ${formatNumber(
                  usageSummary?.failedRequests || 0
                )} failed`}
                tone="yellow"
              />
            </section>

            <section className="mb-6 rounded-2xl border border-white/10 bg-[#151a22]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setError("");
                      setSuccess("");
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                      activeTab === tab.key
                        ? "bg-cyan-400 text-black"
                        : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "SETTINGS" && (
              <SettingsTab
                form={settingsForm}
                errors={settingsErrors}
                models={enabledModels}
                saving={savingSettings}
                onChange={updateSettingsField}
                onSave={handleSaveSettings}
              />
            )}

            {activeTab === "MODELS" && (
              <ModelsTab
                models={models}
                onCreate={openCreateModelModal}
                onEdit={openEditModelModal}
              />
            )}

            {activeTab === "TEST" && (
              <TestTab
                form={testForm}
                errors={testErrors}
                models={models}
                result={testResult}
                testing={testing}
                onChange={updateTestField}
                onTest={handleTestAi}
              />
            )}

            {activeTab === "USAGE" && (
              <UsageTab
                days={usageDays}
                summary={usageSummary}
                byFeature={usageByFeature}
                logs={usageLogs}
                loading={usageLoading}
                onDaysChange={setUsageDays}
                onReload={loadUsage}
              />
            )}
          </>
        )}

        {showModelModal && (
          <ModelModal
            title={editingModel ? "Edit AI Model" : "Create AI Model"}
            form={modelForm}
            errors={modelErrors}
            modalError={modelModalError}
            isEdit={Boolean(editingModel)}
            loading={savingModel}
            onChange={updateModelField}
            onClose={closeModelModal}
            onSave={handleSaveModel}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function SettingsTab({ form, errors, models, saving, onChange, onSave }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">AI Settings</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">
            Configure the default model, response mode, token budgets, and
            request limits used by AI features.
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <FormSection
        icon="memory"
        title="Model Settings"
        description="Choose the default model and response format."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SelectInput
            label="Current Model"
            required
            value={form.model}
            error={errors.model}
            onChange={(value) => onChange("model", value)}
            options={models.map((item) => ({
              value: item.model,
              label: `${item.displayName || item.model} (${item.model})`,
            }))}
          />

          <SwitchInput
            label="AI Enabled"
            value={form.isEnabled}
            onChange={(value) => onChange("isEnabled", value)}
          />

          <SwitchInput
            label="JSON Object Response"
            value={form.jsonObjectResponse}
            onChange={(value) => onChange("jsonObjectResponse", value)}
          />
        </div>
      </FormSection>

      <FormSection
        icon="token"
        title="Token Limits"
        description="Set the maximum output token budget for each AI feature."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <NumberInput
            label="Job Assistant Max Tokens"
            required
            value={form.jobAssistantMaxTokens}
            error={errors.jobAssistantMaxTokens}
            onChange={(value) => onChange("jobAssistantMaxTokens", value)}
          />

          <NumberInput
            label="Expert Skill Max Tokens"
            required
            value={form.expertSkillMaxTokens}
            error={errors.expertSkillMaxTokens}
            onChange={(value) => onChange("expertSkillMaxTokens", value)}
          />

          <NumberInput
            label="Profile Review Max Tokens"
            required
            value={form.profileReviewMaxTokens}
            error={errors.profileReviewMaxTokens}
            onChange={(value) => onChange("profileReviewMaxTokens", value)}
          />

          <NumberInput
            label="Skill Validator Max Tokens"
            required
            value={form.skillValidatorMaxTokens}
            error={errors.skillValidatorMaxTokens}
            onChange={(value) => onChange("skillValidatorMaxTokens", value)}
          />

          <NumberInput
            label="Temperature"
            required
            value={form.temperature}
            error={errors.temperature}
            helper="Allowed range: 0 to 2."
            onChange={(value) => onChange("temperature", value)}
          />
        </div>
      </FormSection>

      <FormSection
        icon="speed"
        title="Request Limits"
        description="Control monthly and daily usage limits."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <NumberInput
            label="Daily Request Limit / User"
            required
            value={form.dailyRequestLimitPerUser}
            error={errors.dailyRequestLimitPerUser}
            onChange={(value) => onChange("dailyRequestLimitPerUser", value)}
          />

          <NumberInput
            label="Monthly Token Limit"
            required
            value={form.monthlyTokenLimit}
            error={errors.monthlyTokenLimit}
            onChange={(value) => onChange("monthlyTokenLimit", value)}
          />

          <NumberInput
            label="Monthly Request Limit"
            required
            value={form.monthlyRequestLimit}
            error={errors.monthlyRequestLimit}
            onChange={(value) => onChange("monthlyRequestLimit", value)}
          />
        </div>
      </FormSection>

      <TextArea
        label="Reason"
        required
        value={form.reason}
        error={errors.reason}
        rows={3}
        onChange={(value) => onChange("reason", value)}
        placeholder="Example: Update model and request limits for production."
      />
    </section>
  );
}
function ModelsTab({ models, onCreate, onEdit }) {
  const enabledCount = models.filter((item) => item.isEnabled).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Allowed Models</h2>
          <p className="mt-1 text-sm text-gray-500">
            {enabledCount} active of {models.length} configured model(s).
          </p>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className="w-fit rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black"
        >
          Create Model
        </button>
      </div>

      {models.length === 0 ? (
        <EmptyState
          icon="smart_toy"
          title="No models found"
          description="Create at least one allowed AI model before enabling AI features."
        />
      ) : (
        <div className="divide-y divide-white/10">
          {models.map((item) => (
            <article
              key={item.aiAllowedModelId || item.model}
              className="p-5 transition hover:bg-white/[0.02]"
            >
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_180px_180px_150px] xl:items-center">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge active={item.isEnabled} />
                    <Badge label={item.provider || "Provider"} />
                    <Badge label={`ID #${item.aiAllowedModelId || "N/A"}`} />
                  </div>

                  <h3 className="font-bold text-white">
                    {item.displayName || item.model}
                  </h3>

                  <p className="mt-1 break-all text-sm text-cyan-300">
                    {item.model}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                    {item.notes || "No notes provided."}
                  </p>
                </div>

                <InfoBlock
                  label="JSON Response"
                  value={
                    item.supportsJsonObjectResponse
                      ? "Supported"
                      : "Not supported"
                  }
                />

                <InfoBlock
                  label="Max Output Tokens"
                  value={formatNumber(item.maxOutputTokens)}
                />

                <div className="xl:text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TestTab({ form, errors, models, result, testing, onChange, onTest }) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <h2 className="text-xl font-bold text-white">Test AI Model</h2>
        <p className="mt-1 text-sm text-gray-400">
          Send a controlled test prompt before using a model in production.
        </p>

        <div className="mt-5 space-y-5">
          <SelectInput
            label="Model"
            required
            value={form.model}
            error={errors.model}
            onChange={(value) => onChange("model", value)}
            options={models.map((item) => ({
              value: item.model,
              label: `${item.displayName || item.model} (${item.model})`,
            }))}
          />

          <TextArea
            label="Message"
            required
            value={form.message}
            error={errors.message}
            rows={6}
            onChange={(value) => onChange("message", value)}
            placeholder="Example: Generate a short JSON response with title and summary."
          />

          <SwitchInput
            label="JSON Object Response"
            value={form.jsonObjectResponse}
            onChange={(value) => onChange("jsonObjectResponse", value)}
          />

          <NumberInput
            label="Max Tokens"
            required
            value={form.maxTokens}
            error={errors.maxTokens}
            onChange={(value) => onChange("maxTokens", value)}
          />

          <NumberInput
            label="Temperature"
            required
            value={form.temperature}
            error={errors.temperature}
            helper="Allowed range: 0 to 2."
            onChange={(value) => onChange("temperature", value)}
          />

          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? "Testing..." : "Run Test"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-white">Test Result</h2>
          <p className="mt-1 text-sm text-gray-400">
            Response and metadata returned by the AI test endpoint.
          </p>
        </div>

        {!result ? (
          <EmptyState
            icon="science"
            title="No test result yet"
            description="Run a test to see the AI response here."
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MiniMetric
                label="Model"
                value={result.model || result.Model || form.model || "N/A"}
              />
              <MiniMetric
                label="Status"
                value={result.status || result.Status || "Completed"}
              />
              <MiniMetric
                label="Tokens"
                value={formatNumber(
                  result.totalTokens ||
                    result.TotalTokens ||
                    result.tokenCount ||
                    result.TokenCount ||
                    0
                )}
              />
            </div>

            <TestResultPanel result={result} form={form} />
          </div>
        )}
      </div>
    </section>
  );
}

function TestResultPanel({ result, form }) {
  const provider = result.provider || "N/A";
  const model = result.model || form.model;
  const status = result.status || "SUCCESS";

  const latency = result.latencyMs || 0;
  const totalTokens = result.totalTokens || 0;

  const content = extractAiContent(result);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#171d27] overflow-hidden">

        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-white">
              AI Test Result
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              Preview the response returned by the selected AI model.
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${getResultStatusClass(
              status
            )}`}
          >
            {status}
          </span>
        </div>

        <div className="p-6">

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">

            <div className="flex items-center gap-3 mb-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                <span className="material-symbols-outlined text-cyan-300">
                  smart_toy
                </span>
              </div>

              <div>
                <h4 className="font-bold text-white">
                  AI Response
                </h4>

                <p className="text-sm text-gray-500">
                  Generated content
                </p>
              </div>

            </div>

            <div className="rounded-xl bg-[#0f141c] border border-white/10 p-5">

              <p className="whitespace-pre-wrap leading-8 text-gray-200 text-[15px]">
                {content || "No response returned."}
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Provider
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {provider}
              </p>

            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                AI Model
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {model}
              </p>

            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Response Time
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {latency} ms
              </p>

            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Total Tokens Used
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {formatNumber(totalTokens)}
              </p>

            </div>

          </div>

          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4">

            <div className="flex items-center gap-3">

              <span className="material-symbols-outlined text-green-400">
                verified
              </span>

              <div>

                <p className="font-semibold text-green-300">
                  AI Test Completed Successfully
                </p>

                <p className="text-sm text-green-200/80">
                  The selected AI model is responding normally.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>
    </div>
  );
}

function UsageTab({
  days,
  summary,
  byFeature,
  logs,
  loading,
  onDaysChange,
  onReload,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Usage Monitor</h2>
            <p className="mt-1 text-sm text-gray-400">
              Monitor AI requests, token usage, failed calls, and estimated cost.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <NumberInput
              label="Days"
              required
              value={days}
              onChange={(value) => onDaysChange(value)}
            />

            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Reload Usage"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniMetric
            label="Total Requests"
            value={formatNumber(summary?.totalRequests)}
          />
          <MiniMetric
            label="Successful"
            value={formatNumber(summary?.successfulRequests)}
          />
          <MiniMetric
            label="Failed"
            value={formatNumber(summary?.failedRequests)}
          />
          <MiniMetric
            label="Total Tokens"
            value={formatNumber(summary?.totalTokens)}
          />
          <MiniMetric
            label="Prompt Tokens"
            value={formatNumber(summary?.totalPromptTokens)}
          />
          <MiniMetric
            label="Completion Tokens"
            value={formatNumber(summary?.totalCompletionTokens)}
          />
          <MiniMetric
            label="Token Usage"
            value={formatPercent(summary?.tokenUsagePercent)}
          />
          <MiniMetric
            label="Request Usage"
            value={formatPercent(summary?.requestUsagePercent)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <h2 className="text-xl font-bold text-white">Usage By Feature</h2>
        <p className="mt-1 text-sm text-gray-400">
          Breakdown of AI usage by system feature.
        </p>

        <div className="mt-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr>
                <Th>Feature</Th>
                <Th>Requests</Th>
                <Th>Success</Th>
                <Th>Failed</Th>
                <Th>Tokens</Th>
                <Th>Cost</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {byFeature.map((item) => (
                <tr key={item.feature}>
                  <Td>{item.feature}</Td>
                  <Td>{formatNumber(item.requests)}</Td>
                  <Td>{formatNumber(item.successfulRequests)}</Td>
                  <Td>{formatNumber(item.failedRequests)}</Td>
                  <Td>{formatNumber(item.totalTokens)}</Td>
                  <Td>{formatUsd(item.estimatedCostUsd)}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          {byFeature.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">
              No usage by feature data.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#151a22]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
        <h2 className="text-xl font-bold text-white">Recent AI Logs</h2>
        <p className="mt-1 text-sm text-gray-400">
          Latest AI calls and error details.
        </p>

        <div className="mt-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="min-w-[1100px] divide-y divide-white/10">
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Feature</Th>
                <Th>Model</Th>
                <Th>Status</Th>
                <Th>Tokens</Th>
                <Th>Error</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {logs.map((item) => (
                <tr key={item.aiUsageLogId}>
                  <Td>{formatDate(item.createdAt)}</Td>
                  <Td>{item.feature || "N/A"}</Td>
                  <Td>{item.model || "N/A"}</Td>
                  <Td>
                    <StatusText status={item.status} />
                  </Td>
                  <Td>{formatNumber(item.totalTokens)}</Td>
                  <Td>
                    <p className="max-w-[360px] whitespace-normal text-xs text-gray-400">
                      {item.errorCode || item.errorMessage
                        ? `${item.errorCode || ""} ${item.errorMessage || ""}`
                        : "-"}
                    </p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          {logs.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">
              No AI usage logs.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ModelModal({
  title,
  form,
  errors,
  modalError,
  isEdit,
  loading,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151a22] shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="mt-1 text-xs text-gray-400">
            Configure an allowed model for AI features.
          </p>
        </div>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {modalError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {modalError}
            </div>
          )}

          {!isEdit && (
            <TextInput
              label="Model"
              required
              value={form.model}
              error={errors.model}
              onChange={(value) => onChange("model", value)}
              placeholder="openai/gpt-oss-120b"
            />
          )}

          <TextInput
            label="Display Name"
            required
            value={form.displayName}
            error={errors.displayName}
            onChange={(value) => onChange("displayName", value)}
            placeholder="GPT OSS 120B"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SwitchInput
              label="Enabled"
              value={form.isEnabled}
              onChange={(value) => onChange("isEnabled", value)}
            />

            <SwitchInput
              label="Supports JSON Object Response"
              value={form.supportsJsonObjectResponse}
              onChange={(value) =>
                onChange("supportsJsonObjectResponse", value)
              }
            />

            <NumberInput
              label="Max Output Tokens"
              required
              value={form.maxOutputTokens}
              error={errors.maxOutputTokens}
              onChange={(value) => onChange("maxOutputTokens", value)}
            />
          </div>

          <TextArea
            label="Notes"
            value={form.notes}
            rows={3}
            onChange={(value) => onChange("notes", value)}
            placeholder="Recommended main model for JSON-heavy AI features."
          />

          <TextArea
            label="Reason"
            required
            value={form.reason}
            error={errors.reason}
            rows={3}
            onChange={(value) => onChange("reason", value)}
            placeholder="Example: Add new model for production testing."
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Model"}
          </button>
        </div>
      </div>
    </div>
  );
}
function FormSection({ icon, title, description, children }) {
  return (
    <section className="mb-8">
      <div className="mb-5 flex gap-3 border-b border-white/10 pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <span className="material-symbols-outlined">{icon}</span>
        </div>

        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function StatCard({ icon, label, value, description, tone = "cyan" }) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    green: "border-green-400/20 bg-green-400/10 text-green-300",
    red: "border-red-400/20 bg-red-400/10 text-red-300",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-300",
    yellow: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  };

  return (
    <div className="flex min-h-[165px] flex-col rounded-2xl border border-white/10 bg-[#151a22]/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${
          toneClass[tone] || toneClass.cyan
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-2xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-auto pt-3 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold text-white">
        {value || 0}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  required = false,
  error = "",
  helper = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-cyan-400/50 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      ) : (
        helper && <p className="mt-2 text-xs leading-5 text-gray-500">{helper}</p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full resize-none rounded-xl border bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      />

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
  required = false,
  error = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-xl border bg-[#0d1117] px-4 text-sm font-bold text-white outline-none ${
          error
            ? "border-red-400/70 focus:border-red-400"
            : "border-white/10 focus:border-cyan-400/50"
        }`}
      >
        <option value="">Select model</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

function SwitchInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </span>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-4 text-sm font-bold transition ${
          value
            ? "border-green-400/30 bg-green-400/10 text-green-300"
            : "border-red-400/30 bg-red-400/10 text-red-300"
        }`}
      >
        <span>{value ? "Enabled" : "Disabled"}</span>
        <span className="material-symbols-outlined text-[20px]">
          {value ? "toggle_on" : "toggle_off"}
        </span>
      </button>
    </label>
  );
}

function StatusBadge({ active }) {
  const className = active
    ? "border-green-400/30 bg-green-400/10 text-green-300"
    : "border-red-400/30 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${className}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StatusText({ status }) {
  const value = String(status || "").toUpperCase();

  const className =
    value === "SUCCESS"
      ? "text-green-300"
      : value === "FAILED"
      ? "text-red-300"
      : "text-gray-300";

  return <span className={`font-bold ${className}`}>{value || "N/A"}</span>;
}

function Badge({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-gray-400">
      {label}
    </span>
  );
}

function Alert({ type, title, message, onClose }) {
  const className =
    type === "success"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-red-500/30 bg-red-500/10 text-red-200";

  return (
    <div className={`mb-5 rounded-xl border px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold opacity-70 hover:opacity-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="p-10 text-center">
      <span className="material-symbols-outlined mb-3 block text-5xl text-gray-500">
        {icon}
      </span>

      <h3 className="text-lg font-bold text-white">{title}</h3>

      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-gray-500">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-4 py-3 text-sm text-gray-300">{children}</td>;
}

function validateSettings(form) {
  const errors = {};

  if (!String(form.model || "").trim()) {
    errors.model = "Current Model is required.";
  }

  SETTINGS_NUMBER_FIELDS.forEach((field) => {
    const value = String(form[field] ?? "").trim();

    if (!value) {
      errors[field] = `${formatLabel(field)} is required.`;
      return;
    }

    if (!/^\d+$/.test(value)) {
      errors[field] = `${formatLabel(field)} must be a whole number.`;
      return;
    }

    if (Number(value) <= 0) {
      errors[field] = `${formatLabel(field)} must be greater than 0.`;
    }
  });

  const temperature = String(form.temperature ?? "").trim();

  if (!temperature) {
    errors.temperature = "Temperature is required.";
  } else if (!/^\d+(\.\d+)?$/.test(temperature)) {
    errors.temperature = "Temperature must be a valid number.";
  } else if (Number(temperature) < 0 || Number(temperature) > 2) {
    errors.temperature = "Temperature must be between 0 and 2.";
  }

  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = "Reason is required.";
  } else if (reason.length < 10) {
    errors.reason = "Reason must be at least 10 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateModel(form, isEdit) {
  const errors = {};

  if (!isEdit && !String(form.model || "").trim()) {
    errors.model = "Model is required.";
  }

  if (!String(form.displayName || "").trim()) {
    errors.displayName = "Display Name is required.";
  }

  const maxOutputTokens = String(form.maxOutputTokens ?? "").trim();

  if (!maxOutputTokens) {
    errors.maxOutputTokens = "Max Output Tokens is required.";
  } else if (!/^\d+$/.test(maxOutputTokens)) {
    errors.maxOutputTokens = "Max Output Tokens must be a whole number.";
  } else if (Number(maxOutputTokens) <= 0) {
    errors.maxOutputTokens = "Max Output Tokens must be greater than 0.";
  }

  const reason = String(form.reason || "").trim();

  if (!reason) {
    errors.reason = "Reason is required.";
  } else if (reason.length < 10) {
    errors.reason = "Reason must be at least 10 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateTest(form) {
  const errors = {};

  if (!String(form.model || "").trim()) {
    errors.model = "Model is required.";
  }

  if (!String(form.message || "").trim()) {
    errors.message = "Message is required.";
  }

  const maxTokens = String(form.maxTokens ?? "").trim();

  if (!maxTokens) {
    errors.maxTokens = "Max Tokens is required.";
  } else if (!/^\d+$/.test(maxTokens)) {
    errors.maxTokens = "Max Tokens must be a whole number.";
  } else if (Number(maxTokens) <= 0) {
    errors.maxTokens = "Max Tokens must be greater than 0.";
  }

  const temperature = String(form.temperature ?? "").trim();

  if (!temperature) {
    errors.temperature = "Temperature is required.";
  } else if (!/^\d+(\.\d+)?$/.test(temperature)) {
    errors.temperature = "Temperature must be a valid number.";
  } else if (Number(temperature) < 0 || Number(temperature) > 2) {
    errors.temperature = "Temperature must be between 0 and 2.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function buildSettingsPayload(form) {
  return {
    model: String(form.model || "").trim(),
    isEnabled: Boolean(form.isEnabled),
    jobAssistantMaxTokens: Number(form.jobAssistantMaxTokens),
    expertSkillMaxTokens: Number(form.expertSkillMaxTokens),
    profileReviewMaxTokens: Number(form.profileReviewMaxTokens),
    skillValidatorMaxTokens: Number(form.skillValidatorMaxTokens),
    temperature: Number(form.temperature),
    jsonObjectResponse: Boolean(form.jsonObjectResponse),
    monthlyTokenLimit: Number(form.monthlyTokenLimit),
    monthlyRequestLimit: Number(form.monthlyRequestLimit),
    dailyRequestLimitPerUser: Number(form.dailyRequestLimitPerUser),
    reason: String(form.reason || "").trim(),
  };
}

function buildModelPayload(form) {
  return {
    model: String(form.model || "").trim(),
    displayName: String(form.displayName || "").trim(),
    isEnabled: Boolean(form.isEnabled),
    supportsJsonObjectResponse: Boolean(form.supportsJsonObjectResponse),
    maxOutputTokens: Number(form.maxOutputTokens),
    notes: String(form.notes || "").trim(),
    reason: String(form.reason || "").trim(),
  };
}

function buildTestPayload(form) {
  return {
    model: String(form.model || "").trim(),
    message: String(form.message || "").trim(),
    jsonObjectResponse: Boolean(form.jsonObjectResponse),
    maxTokens: Number(form.maxTokens),
    temperature: Number(form.temperature),
  };
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) return fallback;

  return number;
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(
    Number.isNaN(number) ? 0 : number
  );
}

function formatPercent(value) {
  const number = Number(value || 0);

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number.isNaN(number) ? 0 : number)}%`;
}

function formatUsd(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(Number.isNaN(number) ? 0 : number);
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("vi-VN");
}

function formatLabel(value) {
  if (!value) return "N/A";

  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFriendlyError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 401) return "Your session has expired. Please login again.";
  if (status === 403) return "You do not have permission to manage AI settings.";
  if (status === 404)
    return "AI management API was not found. Please check backend route.";

  const data = err?.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;

  if (data?.errors) {
    const allErrors = Object.values(data.errors).flat();
    if (allErrors.length > 0) return allErrors.join(" ");
  }

  return err?.message || fallback;
}

function extractAiContent(result) {
  const rawContent =
    result?.content ||
    result?.Content ||
    result?.response ||
    result?.Response ||
    result?.data ||
    result?.Data ||
    "";

  if (!rawContent) return "";

  if (typeof rawContent !== "string") {
    return JSON.stringify(rawContent, null, 2);
  }

  const trimmed = rawContent.trim();

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return trimmed;
  }
}

function getResultStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "SUCCESS" || value === "COMPLETED") {
    return "border-green-400/30 bg-green-400/10 text-green-300";
  }

  if (value === "FAILED" || value === "ERROR") {
    return "border-red-400/30 bg-red-400/10 text-red-300";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
}