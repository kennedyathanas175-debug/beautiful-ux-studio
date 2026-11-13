import agri from "@/assets/project-agri.jpg";
import health from "@/assets/project-health.jpg";
import energy from "@/assets/project-energy.jpg";
import fintech from "@/assets/project-fintech.jpg";
import edu from "@/assets/project-edu.jpg";
import water from "@/assets/project-water.jpg";
import neema from "@/assets/innovator-neema.jpg";
import baraka from "@/assets/innovator-baraka.jpg";
import zawadi from "@/assets/innovator-zawadi.jpg";
import juma from "@/assets/innovator-juma.jpg";

export type Stage = "concept" | "prototype" | "pilot" | "market";

export type CategoryId =
  | "agriculture"
  | "health"
  | "energy"
  | "fintech"
  | "education"
  | "environment"
  | "mobility"
  | "ai";

export interface Category {
  id: CategoryId;
  en: string;
  sw: string;
  icon: string;
}

export const categories: Category[] = [
  { id: "agriculture", en: "Agriculture", sw: "Kilimo", icon: "Sprout" },
  { id: "health", en: "Health", sw: "Afya", icon: "HeartPulse" },
  { id: "energy", en: "Energy", sw: "Nishati", icon: "Sun" },
  { id: "fintech", en: "Fintech", sw: "Fedha Dijitali", icon: "Wallet" },
  { id: "education", en: "Education", sw: "Elimu", icon: "GraduationCap" },
  { id: "environment", en: "Environment", sw: "Mazingira", icon: "Leaf" },
  { id: "mobility", en: "Mobility & Logistics", sw: "Usafiri", icon: "Truck" },
  { id: "ai", en: "AI & Data", sw: "AI na Data", icon: "Cpu" },
];

export interface Institution {
  slug: string;
  name: string;
  short: string;
  type: "University" | "Research" | "Innovation Hub" | "Government";
  location: string;
  description: string;
  website: string;
  verified: boolean;
  focus: CategoryId[];
}

export const institutions: Institution[] = [
  {
    slug: "udsm",
    name: "University of Dar es Salaam",
    short: "UDSM",
    type: "University",
    location: "Dar es Salaam",
    description:
      "Tanzania's oldest public university, home to engineering, ICT and applied science programs and a growing student innovation community.",
    website: "https://www.udsm.ac.tz",
    verified: true,
    focus: ["ai", "energy", "fintech"],
  },
  {
    slug: "nm-aist",
    name: "Nelson Mandela African Institution of Science and Technology",
    short: "NM-AIST",
    type: "University",
    location: "Arusha",
    description:
      "A research-intensive institution focused on science, engineering and technology for development across East Africa.",
    website: "https://www.nm-aist.ac.tz",
    verified: true,
    focus: ["environment", "health", "ai"],
  },
  {
    slug: "sua",
    name: "Sokoine University of Agriculture",
    short: "SUA",
    type: "University",
    location: "Morogoro",
    description: "Leading agricultural university driving research in crops, livestock, food systems and agritech.",
    website: "https://www.sua.ac.tz",
    verified: true,
    focus: ["agriculture", "environment"],
  },
  {
    slug: "dit",
    name: "Dar es Salaam Institute of Technology",
    short: "DIT",
    type: "University",
    location: "Dar es Salaam",
    description: "Technical institute known for hands-on engineering, electronics and manufacturing innovation.",
    website: "https://www.dit.ac.tz",
    verified: true,
    focus: ["energy", "mobility"],
  },
  {
    slug: "muhas",
    name: "Muhimbili University of Health and Allied Sciences",
    short: "MUHAS",
    type: "University",
    location: "Dar es Salaam",
    description: "Tanzania's specialised health sciences university, advancing medical research and digital health.",
    website: "https://www.muhas.ac.tz",
    verified: true,
    focus: ["health"],
  },
  {
    slug: "udom",
    name: "University of Dodoma",
    short: "UDOM",
    type: "University",
    location: "Dodoma",
    description: "Large public university in the capital with strong programs in informatics, education and social sciences.",
    website: "https://www.udom.ac.tz",
    verified: true,
    focus: ["education", "ai"],
  },
  {
    slug: "costech",
    name: "Tanzania Commission for Science and Technology",
    short: "COSTECH",
    type: "Government",
    location: "Dar es Salaam",
    description: "The national body coordinating and promoting research, science, technology and innovation.",
    website: "https://www.costech.or.tz",
    verified: true,
    focus: ["ai", "health", "agriculture", "energy"],
  },
  {
    slug: "kilihub",
    name: "Kili Innovation Hub",
    short: "KILI",
    type: "Innovation Hub",
    location: "Moshi",
    description: "Community innovation space supporting early-stage founders in the northern zone with mentorship and maker tools.",
    website: "",
    verified: false,
    focus: ["agriculture", "mobility"],
  },
];

