# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: Blockestate 3.0

Overview
- Monorepo with a Next.js (TypeScript) frontend and a Django backend.
- Data layer integrates with IBM Cloudant via a custom client.
- Local dev workflow: run Django API on :8000 and Next.js app on :3000. CORS is preconfigured for localhost:3000.

Common commands (Windows PowerShell)

Frontend (Next.js) — D:\Blockestate\Blockestate_3.0\frontend
- Install deps (Bun lockfile present):
  bun install
- Dev server (Turbopack):
  bun run dev
  # opens http://localhost:3000
- Production build and start:
  bun run build
  bun run start
- Lint:
  bun run lint

Notes
- No frontend test script is defined in package.json.
- next.config.ts enables a custom Turbopack loader at src/visual-edits/component-tagger-loader.js and allows remote images from any host.

Backend (Django) — D:\Blockestate\Blockestate_3.0\project
- Create/activate venv (example):
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
- Install required packages (inferred from imports/settings):
  pip install django python-decouple ibmcloudant ibm-cloud-sdk-core django-cors-headers
- Apply migrations and runserver:
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
- Run all tests:
  python manage.py test
- Run a single test (patterns):
  # by module/package
  python manage.py test authentication.tests
  # by TestCase class
  python manage.py test authentication.tests:MyTestCase
  # by method
  python manage.py test authentication.tests:MyTestCase.test_something

Environment configuration
- Email: settings.py reads EMAIL_HOST_USER and EMAIL_HOST_PASSWORD via python-decouple.
  # PowerShell example (do NOT commit secrets)
  $env:GMAIL_USER = "{{GMAIL_USER}}"
  $env:GMAIL_APP_PASSWORD = "{{GMAIL_APP_PASSWORD}}"
- CORS: settings.py allows http://localhost:3000 and 127.0.0.1:3000.
- Database: default is SQLite for Django; domain data is stored/fetched from IBM Cloudant using project/project/utils/cloudant_client.py.

Integration and local smoke test
- The repo includes debug_frontend_api.js to probe the auth verify endpoint:
  node D:\Blockestate\Blockestate_3.0\debug_frontend_api.js
- Default endpoints (mounted in project/project/urls.py):
  /verify, /verify-otp from authentication app
  /api/property/... from property app

High-level architecture
- Frontend (frontend/)
  - Next.js 15 + React 19, TypeScript, TailwindCSS 4.
  - Uses Turbopack and a custom loader (src/visual-edits/component-tagger-loader.js) via next.config.ts.
  - Pages for dashboard, marketplace, properties, chats, verification, etc. API calls live under src/lib/api.ts.
- Backend (project/)
  - Django 5.1 skeleton with two apps:
    - authentication: Aadhaar/PAN verification -> email OTP flow backed by Cloudant lookups (OTP stored in-memory for dev).
      • Endpoints: /verify (POST), /verify-otp (POST), /testform (GET)
    - property: property queries, marketplace listing, and a basic chat system between buyer/seller.
      • Endpoints mounted at /api/property/:
        - user-properties (GET), property/<id> (GET), flag-property-for-sale (POST), marketplace (GET), user-profile (POST), dev/seed (POST)
        - chats: initiate (POST), send-message (POST), <chat_id>/messages (GET with optional ?user_email=), <chat_id>/info (GET), user-chats (POST)
  - project/project/utils/cloudant_client.py centralizes Cloudant operations:
    • users and identity: app-users, govt-citizen
    • properties: property-details, registered_for_sale (also register-for-sale seen in comments), plus convenience functions
    • chat: property-chats (chat docs), chat-messages (message docs)
  - settings highlights:
    • INSTALLED_APPS includes corsheaders, authentication, property
    • CORS allowed origins for localhost:3000
    • EMAIL_* configured via decouple; SMTP via Gmail (for dev)

Conventions and gotchas
- OTP storage in authentication.views is in-memory (OTP_STORE) — suitable only for local dev.
- Some Cloudant collection names vary in comments vs. code (e.g., registered_for_sale vs register-for-sale). Prefer the ones used in cloudant_client functions when seeding/querying.
- Frontend expects the API at http://localhost:8000 (see debug_frontend_api.js and CORS settings). Ensure the backend is running before UI flows.

Short how-to for common tasks
- Start backend then frontend:
  # backend
  .\.venv\Scripts\Activate.ps1
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
  # frontend (separate terminal)
  bun install
  bun run dev
- Seed dev data (enables a user and a property when DEBUG=True):
  Invoke-WebRequest -Uri "http://localhost:8000/api/property/dev/seed/" -Method POST
- List a property for sale:
  $body = @{ property_id = "P-001"; price = 999 } | ConvertTo-Json
  Invoke-WebRequest -Uri "http://localhost:8000/api/property/flag-property-for-sale/" -Method POST -ContentType 'application/json' -Body $body
