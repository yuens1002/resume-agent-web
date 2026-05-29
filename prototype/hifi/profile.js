/* profile.js — Sunny Yuen's canonical profile (from seed-profile.json),
   shaped for the hi-fi prototype. Attached to window for all scripts. */
window.PROFILE = {
  contact: {
    name: "Sunny Yuen",
    role: "Frontend / Full-stack Engineer",
    email: "syuen@sbgrp.cc",
    calendly: "https://calendly.com/syuen-sbgrp/get_to_know_you",
    github: "https://github.com/yuens1002",
    linkedin: "https://linkedin.com/in/yuens-me/",
    gpt: "https://chatgpt.com/g/sunny-yuen",
    site: "https://yuen.me",
    mcp: "https://yuen.me/public-mcp",
  },
  summary:
    "Frontend engineer with 6+ years shipping user-centric web applications across startups and government. Deep in the Vue & React ecosystems, end-to-end testing, and accessibility (508/WCAG) — with recent, hands-on AI/ML integration work in TypeScript.",
  availability: {
    status: "Open to work",
    detail: "Actively looking · remote",
    roles: ["Frontend Engineer", "Full-Stack Engineer", "Software Engineer"],
    remote: true,
  },
  skills: [
    { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "Go", "HTML/CSS"] },
    { category: "Frameworks", items: ["Vue.js", "React", "Next.js", "Tailwind", "LangChain"] },
    { category: "Testing", items: ["Jest", "Playwright", "Cucumber", "RTL"] },
    { category: "Data & APIs", items: ["PostgreSQL", "Prisma", "REST", "GraphQL"] },
    { category: "Practices", items: ["CI/CD", "SAFe Agile", "508 / WCAG"] },
  ],
  employment: [
    { company: "Self-Employed", title: "Application Developer", period: "2023 — now", current: true,
      bullets: [
        "Launched a full-stack Next.js application from inception with a CI/CD pipeline on Vercel.",
        "Built an open-source e-commerce platform with an AI-powered storefront and a secure analytics admin.",
      ] },
    { company: "Wipro", title: "Frontend Developer", period: "2023",
      bullets: [
        "Spearheaded a custom web app for LAX airport — dynamic reporting + an org directory.",
        "Built responsive mobile-first UI in Next.js / React / TypeScript from Figma specs.",
      ] },
    { company: "DesignIt", title: "Software Developer", period: "2022",
      bullets: [
        "Extended the Coherence Design System with type-safe functional components.",
        "Lifted unit-test coverage from 50% → 80%+ (Jest, RTL); resolved 508/WCAG issues.",
      ] },
    { company: "MetroStar Systems", title: "Frontend Developer", period: "2020 — 22",
      bullets: [
        "Built automated 508 + quality tests (Jest, Playwright, Cucumber) for the US Census Bureau.",
        "Shipped self-contained Vue.js apps on a Drupal content backend; refactored Farmers.gov theme.",
      ] },
    { company: "Remine", title: "Software Engineer", period: "2019 — 20",
      bullets: [
        "Delivered cross-product features for a real-estate intelligence app used by national brokerages.",
        "Worked both ends — React/Redux frontend and REST/GraphQL backend; owned global UI components.",
      ] },
    { company: "DealerOn", title: "Front-End Developer", period: "2017 — 19",
      bullets: [
        "Built data-intensive SPAs for a client-facing operations system (Vue.js / Vuetify).",
        "Partnered with UX on prototypes and user testing; data viz with Google Charts.",
      ] },
  ],
  education: [
    { school: "Seattle University", line: "Certificate, Web Development", year: "2016" },
    { school: "University of Washington", line: "Bachelor of Arts", year: "1999" },
  ],
  projects: [
    {
      slug: "artisan-roast",
      name: "Artisan Roast Platform",
      featured: true,
      status: "active",
      period: "2025 — now · v0.97",
      tagline: "Open-source e-commerce for specialty coffee, built with an AI-native workflow.",
      problem:
        "Independent coffee shops lack affordable, purpose-built e-commerce. Generic platforms are costly and ill-fitted to specialty-coffee workflows, and non-technical owners have no viable self-hosted option.",
      role: "Sole developer & architect — open-source store, SaaS layer, and the agentic dev workflow, end to end.",
      tech: ["Next.js 16", "TypeScript", "Prisma", "Neon Postgres", "Stripe", "NextAuth v5", "Tailwind", "shadcn/ui", "Claude Agent SDK", "Gemini", "Playwright"],
      highlights: [
        "Shipped a complete coffee-native commerce platform solo — 118 API routes, 39 Prisma models, 638 TS files.",
        "Built a nightly QA agent (Claude Agent SDK + Playwright) that reads accessibility trees to verify 16 acceptance criteria and auto-files GitHub issues on regression.",
        "Formalized a 6-phase agentic feature loop with sub-agent AC verification and a pre-commit verification state machine.",
        "AI personalization engine learns from activity to power recommendations and a natural-language shop assistant.",
        "SaaS monetization layer: Stripe Billing, tiered plans, license key generation, telemetry ingestion.",
      ],
      architecture:
        "Two-repo design — open-source store + a separate SaaS platform on the same stack, served from one Vercel project via hostname routing. Store instances validate licenses and phone home telemetry. Claude is a first-class dev tool throughout.",
      impact: "Live at artisanroast.app with weekly releases. Free tier, support plans, and add-ons shipped; managed hosting + AI back-office in active development.",
      links: { demo: "https://demo.artisanroast.app", repo: "https://github.com/yuens1002/artisan-roast" },
    },
    {
      slug: "resume-agent",
      name: "Resume Agent",
      status: "in-progress",
      period: "2026",
      tagline: "An A2A-compatible agent that makes a professional profile machine-queryable.",
      problem:
        "AI systems are increasingly the first pass in hiring, yet most candidates have no structured, queryable representation an agent can interrogate directly.",
      role: "Sole developer & architect.",
      tech: ["Node.js", "TypeScript", "Hono", "Supabase", "PostgreSQL", "Anthropic Claude", "Vercel AI SDK", "Zod"],
      highlights: [
        "Designed a deterministic job-fit model — AI gives categorical sub-judgments, code computes a weighted (50/30/20) score for auditable results.",
        "A2A agent-card autodiscovery (/.well-known/agent-card.json) for AI interoperability.",
        "Caller detection adapts tone for an ATS, a recruiter, or another AI agent.",
        "Singleton-profile API with Supabase RLS — public read-only, service-role-only writes.",
      ],
      architecture:
        "Hono server on Node. Single profile row in Supabase (singleton via CHECK constraint). AI routes use the Vercel AI SDK with provider abstraction — Sonnet for scoring, Haiku for light routes.",
      impact: "Built to be discovered and queried by employer AI, ATS tools, and personal LLM agents — over HTTP, MCP, or a QR code at networking events.",
      links: { repo: "https://github.com/yuens1002/resume-agent" },
    },
    {
      slug: "artisan-roast-platform",
      name: "Artisan Roast — SaaS Layer",
      status: "in-progress",
      period: "2025 — now",
      tagline: "Managed hosting, billing, and an AI back-office over the open-source store.",
      problem:
        "Self-hosting the store needs DevOps skill. The SaaS layer removes that barrier — a managed instance, Stripe billing, and AI tools with zero ops.",
      role: "Sole developer & architect.",
      tech: ["Next.js", "TypeScript", "Prisma", "Neon Postgres", "Stripe", "MCP protocol", "Claude API", "Vercel"],
      highlights: [
        "Provisioning pipeline spins up a fully configured store (db, auth, Stripe, domain) on checkout.",
        "AI back-office MCP server gives owners natural-language access to orders, inventory, and analytics.",
        "Migration pipeline for self-hosted → managed, modeled as a state machine.",
      ],
      architecture: "Multi-tenant SaaS on the same Next.js / Prisma / Neon stack, integrated with the open-source store via license validation + telemetry.",
      impact: "In active development alongside the open-source platform.",
      links: { repo: "https://github.com/dev-yuen-agency/artisan-roast-platform" },
    },
  ],
};
