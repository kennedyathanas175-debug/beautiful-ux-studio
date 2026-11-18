import type { Category, CategoryId, Stage } from "@/lib/api-types";

export type {
  Category,
  CategoryId,
  Stage,
  Innovation,
  Innovator,
  Institution,
  InstitutionType,
  Opportunity,
  OpportunityType as OppType,
  OpportunityType,
  UserSummary,
  UserRole,
  Comment,
  CollaborationRequest,
  Notification,
  Report,
  HomeData,
  DashboardData,
  ModerationOverview,
  OpportunityApplication,
  ApplicationStatus,
  Paginated,
  ViewerState,
} from "@/lib/api-types";

export const categories: Category[] = [
  { id: "agriculture", en: "Agriculture", sw: "Kilimo", icon: "Sprout", count: 0 },
  { id: "health", en: "Health", sw: "Afya", icon: "HeartPulse", count: 0 },
  { id: "energy", en: "Energy", sw: "Nishati", icon: "Sun", count: 0 },
  { id: "fintech", en: "Fintech", sw: "Fedha Dijitali", icon: "Wallet", count: 0 },
  { id: "education", en: "Education", sw: "Elimu", icon: "GraduationCap", count: 0 },
  { id: "environment", en: "Environment", sw: "Mazingira", icon: "Leaf", count: 0 },
  { id: "mobility", en: "Mobility & Logistics", sw: "Usafiri", icon: "Truck", count: 0 },
  { id: "ai", en: "AI & Data", sw: "AI na Data", icon: "Cpu", count: 0 },
];

export const stages: Stage[] = ["concept", "prototype", "pilot", "market"];

export const opportunityTypes = [
  "Challenge",
  "Hackathon",
  "Grant",
  "Research",
  "Internship",
  "Program",
] as const;

export const institutionTypes = ["University", "Research", "Innovation Hub", "Government"] as const;

export const communityRoles = [
  { value: "innovator", label: "Innovator", labelSw: "Mbunifu", icon: "Lightbulb" },
  { value: "student", label: "Student", labelSw: "Mwanafunzi", icon: "GraduationCap" },
  { value: "researcher", label: "Researcher", labelSw: "Mtafiti", icon: "FlaskConical" },
  { value: "creator", label: "Creator", labelSw: "Msanii / Mbunifu wa maudhui", icon: "Palette" },
  {
    value: "institution_rep",
    label: "Institution representative",
    labelSw: "Mwakilishi wa taasisi",
    icon: "Building2",
  },
] as const;

export const TANZANIA_REGIONS = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
  "Kaskazini Pemba",
  "Kusini Pemba",
  "Kaskazini Unguja",
  "Kusini Unguja",
  "Mjini Magharibi",
];

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;

export function daysUntil(date: string, from = new Date()) {
  const d = new Date(`${date}T23:59:59`);
  return Math.ceil((d.getTime() - from.getTime()) / 86_400_000);
}
