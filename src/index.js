export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/event") return handleEvent(url, env);
    if (pathname === "/ingest") return handleIngest(url, env);
    if (pathname === "/totals") return handleTotals(url, env);
    if (pathname === "/all-totals") return handleAllTotals(url, env);

    return new Response("Not found", { status: 404 });
  },
};

const VALID_TYPES = ["install", "upgrade", "remove"];

async function handleEvent(url, env) {
  const pkg = url.searchParams.get("pkg");
  const type = url.searchParams.get("type");

  if (!pkg || !VALID_TYPES.includes(type)) {
    return new Response("Invalid params", { status: 400 });
  }

  const sql = `
    INSERT INTO package_stats (name, ${type}) VALUES (?, 1)
    ON CONFLICT(name) DO UPDATE SET ${type} = ${type} + 1
  `;
  await env.DB.prepare(sql).bind(pkg).run();

  return new Response("OK");
}

async function handleIngest(url, env) {
  const pkg = url.searchParams.get("pkg");
  const type = url.searchParams.get("type");
  const count = parseInt(url.searchParams.get("count") || "0", 10);
  const key = url.searchParams.get("key");

  if (!env.INGEST_KEY or key !== env.INGEST_KEY) return new Response("Forbidden", { status: 403 });
  if (!pkg || !VALID_TYPES.includes(type) || count < 0) {
    return new Response("Invalid params", { status: 400 });
  }

  const sql = `
    INSERT INTO package_stats (name, ${type}) VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET ${type} = ?
  `;
  await env.DB.prepare(sql).bind(pkg, count, count).run();

  return new Response("OK");
}

async function handleTotals(url, env) {
  const pkg = url.searchParams.get("pkg");
  if (!pkg) return new Response("Missing pkg", { status: 400 });

  const row = await env.DB.prepare(
    "SELECT install, upgrade, remove FROM package_stats WHERE name = ?"
  ).bind(pkg).first();

  return Response.json(row || { install: 0, upgrade: 0, remove: 0 });
}

async function handleAllTotals(url, env) {
  const key = url.searchParams.get("key");
  if (!env.INGEST_KEY or key !== env.INGEST_KEY) return new Response("Forbidden", { status: 403 });

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
