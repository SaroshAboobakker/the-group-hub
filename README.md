# The Group Hub

A small, dark community chat for Marc, Willson, Nando, and Rosh. Built with React, TypeScript, Vite, and Supabase.

## Run locally

```sh
npm install
npm run dev
```

The checked-in `.env.example` contains the project's browser-safe URL and publishable key. Copy it to `.env.local` for local use. A publishable key is intended for browser use; never put a service-role or secret key in a client-side environment variable.

## Backend

The Supabase project is **The Group Hub** in Sarosh Org (`psaiiihyfhgvjzgirxzx`). Its `public.messages` table stores a UUID id, member name, message text, and creation timestamp. Row Level Security is enabled, and the table is included in the `supabase_realtime` publication so new messages appear live. GitHub Actions builds and deploys the app to Pages on pushes to `main`.

This version deliberately uses a public-link access model. Anyone with the site URL can read the conversation and submit a message under any of the four names. The member selector is an identity label stored for the browser session, not authentication or a privacy boundary. Do not use this setup for sensitive conversations. Add Supabase Auth and member allow-list policies before treating the chat as private.

## Database migration

The schema is recorded at `supabase/migrations/20261106000100_create_group_hub_messages.sql`.
