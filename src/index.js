// Router and middleware system
export default {
  async fetch(request, env, ctx) {
    return await router.handle(request, env, ctx);
  },
};

// Router class for handling routes
class Router {
  constructor() {
    this.routes = new Map();
  }

  // Register a route with optional middleware
  register(method, path, handler, middleware = []) {
    const key = `${method}:${path}`;
    this.routes.set(key, { handler, middleware });
  }

  // Handle incoming requests
  async handle(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const key = `${request.method}:${url.pathname}`;
      
      const route = this.routes.get(key);
      if (!route) {
        return new Response("Not found", { status: 404 });
      }

      // Run middleware chain
      for (const middleware of route.middleware) {
        const result = await middleware(request, env, ctx);
        if (result instanceof Response) {
          return result; // Middleware returned early (e.g., auth failed)
        }
      }

      // Execute the handler
      return await route.handler(request, env, ctx);
    } catch (error) {
      console.error('Router error:', error);
      return new Response("Internal server error", { status: 500 });
    }
  }
}

// Middleware functions
const auth = {
  // Require INGEST_KEY authentication via X-API-Token header
  requireIngestKey: async (request, env, ctx) => {
    const token = request.headers.get("X-API-Token");

    if (!env.INGEST_KEY || token !== env.INGEST_KEY) {
      return new Response("Forbidden", { status: 403 });
    }
  }
};

const validation = {
  // Validate package operation parameters
  validatePackageOperation: async (request, env, ctx) => {
    const url = new URL(request.url);
    let params;

    if (request.method === 'GET') {
      params = {
        pkg: url.searchParams.get("pkg"),
        type: url.searchParams.get("type"),
        count: parseInt(url.searchParams.get("count") || "0", 10)
      };
    } else {
      try {
        const body = await request.clone().json();
        params = {
          pkg: body.pkg,
          type: body.type,
          count: body.count || 0
        };
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    if (!params.pkg || !VALID_TYPES.includes(params.type) || params.count < 0) {
      return new Response("Invalid params", { status: 400 });
    }

    // Store validated params for handler use
    request.validatedParams = params;
  }
};

// Constants
const VALID_TYPES = ["install", "upgrade", "remove"];

// Route handlers
const handlers = {
  // Handle package events (increment counters)
  async handleEvent(request, env, ctx) {
    const params = request.validatedParams;
    
    const sql = `
      INSERT INTO package_stats (name, ${params.type}) VALUES (?, 1)
      ON CONFLICT(name) DO UPDATE SET ${params.type} = ${params.type} + 1
    `;
    await env.DB.prepare(sql).bind(params.pkg).run();

    return new Response("OK");
  },

  // Handle data ingestion (set specific counts)
  async handleIngest(request, env, ctx) {
    const params = request.validatedParams;
    
    const sql = `
      INSERT INTO package_stats (name, ${params.type}) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET ${params.type} = ?
    `;
    await env.DB.prepare(sql).bind(params.pkg, params.count, params.count).run();

    return new Response("OK");
  },

  // Get totals for a specific package
  async handleTotals(request, env, ctx) {
    const url = new URL(request.url);
    const pkg = url.searchParams.get("pkg");
    
    if (!pkg) {
      return new Response("Missing pkg parameter", { status: 400 });
    }

    const row = await env.DB.prepare(
      "SELECT install, upgrade, remove FROM package_stats WHERE name = ?"
    ).bind(pkg).first();

    return Response.json(row || { install: 0, upgrade: 0, remove: 0 });
  },

  // Get all package totals (admin endpoint)
  async handleAllTotals(request, env, ctx) {
    const { results } = await env.DB.prepare(
      "SELECT name, install, upgrade, remove FROM package_stats"
    ).all();

    const output = {};
    for (const row of results) {
      output[row.name] = {
        install: row.install,
        upgrade: row.upgrade,
        remove: row.remove,
      };
    }

    return Response.json(output);
  }
};

// Initialize router and register routes
const router = new Router();

// Public routes
router.register('GET', '/event', handlers.handleEvent, [validation.validatePackageOperation]);
router.register('GET', '/totals', handlers.handleTotals);
router.register('GET', '/all-totals', handlers.handleAllTotals);

// Protected routes (require authentication)
router.register('POST', '/ingest', handlers.handleIngest, [
  auth.requireIngestKey, 
  validation.validatePackageOperation
]);

