# Frontend Structure

The frontend is organized by responsibility:

- `api/`: backend clients and request helpers.
- `components/ui/`: reusable UI primitives shared across features.
- `components/layout/`: app shell, sidebar, and header.
- `components/marketing/`: public website layout pieces.
- `features/admin/`: admin-only user, document, and match routes.
- `features/auth/`: login and OAuth callback UI.
- `features/dashboard/`: role-aware dashboard container.
- `features/documents/`: CV/JD mapping, API state hooks, edit/delete/detail UI.
- `features/interview/`: interview wizard, result, and legacy interview surfaces.
- `features/onboarding/`: role/plan onboarding flow.
- `features/user/`: profile and user-account UI.
- `pages/`: route wrappers wired into React Router.
- `utils/`: browser/session/theme helpers.
- `config/`: runtime configuration.

Rules:

- Shared visual primitives belong in `components/ui`.
- Feature-specific screens stay inside `features/<domain>`.
- Route files in `pages` should stay thin when a feature grows.
- Avoid long helper copy in UI; use labels, states, and concise errors.
- Prefer barrel imports from `components/ui`, `components/layout`, `api`, and feature indexes.
- Admin routes must stay under `/admin/*`; admin must not see interview/practice entrypoints.
- `features/aiInterview/components/shared` is a compatibility layer only. New shared UI goes in `components/ui`.
