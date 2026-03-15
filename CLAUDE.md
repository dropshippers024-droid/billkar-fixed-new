# BillKar — Project Context for Claude

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (to be connected — auth, database, storage)
- **Payments**: Razorpay (to be connected — subscription billing)

## Plan Tiers

### Free Plan
- 50 invoices/month
- 3 invoice templates
- WhatsApp + Email sharing
- Expense tracking
- No watermark
- PDF download
- 1 business, 1 user

### Pro Plan — ₹399/month
- Unlimited invoices
- All 8 templates
- UPI QR on invoices
- Payment reminders
- Recurring invoices
- GSTR-1 export
- 3 team members
- Priority support

### Business Plan — ₹799/month
- Everything in Pro
- 10 team members
- Excel + PDF report exports
- Multi-business (up to 5)
- Priority WhatsApp support

## Key Files
- `src/lib/authStore.ts` — Auth state (localStorage-based, getUser/login/logout)
- `src/lib/businessStore.ts` — Business profile state
- `src/lib/planStore.ts` — Plan/tier state
- `src/pages/Settings.tsx` — Settings page with Profile, Business, Billing, Team, Notifications tabs
- `src/components/invoice/` — Invoice creation components
- `src/components/dashboard/` — Dashboard shell, sidebar, topbar, widgets

## Conventions
- Use `getUser()` from `@/lib/authStore` for current user data (name, email)
- Use `getBusinessProfile()` / `setBusinessProfile()` from `@/lib/businessStore` for business data
- shadcn/ui components live in `src/components/ui/`
- Framer Motion used for page/section animations
- Toast notifications via `sonner`
