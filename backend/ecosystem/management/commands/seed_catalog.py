"""Seed the catalogue that existed in the original frontend.

The seed is idempotent: existing records are left untouched unless --update is
passed. This lets the migrated platform start with its real published content
without making the deployment dependent on the frontend's source files.
"""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import User
from ecosystem.models import Category, Innovation, Institution
from opportunities.models import Opportunity

CATEGORIES = [
    ("agriculture", "Agriculture", "Kilimo", "Sprout", 1),
    ("health", "Health", "Afya", "HeartPulse", 2),
    ("energy", "Energy", "Nishati", "Sun", 3),
    ("fintech", "Fintech", "Fedha Dijitali", "Wallet", 4),
    ("education", "Education", "Elimu", "GraduationCap", 5),
    ("environment", "Environment", "Mazingira", "Leaf", 6),
    ("mobility", "Mobility & Logistics", "Usafiri", "Truck", 7),
    ("ai", "AI & Data", "AI na Data", "Cpu", 8),
]

INSTITUTIONS = [
    {
        "slug": "udsm",
        "name": "University of Dar es Salaam",
        "short_name": "UDSM",
        "type": "University",
        "location": "Dar es Salaam",
        "description": "Tanzania's oldest public university, home to engineering, ICT and applied science programs and a growing student innovation community.",
        "website": "https://www.udsm.ac.tz",
        "verified": True,
        "focus": ["ai", "energy", "fintech"],
    },
    {
        "slug": "nm-aist",
        "name": "Nelson Mandela African Institution of Science and Technology",
        "short_name": "NM-AIST",
        "type": "University",
        "location": "Arusha",
        "description": "A research-intensive institution focused on science, engineering and technology for development across East Africa.",
        "website": "https://www.nm-aist.ac.tz",
        "verified": True,
        "focus": ["environment", "health", "ai"],
    },
    {
        "slug": "sua",
        "name": "Sokoine University of Agriculture",
        "short_name": "SUA",
        "type": "University",
        "location": "Morogoro",
        "description": "Leading agricultural university driving research in crops, livestock, food systems and agritech.",
        "website": "https://www.sua.ac.tz",
        "verified": True,
        "focus": ["agriculture", "environment"],
    },
    {
        "slug": "dit",
        "name": "Dar es Salaam Institute of Technology",
        "short_name": "DIT",
        "type": "University",
        "location": "Dar es Salaam",
        "description": "Technical institute known for hands-on engineering, electronics and manufacturing innovation.",
        "website": "https://www.dit.ac.tz",
        "verified": True,
        "focus": ["energy", "mobility"],
    },
    {
        "slug": "muhas",
        "name": "Muhimbili University of Health and Allied Sciences",
        "short_name": "MUHAS",
        "type": "University",
        "location": "Dar es Salaam",
        "description": "Tanzania's specialised health sciences university, advancing medical research and digital health.",
        "website": "https://www.muhas.ac.tz",
        "verified": True,
        "focus": ["health"],
    },
    {
        "slug": "udom",
        "name": "University of Dodoma",
        "short_name": "UDOM",
        "type": "University",
        "location": "Dodoma",
        "description": "Large public university in the capital with strong programs in informatics, education and social sciences.",
        "website": "https://www.udom.ac.tz",
        "verified": True,
        "focus": ["education", "ai"],
    },
    {
        "slug": "costech",
        "name": "Tanzania Commission for Science and Technology",
        "short_name": "COSTECH",
        "type": "Government",
        "location": "Dar es Salaam",
        "description": "The national body coordinating and promoting research, science, technology and innovation.",
        "website": "https://www.costech.or.tz",
        "verified": True,
        "focus": ["ai", "health", "agriculture", "energy"],
    },
    {
        "slug": "kilihub",
        "name": "Kili Innovation Hub",
        "short_name": "KILI",
        "type": "Innovation Hub",
        "location": "Moshi",
        "description": "Community innovation space supporting early-stage founders in the northern zone with mentorship and maker tools.",
        "website": "",
        "verified": False,
        "focus": ["agriculture", "mobility"],
    },
]

