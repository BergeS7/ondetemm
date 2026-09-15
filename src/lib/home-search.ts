// Default search params for the "/" route (see its `searchSchema` in routes/index.tsx).
// Shared so any `<Link to="/">` elsewhere in the app (nav, footer, breadcrumbs) can satisfy
// the route's fully-required search type without duplicating these defaults or importing
// the route module itself (which would create a circular import with site-shell.tsx).
export const homeSearch = {
  q: "",
  state: "ma",
  city: "santa-ines",
  category: "",
  neighborhood: "",
  page: 1,
  sort: "relevance" as const,
  open_now: false,
  has_promotion: false,
};
