import { query, queryOne } from "../../shared/db.js";

type ProviderRow = {
  id: string;
  code: string;
  name: string;
  provider_type: string;
  status: string;
  noc_email: string | null;
  active_circuits: string;
};

type ContractRow = {
  id: string;
  provider_code: string;
  code: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  monthly_cost: string | null;
  sla_target: string | null;
};

export type CreateProviderInput = {
  code: string;
  name: string;
  providerType: string;
  status?: string;
  nocEmail?: string | null;
  nocPhone?: string | null;
};

export type CreateContractInput = {
  providerCode: string;
  code: string;
  name: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string | null;
  monthlyCost?: number | null;
  slaTarget?: number | null;
};

function mapProvider(row: ProviderRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.provider_type,
    status: row.status,
    nocEmail: row.noc_email ?? "",
    activeCircuits: Number(row.active_circuits ?? 0),
    availability30d: 0,
    mttrHours30d: 0
  };
}

function mapContract(row: ContractRow) {
  return {
    id: row.id,
    providerCode: row.provider_code,
    code: row.code,
    name: row.name,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    currency: row.currency,
    monthlyCost: row.monthly_cost === null ? null : Number(row.monthly_cost),
    slaTarget: row.sla_target === null ? null : Number(row.sla_target)
  };
}

export async function listProvidersFromDb() {
  const rows = await query<ProviderRow>(
    `SELECT
       p.id,
       p.code,
       p.name,
       p.provider_type,
       p.status,
       p.noc_email,
       COUNT(c.id) AS active_circuits
     FROM providers p
     LEFT JOIN circuits c ON c.provider_id = p.id AND c.status <> 'retired'
     GROUP BY p.id
     ORDER BY p.name`
  );

  return rows?.map(mapProvider) ?? null;
}

export async function getProviderFromDb(id: string) {
  const row = await queryOne<ProviderRow>(
    `SELECT
       p.id,
       p.code,
       p.name,
       p.provider_type,
       p.status,
       p.noc_email,
       COUNT(c.id) AS active_circuits
     FROM providers p
     LEFT JOIN circuits c ON c.provider_id = p.id AND c.status <> 'retired'
     WHERE p.id::text = $1 OR p.code = $1
     GROUP BY p.id`,
    [id]
  );

  return row ? mapProvider(row) : null;
}

export async function createProviderInDb(input: CreateProviderInput) {
  const row = await queryOne<ProviderRow>(
    `INSERT INTO providers (code, name, provider_type, status, noc_email, noc_phone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, code, name, provider_type, status, noc_email, 0 AS active_circuits`,
    [input.code, input.name, input.providerType, input.status ?? "active", input.nocEmail ?? null, input.nocPhone ?? null]
  );

  return row ? mapProvider(row) : null;
}

export async function updateProviderStatusInDb(id: string, status: string) {
  const row = await queryOne<ProviderRow>(
    `UPDATE providers p
     SET status = $2
     WHERE p.id::text = $1 OR p.code = $1
     RETURNING
       p.id,
       p.code,
       p.name,
       p.provider_type,
       p.status,
       p.noc_email,
       (SELECT COUNT(*) FROM circuits c WHERE c.provider_id = p.id AND c.status <> 'retired') AS active_circuits`,
    [id, status]
  );

  return row ? mapProvider(row) : null;
}

export async function deleteProviderInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM providers
     WHERE (id::text = $1 OR code = $1)
       AND NOT EXISTS (SELECT 1 FROM contracts WHERE provider_id = providers.id)
       AND NOT EXISTS (SELECT 1 FROM circuits WHERE provider_id = providers.id)
       AND NOT EXISTS (SELECT 1 FROM provider_capacities WHERE provider_id = providers.id)
       AND NOT EXISTS (SELECT 1 FROM fiber_spans WHERE provider_id = providers.id)
       AND NOT EXISTS (SELECT 1 FROM site_transport_links WHERE provider_id = providers.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}

export async function listContractsFromDb() {
  const rows = await query<ContractRow>(
    `SELECT
       c.id,
       p.code AS provider_code,
       c.code,
       c.name,
       c.status,
       c.start_date::text,
       c.end_date::text,
       c.currency,
       c.monthly_cost,
       c.sla_target
     FROM contracts c
     JOIN providers p ON p.id = c.provider_id
     ORDER BY p.code, c.code`
  );

  return rows?.map(mapContract) ?? null;
}

export async function listContractsByProviderFromDb(providerCode: string) {
  const rows = await query<ContractRow>(
    `SELECT
       c.id,
       p.code AS provider_code,
       c.code,
       c.name,
       c.status,
       c.start_date::text,
       c.end_date::text,
       c.currency,
       c.monthly_cost,
       c.sla_target
     FROM contracts c
     JOIN providers p ON p.id = c.provider_id
     WHERE p.code = $1
     ORDER BY c.code`,
    [providerCode]
  );

  return rows?.map(mapContract) ?? null;
}

export async function createContractInDb(input: CreateContractInput) {
  const row = await queryOne<ContractRow>(
    `INSERT INTO contracts (provider_id, code, name, status, start_date, end_date, currency, monthly_cost, sla_target)
     SELECT id, $2, $3, $4, $5::date, $6::date, $7, $8, $9
     FROM providers
     WHERE code = $1
     RETURNING
       id,
       $1::text AS provider_code,
       code,
       name,
       status,
       start_date::text,
       end_date::text,
       currency,
       monthly_cost,
       sla_target`,
    [
      input.providerCode,
      input.code,
      input.name,
      input.status ?? "active",
      input.startDate ?? null,
      input.endDate ?? null,
      input.currency ?? null,
      input.monthlyCost ?? null,
      input.slaTarget ?? null
    ]
  );

  return row ? mapContract(row) : null;
}

export async function updateContractStatusInDb(id: string, status: string) {
  const row = await queryOne<ContractRow>(
    `UPDATE contracts c
     SET status = $2
     WHERE c.id = $1::uuid
     RETURNING
       c.id,
       (SELECT p.code FROM providers p WHERE p.id = c.provider_id) AS provider_code,
       c.code,
       c.name,
       c.status,
       c.start_date::text,
       c.end_date::text,
       c.currency,
       c.monthly_cost,
       c.sla_target`,
    [id, status]
  );

  return row ? mapContract(row) : null;
}

export async function deleteContractInDb(id: string) {
  const row = await queryOne<{ id: string }>(
    `DELETE FROM contracts
     WHERE id = $1::uuid
       AND NOT EXISTS (SELECT 1 FROM circuits WHERE contract_id = contracts.id)
       AND NOT EXISTS (SELECT 1 FROM provider_capacities WHERE contract_id = contracts.id)
     RETURNING id`,
    [id]
  );

  return row ?? null;
}
