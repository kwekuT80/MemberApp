# Member App — Project Context

## Architecture Overview

This is a dual-platform application for the KSJI Commandery member registration system.

### Web Application (Next.js 15)

- **Framework**: Next.js 15 App Router with TypeScript
- **Styling**: Tailwind CSS (`web/src/app/globals.css`)
- **Database/Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Deployment**: Vercel (`vercel.json`)

**Key directories:**
- `web/src/app/` — Next.js App Router pages (registrar dashboard, verify, login)
- `web/src/components/` — Reusable UI components (layout shell, forms, tables)
- `web/src/lib/supabase/` — Supabase client utilities (`server.ts`, `middleware.ts`)
- `web/src/lib/auth/` — Auth helpers (`requireUser.ts`, `getCurrentProfile.ts`)
- `web/src/types/` — TypeScript interfaces (member, position)

**Routes:**
- `/registrar/members` — Member list/search table
- `/registrar/members/[id]` — Member detail page
- `/registrar/members/[id]/dossier` — Full dossier view
- `/registrar/members/[id]/bio` — Biography section
- `/registrar/members/[id]/id-card` — ID card generation
- `/registrar/import` — Bulk import functionality
- `/registrar/reports` — Report generation
- `/verify/[id]` — Public verification page

**Auth pattern**: `requireUser()` in `web/src/lib/auth/requireUser.ts` enforces login on registrar routes. Middleware (`web/src/lib/supabase/middleware.ts`) manages Supabase cookie sessions.

---

### Mobile Application (React Native + Expo)

- **Framework**: React Native 0.74.5 with Expo SDK 51
- **Navigation**: @react-navigation/native + native-stack
- **Database/Auth**: Supabase JS client
- **Build System**: EAS Build (`eas.json`) — Android APK preview, AAB production

**Key dependencies:**
- `expo-image-picker` — Photo capture/upload
- `expo-print` / `expo-sharing` — PDF export functionality
- `@react-native-picker/picker` — Native select dropdowns
- `react-native-screens` — Navigation optimization

---

## Shared Data Model (Member Interface)

Defined in `web/src/types/member.ts`. Fields include: personal info, contact details, family members, employment, uniform positions, degree/chapter information, burial/transfer records, and photo URL.

---

## Key Patterns & Conventions

1. **Authentication**: Supabase auth via middleware cookies; `requireUser()` enforces login on registrar routes
2. **Type Safety**: Full TypeScript across web (`@types/react`, `typescript ^5.8`); mobile has `~5.3.3`
3. **API Layer**: Services in `web/src/services/` (memberService, photoService)
4. **Validation**: Dedicated validation modules (`web/src/lib/validation/`)
5. **Build**: EAS for mobile distribution; `next build` for web

---

## Running the Project

### Web
```bash
cd web
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
```

### Mobile
```bash
npx expo start     # Development (uses app.json)
eas build --platform android  # Android APK preview
eas build --platform android --profile production   # AAB for store
```

---

## Git History Summary

Recent major work: offline caching, QR codes, bulk import, verification page, rank display fixes, and Android photo upload improvements.
