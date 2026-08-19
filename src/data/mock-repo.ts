/**
 * MOCK DATA ONLY — static fixtures used to develop and demonstrate the UI.
 *
 * Nothing here talks to GitHub, no analysis happens, no AST is parsed.
 * When the backend exists, these shapes are what the API layer should return
 * so the UI can be swapped over without component changes.
 */

export type NodeKind =
  | "file"
  | "module"
  | "component"
  | "function"
  | "class"
  | "method"
  | "type"
  | "variable"
  | "api_route"
  | "package"
  | "external";

export type RelationKind =
  | "import"
  | "call"
  | "export"
  | "IMPORTS"
  | "CONTAINS"
  | "CALLS"
  | "USES"
  | "EXTENDS"
  | "IMPLEMENTS"
  | "HANDLES_ROUTE"
  | "CALLS_API"
  | (string & {});

export interface RepoSummary {
  owner: string;
  name: string;
  description: string;
  defaultBranch: string;
  language: string;
  stars: string;
  files: number;
  directories: number;
  linesOfCode: string;
  analyzedAt: string;
  languages: { name: string; share: number }[];
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "dir" | "file";
  kind?: NodeKind;
  loc?: number;
  children?: FileNode[];
}

export interface GraphNodeData {
  id: string;
  label: string;
  path: string;
  kind: NodeKind;
  loc: number;
  exports: string[];
  imports: string[];
  summary: string;
  position: { x: number; y: number };
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relation: RelationKind;
  symbol: string;
}

export const mockRepo: RepoSummary = {
  owner: "vercel",
  name: "commerce-kit",
  description:
    "Headless storefront toolkit — checkout primitives, cart state machine and a small design system.",
  defaultBranch: "main",
  language: "TypeScript",
  stars: "12.4k",
  files: 428,
  directories: 63,
  linesOfCode: "51,204",
  analyzedAt: "static fixture",
  languages: [
    { name: "TypeScript", share: 74 },
    { name: "TSX", share: 18 },
    { name: "CSS", share: 5 },
    { name: "Other", share: 3 },
  ],
};

export const mockFileTree: FileNode[] = [
  {
    id: "src",
    name: "src",
    path: "src",
    type: "dir",
    children: [
      {
        id: "src/app",
        name: "app",
        path: "src/app",
        type: "dir",
        children: [
          {
            id: "n-checkout-page",
            name: "checkout.tsx",
            path: "src/app/checkout.tsx",
            type: "file",
            kind: "component",
            loc: 214,
          },
          {
            id: "n-cart-page",
            name: "cart.tsx",
            path: "src/app/cart.tsx",
            type: "file",
            kind: "component",
            loc: 168,
          },
        ],
      },
      {
        id: "src/lib",
        name: "lib",
        path: "src/lib",
        type: "dir",
        children: [
          {
            id: "n-cart-store",
            name: "cart-store.ts",
            path: "src/lib/cart-store.ts",
            type: "file",
            kind: "module",
            loc: 342,
          },
          {
            id: "n-pricing",
            name: "pricing.ts",
            path: "src/lib/pricing.ts",
            type: "file",
            kind: "module",
            loc: 128,
          },
          {
            id: "n-format",
            name: "format-money.ts",
            path: "src/lib/format-money.ts",
            type: "file",
            kind: "function",
            loc: 34,
          },
        ],
      },
      {
        id: "src/components",
        name: "components",
        path: "src/components",
        type: "dir",
        children: [
          {
            id: "n-cart-summary",
            name: "CartSummary.tsx",
            path: "src/components/CartSummary.tsx",
            type: "file",
            kind: "component",
            loc: 96,
          },
          {
            id: "n-line-item",
            name: "LineItem.tsx",
            path: "src/components/LineItem.tsx",
            type: "file",
            kind: "component",
            loc: 74,
          },
        ],
      },
      {
        id: "src/api",
        name: "api",
        path: "src/api",
        type: "dir",
        children: [
          {
            id: "n-checkout-api",
            name: "checkout-session.ts",
            path: "src/api/checkout-session.ts",
            type: "file",
            kind: "module",
            loc: 187,
          },
        ],
      },
    ],
  },
  {
    id: "node_modules",
    name: "external",
    path: "external",
    type: "dir",
    children: [
      {
        id: "n-stripe",
        name: "stripe",
        path: "external/stripe",
        type: "file",
        kind: "external",
        loc: 0,
      },
    ],
  },
];

