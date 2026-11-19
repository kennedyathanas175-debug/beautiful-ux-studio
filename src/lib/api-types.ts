export type CategoryId =
  "agriculture" | "health" | "energy" | "fintech" | "education" | "environment" | "mobility" | "ai";

export type Stage = "concept" | "prototype" | "pilot" | "market";

export type OpportunityType =
  "Challenge" | "Hackathon" | "Grant" | "Research" | "Internship" | "Program";

export type InstitutionType = "University" | "Research" | "Innovation Hub" | "Government";

export type UserRole =
  "innovator" | "student" | "researcher" | "creator" | "institution_rep" | "admin";

export interface Category {
  id: CategoryId;
  en: string;
  sw: string;
  icon: string;
  count: number;
}

export interface Institution {
  slug: string;
  name: string;
  short: string;
  type: InstitutionType;
  location: string;
  description: string;
  website: string;
  verified: boolean;
  focus: CategoryId[];
  innovationCount?: number;
  isActive?: boolean;
}

export interface UserSummary {
  slug: string;
  name: string;
  headline: string;
  photo: string | null;
  location: string;
  role: UserRole;
  institution: Institution | null;
}

export interface ViewerState {
  liked: boolean;
  saved: boolean;
  isOwner: boolean;
  collaborationStatus: "pending" | "accepted" | "declined" | "withdrawn" | null;
}

export type InnovationMediaKind = "image" | "video";
export type InnovationMediaDesignation = "gallery" | "pitch" | "demo";

export interface InnovationMedia {
  id: number;
  kind: InnovationMediaKind;
  designation: InnovationMediaDesignation;
  url: string;
  thumbnailUrl: string | null;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  order: number;
}

export interface Innovation {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  problem: string;
  solution: string;
  objectives: string[];
  tech: string[];
  category: CategoryId;
  stage: Stage;
  image: string | null;
  creator: UserSummary;
  team: UserSummary[];
  institution: Institution | null;
  region: string;
  likes: number;
  comments: number;
  views: number;
  publishedAt: string;
  featured: boolean;
  trending: boolean;
  link: string;
  status: "draft" | "published" | "hidden" | "archived";
  viewer: ViewerState;
  media?: InnovationMedia[];
  previewImage?: string | null;
  mediaCounts?: { images: number; videos: number };
}

export interface Innovator extends UserSummary {
  email?: string;
  roleLabel: string;
  bio: string;
  skills: string[];
  interests: CategoryId[];
  lookingFor: string[];
  links: { label: string; url: string }[];
  followers: number;
  followingCount: number;
  projectCount: number;
  isPublic: boolean;
  isStaff: boolean;
  viewer: { isFollowing: boolean; isSelf: boolean };
  createdAt?: string;
  projects?: Innovation[];
}

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  type: OpportunityType;
  organizer: string;
  deadline: string;
  location: string;
  summary: string;
  eligibility: string[];
  reward: string;
  categories: CategoryId[];
  external_url: string;
  status: "draft" | "published" | "closed" | "archived";
  daysLeft: number;
  isOpen: boolean;
  applicationCount: number;
  viewer: { saved: boolean; applicationStatus: ApplicationStatus | null };
}

export type ApplicationStatus =
  "submitted" | "under_review" | "accepted" | "rejected" | "withdrawn";

export interface OpportunityApplication {
  id: number;
  opportunity: { slug: string; title: string; deadline: string };
  applicant: UserSummary;
  applicantEmail: string | null;
  motivation: string;
  status: ApplicationStatus;
  reviewNote: string;
  createdAt: string;
}

export interface Comment {
  id: number;
  body: string;
  author: UserSummary;
  canEdit: boolean;
  createdAt: string;
  isHidden: boolean;
}

export interface CollaborationRequest {
  id: number;
  sender: UserSummary;
  recipient: UserSummary;
  innovation: { slug: string; title: string } | null;
  message: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  responseMessage: string;
  canRespond: boolean;
  canWithdraw: boolean;
  createdAt: string;
}

export interface Notification {
  id: number;
  kind: string;
  title: string;
  message: string;
  url: string;
  isRead: boolean;
  actor: UserSummary | null;
  createdAt: string;
}

export interface Report {
  id: number;
  reporter: UserSummary;
  innovation: { slug: string; title: string } | null;
  comment: { id: number; body: string; author: string; innovationSlug: string } | null;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  resolutionNote: string;
  reviewedBy: UserSummary | null;
  createdAt: string;
}

export interface HomeData {
  stats: { innovations: number; innovators: number; institutions: number; regions: number };
  latest: Innovation[];
  featured: Innovation[];
  trending: Innovation[];
  innovators: Innovator[];
  institutions: Institution[];
  categories: Category[];
  announcements: Opportunity[];
  opportunities: Opportunity[];
}

export interface DashboardData {
  stats: {
    innovations: number;
    publishedInnovations: number;
    followers: number;
    following: number;
    totalLikes: number;
    savedInnovations: number;
    savedOpportunities: number;
    pendingRequests: number;
    unreadNotifications: number;
  };
  innovations: Innovation[];
  requests: CollaborationRequest[];
  notifications: Notification[];
  applications: OpportunityApplication[];
}

export interface ModerationOverview {
  stats: {
    reportsOpen: number;
    innovationsTotal: number;
    innovationsPublished: number;
    innovationsHidden: number;
    innovationsDraft: number;
    users: number;
    opportunities: number;
    applications: number;
    pendingCollaborationRequests: number;
    unreadNotifications: number;
  };
  reports: Report[];
  hiddenInnovations: Innovation[];
  draftInnovations: Innovation[];
  applications: OpportunityApplication[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthResponse {
  user: Innovator;
}

export interface ApiErrorPayload {
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
}

export interface InnovationInput {
  title: string;
  tagline: string;
  description: string;
  problem?: string;
  solution?: string;
  objectives: string[];
  tech: string[];
  category: CategoryId;
  stage: Stage;
  institution?: string | null;
  region: string;
  link?: string;
  status: "draft" | "published";
  teamEmails?: string[];
  image?: File | null;
}

export interface ProfileInput {
  full_name: string;
  role: UserRole;
  headline: string;
  bio: string;
  location: string;
  institution: string | null;
  skills: string[];
  interests: CategoryId[];
  looking_for: string[];
  links: { label: string; url: string }[];
  is_public: boolean;
  avatar?: File | null;
}
