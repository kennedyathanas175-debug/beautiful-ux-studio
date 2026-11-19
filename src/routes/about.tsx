import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Target, ShieldCheck, Users, Globe2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { photos, allPhotos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { PageIntro, PhotoCredit } from "@/components/site/bits";
import { LogoFull } from "@/components/site/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TIE – Tanzania Innovation Ecosystem" },
      {
        name: "description",
        content:
          "TIE connects innovators, students, researchers, institutions and startups across Tanzania in one national innovation platform.",
      },
      { property: "og:title", content: "About TIE – Tanzania Innovation Ecosystem" },
      {
        property: "og:description",
        content: "Our vision: a connected Tanzania where ideas become innovations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t, lang } = usePrefs();
  const sw = lang === "sw";
  const values = [
    {
      icon: ShieldCheck,
      title: sw ? "Uaminifu" : "Trust",
      body: sw
        ? "Taasisi zilizothibitishwa na umiliki wa wazi wa kila ubunifu."
        : "Verified institutions and clear ownership of every innovation.",
    },
    {
      icon: Users,
      title: sw ? "Ushirikiano" : "Collaboration",
      body: sw
        ? "Kuwaunganisha watu wenye ujuzi tofauti ili kutatua changamoto halisi."
        : "Connecting people with different skills to solve real problems.",
    },
    {
      icon: Globe2,
      title: sw ? "Ujumuishi" : "Inclusion",
      body: sw
        ? "Kwa kila mkoa, kwa Kiingereza na Kiswahili, kwenye simu yoyote."
        : "For every region, in English and Kiswahili, on any phone.",
    },
    {
      icon: Lightbulb,
      title: sw ? "Ubora" : "Excellence",
      body: sw
        ? "Kuonyesha kazi bora ya ubunifu ya Tanzania kwa dunia."
        : "Showcasing Tanzania's best innovation work to the world.",
    },
  ];
  return (
    <>
      <PageIntro
        eyebrow={t("nav.about")}
        title={sw ? "Kuhusu TIE" : "About TIE"}
        body={t("footer.tagline")}
        photo={photos.kilimanjaro}
      />

      <section className="container-tie grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">{sw ? "Sisi ni nani" : "Who we are"}</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {sw ? "Jukwaa la kitaifa la ubunifu" : "A national home for innovation"}
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {sw
              ? "TIE – Tanzania Innovation Ecosystem ni jukwaa la umma linalowaunganisha wabunifu, wanafunzi, watafiti, wasanidi programu, taasisi, kampuni changa na mashirika kote Tanzania. Tunatoa sehemu moja ya kidijitali ya kuonyesha kazi, kushirikiana, kugundua fursa na kubadilishana maarifa."
              : "TIE – Tanzania Innovation Ecosystem is a public platform connecting innovators, students, researchers, developers, creators, institutions, startups and organisations across Tanzania. It gives everyone one digital place to showcase work, collaborate, discover opportunities and share knowledge."}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border-l-4 border-gold bg-card p-5 shadow-card">
              <Eye className="size-5 text-azure" />
              <p className="mt-3 font-semibold text-foreground">{sw ? "Dira" : "Vision"}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {sw
                  ? "Tanzania iliyounganika ambapo mawazo yanakuwa ubunifu unaobadilisha jamii."
                  : "A connected Tanzania where ideas become innovations that transform society."}
              </p>
            </div>
            <div className="rounded-lg border-l-4 border-primary bg-card p-5 shadow-card">
              <Target className="size-5 text-azure" />
              <p className="mt-3 font-semibold text-foreground">{sw ? "Dhamira" : "Mission"}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {sw
                  ? "Kuwapa wabunifu mwonekano, washirika na fursa wanazohitaji kukua."
                  : "Give innovators the visibility, partners and opportunities they need to grow."}
              </p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg border shadow-lift">
          <img
            src={photos.serengeti.src}
            alt={photos.serengeti.place}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
          <PhotoCredit photo={photos.serengeti} />
        </div>
      </section>

      <section className="border-y bg-card py-14">
        <div className="container-tie">
          <p className="eyebrow">{sw ? "Maadili yetu" : "Our values"}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-lg border bg-background p-5">
                <span className="grid size-10 place-items-center rounded-md bg-navy text-navy-foreground">
                  <v.icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold text-foreground">{v.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-tie grid gap-8 py-14 md:grid-cols-[auto_1fr] md:items-center">
        <LogoFull className="border bg-card" />
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {sw ? "Nembo yetu" : "Our identity"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {sw
              ? "Herufi “i” imevaa rangi za bendera ya Tanzania, na ramani ya Tanzania iko ndani ya “E” — ishara ya ubunifu uliotoka na kwa ajili ya Tanzania."
              : "The “i” wears the colours of the Tanzanian flag and the map of Tanzania sits inside the “E” — innovation from Tanzania, for Tanzania."}
          </p>
          <Button asChild className="mt-5">
            <Link to="/explore">
              {t("hero.cta.explore")} <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-card py-10">
        <div className="container-tie">
          <h2 className="text-sm font-semibold text-foreground">
            {sw ? "Picha" : "Photo credits"}
          </h2>
          <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {allPhotos.map((p) => (
              <li key={p.source}>
                {p.place} —{" "}
                <a
                  href={p.source}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  {p.credit}
                </a>
                , {p.license}, via Wikimedia Commons
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
