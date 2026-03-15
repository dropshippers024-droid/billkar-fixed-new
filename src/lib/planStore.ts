export type PlanType = "free" | "pro" | "business";

const PLAN_KEY  = "billkar_plan";
const PLAN_EXPIRES_KEY = "billkar_plan_expires";
const TRIAL_KEY = "billkar_trial_start";

function getMonthKey(): string {
  const d = new Date();
  return `billkar_inv_${d.getFullYear()}_${d.getMonth() + 1}`;
}

export function getCurrentPlan(): PlanType {
  const plan = (localStorage.getItem(PLAN_KEY) as PlanType) || "free";
  if (plan !== "free") {
    const expires = localStorage.getItem(PLAN_EXPIRES_KEY);
    if (expires && new Date(expires) < new Date()) return "free";
  }
  return plan;
}

export function setCurrentPlan(plan: PlanType, expiresAt?: string | null): void {
  localStorage.setItem(PLAN_KEY, plan);
  if (expiresAt) {
    localStorage.setItem(PLAN_EXPIRES_KEY, expiresAt);
  } else {
    localStorage.removeItem(PLAN_EXPIRES_KEY);
  }
  window.dispatchEvent(new CustomEvent("billkar:plan-updated"));
}

export function syncPlanFromUser(user: { plan?: string; plan_expires_at?: string | null }): void {
  const plan = (user.plan as PlanType) || "free";
  setCurrentPlan(plan, user.plan_expires_at);
}

/** Fetch latest plan from server and update localStorage. Call on dashboard mount. */
export async function refreshPlan(): Promise<PlanType> {
  try {
    // Dynamic import to avoid circular dependency
    const { api } = await import("@/lib/api");
    await api.getMe();
    // api.getMe() already calls syncPlanFromUser internally
    return getCurrentPlan();
  } catch {
    return getCurrentPlan();
  }
}

// ── Trial ─────────────────────────────────────────────────────────────────

export function initTrial(): void {
  if (!localStorage.getItem(TRIAL_KEY)) {
    localStorage.setItem(TRIAL_KEY, new Date().toISOString());
  }
}

export function getTrialStart(): string | null {
  return localStorage.getItem(TRIAL_KEY);
}

export function getTrialDaysLeft(): number {
  const start = getTrialStart();
  if (!start) return 0;
  const elapsed = Date.now() - new Date(start).getTime();
  const days = 7 - Math.floor(elapsed / 86400000);
  return Math.max(0, days);
}

export function isTrialActive(): boolean {
  if (getCurrentPlan() !== "free") return false;
  const start = getTrialStart();
  if (!start) return false;
  return getTrialDaysLeft() > 0;
}

export function isTrialExpired(): boolean {
  const start = getTrialStart();
  if (!start) return false;
  return getTrialDaysLeft() <= 0 && getCurrentPlan() === "free";
}

// ── Invoice limits ─────────────────────────────────────────────────────────

export function getInvoiceCount(): number {
  return parseInt(localStorage.getItem(getMonthKey()) || "0", 10);
}

export function incrementInvoiceCount(): void {
  localStorage.setItem(getMonthKey(), String(getInvoiceCount() + 1));
}

export function getInvoiceLimit(): number {
  if (isTrialActive()) return Infinity;
  const plan = getCurrentPlan();
  return plan === "free" ? 50 : Infinity;
}

export function getRemainingInvoices(): number {
  return Math.max(0, getInvoiceLimit() - getInvoiceCount());
}

export function isLimitReached(): boolean {
  if (isTrialActive()) return false;
  return getCurrentPlan() === "free" && getInvoiceCount() >= 50;
}

// ── Feature gating ─────────────────────────────────────────────────────────

export function getTemplateAccess(): string[] {
  const free = ["modern", "classic", "minimal"];
  if (getCurrentPlan() === "free" && !isTrialActive()) return free;
  return ["modern", "classic", "minimal", "bold", "professional", "elegant", "startup", "compact"];
}

export function canUseWhatsApp(): boolean {
  return true; // WhatsApp sharing is free for all users
}

export function canExportGSTR(): boolean {
  return getCurrentPlan() !== "free" || isTrialActive();
}

export function canExportExcel(): boolean {
  return getCurrentPlan() === "business";
}

export function canUseMultiBusiness(): boolean {
  return getCurrentPlan() === "business";
}

export function canUseAPI(): boolean {
  return getCurrentPlan() === "business";
}

export function canUseBulkOps(): boolean {
  return getCurrentPlan() === "business";
}

export function getCustomerLimit(): number {
  const plan = getCurrentPlan();
  return plan === "free" ? 50 : plan === "pro" ? 500 : Infinity;
}

export function getProductLimit(): number {
  const plan = getCurrentPlan();
  return plan === "free" ? 50 : plan === "pro" ? 500 : Infinity;
}

export function getTeamMemberLimit(): number {
  const plan = getCurrentPlan();
  if (isTrialActive()) return 3;
  return plan === "free" ? 1 : plan === "pro" ? 3 : 10;
}

export function getBusinessLimit(): number {
  const plan = getCurrentPlan();
  return plan === "business" ? 5 : 1;
}

// ── Plan helpers ──────────────────────────────────────────────────────────

// True for pro, business, or active trial
export function isPro(): boolean {
  return getCurrentPlan() !== "free" || isTrialActive();
}

export function isBusinessPlan(): boolean {
  return getCurrentPlan() === "business";
}

export function canUseRecurring(): boolean {
  return getCurrentPlan() !== "free" || isTrialActive();
}

export function canUseReminders(): boolean {
  return getCurrentPlan() !== "free" || isTrialActive();
}

// ── Team role helpers ─────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "staff" | "viewer" | null;

const TEAM_ROLE_KEY = "billkar_team_role";

export function getTeamRole(): TeamRole {
  return (localStorage.getItem(TEAM_ROLE_KEY) as TeamRole) || null;
}

export function setTeamRole(role: string | null): void {
  if (role) {
    localStorage.setItem(TEAM_ROLE_KEY, role);
  } else {
    localStorage.removeItem(TEAM_ROLE_KEY);
  }
  window.dispatchEvent(new CustomEvent("billkar:plan-updated"));
}

/** Viewer: read-only — no create, edit, or delete */
export function isViewer(): boolean {
  return getTeamRole() === "viewer";
}

/** Staff: can create invoices, customers, products, expenses but no settings/team/billing */
export function isStaff(): boolean {
  return getTeamRole() === "staff";
}

/** Can the current user create/edit/delete data? (false for viewers) */
export function canWrite(): boolean {
  return getTeamRole() !== "viewer";
}

/** Can the current user access business settings, billing, team tabs? */
export function canManageBusiness(): boolean {
  const role = getTeamRole();
  return !role || role === "owner" || role === "admin";
}

// ── Admin/testing helpers ─────────────────────────────────────────────────

export function setAdminPro(): void {
  localStorage.setItem(PLAN_KEY, "pro");
  window.dispatchEvent(new CustomEvent("billkar:plan-updated"));
}

export function activateBusinessForTesting(): void {
  localStorage.setItem(PLAN_KEY, "business");
  window.dispatchEvent(new CustomEvent("billkar:plan-updated"));
}
