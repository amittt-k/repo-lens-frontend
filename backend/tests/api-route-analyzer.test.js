import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeApiRoutes,
  normalizeRoutePath,
  combineRoutePaths,
} from "../src/analyzers/javascript/apiRouteAnalyzer.js";
import { ApiRouteService, ROUTE_RELATIONSHIP_TYPES } from "../src/services/apiRoute.service.js";
import { analyzeSource } from "../src/analyzers/javascript/astAnalyzer.js";
import { resolveFileDependencies, createFileLookupMap } from "../src/analyzers/javascript/dependencyResolver.js";

describe("API Route Analyzer Unit Tests", () => {
  it("normalizes and combines route paths deterministically", () => {
    assert.equal(normalizeRoutePath("users"), "/users");
    assert.equal(normalizeRoutePath("/users/"), "/users");
    assert.equal(normalizeRoutePath("///api///v1///users/:id/"), "/api/v1/users/:id");
    assert.equal(normalizeRoutePath(""), "/");

    assert.equal(combineRoutePaths("/api/v1", "/users"), "/api/v1/users");
    assert.equal(combineRoutePaths("/api/v1/", "/users/:id/"), "/api/v1/users/:id");
    assert.equal(combineRoutePaths("/", "/health"), "/health");
  });

  it("extracts GET, POST, PUT, PATCH, DELETE routes on app and router objects", () => {
    const routeCode = `
import { Router } from "express";

const router = Router();

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", updateStatus);
router.delete("/users/:id", deleteUser);
`;

    const ast = analyzeSource(routeCode, { filePath: "src/routes/users.js" });
    const fileData = [
      {
        id: "f-routes",
        path: "src/routes/users.js",
        content: routeCode,
        symbols: ast.symbols,
        imports: ast.imports,
        dependencies: [],
      },
    ];

    const { routes } = analyzeApiRoutes(fileData);

    assert.equal(routes.length, 5);

    const getRoute = routes.find((r) => r.method === "GET" && r.path === "/users");
    assert.ok(getRoute);
    assert.equal(getRoute.handler, "getUsers");

    const postRoute = routes.find((r) => r.method === "POST" && r.path === "/users");
    assert.ok(postRoute);
    assert.equal(postRoute.handler, "createUser");

    const putRoute = routes.find((r) => r.method === "PUT" && r.path === "/users/:id");
    assert.ok(putRoute);

    const patchRoute = routes.find((r) => r.method === "PATCH" && r.path === "/users/:id/status");
    assert.ok(patchRoute);

    const deleteRoute = routes.find((r) => r.method === "DELETE" && r.path === "/users/:id");
    assert.ok(deleteRoute);
  });

  it("resolves named handlers in same file and across files and creates HANDLES_ROUTE relationships", () => {
    const controllerCode = `
export function listProducts(req, res) {}
export function createProduct(req, res) {}
`;

    const routerCode = `
import { listProducts, createProduct } from "../controllers/products";

function localMiddleware(req, res, next) {}

export function setupRoutes(router) {
  router.get("/products", localMiddleware, listProducts);
  router.post("/products", createProduct);
}
`;

    const ctrlAst = analyzeSource(controllerCode, { filePath: "src/controllers/products.ts" });
    const routerAst = analyzeSource(routerCode, { filePath: "src/routes/products.ts" });

    const ctrlSymbols = ctrlAst.symbols.map((s, idx) => ({ ...s, id: `sym-ctrl-${idx}` }));
    const routerSymbols = routerAst.symbols.map((s, idx) => ({ ...s, id: `sym-router-${idx}` }));

    const files = [
      { id: "f-ctrl", path: "src/controllers/products.ts" },
      { id: "f-router", path: "src/routes/products.ts" },
    ];
    const fileMap = createFileLookupMap(files);
    const routerDeps = resolveFileDependencies("src/routes/products.ts", routerAst.imports, fileMap).dependencies;

    const fileData = [
      {
        id: "f-ctrl",
        path: "src/controllers/products.ts",
        content: controllerCode,
        symbols: ctrlSymbols,
        imports: ctrlAst.imports,
        dependencies: [],
      },
      {
        id: "f-router",
        path: "src/routes/products.ts",
        content: routerCode,
        symbols: routerSymbols,
        imports: routerAst.imports,
        dependencies: routerDeps,
      },
    ];

    const { routes, relationships } = analyzeApiRoutes(fileData);

    assert.equal(routes.length, 2);

    const getRoute = routes.find((r) => r.method === "GET" && r.path === "/products");
    assert.ok(getRoute);
    assert.equal(getRoute.handler, "listProducts");

    const listProdSym = ctrlSymbols.find((s) => s.name === "listProducts");
    assert.equal(getRoute.handlerSymbolId, listProdSym.id);

    // Verify HANDLES_ROUTE relationship
    const handlesRel = relationships.find(
      (r) => r.relationshipType === "HANDLES_ROUTE" && r.sourceId === listProdSym.id && r.targetId === getRoute.id,
    );
    assert.ok(handlesRel);
    assert.equal(handlesRel.metadata.method, "GET");
    assert.equal(handlesRel.metadata.path, "/products");
  });

  it("handles inline handler functions cleanly without creating fake symbol IDs", () => {
    const code = `
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
`;

    const ast = analyzeSource(code, { filePath: "src/app.js" });
    const fileData = [
      {
        id: "f-app",
        path: "src/app.js",
        content: code,
        symbols: ast.symbols,
        imports: ast.imports,
        dependencies: [],
      },
    ];

    const { routes, relationships } = analyzeApiRoutes(fileData);

    assert.equal(routes.length, 1);
    assert.equal(routes[0].method, "GET");
    assert.equal(routes[0].path, "/health");
    assert.equal(routes[0].handler, "inline");
    assert.equal(routes[0].handlerSymbolId, null);

    // No HANDLES_ROUTE relationship should be created for anonymous inline handler
    const handlesRel = relationships.find((r) => r.relationshipType === "HANDLES_ROUTE");
    assert.equal(handlesRel, undefined);
  });

  it("extracts chained route definitions on router.route()", () => {
    const code = `
router.route("/items/:id")
  .get(getItem)
  .put(updateItem)
  .delete(deleteItem);
`;

    const ast = analyzeSource(code, { filePath: "src/items.js" });
    const fileData = [
      {
        id: "f-items",
        path: "src/items.js",
        content: code,
        symbols: ast.symbols,
        imports: ast.imports,
        dependencies: [],
      },
    ];

    const { routes } = analyzeApiRoutes(fileData);

    assert.equal(routes.length, 3);
    assert.ok(routes.some((r) => r.method === "GET" && r.path === "/items/:id" && r.handler === "getItem"));
    assert.ok(routes.some((r) => r.method === "PUT" && r.path === "/items/:id" && r.handler === "updateItem"));
    assert.ok(routes.some((r) => r.method === "DELETE" && r.path === "/items/:id" && r.handler === "deleteItem"));
  });

  it("detects router mount prefixes (app.use('/api/v1', userRouter))", () => {
    const serverCode = `
import express from 'express';
import userRouter from './routes/users';

const app = express();
app.use("/api/v1/auth", userRouter);
`;

    const userRouteCode = `
import { Router } from 'express';
const userRouter = Router();

userRouter.post("/login", loginHandler);
userRouter.post("/register", registerHandler);
`;

    const serverAst = analyzeSource(serverCode, { filePath: "src/server.ts" });
    const userAst = analyzeSource(userRouteCode, { filePath: "src/routes/users.ts" });

    const fileData = [
      {
        id: "f-server",
        path: "src/server.ts",
        content: serverCode,
        symbols: serverAst.symbols,
        imports: serverAst.imports,
        dependencies: [],
      },
      {
        id: "f-users",
        path: "src/routes/users.ts",
        content: userRouteCode,
        symbols: userAst.symbols,
        imports: userAst.imports,
        dependencies: [],
      },
    ];

    const { routes } = analyzeApiRoutes(fileData);

    assert.ok(routes.some((r) => r.method === "POST" && r.path === "/api/v1/auth/login"));
    assert.ok(routes.some((r) => r.method === "POST" && r.path === "/api/v1/auth/register"));
  });

  it("detects CALLS_API relationships from client fetch and axios invocations", () => {
    const routeCode = `
router.get("/users", getUsers);
router.post("/orders", createOrder);
`;

    const clientCode = `
import axios from 'axios';

export async function fetchUsers() {
  const res = await axios.get("/users");
  return res.data;
}

export async function submitOrder(orderData) {
  const res = await fetch("/orders", { method: "POST" });
  return res.json();
}
`;

    const routeAst = analyzeSource(routeCode, { filePath: "src/routes/api.js" });
    const clientAst = analyzeSource(clientCode, { filePath: "src/client/apiClient.js" });

    const clientSymbols = clientAst.symbols.map((s, idx) => ({ ...s, id: `sym-client-${idx}` }));

    const fileData = [
      {
        id: "f-route",
        path: "src/routes/api.js",
        content: routeCode,
        symbols: routeAst.symbols,
        imports: routeAst.imports,
        dependencies: [],
      },
      {
        id: "f-client",
        path: "src/client/apiClient.js",
        content: clientCode,
        symbols: clientSymbols,
        imports: clientAst.imports,
        dependencies: [],
      },
    ];

    const { routes, relationships } = analyzeApiRoutes(fileData);

    assert.equal(routes.length, 2);

    const fetchUsersSym = clientSymbols.find((s) => s.name === "fetchUsers");
    const submitOrderSym = clientSymbols.find((s) => s.name === "submitOrder");

    const getRoute = routes.find((r) => r.method === "GET" && r.path === "/users");
    const postRoute = routes.find((r) => r.method === "POST" && r.path === "/orders");

    // fetchUsers -> CALLS_API -> GET /users
    const callsUsersRel = relationships.find(
      (r) => r.relationshipType === "CALLS_API" && r.sourceId === fetchUsersSym.id && r.targetId === getRoute.id,
    );
    assert.ok(callsUsersRel);

    // submitOrder -> CALLS_API -> POST /orders
    const callsOrderRel = relationships.find(
      (r) => r.relationshipType === "CALLS_API" && r.sourceId === submitOrderSym.id && r.targetId === postRoute.id,
    );
    assert.ok(callsOrderRel);
  });

  it("handles malformed source code gracefully without throwing", () => {
    const fileData = [
      {
        id: "f-bad",
        path: "src/bad.js",
        content: "router.get( { const = ;",
        symbols: [],
        imports: [],
        dependencies: [],
      },
    ];

    const result = analyzeApiRoutes(fileData);
    assert.deepEqual(result.routes, []);
    assert.deepEqual(result.relationships, []);
  });
});