export interface Innovator {
  slug: string;
  name: string;
  headline: string;
  bio: string;
  photo?: string;
  location: string;
  institution?: string;
  skills: string[];
  interests: CategoryId[];
  lookingFor: string[];
  followers: number;
  links: { label: string; url: string }[];
}

export const innovators: Innovator[] = [
  {
    slug: "neema-mushi",
    name: "Neema Mushi",
    headline: "Software engineer · Digital health",
    bio: "Neema builds offline-first health tools for community health workers. She leads the AfyaLink team and mentors women in tech across Dar es Salaam.",
    photo: neema,
    location: "Dar es Salaam",
    institution: "muhas",
    skills: ["React Native", "Offline sync", "FHIR", "Product design"],
    interests: ["health", "ai"],
    lookingFor: ["Clinical partners", "Pilot districts"],
    followers: 1284,
    links: [{ label: "GitHub", url: "https://github.com" }],
  },
  {
    slug: "baraka-mwakyusa",
    name: "Baraka Mwakyusa",
    headline: "Hardware engineer · Off-grid energy",
    bio: "Baraka designs pay-as-you-go solar battery systems for rural shops and clinics. Former teaching assistant at DIT's electronics lab.",
    photo: baraka,
    location: "Mbeya",
    institution: "dit",
    skills: ["Embedded C", "PCB design", "IoT", "Battery systems"],
    interests: ["energy", "mobility"],
    lookingFor: ["Seed funding", "Manufacturing partner"],
    followers: 962,
    links: [],
  },
  {
    slug: "zawadi-salim",
    name: "Dr. Zawadi Salim",
    headline: "Researcher · Water quality & environment",
    bio: "Zawadi's research combines low-cost sensors and data science to monitor water quality on Lake Victoria and protect fishing communities.",
    photo: zawadi,
    location: "Mwanza",
    institution: "nm-aist",
    skills: ["Environmental science", "Python", "Sensor networks", "GIS"],
    interests: ["environment", "ai"],
    lookingFor: ["Data engineers", "Research grants"],
    followers: 741,
    links: [],
  },
  {
    slug: "juma-kileo",
    name: "Juma Kileo",
    headline: "Founder · Agritech",
    bio: "Juma founded ShambaSense after 15 years in extension services. His team helps smallholder farmers make better decisions with soil and weather data.",
    photo: juma,
    location: "Moshi",
    institution: "sua",
    skills: ["Agronomy", "Business development", "USSD", "Partnerships"],
    interests: ["agriculture"],
    lookingFor: ["Cooperative partners", "Investors"],
    followers: 2105,
    links: [],
  },
  {
    slug: "amani-temba",
    name: "Amani Temba",
    headline: "Student developer · EdTech",
    bio: "Computer science student building Somo, an offline Kiswahili learning app for secondary schools with limited connectivity.",
    location: "Dodoma",
    institution: "udom",
    skills: ["Flutter", "Firebase", "Content design"],
    interests: ["education"],
    lookingFor: ["Teachers to pilot", "Mentorship"],
    followers: 418,
    links: [],
  },
  {
    slug: "rehema-nyerere",
    name: "Rehema Lyimo",
    headline: "Fintech product lead",
    bio: "Rehema designs savings and credit tools for VICOBA groups, bringing transparent records to community savings across the lake zone.",
    location: "Dar es Salaam",
    institution: "udsm",
    skills: ["Product strategy", "Mobile money APIs", "UX research"],
    interests: ["fintech"],
    lookingFor: ["Microfinance partners"],
    followers: 1530,
    links: [],
  },
];

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
  image: string;
  creator: string;
  team: string[];
  institution?: string;
  region: string;
  likes: number;
  comments: number;
  views: number;
  publishedAt: string;
  featured?: boolean;
  trending?: boolean;
  link?: string;
}

