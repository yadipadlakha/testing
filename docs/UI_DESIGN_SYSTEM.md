# UI Design System

Status: **Proposal.** Defines the design tokens, layout system, and component inventory for the Travel DMC CRM. Replaces the ad hoc indigo theme in the current MVP.

---

## 1. Design tokens

### 1.1 Color palette (as specified)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#0B1F33` | Deep navy — top nav background, sidebar background, headings on light surfaces where emphasis is needed, dark UI accents |
| `accent` (primary accent) | `#1677FF` | Primary actions (buttons, links, active nav item, focus ring), brand interactive color |
| `accent-secondary` | `#12B8A6` | Secondary emphasis — secondary buttons, chart series 2, positive-but-not-success indicators |
| `highlight` | `#F5A623` | Sparingly: featured/callout badges, "new" markers, highlight chart series — never for primary actions |
| `background` | `#F5F7FA` | App canvas background |
| `card` | `#FFFFFF` | Cards, panels, tables, modals, drawers |
| `text-primary` | `#172033` | Body text, headings on light surfaces |
| `text-secondary` | `#667085` | Muted/helper text, table secondary lines, placeholders |
| `success` | `#12B76A` | Success states, confirmed/paid badges, positive deltas |
| `warning` | `#F79009` | Warning states, pending/at-risk badges |
| `error` | `#F04438` | Error states, destructive actions, overdue/failed badges |

### 1.2 Token mapping to shadcn/ui (Tailwind CSS variables, light theme only for Phase 1)

```css
:root {
  --background: 220 27% 97%;      /* #F5F7FA */
  --foreground: 222 33% 15%;      /* #172033 */

  --card: 0 0% 100%;              /* #FFFFFF */
  --card-foreground: 222 33% 15%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 33% 15%;

  --primary: 209 62% 12%;         /* #0B1F33 */
  --primary-foreground: 0 0% 100%;

  --secondary: 168 46% 40%;       /* #12B8A6 */
  --secondary-foreground: 0 0% 100%;

  --accent: 214 100% 55%;         /* #1677FF */
  --accent-foreground: 0 0% 100%;

  --muted: 220 20% 94%;
  --muted-foreground: 220 9% 46%; /* #667085 */

  --destructive: 4 86% 58%;       /* #F04438 */
  --destructive-foreground: 0 0% 100%;

  --success: 145 63% 42%;         /* #12B76A */
  --warning: 32 95% 49%;          /* #F79009 */
  --highlight: 36 90% 55%;        /* #F5A623 */

  --border: 220 20% 88%;
  --input: 220 20% 88%;
  --ring: 214 100% 55%;           /* accent */

  --radius: 0.5rem;               /* 8px — see §2.4 on avoiding excessive rounding */
}
```

`accent` (`#1677FF`) is the shadcn "primary" *action* color (buttons, links, focus). `primary` (`#0B1F33`) is used as a **surface** color (nav/sidebar), not as the button color — this matches "clean sidebar" + "sticky top navigation" direction without producing an all-dark dashboard, which is explicitly to be avoided.

**Dark mode**: not in Phase 1 scope (explicit direction is a light, premium SaaS surface). The token structure above is dark-mode-ready (swap the `:root` block for a `.dark` block later) but no dark theme ships initially.

### 1.3 Accessibility notes on color