INNOVATORS = [
    {
        "slug": "neema-mushi",
        "email": "neema.mushi@seed.tie.local",
        "full_name": "Neema Mushi",
        "headline": "Software engineer · Digital health",
        "bio": "Neema builds offline-first health tools for community health workers. She leads the AfyaLink team and mentors women in tech across Dar es Salaam.",
        "avatar": "seed/avatars/neema.jpg",
        "location": "Dar es Salaam",
        "institution": "muhas",
        "skills": ["React Native", "Offline sync", "FHIR", "Product design"],
        "interests": ["health", "ai"],
        "looking_for": ["Clinical partners", "Pilot districts"],
        "base_followers": 1284,
        "links": [{"label": "GitHub", "url": "https://github.com"}],
    },
    {
        "slug": "baraka-mwakyusa",
        "email": "baraka.mwakyusa@seed.tie.local",
        "full_name": "Baraka Mwakyusa",
        "headline": "Hardware engineer · Off-grid energy",
        "bio": "Baraka designs pay-as-you-go solar battery systems for rural shops and clinics. Former teaching assistant at DIT's electronics lab.",
        "avatar": "seed/avatars/baraka.jpg",
        "location": "Mbeya",
        "institution": "dit",
        "skills": ["Embedded C", "PCB design", "IoT", "Battery systems"],
        "interests": ["energy", "mobility"],
        "looking_for": ["Seed funding", "Manufacturing partner"],
        "base_followers": 962,
        "links": [],
    },
    {
        "slug": "zawadi-salim",
        "email": "zawadi.salim@seed.tie.local",
        "full_name": "Dr. Zawadi Salim",
        "headline": "Researcher · Water quality & environment",
        "bio": "Zawadi's research combines low-cost sensors and data science to monitor water quality on Lake Victoria and protect fishing communities.",
        "avatar": "seed/avatars/zawadi.jpg",
        "location": "Mwanza",
        "institution": "nm-aist",
        "skills": ["Environmental science", "Python", "Sensor networks", "GIS"],
        "interests": ["environment", "ai"],
        "looking_for": ["Data engineers", "Research grants"],
        "base_followers": 741,
        "links": [],
    },
    {
        "slug": "juma-kileo",
        "email": "juma.kileo@seed.tie.local",
        "full_name": "Juma Kileo",
        "headline": "Founder · Agritech",
        "bio": "Juma founded ShambaSense after 15 years in extension services. His team helps smallholder farmers make better decisions with soil and weather data.",
        "avatar": "seed/avatars/juma.jpg",
        "location": "Moshi",
        "institution": "sua",
        "skills": ["Agronomy", "Business development", "USSD", "Partnerships"],
        "interests": ["agriculture"],
        "looking_for": ["Cooperative partners", "Investors"],
        "base_followers": 2105,
        "links": [],
    },
    {
        "slug": "amani-temba",
        "email": "amani.temba@seed.tie.local",
        "full_name": "Amani Temba",
        "headline": "Student developer · EdTech",
        "bio": "Computer science student building Somo, an offline Kiswahili learning app for secondary schools with limited connectivity.",
        "avatar": None,
        "location": "Dodoma",
        "institution": "udom",
        "skills": ["Flutter", "Firebase", "Content design"],
        "interests": ["education"],
        "looking_for": ["Teachers to pilot", "Mentorship"],
        "base_followers": 418,
        "links": [],
    },
    {
        "slug": "rehema-nyerere",
        "email": "rehema.nyerere@seed.tie.local",
        "full_name": "Rehema Lyimo",
        "headline": "Fintech product lead",
        "bio": "Rehema designs savings and credit tools for VICOBA groups, bringing transparent records to community savings across the lake zone.",
        "avatar": None,
        "location": "Dar es Salaam",
        "institution": "udsm",
        "skills": ["Product strategy", "Mobile money APIs", "UX research"],
        "interests": ["fintech"],
        "looking_for": ["Microfinance partners"],
        "base_followers": 1530,
        "links": [],
    },
]


