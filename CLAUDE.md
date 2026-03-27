# Advanced Think Tank Project

## Overview
Advanced Think Tank - React + Vite + TypeScript application with Supabase backend.
Figma-to-code generated UI using shadcn/ui (Radix UI) + Tailwind CSS v4 + MUI.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS v4
- **UI Libraries**: shadcn/ui (Radix UI primitives), MUI, Lucide icons
- **Animation**: Motion (Framer Motion), tw-animate-css
- **State/Forms**: react-hook-form, react-dnd
- **Backend**: Supabase (auth, database, storage, edge functions)
- **Automation**: n8n (Docker on Hetzner VPS) — workflow automation, integrations, AI pipelines
- **Infrastructure**: Hetzner VPS (Docker), SSH access
- **Package Manager**: pnpm

## Project Structure
```
ET/                          # Main application directory
├── src/
│   ├── main.tsx             # Entry point
│   ├── app/
│   │   ├── App.tsx          # Root component (ThemeProvider wrapper)
│   │   └── components/
│   │       ├── LeftNav.tsx       # Navigation sidebar
│   │       ├── SourceStrip.tsx   # Source display strip
│   │       ├── QueryArea.tsx     # Search/query input
│   │       ├── AnswerArea.tsx    # Results display
│   │       ├── RightSidebar.tsx  # Right panel
│   │       ├── ThemeToggle.tsx   # Dark/light mode toggle
│   │       ├── figma/            # Figma-specific components
│   │       └── ui/              # 50+ shadcn/ui components
│   └── styles/              # Global styles, Tailwind imports
├── public/                  # Static assets
├── package.json
├── vite.config.ts           # Vite + React + Tailwind plugins, @ alias
└── index.html
```

## Commands
- `cd ET && pnpm dev` — Start dev server
- `cd ET && pnpm build` — Production build
- `cd ET && pnpm install` — Install dependencies

## Code Conventions
- ES modules only (import/export)
- Functional components with hooks
- Path alias: `@/` maps to `./src/`
- Tailwind CSS for styling (no inline styles)
- shadcn/ui patterns for new UI components
- Use `cn()` from `@/lib/utils` for class merging (clsx + tailwind-merge)
- Lucide React for icons
- Dark mode via `next-themes` ThemeProvider with `class` attribute

## Architecture Rules
- NEVER modify files in `src/app/components/ui/` unless explicitly asked — these are shadcn/ui primitives
- New features go in `src/app/components/` or new feature directories under `src/`
- Keep components small and focused — extract when > 150 lines
- Colocate related files (component + types + hooks + tests)
- Use barrel exports sparingly — prefer direct imports

## Supabase
- Supabase MCP is enabled for direct database/auth operations
- Use Supabase client from `@supabase/supabase-js`
- Row Level Security (RLS) on all tables
- Edge Functions for server-side logic

## Git Workflow
- Branch naming: `feature/*`, `fix/*`, `chore/*`, `refactor/*`
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`
- Always create PR, never push directly to main
- Run build check before committing

## Quality Standards
- TypeScript strict mode — no `any` types unless absolutely necessary
- Handle loading, error, and empty states for all async operations
- Accessible components (ARIA labels, keyboard navigation)
- Mobile-responsive layouts
- No console.log in production code

## Infrastructure
- **Hetzner VPS**: Docker host running n8n and supporting services
- **n8n**: Workflow automation at `${N8N_BASE_URL}` — API at `${N8N_API_URL}`
- **SSH MCP**: Direct shell access to VPS for server management
- **Hetzner MCP**: Cloud API for server provisioning, snapshots, firewalls
- Use `/vps-health` to check server status, `/docker-manage` for containers

## Agent Hierarchy
- **Master Orchestrator** (`master-orchestrator`): Top-level coordinator — delegates complex tasks to 45 specialist agents
- Use `/orchestrate` for multi-agent complex tasks
- For simple tasks, agents are auto-selected by Claude based on context
- 23 MCP servers, 114 skills, 45 agents available

## IMPORTANT
- Working directory for all commands is `ET/` subdirectory
- The `@` path alias resolves to `ET/src/`
- Always verify builds pass after changes: `cd ET && pnpm build`
- Use `context7` MCP for up-to-date library documentation (add "use context7" to prompts)
- VPS env vars needed: `VPS_HOST`, `VPS_USER`, `N8N_BASE_URL`, `N8N_API_URL`, `N8N_API_KEY`, `HCLOUD_TOKEN`
