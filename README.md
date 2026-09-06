# Ovid PMS — Construction Project Management System

**Ovid Construction PLC** project controls platform aligned with Ethiopian Grade-1 practice, ISO 9001/10006 document control, and FIDIC workflows.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma 6 |
| Auth | Custom JWT (jose) + httpOnly cookies + bcrypt |
| Validation | Zod |
| UI | Tailwind CSS 4, custom shadcn-style components, Lucide icons |

## Project structure

```
ovid/
├── prisma/
│   ├── schema.prisma          # Full 14-domain data model
│   ├── seed.ts                # Demo org, users, sample project
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, accept-invitation
│   │   ├── (dashboard)/       # Authenticated shell
│   │   │   ├── dashboard/     # Role-specific dashboards
│   │   │   └── projects/      # Project list + workspace modules
│   │   └── api/               # REST API routes
│   │       ├── auth/
│   │       ├── projects/
│   │       ├── invitations/
│   │       └── dashboard/
│   ├── components/
│   │   ├── dashboards/        # 16 role dashboards
│   │   ├── projects/          # Sidebar, views (WBS, daily, quality…)
│   │   ├── bulk-invite/       # Full invite wizard
│   │   └── ui/                # Primitives
│   ├── lib/
│   │   ├── auth.ts            # Session, login, JWT
│   │   ├── permissions.ts     # RBAC matrix (role × resource × action)
│   │   ├── db.ts              # Prisma client
│   │   ├── api.ts             # Response helpers + error handling
│   │   ├── constants.ts
│   │   ├── validations/       # Zod schemas per domain
│   │   └── services/          # Business logic (project, daily, quality, safety, invitation, dashboard)
│   └── generated/prisma/      # Prisma client output
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Domains covered

1. **Organization & Users** — parties, roles, memberships, invitations  
2. **Projects & Contracts**  
3. **WBS**  
4. **Schedule** (activities, dependencies, stoppages)  
5. **Daily reports** (earthwork / structure / rebar)  
6. **Cost / BOQ / Measurements / Variation Orders**  
7. **Risk**  
8. **HSE** (observations + incidents)  
9. **Quality** (ITRs, defects, punch lists)  
10. **Labor / HR**  
11. **Equipment**  
12. **Materials & Procurement**  
13. **Takeoff / Structural quantities**  
14. **Documents, decisions, lessons, notifications, audit**

## API surface (current)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Credentials → session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/accept-invitation` | Accept invite + set password |
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH | `/api/projects/:id` | Project detail / update |
| GET/POST | `/api/projects/:id/wbs` | WBS tree / create node |
| GET/POST | `/api/projects/:id/daily` | Daily reports (earthwork/structure/rebar) |
| GET/POST | `/api/projects/:id/quality` | ITRs, defects, punches |
| GET/POST | `/api/projects/:id/safety` | Observations & incidents |
| GET/POST | `/api/invitations` | List / bulk create invitations |
| GET | `/api/dashboard` | Role metrics |

All mutating routes enforce **session + RBAC** via `requireSession` → `assertPermission` → `assertProjectAccess`.

## Getting started

```bash
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET

npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed

npm run dev
```

Open http://localhost:3000 → Sign in with seeded accounts (password: `password123`).

Company-tier demo accounts are organization-scoped and intentionally have no
project memberships:

| Company role | Demo email |
| --- | --- |
| General Manager | `gm@ovid.com` |
| Legal Service Manager | `legal.manager@ovid.com` |
| Head Tendering | `head.tendering@ovid.com` |
| Tendering Officer | `tendering.officer@ovid.com` |
| Head Planning & Monitoring | `head.planning@ovid.com` |
| Planning Officer | `planning.officer@ovid.com` |
| Engineering Department Manager | `engineering.manager@ovid.com` |
| Head Engineering Services | `head.engineering.services@ovid.com` |
| Engineering Services Officer | `engineering.services.officer@ovid.com` |
| Equipment Administration Manager | `equipment.admin@ovid.com` |
| Finance Department Manager | `finance.manager@ovid.com` |
| Internal Auditor | `internal.auditor@ovid.com` |

The project-level Office Engineer demo account is `officeengineer@ovid.com`.
The technical administrator is `admin@ovid.com` and has no company business
approval assignment.

## RBAC

See `src/lib/permissions.ts`. Project and company permissions use separate matrices. Project access is normally membership-scoped; active company assignments receive organization-wide read access only where their company permission allows it.

## UI highlights

- Role-specific dashboards (Foreman → Client Rep)
- Project workspace with module sidebar (WBS, Daily, Quality, Safety, Team…)
- Bulk invitation wizard (CSV/Excel import, validation, progress)
- Status badges, data tables, empty states, emerald construction theme

## Next steps (suggested)

- Server Actions for form mutations alongside REST
- Schedule Gantt / CPM view
- Measurement & VO approval workflows
- File attachments for documents & ITRs
- Real-time notifications
- Mobile-optimised field entry
# ovid