def innovation(
    slug,
    title,
    tagline,
    description,
    problem,
    solution,
    objectives,
    tech,
    category,
    stage,
    image,
    creator,
    team,
    institution,
    region,
    views,
    likes,
    published_at,
    featured=False,
    trending=False,
):
    return {
        "slug": slug,
        "title": title,
        "tagline": tagline,
        "description": description,
        "problem": problem,
        "solution": solution,
        "objectives": objectives,
        "tech": tech,
        "category": category,
        "stage": stage,
        "image": image,
        "creator": creator,
        "team": team,
        "institution": institution,
        "region": region,
        "views": views,
        "legacy_likes": likes,
        "published_at": published_at,
        "featured": featured,
        "trending": trending,
    }


INNOVATIONS = [
    innovation(
        "shambasense",
        "ShambaSense",
        "Soil and weather insights for smallholder farmers via SMS and app.",
        "ShambaSense pairs low-cost soil moisture sensors with local weather data to give farmers simple, timely advice on planting, irrigation and fertiliser — in Kiswahili, by SMS or smartphone.",
        "Most smallholder farmers plan with little access to soil or weather data, leading to poor yields and wasted inputs, especially as rainfall becomes less predictable.",
        "Solar-powered field sensors stream readings to a cloud model that sends plain-language recommendations through USSD, SMS and a lightweight Android app.",
        [
            "Increase maize yields by 20% for pilot farmers",
            "Reach 10,000 farmers through cooperatives by 2027",
            "Keep sensor cost below TZS 60,000 per unit",
        ],
        ["IoT", "LoRaWAN", "USSD", "Python", "Android"],
        "agriculture",
        "pilot",
        "seed/innovations/agri.jpg",
        "juma-kileo",
        ["juma-kileo", "amani-temba"],
        "sua",
        "Kilimanjaro",
        18400,
        1240,
        date(2026, 10, 28),
        featured=True,
        trending=True,
    ),
    innovation(
        "afyalink",
        "AfyaLink",
        "Offline-first diagnostics companion for rural clinics.",
        "AfyaLink helps nurses and community health workers capture patient data, run guided diagnostic checklists and sync records when connectivity returns.",
        "Rural clinics often rely on paper records and lack specialist support, delaying diagnosis and making referrals hard to track.",
        "A tablet app with structured protocols, connected point-of-care devices and secure sync to district health systems.",
        [
            "Cut referral turnaround time by half",
            "Digitise records in 40 dispensaries",
            "Integrate with national health information systems",
        ],
        ["React Native", "SQLite", "FHIR", "Bluetooth LE"],
        "health",
        "pilot",
        "seed/innovations/health.jpg",
        "neema-mushi",
        ["neema-mushi", "zawadi-salim"],
        "muhas",
        "Dodoma",
        14250,
        980,
        date(2026, 11, 2),
        featured=True,
        trending=True,
    ),
    innovation(
        "nuru-grid",
        "Nuru Grid",
        "Pay-as-you-go solar storage for village businesses.",
        "Nuru Grid installs modular solar and battery units at shops and clinics, letting owners pay daily via mobile money and share surplus power with neighbours.",
        "Many rural businesses close at sunset or depend on costly diesel, limiting income and essential services.",
        "Locally assembled battery cabinets with smart meters, remote monitoring and mobile-money billing.",
        ["Power 500 businesses in Mbeya and Iringa", "Train 60 local technicians", "Reduce energy costs by 40%"],
        ["Embedded C", "IoT", "Mobile Money API", "Solar PV"],
        "energy",
        "market",
        "seed/innovations/energy.jpg",
        "baraka-mwakyusa",
        ["baraka-mwakyusa"],
        "dit",
        "Mbeya",
        22100,
        1532,
        date(2026, 9, 14),
        featured=True,
    ),
    innovation(
        "kikoba-ledger",
        "Kikoba Ledger",
        "Transparent digital records for community savings groups.",
        "Kikoba Ledger digitises VICOBA savings, loans and meeting minutes so every member can see balances in real time from any phone.",
        "Paper-based savings groups face record disputes, lost books and limited access to formal credit.",
        "A USSD and app-based ledger with group approvals, mobile-money deposits and credit history exports.",
        ["Onboard 2,000 savings groups", "Enable credit scoring for members", "Support Kiswahili voice prompts"],
        ["Flutter", "Node.js", "PostgreSQL", "USSD"],
        "fintech",
        "market",
        "seed/innovations/fintech.jpg",
        "rehema-nyerere",
        ["rehema-nyerere"],
        "udsm",
        "Mwanza",
        11800,
        870,
        date(2026, 10, 5),
        trending=True,
    ),
    innovation(
        "somo-offline",
        "Somo Offline",
        "Kiswahili-first learning app that works without internet.",
        "Somo delivers curriculum-aligned lessons, quizzes and teacher dashboards on low-cost tablets, syncing progress when a connection is available.",
        "Many secondary schools have few textbooks and unreliable internet, widening learning gaps.",
        "Pre-loaded lesson packs, peer-to-peer sharing between devices and lightweight progress tracking for teachers.",
        ["Pilot in 25 schools in Dodoma", "Cover Form 1–4 science subjects", "Run on devices under TZS 250,000"],
        ["Flutter", "Firebase", "P2P sync"],
        "education",
        "prototype",
        "seed/innovations/edu.jpg",
        "amani-temba",
        ["amani-temba"],
        "udom",
        "Dodoma",
        8900,
        640,
        date(2026, 11, 8),
        trending=True,
    ),
    innovation(
        "ziwa-watch",
        "Ziwa Watch",
        "Floating sensors monitoring Lake Victoria's water quality.",
        "Ziwa Watch deploys solar-powered buoys that measure temperature, oxygen and turbidity, alerting fishing communities and authorities to pollution events.",
        "Pollution and algal blooms threaten fisheries and drinking water, but monitoring is infrequent and costly.",
        "A network of low-cost buoys feeding an open dashboard and SMS alerts for beach management units.",
        ["Deploy 30 buoys around Mwanza", "Publish open water data", "Provide early warnings to 50 landing sites"],
        ["Sensors", "Python", "GIS", "LoRaWAN"],
        "environment",
        "pilot",
        "seed/innovations/water.jpg",
        "zawadi-salim",
        ["zawadi-salim"],
        "nm-aist",
        "Mwanza",
        9600,
        720,
        date(2026, 10, 18),
        featured=True,
    ),
    innovation(
        "mazao-market",
        "Mazao Market",
        "Connecting farmers directly to buyers with fair price data.",
        "A marketplace that publishes daily crop prices from regional markets and matches cooperatives with verified buyers.",
        "Farmers often sell to middlemen without knowing fair market prices.",
        "Price aggregation from market agents plus buyer matching and logistics booking.",
        ["Cover 20 regional markets", "Increase farm-gate prices by 15%"],
        ["Next.js", "PostgreSQL", "SMS"],
        "agriculture",
        "prototype",
        "seed/innovations/agri.jpg",
        "juma-kileo",
        ["juma-kileo"],
        "kilihub",
        "Arusha",
        5100,
        410,
        date(2026, 8, 30),
    ),
    innovation(
        "msaidizi-ai",
        "Msaidizi AI",
        "Kiswahili voice assistant for public service information.",
        "A speech-based assistant that answers common questions about health, licences and government services in Kiswahili.",
        "Information about public services is hard to find, especially for people with low literacy.",
        "Speech recognition tuned for Tanzanian Kiswahili, delivered over phone calls and WhatsApp.",
        ["Support 5 service categories", "Reach 95% intent accuracy"],
        ["Speech AI", "NLP", "Python", "WhatsApp API"],
        "ai",
        "concept",
        "seed/innovations/fintech.jpg",
        "neema-mushi",
        ["neema-mushi", "rehema-nyerere"],
        "udsm",
        "Dar es Salaam",
        7300,
        530,
        date(2026, 11, 10),
        trending=True,
    ),
    innovation(
        "boda-safe",
        "BodaSafe",
        "Safety and earnings app for boda boda riders.",
        "Helmet-mounted crash detection with an app that logs trips, earnings and emergency contacts for motorcycle taxi riders.",
        "Boda boda riders face high accident risk and unstable income records.",
        "Crash detection sensors with automatic SMS alerts and an earnings diary usable for micro-loans.",
        ["Pilot with 300 riders in Moshi", "Partner with insurers"],
        ["Accelerometer", "Android", "SMS"],
        "mobility",
        "prototype",
        "seed/innovations/energy.jpg",
        "baraka-mwakyusa",
        ["baraka-mwakyusa", "amani-temba"],
        "kilihub",
        "Kilimanjaro",
        4800,
        360,
        date(2026, 9, 25),
    ),
]

