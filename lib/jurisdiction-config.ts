/**
 * CivicTrust India-Wide Municipal Jurisdiction Configuration Architecture
 * 
 * Provides configurable abstractions for deploying CivicTrust across
 * Municipal Corporations (e.g. GHMC, BMC, BBMP), Municipalities, Panchayats,
 * and state-wide civic authorities without hardcoding location structures.
 */

export interface AdministrativeLevel {
  id: string;
  name: string;
  code: string;
  subLevels?: AdministrativeLevel[];
}

export interface JurisdictionConfig {
  country: string; // e.g. "India"
  state: string; // e.g. "Telangana"
  district: string; // e.g. "Hyderabad"
  authorityType: "MUNICIPAL_CORPORATION" | "MUNICIPALITY" | "URBAN_DEVELOPMENT" | "GRAM_PANCHAYAT";
  authorityName: string; // e.g. "Greater Hyderabad Municipal Corporation"
  authorityCode: string; // e.g. "GHMC"
  portalTitle: string; // e.g. "GHMC Citizen Grievance Portal"
  hierarchyLabels: string[]; // e.g. ["Zone", "Circle", "Ward"]
  departments: Array<{
    id: string;
    name: string;
    code: string;
    slaHours: number;
    categories: string[];
  }>;
}

export const DEFAULT_JURISDICTION_CONFIG: JurisdictionConfig = {
  country: "India",
  state: "Telangana",
  district: "Hyderabad",
  authorityType: "MUNICIPAL_CORPORATION",
  authorityName: "Greater Hyderabad Municipal Corporation",
  authorityCode: "GHMC",
  portalTitle: "GHMC Civic Grievance Desk",
  hierarchyLabels: ["Zone", "Circle", "Ward"],
  departments: [
    {
      id: "dept-roads",
      name: "Roads & Maintenance",
      code: "ROADS",
      slaHours: 24,
      categories: ["Roads & Potholes", "Footpath & Pavement", "Manhole Cover"]
    },
    {
      id: "dept-sanitation",
      name: "Sanitation & Waste Management",
      code: "SANI",
      slaHours: 12,
      categories: ["Garbage & Waste", "Open Dumping", "Public Toilet"]
    },
    {
      id: "dept-water",
      name: "Water Supply & Drainage",
      code: "WATER",
      slaHours: 18,
      categories: ["Drainage & Water Leakage", "Pipe Burst", "Water Contamination"]
    },
    {
      id: "dept-electrical",
      name: "Electrical & Streetlights",
      code: "ELEC",
      slaHours: 24,
      categories: ["Street Lighting & Electrical", "Hanging Wires", "Transformer Hazard"]
    },
    {
      id: "dept-veterinary",
      name: "Veterinary & Stray Animal Control",
      code: "VET",
      slaHours: 36,
      categories: ["Veterinary & Stray Animal Control", "Stray Dog Nuisance", "Cattle Obstruction"]
    }
  ]
};

export function getDepartmentForCategory(category: string, config: JurisdictionConfig = DEFAULT_JURISDICTION_CONFIG) {
  const catLower = category.toLowerCase();
  for (const dept of config.departments) {
    if (dept.categories.some(c => catLower.includes(c.toLowerCase()) || c.toLowerCase().includes(catLower))) {
      return dept;
    }
  }
  return config.departments[0];
}