export const innovations: Innovation[] = [
  {
    slug: "shambasense",
    title: "ShambaSense",
    tagline: "Soil and weather insights for smallholder farmers via SMS and app.",
    description:
      "ShambaSense pairs low-cost soil moisture sensors with local weather data to give farmers simple, timely advice on planting, irrigation and fertiliser — in Kiswahili, by SMS or smartphone.",
    problem:
      "Most smallholder farmers plan with little access to soil or weather data, leading to poor yields and wasted inputs, especially as rainfall becomes less predictable.",
    solution:
      "Solar-powered field sensors stream readings to a cloud model that sends plain-language recommendations through USSD, SMS and a lightweight Android app.",
    objectives: [
      "Increase maize yields by 20% for pilot farmers",
      "Reach 10,000 farmers through cooperatives by 2027",
      "Keep sensor cost below TZS 60,000 per unit",
    ],
    tech: ["IoT", "LoRaWAN", "USSD", "Python", "Android"],
    category: "agriculture",
    stage: "pilot",
    image: agri,
    creator: "juma-kileo",
    team: ["juma-kileo", "amani-temba"],
    institution: "sua",
    region: "Kilimanjaro",
    likes: 1240,
    comments: 86,
    views: 18400,
    publishedAt: "2026-10-28",
    featured: true,
    trending: true,
  },
  {
    slug: "afyalink",
    title: "AfyaLink",
    tagline: "Offline-first diagnostics companion for rural clinics.",
    description:
      "AfyaLink helps nurses and community health workers capture patient data, run guided diagnostic checklists and sync records when connectivity returns.",
    problem:
      "Rural clinics often rely on paper records and lack specialist support, delaying diagnosis and making referrals hard to track.",
    solution:
      "A tablet app with structured protocols, connected point-of-care devices and secure sync to district health systems.",
    objectives: [
      "Cut referral turnaround time by half",
      "Digitise records in 40 dispensaries",
      "Integrate with national health information systems",
    ],
    tech: ["React Native", "SQLite", "FHIR", "Bluetooth LE"],
    category: "health",
    stage: "pilot",
    image: health,
    creator: "neema-mushi",
    team: ["neema-mushi", "zawadi-salim"],
    institution: "muhas",
    region: "Dodoma",
    likes: 980,
    comments: 64,
    views: 14250,
    publishedAt: "2026-11-02",
    featured: true,
    trending: true,
  },
  {
    slug: "nuru-grid",
    title: "Nuru Grid",
    tagline: "Pay-as-you-go solar storage for village businesses.",
    description:
      "Nuru Grid installs modular solar and battery units at shops and clinics, letting owners pay daily via mobile money and share surplus power with neighbours.",
    problem:
      "Many rural businesses close at sunset or depend on costly diesel, limiting income and essential services.",
    solution:
      "Locally assembled battery cabinets with smart meters, remote monitoring and mobile-money billing.",
    objectives: ["Power 500 businesses in Mbeya and Iringa", "Train 60 local technicians", "Reduce energy costs by 40%"],
    tech: ["Embedded C", "IoT", "Mobile Money API", "Solar PV"],
    category: "energy",
    stage: "market",
    image: energy,
    creator: "baraka-mwakyusa",
    team: ["baraka-mwakyusa"],
    institution: "dit",
    region: "Mbeya",
    likes: 1532,
    comments: 112,
    views: 22100,
    publishedAt: "2026-09-14",
    featured: true,
  },
  {
    slug: "kikoba-ledger",
    title: "Kikoba Ledger",
    tagline: "Transparent digital records for community savings groups.",
    description:
      "Kikoba Ledger digitises VICOBA savings, loans and meeting minutes so every member can see balances in real time from any phone.",
    problem: "Paper-based savings groups face record disputes, lost books and limited access to formal credit.",
    solution: "A USSD and app-based ledger with group approvals, mobile-money deposits and credit history exports.",
    objectives: ["Onboard 2,000 savings groups", "Enable credit scoring for members", "Support Kiswahili voice prompts"],
    tech: ["Flutter", "Node.js", "PostgreSQL", "USSD"],
    category: "fintech",
    stage: "market",
    image: fintech,
    creator: "rehema-nyerere",
    team: ["rehema-nyerere"],
    institution: "udsm",
    region: "Mwanza",
    likes: 870,
    comments: 51,
    views: 11800,
    publishedAt: "2026-10-05",
    trending: true,
  },
  {
    slug: "somo-offline",
    title: "Somo Offline",
    tagline: "Kiswahili-first learning app that works without internet.",
    description:
      "Somo delivers curriculum-aligned lessons, quizzes and teacher dashboards on low-cost tablets, syncing progress when a connection is available.",
    problem: "Many secondary schools have few textbooks and unreliable internet, widening learning gaps.",
    solution: "Pre-loaded lesson packs, peer-to-peer sharing between devices and lightweight progress tracking for teachers.",
    objectives: ["Pilot in 25 schools in Dodoma", "Cover Form 1–4 science subjects", "Run on devices under TZS 250,000"],
    tech: ["Flutter", "Firebase", "P2P sync"],
    category: "education",
    stage: "prototype",
    image: edu,
    creator: "amani-temba",
    team: ["amani-temba"],
    institution: "udom",
    region: "Dodoma",
    likes: 640,
    comments: 39,
    views: 8900,
    publishedAt: "2026-11-08",
    trending: true,
  },
  {
    slug: "ziwa-watch",
    title: "Ziwa Watch",
    tagline: "Floating sensors monitoring Lake Victoria's water quality.",
    description:
      "Ziwa Watch deploys solar-powered buoys that measure temperature, oxygen and turbidity, alerting fishing communities and authorities to pollution events.",
    problem: "Pollution and algal blooms threaten fisheries and drinking water, but monitoring is infrequent and costly.",
    solution: "A network of low-cost buoys feeding an open dashboard and SMS alerts for beach management units.",
    objectives: ["Deploy 30 buoys around Mwanza", "Publish open water data", "Provide early warnings to 50 landing sites"],
    tech: ["Sensors", "Python", "GIS", "LoRaWAN"],
    category: "environment",
    stage: "pilot",
    image: water,
    creator: "zawadi-salim",
    team: ["zawadi-salim"],
    institution: "nm-aist",
    region: "Mwanza",
    likes: 720,
    comments: 44,
    views: 9600,
    publishedAt: "2026-10-18",
    featured: true,
  },
  {
    slug: "mazao-market",
    title: "Mazao Market",
    tagline: "Connecting farmers directly to buyers with fair price data.",
    description: "A marketplace that publishes daily crop prices from regional markets and matches cooperatives with verified buyers.",
    problem: "Farmers often sell to middlemen without knowing fair market prices.",
    solution: "Price aggregation from market agents plus buyer matching and logistics booking.",
    objectives: ["Cover 20 regional markets", "Increase farm-gate prices by 15%"],
    tech: ["Next.js", "PostgreSQL", "SMS"],
    category: "agriculture",
    stage: "prototype",
    image: agri,
    creator: "juma-kileo",
    team: ["juma-kileo"],
    institution: "kilihub",
    region: "Arusha",
    likes: 410,
    comments: 22,
    views: 5100,
    publishedAt: "2026-08-30",
  },
  {
    slug: "msaidizi-ai",
    title: "Msaidizi AI",
    tagline: "Kiswahili voice assistant for public service information.",
    description: "A speech-based assistant that answers common questions about health, licences and government services in Kiswahili.",
    problem: "Information about public services is hard to find, especially for people with low literacy.",
    solution: "Speech recognition tuned for Tanzanian Kiswahili, delivered over phone calls and WhatsApp.",
    objectives: ["Support 5 service categories", "Reach 95% intent accuracy"],
    tech: ["Speech AI", "NLP", "Python", "WhatsApp API"],
    category: "ai",
    stage: "concept",
    image: fintech,
    creator: "neema-mushi",
    team: ["neema-mushi", "rehema-nyerere"],
    institution: "udsm",
    region: "Dar es Salaam",
    likes: 530,
    comments: 70,
    views: 7300,
    publishedAt: "2026-11-10",
    trending: true,
  },
  {
    slug: "boda-safe",
    title: "BodaSafe",
    tagline: "Safety and earnings app for boda boda riders.",
    description: "Helmet-mounted crash detection with an app that logs trips, earnings and emergency contacts for motorcycle taxi riders.",
    problem: "Boda boda riders face high accident risk and unstable income records.",
    solution: "Crash detection sensors with automatic SMS alerts and an earnings diary usable for micro-loans.",
    objectives: ["Pilot with 300 riders in Moshi", "Partner with insurers"],
    tech: ["Accelerometer", "Android", "SMS"],
    category: "mobility",
    stage: "prototype",
    image: energy,
    creator: "baraka-mwakyusa",
    team: ["baraka-mwakyusa", "amani-temba"],
    institution: "kilihub",
    region: "Kilimanjaro",
    likes: 360,
    comments: 28,
    views: 4800,
    publishedAt: "2026-09-25",
  },
];