export const mockGraphNodes: GraphNodeData[] = [
  {
    id: "n-checkout-page",
    label: "checkout.tsx",
    path: "src/app/checkout.tsx",
    kind: "component",
    loc: 214,
    exports: ["CheckoutPage"],
    imports: ["cart-store", "CartSummary", "checkout-session"],
    summary:
      "Route-level screen that renders the checkout form and submits a session request.",
    position: { x: 0, y: 0 },
  },
  {
    id: "n-cart-page",
    label: "cart.tsx",
    path: "src/app/cart.tsx",
    kind: "component",
    loc: 168,
    exports: ["CartPage"],
    imports: ["cart-store", "LineItem"],
    summary: "Cart screen listing line items with quantity controls.",
    position: { x: 0, y: 190 },
  },
  {
    id: "n-cart-summary",
    label: "CartSummary.tsx",
    path: "src/components/CartSummary.tsx",
    kind: "component",
    loc: 96,
    exports: ["CartSummary"],
    imports: ["pricing", "format-money"],
    summary: "Presents subtotal, tax and total for the active cart.",
    position: { x: 300, y: 70 },
  },
  {
    id: "n-line-item",
    label: "LineItem.tsx",
    path: "src/components/LineItem.tsx",
    kind: "component",
    loc: 74,
    exports: ["LineItem"],
    imports: ["format-money"],
    summary: "Single cart row with remove and quantity affordances.",
    position: { x: 300, y: 260 },
  },
  {
    id: "n-cart-store",
    label: "cart-store.ts",
    path: "src/lib/cart-store.ts",
    kind: "module",
    loc: 342,
    exports: ["useCart", "cartReducer", "CartProvider"],
    imports: ["pricing"],
    summary:
      "Central cart state machine. Most of the product surface reads from here.",
    position: { x: 610, y: 0 },
  },
  {
    id: "n-pricing",
    label: "pricing.ts",
    path: "src/lib/pricing.ts",
    kind: "module",
    loc: 128,
    exports: ["calcSubtotal", "calcTax", "calcTotal"],
    imports: ["format-money"],
    summary: "Pure pricing math shared by cart, summary and checkout session.",
    position: { x: 610, y: 200 },
  },
  {
    id: "n-format",
    label: "format-money.ts",
    path: "src/lib/format-money.ts",
    kind: "function",
    loc: 34,
    exports: ["formatMoney"],
    imports: [],
    summary: "Leaf utility. Formats minor-unit integers into localized currency.",
    position: { x: 900, y: 300 },
  },
  {
    id: "n-checkout-api",
    label: "checkout-session.ts",
    path: "src/api/checkout-session.ts",
    kind: "module",
    loc: 187,
    exports: ["createCheckoutSession"],
    imports: ["pricing", "stripe"],
    summary: "Server module that turns a cart into a payment session.",
    position: { x: 900, y: 60 },
  },
  {
    id: "n-stripe",
    label: "stripe",
    path: "external/stripe",
    kind: "external",
    loc: 0,
    exports: ["Stripe"],
    imports: [],
    summary: "Third-party dependency. Outside the analyzed source tree.",
    position: { x: 1190, y: 140 },
  },
];

