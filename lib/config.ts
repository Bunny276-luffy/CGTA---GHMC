import fs from "fs";
import path from "path";

/**
 * Jurisdiction Configuration Engine
 *
 * The deployment profile (state, local body, hierarchy, departments,
 * service categories, SLA policies, escalation rules, verification
 * thresholds, languages) lives in config/jurisdiction.config.json —
 * never in application logic. Making GHMC a deployment profile rather
 * than the software's hard-coded identity is what makes CivicTrust
 * portable across India-wide local-government structures.
 */

export interface DepartmentConfig {
  id: string;
  name: string;
  categories: string[];
  escalationAuthority: string;
}

export interface ServiceCategoryConfig {
  id: string;
  label: string;
  description: string;
  group: string;
}

export interface SlaPolicy {
  hours: number;
  warnAtPercent: number;
}

export interface JurisdictionConfig {
  deployment: {
    id: string;
    description: string;
    state: string;
    district: string;
    localBodyType: string;
    localBodyName: string;
    localBodyShortName: string;
    hierarchy: string[];
    jurisdictionStats: string;
    boundaryDataset: string;
  };
  departments: DepartmentConfig[];
  serviceCategories: ServiceCategoryConfig[];
  slaPolicies: Record<string, SlaPolicy>;
  escalationRules: {
    slaBreachStatus: string;
    unassignedAfterHours: number;
    escalationNote: string;
  };
  verification: {
    gpsToleranceMeters: number;
    duplicateRadiusMeters: number;
    manualReviewTrustThreshold: number;
    highTrustThreshold: number;
    maxPhotoBytes: number;
  };
  languages: {
    default: string;
    fallback: string;
    enabled: string[];
    note: string;
  };
}

let cachedConfig: JurisdictionConfig | null = null;

export function getJurisdictionConfig(): JurisdictionConfig {
  if (cachedConfig) return cachedConfig;
  const configPath = path.join(process.cwd(), "config", "jurisdiction.config.json");
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as JurisdictionConfig;
    // Minimal sanity validation — fail loudly on a broken deployment profile.
    if (!raw.deployment?.localBodyName || !Array.isArray(raw.departments)) {
      throw new Error("jurisdiction.config.json is missing required fields");
    }
    cachedConfig = raw;
    return raw;
  } catch (err: any) {
    throw new Error(`Failed to load the jurisdiction configuration: ${err.message}`);
  }
}

/** Public (non-sensitive) subset for client components. */
export function getPublicConfig() {
  const cfg = getJurisdictionConfig();
  return {
    deployment: {
      id: cfg.deployment.id,
      state: cfg.deployment.state,
      localBodyName: cfg.deployment.localBodyName,
      localBodyShortName: cfg.deployment.localBodyShortName,
      hierarchy: cfg.deployment.hierarchy,
      jurisdictionStats: cfg.deployment.jurisdictionStats
    },
    serviceCategories: cfg.serviceCategories,
    slaPolicies: Object.fromEntries(
      Object.entries(cfg.slaPolicies).map(([k, v]) => [k, v.hours])
    ),
    escalationRules: cfg.escalationRules,
    languages: cfg.languages
  };
}

/** Department owning a service category (deterministic routing). */
export function getDepartmentForCategory(category: string): DepartmentConfig | null {
  const cfg = getJurisdictionConfig();
  return (
    cfg.departments.find(d => d.categories.includes(category)) ||
    cfg.departments.find(d => d.id === "other") ||
    null
  );
}

export function getSlaPolicy(severity: string): SlaPolicy {
  const cfg = getJurisdictionConfig();
  return cfg.slaPolicies[severity] || cfg.slaPolicies.default || { hours: 168, warnAtPercent: 75 };
}

export interface SlaState {
  deadlineHours: number;
  warnAtPercent: number;
  state: "ON_TRACK" | "WARNING" | "OVERDUE";
  ageHours: number;
}

/** Deterministic SLA evaluation against the configured policy. */
export function evaluateSla(createdAt: string | Date | undefined, severity: string): SlaState | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  const policy = getSlaPolicy(severity);
  const ageHours = (Date.now() - created) / 3_600_000;
  const state: SlaState["state"] =
    ageHours > policy.hours
      ? "OVERDUE"
      : ageHours >= (policy.hours * policy.warnAtPercent) / 100
      ? "WARNING"
      : "ON_TRACK";
  return { deadlineHours: policy.hours, warnAtPercent: policy.warnAtPercent, state, ageHours: Math.round(ageHours * 10) / 10 };
}