describe("API Route Service Unit Tests", () => {
  it("persists ApiRoute and route relationships while preserving IMPORTS and symbol relationships", async () => {
    let deletedApiRoutesWhere = null;
    let deletedRelationshipsWhere = null;
    let createdRoutes = null;
    let createdRelationships = null;

    const mockPrisma = {
      apiRoute: {
        deleteMany: async ({ where }) => {
          deletedApiRoutesWhere = where;
          return { count: 0 };
        },
        createMany: async ({ data }) => {
          createdRoutes = data;
          return { count: data.length };
        },
      },
      relationship: {
        deleteMany: async ({ where }) => {
          deletedRelationshipsWhere = where;
          return { count: 0 };
        },
        createMany: async ({ data }) => {
          createdRelationships = data;
          return { count: data.length };
        },
      },
    };

    const service = new ApiRouteService({ prisma: mockPrisma });

    const routes = [
      { id: "route-1", method: "GET", path: "/users", fileId: "f-1", handler: "getUsers" },
    ];
    const relationships = [
      { sourceId: "sym-1", targetId: "route-1", relationshipType: "HANDLES_ROUTE", metadata: { path: "/users" } },
    ];

    const result = await service.persistApiRoutes("repo-test", routes, relationships);

    assert.equal(result.routesCount, 1);
    assert.equal(result.relationshipsCount, 1);

    assert.equal(deletedApiRoutesWhere.repositoryId, "repo-test");
    assert.equal(deletedRelationshipsWhere.repositoryId, "repo-test");
    assert.deepEqual(deletedRelationshipsWhere.relationshipType.in, ROUTE_RELATIONSHIP_TYPES);

    assert.equal(createdRoutes[0].path, "/users");
    assert.equal(createdRelationships[0].relationshipType, "HANDLES_ROUTE");
  });
});