- `accent` (#1677FF) on white passes WCAG AA for large text/UI components (≥3:1) and is close to AA for normal text — **use it for buttons/links/icons, not for small dense body copy**; body copy stays `text-primary`/`text-secondary`.
- Status colors (`success`/`warning`/`error`/`highlight`) are used as **tinted backgrounds with a matching darker text tone** for badges (e.g. `success` background at 12% opacity + full-strength `success` text), not as solid fills with white text on small chips — this keeps contrast comfortable at small sizes and avoids the "childish colors" failure mode.
- Never introduce a page-local color. Any new semantic meaning (e.g. "draft" vs. "pending") maps to one of the existing tokens; if none fits, it's a design-system change, not a page-level choice (principle #29).

### 1.4 Typography

- Font: **Inter** (variable font), loaded via `next/font/google` — a neutral, highly legible enterprise SaaS face; replaces the current Geist default. (If brand guidelines later specify a different typeface, swap only the font-loading code — the type scale below stays.)
- Scale (Tailwind classes, 4px baseline):

| Role | Size / line-height | Weight |
|---|---|---|
| Page title | `text-2xl` (24/32) | 600 |
| Section/card title | `text-base` (16/24) | 600 |
| Body | `text-sm` (14/20) | 400 |
| Secondary/meta | `text-xs` (12/16) | 400–500 |
| Table header | `text-xs` (12/16), uppercase, tracked | 500 |
| Numeric/stat | `text-3xl` (30/36) | 600, tabular-nums |

- Numeric data (money, counts) always uses `tabular-nums` so columns align.

### 1.5 Spacing & radius

- Spacing scale: Tailwind default 4px base (`1`=4px … `6`=24px … `8`=32px).
- Card padding: `p-5` (20px) standard, `p-4` for dense/table-adjacent cards.
- Radius: `--radius: 0.5rem` (8px) for cards/inputs/buttons; **do not** use `rounded-2xl`/`rounded-3xl` anywhere (explicit "avoid excessive rounded cards" direction). Pills (badges, avatars) are the one exception (`rounded-full`).
- Shadows: one elevation only — `shadow-sm` for cards/popovers, `shadow-md` for modals/drawers. No stacked/soft glow shadows (explicit "avoid excessive shadows").

### 1.6 Motion

Per explicit direction ("no unnecessary animations; only when they improve UX"):

- **Allowed**: 150–200ms ease-out for drawer/modal enter-exit, popover/dropdown fade+scale, skeleton shimmer, toast enter-exit, tab underline slide.
- **Not allowed**: page-transition animations, decorative hover-lift on cards, animated gradients, bouncing/elastic easing, auto-playing carousels.
- Respect `prefers-reduced-motion`: all of the above collapse to instant/opacity-only when set.

---

## 2. Layout system

### 2.1 Application shell

```
┌───────────────────────────────────────────────────────────┐
│ Sticky top nav: logo, global search/command (⌘K), org      │
│ switcher (future multi-branch), notifications, user menu    │
├───────────┬───────────────────────────────────────────────┤
│           │ Breadcrumbs                                    │
│  Sidebar  ├───────────────────────────────────────────────┤
│  (icon +  │ Page header: title, primary action(s)          │
│  label,   ├───────────────────────────────────────────────┤
│  collaps- │                                                │
│  ible)    │  Content: filters bar → table/cards → pagination│
│           │  (or) form / detail layout with tabs            │
└───────────┴───────────────────────────────────────────────┘
```

- **Top nav**: `primary` (#0B1F33) background, white text/icons, sticky (`position: sticky; top: 0; z-index: 40`). Houses the command/search interface (`cmdk`), notification bell (drawer), and user menu (dropdown).
- **Sidebar**: white or very-light-tint background (not navy — keeps the app from reading as an "overly dark dashboard"), `accent`-colored active item with a left border indicator, icon (Lucide) + label, collapsible to icon-only on tablet widths.
- **Breadcrumbs**: every page below the top level shows one, using `text-secondary` with `accent` on the current/final segment link states.
- **Page header**: title + contextual primary action button(s) (e.g. "New Quotation"), right-aligned secondary actions (export, filters toggle) as icon buttons with tooltips.

### 2.2 Responsive behavior (desktop + tablet, per requirement)

| Breakpoint | Sidebar | Tables | Forms |
|---|---|---|---|
| Desktop (≥1280px) | Expanded (icon+label) | Full column set | Two-column field layout where sensible |
| Tablet (768–1279px) | Collapsible to icon-only, overlay on demand | Priority columns shown, rest behind a "columns" toggle; horizontal scroll as fallback, never silent truncation | Single-column field layout |
| < 768px | Out of scope for Phase 1 internal app (see PRD non-goals) | — | — |

### 2.3 Core interaction patterns (per explicit direction)

- **Command/search (⌘K)**: global entity search (leads, quotations, bookings) + quick actions ("New Lead", "New Quotation"), via `cmdk`.
- **Drawers**: right-side, for quick create/edit that doesn't need a full page (e.g. "Log interaction," "Add payment") and for detail "peek" views from a table row.
- **Modals**: centered, for confirmations and short single-purpose forms (e.g. "Delete lead?", "Change status").
- **Filters**: a persistent filter bar above tables (status, owner, date range, destination), each filter a popover, active filters shown as removable chips.
- **Tables**: sticky header, sortable columns, row-level contextual menu (kebab), status via badges (never raw enum text), pagination footer with page-size control.
- **Timeline / activity feed**: vertical timeline component for interaction history and audit history (icon per event type, timestamp, actor), reused across Lead detail, Booking detail, and the Admin audit log viewer.
- **Status badges**: one shared `<StatusBadge>` component mapping a status enum → tint + label, per module (pipeline stage, quotation status, booking status, payment status) — never a one-off colored `<span>` on a page.

### 2.4 Explicit anti-patterns (carried over from the brief)

No dark dashboards, no gradients as decoration, no `rounded-2xl`+ cards, no drop-shadow stacking, no saturated/"childish" accent colors beyond the four semantic + two brand accents above, no dense unfiltered tables without a filter bar, no default Bootstrap-style components (all components are shadcn/ui + Tailwind, themed to the tokens in §1).

---

## 3. Component inventory (shadcn/ui-based)

| Category | Components |
|---|---|
| Layout | AppShell, Sidebar, TopNav, Breadcrumbs, PageHeader, Tabs |
| Data display | DataTable (sortable, paginated), StatCard, StatusBadge, Timeline/ActivityFeed, Avatar, EmptyState, Skeleton (table/card/detail variants) |
| Forms | Form (RHF + Zod resolver wrapper), Input, Textarea, Select/Combobox, DatePicker, DateRangePicker, CurrencyInput, FileUpload |
| Feedback | Toast, AlertDialog (confirmations), InlineError, ErrorState (page-level), Banner (system-wide notices) |
| Overlays | Modal/Dialog, Drawer/Sheet, Popover, DropdownMenu, CommandMenu (⌘K) |
| Navigation | NavLink, Pagination, FilterBar/FilterChip |
| Charts (Recharts, themed to tokens) | BarChart, LineChart, DonutChart (pipeline/status breakdowns), Sparkline |

### 3.1 Required states per data view (principle #25)

Every list/detail view ships all four states, not just the happy path:

1. **Loading** — skeleton matching the eventual layout (never a bare spinner for list/table views).
2. **Empty** — `EmptyState` with an icon, one-line explanation, and the primary action to resolve it (e.g. "No leads yet — Add your first lead").
3. **Error** — `ErrorState` with a human message and a retry action; raw error text/stack never shown to the user.
4. **Populated** — the real content.

---

## 4. From current implementation to target

The current hand-rolled `src/components/ui/*` (button, input, card, badge, select, textarea, label) are structurally similar to shadcn/ui's API (they're `class-variance-authority`-based already) but are themed to a default indigo palette and are missing most of the inventory above (no table, drawer, modal, command menu, toast, skeleton, empty/error states). Phase 0 of the roadmap replaces them with shadcn/ui's generator output re-themed to the tokens in §1, rather than hand-extending the current set.