export const mockGraphEdges: GraphEdgeData[] = [
  { id: "e1", source: "n-checkout-page", target: "n-cart-store", relation: "import", symbol: "useCart" },
  { id: "e2", source: "n-checkout-page", target: "n-cart-summary", relation: "import", symbol: "CartSummary" },
  { id: "e3", source: "n-checkout-page", target: "n-checkout-api", relation: "call", symbol: "createCheckoutSession()" },
  { id: "e4", source: "n-cart-page", target: "n-cart-store", relation: "import", symbol: "useCart" },
  { id: "e5", source: "n-cart-page", target: "n-line-item", relation: "import", symbol: "LineItem" },
  { id: "e6", source: "n-cart-summary", target: "n-pricing", relation: "call", symbol: "calcTotal()" },
  { id: "e7", source: "n-line-item", target: "n-format", relation: "call", symbol: "formatMoney()" },
  { id: "e8", source: "n-cart-store", target: "n-pricing", relation: "call", symbol: "calcSubtotal()" },
  { id: "e9", source: "n-pricing", target: "n-format", relation: "export", symbol: "formatMoney" },
  { id: "e10", source: "n-checkout-api", target: "n-pricing", relation: "call", symbol: "calcTotal()" },
  { id: "e11", source: "n-checkout-api", target: "n-stripe", relation: "import", symbol: "Stripe" },
];

export interface FlowStep {
  nodeId: string;
  label: string;
  detail: string;
}

export interface RepoFlow {
  id: string;
  name: string;
  steps: FlowStep[];
}

export const mockFlows: RepoFlow[] = [
  {
    id: "flow-checkout",
    name: "Checkout submit",
    steps: [
      { nodeId: "n-checkout-page", label: "checkout.tsx", detail: "onSubmit handler reads cart from useCart()" },
      { nodeId: "n-cart-store", label: "cart-store.ts", detail: "returns normalized cart snapshot" },
      { nodeId: "n-pricing", label: "pricing.ts", detail: "calcTotal() derives payable amount" },
      { nodeId: "n-checkout-api", label: "checkout-session.ts", detail: "createCheckoutSession() builds the payload" },
      { nodeId: "n-stripe", label: "stripe", detail: "external boundary — payment session created" },
    ],
  },
  {
    id: "flow-render-cart",
    name: "Cart render",
    steps: [
      { nodeId: "n-cart-page", label: "cart.tsx", detail: "subscribes to cart items" },
      { nodeId: "n-line-item", label: "LineItem.tsx", detail: "renders one row per item" },
      { nodeId: "n-format", label: "format-money.ts", detail: "formatMoney() prints the price" },
    ],
  },
];

export const mockExplanations: Record<string, string> = {
  "n-cart-store":
    "cart-store.ts is the gravitational center of this repository. It owns cart state through a reducer and exposes `useCart` plus a `CartProvider`. Screens never mutate cart data directly — they dispatch through this module, which is why almost every UI file has an inbound edge here. Pricing math is delegated to pricing.ts so the store stays free of currency logic.",
  "n-pricing":
    "pricing.ts holds pure functions: `calcSubtotal`, `calcTax` and `calcTotal`. Because it has no side effects it is imported from both client and server paths, which is why you see edges arriving from the store, the summary component and the checkout API module.",
  "n-checkout-api":
    "checkout-session.ts is the only file that touches the third-party payment SDK. It converts a cart snapshot into a session payload. Treat it as the trust boundary of the codebase: everything above it is presentation, everything below it is external.",
};

export const genericExplanation =
  "This node participates in the dependency graph through its imports and exported symbols. Select a relationship in the panel to see how data reaches it, or trace a flow to follow execution across files.";

export const relationLabels: Record<string, string> = {
  import: "Imports",
  call: "Function calls",
  export: "Re-exports",
  IMPORTS: "Imports",
  CONTAINS: "Contains",
  CALLS: "Calls",
  USES: "Uses",
  EXTENDS: "Extends",
  IMPLEMENTS: "Implements",
  HANDLES_ROUTE: "Handles route",
  CALLS_API: "Calls API",
};

export const kindLabels: Record<string, string> = {
  module: "Module",
  component: "Component",
  function: "Function",
  file: "File",
  class: "Class",
  method: "Method",
  type: "Type",
  variable: "Variable",
  api_route: "API Route",
  package: "Package",
  external: "External",
};
