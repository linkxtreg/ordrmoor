/**
 * Tenant-scoped KV store. When tenant is null, undefined, or "default",
 * uses unprefixed keys (legacy single-tenant). For other tenants, prefixes
 * all keys with "tenant:{slug}:".
 */
import * as kv from "./kv_store.tsx";

function prefix(tenantSlug: string | null | undefined): string {
  if (!tenantSlug || tenantSlug === "default") return "";
  return `tenant:${tenantSlug}:`;
}

export function tenantKv(tenantSlug: string | null | undefined) {
  const p = prefix(tenantSlug);
  return {
    async get(key: string): Promise<any> {
      return kv.get(p + key);
    },
    async set(key: string, value: any): Promise<void> {
      return kv.set(p + key, value);
    },
    async del(key: string): Promise<void> {
      return kv.del(p + key);
    },
    async getByPrefix(prefixKey: string): Promise<any[]> {
      return kv.getByPrefix(p + prefixKey);
    },
    async mset(keys: string[], values: any[]): Promise<void> {
      return kv.mset(keys.map((k) => p + k), values);
    },
    async mget(keys: string[]): Promise<any[]> {
      return kv.mget(keys.map((k) => p + k));
    },
    async mdel(keys: string[]): Promise<void> {
      return kv.mdel(keys.map((k) => p + k));
    },
  };
}
