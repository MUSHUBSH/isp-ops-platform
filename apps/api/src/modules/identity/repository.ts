import { query } from "../../shared/db.js";

type RoleRow = {
  code: string;
  name: string;
  permissions: string | null;
};

type PermissionRow = {
  code: string;
  description: string;
};

export async function listRolesFromDb() {
  const rows = await query<RoleRow>(
    `SELECT
       r.code,
       r.name,
       string_agg(p.code, ',' ORDER BY p.code) AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.code`
  );

  return (
    rows?.map((row) => ({
      code: row.code,
      name: row.name,
      permissions: row.permissions ? row.permissions.split(",").filter(Boolean) : []
    })) ?? null
  );
}

export async function listPermissionsFromDb() {
  return await query<PermissionRow>("SELECT code, description FROM permissions ORDER BY code");
}