OPPORTUNITIES = [
    {
        "slug": "climate-challenge-2026",
        "title": "Climate Resilience Innovation Challenge",
        "type": "Challenge",
        "organizer": "TIE Partners",
        "deadline": date(2026, 12, 15),
        "location": "Nationwide",
        "summary": "Solutions that help communities adapt to drought, floods and changing rainfall patterns.",
        "eligibility": ["Tanzanian innovators or teams", "Working prototype or pilot", "Clear plan for community impact"],
        "reward": "Up to TZS 50M in grants + mentorship",
        "categories": ["environment", "agriculture"],
    },
    {
        "slug": "health-hack",
        "title": "Digital Health Hackathon",
        "type": "Hackathon",
        "organizer": "Health innovation network",
        "deadline": date(2026, 12, 2),
        "location": "Dar es Salaam",
        "summary": "48-hour build sprint on maternal health, referrals and supply chains for medicines.",
        "eligibility": ["Teams of 3–5", "Students and professionals welcome"],
        "reward": "Prizes, incubation places and clinical mentors",
        "categories": ["health", "ai"],
    },
    {
        "slug": "research-seed",
        "title": "Applied Research Seed Fund",
        "type": "Grant",
        "organizer": "Research partners",
        "deadline": date(2027, 1, 31),
        "location": "Nationwide",
        "summary": "Early funding for university researchers turning lab work into usable technology.",
        "eligibility": ["Affiliated with a Tanzanian institution", "Defined research outcome within 12 months"],
        "reward": "Grants of TZS 10M – 30M",
        "categories": ["ai", "health", "energy", "agriculture"],
    },
    {
        "slug": "energy-fellowship",
        "title": "Off-Grid Energy Fellowship",
        "type": "Program",
        "organizer": "Energy access partners",
        "deadline": date(2026, 11, 30),
        "location": "Mbeya & Iringa",
        "summary": "Six-month fellowship placing engineers with rural energy enterprises.",
        "eligibility": ["Engineering graduates", "Willingness to work in rural regions"],
        "reward": "Monthly stipend + field training",
        "categories": ["energy"],
    },
    {
        "slug": "edtech-internship",
        "title": "EdTech Product Internship",
        "type": "Internship",
        "organizer": "Somo Offline team",
        "deadline": date(2026, 12, 20),
        "location": "Dodoma · Hybrid",
        "summary": "Join a student-led team building offline learning tools for secondary schools.",
        "eligibility": ["Final-year students", "Flutter or content design skills"],
        "reward": "Paid internship · 3 months",
        "categories": ["education"],
    },
    {
        "slug": "agri-data",
        "title": "Agri-Data Collaboration Call",
        "type": "Research",
        "organizer": "Agriculture research partners",
        "deadline": date(2027, 2, 14),
        "location": "Morogoro",
        "summary": "Partner with researchers to build open datasets on soil, yields and markets.",
        "eligibility": ["Data scientists, agronomists or startups", "Commitment to open data"],
        "reward": "Co-authorship, data access and travel support",
        "categories": ["agriculture", "ai"],
    },
]


