#!/usr/bin/env node
/**
 * Migrate all menu items for tenant "noor" to simple pricing.
 * Clears optionGroups, pricingMatrix, priceVariants, and legacy pricing.
 * Uses the minimum price from matrix/variants/legacy as the main price.
 *
 * Usage: node scripts/migrate-to-simple-pricing.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load project config
const infoPath = join(__dirname, '../utils/supabase/info.tsx');
const infoContent = readFileSync(infoPath, 'utf-8');
const projectIdMatch = infoContent.match(/projectId\s*=\s*["']([^"']+)["']/);
const anonKeyMatch = infoContent.match(/publicAnonKey\s*=\s*["']([^"']+)["']/);
const projectId = projectIdMatch?.[1] || process.env.VITE_SUPABASE_PROJECT_ID || 'pfrpliybqegikexwuokl';
const publicAnonKey = anonKeyMatch?.[1] || process.env.VITE_SUPABASE_ANON_KEY;

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-47a828b2`;
const TENANT = 'noor';

function getMinPrice(item) {
  // Two-layer matrix
  const matrix = item.pricingMatrix;
  if (matrix?.cells?.length > 0) {
    const prices = matrix.cells.map((c) => c.discountedPrice != null && c.discountedPrice > 0 ? c.discountedPrice : c.price);
    return Math.min(...prices);
  }
  // Legacy pricing
  const p = item.pricing;
  if (p && typeof p === 'object') {
    let min = Infinity;
    for (const row of Object.values(p)) {
      if (row && typeof row === 'object') {
        for (const price of Object.values(row)) {
          if (typeof price === 'number' && price < min) min = price;
        }
      }
    }
    if (min !== Infinity) return min;
  }
  // Flat variants
  const v = item.priceVariants;
  if (Array.isArray(v) && v.length > 0) {
    const prices = v.map((x) => x.discountedPrice != null && x.discountedPrice > 0 ? x.discountedPrice : x.price);
    return Math.min(...prices);
  }
  return item.price ?? 0;
}

function toSimpleItem(item) {
  const price = getMinPrice(item);
  const { id, name, category, description, image, isAvailable, isPopular, order, menuId, nameEn, nameAr, descriptionEn, descriptionAr, discountedPrice } = item;
  return {
    id,
    name,
    category,
    description: description ?? '',
    price,
    discountedPrice: discountedPrice ?? undefined,
    image: image ?? '',
    isAvailable: isAvailable ?? true,
    isPopular: isPopular ?? false,
    order,
    menuId,
    nameEn,
    nameAr,
    descriptionEn,
    descriptionAr,
    // Explicitly omit advanced pricing fields
    priceVariants: undefined,
    optionGroups: undefined,
    pricingMatrix: undefined,
    pricing: undefined,
  };
}

async function run() {
  const headers = {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT,
  };

  console.log(`Fetching menu items for tenant "${TENANT}"...`);
  const listRes = await fetch(`${API_BASE}/menu-items`, { headers });
  const listJson = await listRes.json();
  if (!listJson.success) {
    console.error('Failed to fetch items:', listJson.error);
    process.exit(1);
  }
  const items = listJson.data;
  console.log(`Found ${items.length} menu items.`);

  let updated = 0;
  for (const item of items) {
    const simple = toSimpleItem(item);
    const putRes = await fetch(`${API_BASE}/menu-items/${item.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(simple),
    });
    const putJson = await putRes.json();
    if (!putJson.success) {
      console.error(`  Failed to update "${item.name}":`, putJson.error);
      continue;
    }
    updated++;
    if (updated <= 10 || updated % 50 === 0 || updated === items.length) {
      console.log(`  Updated ${updated}/${items.length}: "${item.name}" -> ${simple.price} EGP`);
    }
  }

  console.log(`\nDone. Converted ${updated} items to simple pricing.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