export type OppType = "Challenge" | "Hackathon" | "Grant" | "Research" | "Internship" | "Program";

export interface Opportunity {
  id: string;
  title: string;
  type: OppType;
  organizer: string;
  deadline: string;
  location: string;
  summary: string;
  eligibility: string[];
  reward: string;
  categories: CategoryId[];
}

export const opportunities: Opportunity[] = [
  {
    id: "climate-challenge-2026",
    title: "Climate Resilience Innovation Challenge",
    type: "Challenge",
    organizer: "TIE Partners",
    deadline: "2026-12-15",
    location: "Nationwide",
    summary: "Solutions that help communities adapt to drought, floods and changing rainfall patterns.",
    eligibility: ["Tanzanian innovators or teams", "Working prototype or pilot", "Clear plan for community impact"],
    reward: "Up to TZS 50M in grants + mentorship",
    categories: ["environment", "agriculture"],
  },
  {
    id: "health-hack",
    title: "Digital Health Hackathon",
    type: "Hackathon",
    organizer: "Health innovation network",
    deadline: "2026-12-02",
    location: "Dar es Salaam",
    summary: "48-hour build sprint on maternal health, referrals and supply chains for medicines.",
    eligibility: ["Teams of 3–5", "Students and professionals welcome"],
    reward: "Prizes, incubation places and clinical mentors",
    categories: ["health", "ai"],
  },
  {
    id: "research-seed",
    title: "Applied Research Seed Fund",
    type: "Grant",
    organizer: "Research partners",
    deadline: "2027-01-31",
    location: "Nationwide",
    summary: "Early funding for university researchers turning lab work into usable technology.",
    eligibility: ["Affiliated with a Tanzanian institution", "Defined research outcome within 12 months"],
    reward: "Grants of TZS 10M – 30M",
    categories: ["ai", "health", "energy", "agriculture"],
  },
  {
    id: "energy-fellowship",
    title: "Off-Grid Energy Fellowship",
    type: "Program",
    organizer: "Energy access partners",
    deadline: "2026-11-30",
    location: "Mbeya & Iringa",
    summary: "Six-month fellowship placing engineers with rural energy enterprises.",
    eligibility: ["Engineering graduates", "Willingness to work in rural regions"],
    reward: "Monthly stipend + field training",
    categories: ["energy"],
  },
  {
    id: "edtech-internship",
    title: "EdTech Product Internship",
    type: "Internship",
    organizer: "Somo Offline team",
    deadline: "2026-12-20",
    location: "Dodoma · Hybrid",
    summary: "Join a student-led team building offline learning tools for secondary schools.",
    eligibility: ["Final-year students", "Flutter or content design skills"],
    reward: "Paid internship · 3 months",
    categories: ["education"],
  },
  {
    id: "agri-data",
    title: "Agri-Data Collaboration Call",
    type: "Research",
    organizer: "Agriculture research partners",
    deadline: "2027-02-14",
    location: "Morogoro",
    summary: "Partner with researchers to build open datasets on soil, yields and markets.",
    eligibility: ["Data scientists, agronomists or startups", "Commitment to open data"],
    reward: "Co-authorship, data access and travel support",
    categories: ["agriculture", "ai"],
  },
];

export const impactStats = { innovations: 1280, innovators: 9400, institutions: 64, regions: 26 };

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;
export const getInnovator = (slug: string) => innovators.find((i) => i.slug === slug);
export const getInstitution = (slug?: string) => (slug ? institutions.find((i) => i.slug === slug) : undefined);
export const getInnovation = (slug: string) => innovations.find((i) => i.slug === slug);

export function daysUntil(date: string, from = new Date()) {
  const d = new Date(date + "T23:59:59");
  return Math.ceil((d.getTime() - from.getTime()) / 86_400_000);
}
