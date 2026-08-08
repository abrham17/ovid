import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_TAGLINE } from "@/lib/constants";
import {
  HardHat,
  Shield,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  Layers,
  Building2,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: ClipboardCheck,
      title: "Daily Reports",
      desc: "Paperless daily site diaries with engineered progress, resources, weather, and stoppages.",
    },
    {
      icon: Shield,
      title: "Quality & HSE",
      desc: "ITRs, defect logs, safety incidents, and regulatory compliance tracking.",
    },
    {
      icon: BarChart3,
      title: "Cost & Commercial",
      desc: "BOQ, measurements, variation orders, procurement, and budget tracking.",
    },
    {
      icon: Building2,
      title: "Enterprise Roles",
      desc: "16 roles from Foreman to Client Rep with precise, FIDIC-aligned permissions.",
    },
  ];

  const stats = [
    { label: "User roles", value: "16" },
    { label: "Modules", value: "14" },
    { label: "Reports", value: "Real-time" },
    { label: "Compliance", value: "FIDIC" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1c1613 0%, #2c1810 50%, #2c2420 100%)" }}>
      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
+
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-sand-400 hover:text-sand-200 hover:bg-sand-800/30">
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="premium">
              Get started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <Badge variant="outline" className="mb-6 border-terracotta-700/50 text-terracotta-300 bg-terracotta-950/50 px-4 py-1.5 text-xs font-semibold">
          <Layers className="mr-1.5 h-3.5 w-3.5" />
          Grade-1 Construction Project Management
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight text-sand-50 sm:text-5xl lg:text-6xl text-balance leading-tight">
          Construction control
          <br />
          <span className="bg-gradient-to-r from-sand-200 via-sand-100 to-sand-50 bg-clip-text text-transparent font-serif italic">
            built for Ethiopian practice
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-sand-400 leading-relaxed">
          {APP_TAGLINE}. Daily reports, WBS, quality, HSE, cost, procurement and
          FIDIC-aligned workflows in one platform.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" variant="premium" className="text-base px-8 shadow-lg" style={{ boxShadow: "0 4px 20px rgba(192, 73, 40, 0.35)" }}>
              Enter workspace
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="border-sand-600/50 text-sand-300 hover:bg-sand-800/30 hover:text-sand-100 text-base"
            >
              Sign in
            </Button>
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-sand-700/20 bg-sand-900/20 p-4 backdrop-blur"
            >
              <p className="font-serif text-2xl font-bold text-sand-100">{s.value}</p>
              <p className="text-xs text-sand-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div className="mt-20">
          <h2 className="font-serif text-xl font-bold text-sand-100 text-center mb-8">
            Everything you need to run a project
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-sand-700/20 bg-sand-900/20 p-6 text-left backdrop-blur transition-all duration-200 hover:bg-sand-900/30 hover:border-terracotta-600/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta-500/10 text-terracotta-300 group-hover:bg-terracotta-500/20 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-sand-100">{f.title}</h3>
                <p className="mt-2 text-sm text-sand-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>


      </main>
    </div>
  );
}