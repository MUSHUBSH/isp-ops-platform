import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { queryOne, query } from "./db.js";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  siteScopes: string[];
};

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

type ApiKeyUserRow = {
  id: string;
  email: string;
  display_name: string;
  roles: string | null;
  permissions: string | null;
  site_scopes: string | null;
};

const publicRoutes = new Set(["GET /health"]);

export async function registerAuth(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    const routeKey = `${request.method} ${request.routeOptions.url ?? request.url}`;

    if (request.method === "GET" || publicRoutes.has(routeKey)) {
      await attachOptionalUser(request);
      return;
    }

    const user = await resolveUser(request);

    if (!user) {
      return reply.code(401).send({ message: "Missing or invalid API key" });
    }

    request.authUser = user;
  });
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      return reply.code(401).send({ message: "Authentication required" });
    }

    if (!request.authUser.permissions.includes(permission)) {
      return reply.code(403).send({ message: `Missing permission: ${permission}` });
    }
  };
}

export function actorId(request: FastifyRequest) {
  return request.authUser?.id ?? null;
}

async function attachOptionalUser(request: FastifyRequest) {
  request.authUser = (await resolveUser(request)) ?? undefined;
}

async function resolveUser(request: FastifyRequest): Promise<AuthUser | null> {
  const apiKey = request.headers["x-api-key"];

  if (!apiKey || Array.isArray(apiKey)) {
    return null;
  }

  const row = await queryOne<ApiKeyUserRow>(
    `SELECT
       u.id,
       u.email,
       u.display_name,
       string_agg(DISTINCT r.code, ',') AS roles,
       string_agg(DISTINCT p.code, ',') AS permissions,
       string_agg(DISTINCT s.code, ',') AS site_scopes
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     LEFT JOIN user_site_scopes uss ON uss.user_id = u.id
     LEFT JOIN sites s ON s.id = uss.site_id
     WHERE ak.key_hash = $1 AND ak.status = 'active' AND u.status = 'active'
     GROUP BY u.id`,
    [apiKey]
  );

  if (!row) {
    return null;
  }

  await query("UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1", [apiKey]);

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roles: splitList(row.roles),
    permissions: splitList(row.permissions),
    siteScopes: splitList(row.site_scopes)
  };
}

function splitList(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}