class Command(BaseCommand):
    help = "Seed categories, institutions, innovators, innovations and opportunities from the original TIE catalogue."

    def add_arguments(self, parser):
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing seeded records instead of leaving them untouched.",
        )

    def handle(self, *args, **options):
        update = options["update"]
        media_root = Path(settings.MEDIA_ROOT)
        categories = {}
        created_counts = {"categories": 0, "institutions": 0, "users": 0, "innovations": 0, "opportunities": 0}

        for slug, en, sw, icon, order in CATEGORIES:
            category, created = Category.objects.update_or_create(
                slug=slug,
                defaults={"name_en": en, "name_sw": sw, "icon": icon, "order": order},
            ) if update else Category.objects.get_or_create(
                slug=slug, defaults={"name_en": en, "name_sw": sw, "icon": icon, "order": order}
            )
            categories[slug] = category
            created_counts["categories"] += int(created)

        institutions = {}
        for raw in INSTITUTIONS:
            data = dict(raw)
            focus = data.pop("focus")
            institution, created = (
                Institution.objects.update_or_create(slug=data["slug"], defaults={**data})
                if update
                else Institution.objects.get_or_create(slug=data["slug"], defaults={**data})
            )
            if created or update:
                institution.focus.set(categories[slug] for slug in focus)
            institutions[institution.slug] = institution
            created_counts["institutions"] += int(created)

        users = {}
        for raw in INNOVATORS:
            data = dict(raw)
            slug = data.pop("slug")
            interests = data.pop("interests")
            avatar = data.pop("avatar")
            institution_slug = data.pop("institution")
            defaults = {
                **data,
                "role": User.Role.INNOVATOR,
                "is_public": True,
            }
            user = User.objects.filter(slug=slug).first()
            created = False
            if not user:
                user = User.objects.create_user(
                    email=data["email"],
                    password=None,
                    slug=slug,
                    institution=institutions.get(institution_slug),
                    **{key: value for key, value in defaults.items() if key not in {"email"}},
                )
                created = True
            elif update:
                for key, value in defaults.items():
                    setattr(user, key, value)
                user.institution = institutions.get(institution_slug)
                user.save()
            if created or update:
                user.interests.set(categories[slug] for slug in interests)
                if avatar and not user.avatar:
                    path = media_root / avatar
                    if path.exists():
                        user.avatar.name = avatar
                        user.save(update_fields=["avatar"])
            users[slug] = user
            created_counts["users"] += int(created)

        for raw in INNOVATIONS:
            data = dict(raw)
            creator = users.get(data["creator"])
            if not creator:
                raise CommandError(f"Seed innovator {data['creator']} is missing")
            team = [users[slug] for slug in data["team"] if slug in users]
            image = data.pop("image")
            team_slugs = data.pop("team")
            created_at = timezone.make_aware(
                datetime.combine(data.pop("published_at"), datetime.min.time()).replace(hour=9),
                timezone.get_current_timezone(),
            )
            defaults = {
                **data,
                "category": categories[data["category"]],
                "institution": institutions.get(data["institution"]),
                "creator": creator,
                "status": Innovation.Status.PUBLISHED,
                "published_at": created_at,
            }
            innovation_obj = Innovation.objects.filter(slug=data["slug"]).first()
            created = False
            if not innovation_obj:
                innovation_obj = Innovation.objects.create(**defaults)
                created = True
            elif update:
                for key, value in defaults.items():
                    setattr(innovation_obj, key, value)
                innovation_obj.save()
            if created or update:
                innovation_obj.team.set(team)
                if image and not innovation_obj.image:
                    path = media_root / image
                    if path.exists():
                        innovation_obj.image.name = image
                        innovation_obj.save(update_fields=["image"])
            created_counts["innovations"] += int(created)

        for raw in OPPORTUNITIES:
            data = dict(raw)
            category_slugs = data.pop("categories")
            opportunity, created = (
                Opportunity.objects.update_or_create(
                    slug=data["slug"],
                    defaults={**data, "status": Opportunity.Status.PUBLISHED},
                )
                if update
                else Opportunity.objects.get_or_create(
                    slug=data["slug"],
                    defaults={**data, "status": Opportunity.Status.PUBLISHED},
                )
            )
            if created or update:
                opportunity.categories.set(categories[slug] for slug in category_slugs)
            created_counts["opportunities"] += int(created)

        summary = ", ".join(f"{count} {name}" for name, count in created_counts.items())
        self.stdout.write(self.style.SUCCESS(f"Seed complete: {summary} created."))
