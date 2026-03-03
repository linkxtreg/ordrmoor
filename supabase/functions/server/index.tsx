import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client with service role key for storage operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ============================================
// RETRY HELPER FOR DATABASE OPERATIONS
// ============================================

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`${operationName} attempt ${attempt + 1} failed:`, error);

      // Check if it's a connection error that might benefit from retry
      const errorMsg = String(error).toLowerCase();
      const isRetryable = 
        errorMsg.includes('connection') ||
        errorMsg.includes('reset by peer') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('econnreset') ||
        errorMsg.includes('network');

      if (!isRetryable) {
        // Don't retry non-connection errors
        throw error;
      }

      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.log(`Retrying ${operationName} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(`${operationName} failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage bucket on startup
async function initializeStorage() {
  const bucketName = 'make-47a828b2-menu-images';
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log(`Bucket ${bucketName} created successfully`);
      }
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Call initialization
initializeStorage();

// Health check endpoint
app.get("/make-server-47a828b2/health", (c) => {
  return c.json({ status: "ok" });
});

// ============================================
// MENUS ENDPOINTS
// ============================================

// Get all menus
app.get("/make-server-47a828b2/menus", async (c) => {
  try {
    let menus = await kv.getByPrefix("menu:");
    if (menus.length === 0) {
      // Auto-migrate: create default menu if we have existing categories/items
      const categories = await kv.getByPrefix("category:");
      const items = await kv.getByPrefix("menu-item:");
      if (categories.length > 0 || items.length > 0) {
        const defaultMenuId = crypto.randomUUID();
        await kv.set(`menu:${defaultMenuId}`, { id: defaultMenuId, name: "Main Menu", order: 0 });
        for (const cat of categories) {
          await kv.set(`category:${cat.id}`, { ...cat, menuId: defaultMenuId });
        }
        for (const item of items) {
          await kv.set(`menu-item:${item.id}`, { ...item, menuId: defaultMenuId });
        }
        menus = await kv.getByPrefix("menu:");
      }
    }
    const sorted = menus.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return c.json({ success: true, data: sorted });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create menu
app.post("/make-server-47a828b2/menus", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const menu = { id, name: body.name || "New Menu", order: body.order ?? 0 };
    await withRetry(() => kv.set(`menu:${id}`, menu), 'Create menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    console.error('Error creating menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update menu
app.put("/make-server-47a828b2/menus/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const menu = { ...body, id };
    await withRetry(() => kv.set(`menu:${id}`, menu), 'Update menu');
    return c.json({ success: true, data: menu });
  } catch (error) {
    console.error('Error updating menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete menu (and its categories + items)
app.delete("/make-server-47a828b2/menus/:id", async (c) => {
  try {
    const menuId = c.req.param('id');
    const categories = await kv.getByPrefix("category:");
    const items = await kv.getByPrefix("menu-item:");
    const catsToDelete = categories.filter((cat) => cat.menuId === menuId);
    const itemsToDelete = items.filter((item) => item.menuId === menuId);
    for (const item of itemsToDelete) {
      await kv.del(`menu-item:${item.id}`);
    }
    for (const cat of catsToDelete) {
      await kv.del(`category:${cat.id}`);
    }
    await kv.del(`menu:${menuId}`);
    return c.json({ success: true, deleted: { menus: 1, categories: catsToDelete.length, menuItems: itemsToDelete.length } });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Duplicate menu (with its categories and items)
app.post("/make-server-47a828b2/menus/:id/duplicate", async (c) => {
  try {
    const sourceMenuId = c.req.param('id');
    const sourceMenu = await kv.get(`menu:${sourceMenuId}`);
    if (!sourceMenu) {
      return c.json({ success: false, error: 'Menu not found' }, 404);
    }
    const newMenuId = crypto.randomUUID();
    const newMenu = { id: newMenuId, name: `${sourceMenu.name} (Copy)`, order: (sourceMenu.order ?? 0) + 1 };
    await kv.set(`menu:${newMenuId}`, newMenu);

    const categories = (await kv.getByPrefix("category:")).filter((cat) => cat.menuId === sourceMenuId);
    const items = (await kv.getByPrefix("menu-item:")).filter((item) => item.menuId === sourceMenuId);

    const categoryIdMap: Record<string, string> = {};
    for (const cat of categories) {
      const newId = crypto.randomUUID();
      categoryIdMap[cat.id] = newId;
      await kv.set(`category:${newId}`, { ...cat, id: newId, menuId: newMenuId });
    }

    for (const item of items) {
      const newId = crypto.randomUUID();
      await kv.set(`menu-item:${newId}`, {
        ...item,
        id: newId,
        menuId: newMenuId,
        category: categories.find((c) => c.id === item.category)?.name ?? item.category,
      });
    }

    return c.json({ success: true, data: newMenu, duplicated: { categories: categories.length, menuItems: items.length } });
  } catch (error) {
    console.error('Error duplicating menu:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// MENU ITEMS ENDPOINTS
// ============================================

// Get all menu items (optional ?menuId= filter)
app.get("/make-server-47a828b2/menu-items", async (c) => {
  try {
    const menuId = c.req.query('menuId');
    let items = await kv.getByPrefix("menu-item:");
    if (menuId) {
      items = items.filter((item) => (item.menuId ?? '') === menuId);
    }
    return c.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single menu item
app.get("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const item = await kv.get(`menu-item:${id}`);
    if (!item) {
      return c.json({ success: false, error: 'Menu item not found' }, 404);
    }
    return c.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create menu item
app.post("/make-server-47a828b2/menu-items", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const item = { ...body, id };
    
    await withRetry(
      () => kv.set(`menu-item:${id}`, item),
      'Create menu item'
    );
    return c.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update menu item
app.put("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const item = { ...body, id };
    
    await withRetry(
      () => kv.set(`menu-item:${id}`, item),
      'Update menu item'
    );
    return c.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete menu item
app.delete("/make-server-47a828b2/menu-items/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`menu-item:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// CATEGORIES ENDPOINTS
// ============================================

// Get all categories (optional ?menuId= filter)
app.get("/make-server-47a828b2/categories", async (c) => {
  try {
    const menuId = c.req.query('menuId');
    let categories = await kv.getByPrefix("category:");
    if (menuId) {
      categories = categories.filter((cat) => (cat.menuId ?? '') === menuId);
    }
    return c.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get single category
app.get("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const category = await kv.get(`category:${id}`);
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404);
    }
    return c.json({ success: true, data: category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create category
app.post("/make-server-47a828b2/categories", async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || crypto.randomUUID();
    const category = { ...body, id };
    
    await withRetry(
      () => kv.set(`category:${id}`, category),
      'Create category'
    );
    return c.json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update category
app.put("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const category = { ...body, id };
    
    await withRetry(
      () => kv.set(`category:${id}`, category),
      'Update category'
    );
    return c.json({ success: true, data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete category
app.delete("/make-server-47a828b2/categories/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`category:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// GENERAL INFO ENDPOINTS
// ============================================

// Get general info
app.get("/make-server-47a828b2/general-info", async (c) => {
  try {
    const info = await kv.get("general-info");
    if (!info) {
      // Return default general info instead of 404
      const defaultInfo = {
        restaurantName: 'My Restaurant',
        tagline: 'Delicious food served daily',
        phoneNumber: '',
        logoImage: '',
        backgroundImage: '',
        brandColor: '#e7000b',
        defaultMenuId: '',
        socialMedia: {
          facebook: '',
          instagram: '',
          tiktok: '',
          messenger: '',
        },
      };
      return c.json({ success: true, data: defaultInfo });
    }
    return c.json({ success: true, data: info });
  } catch (error) {
    console.error('Error fetching general info:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update general info
app.put("/make-server-47a828b2/general-info", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("general-info", body);
    return c.json({ success: true, data: body });
  } catch (error) {
    console.error('Error updating general info:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// IMAGE UPLOAD ENDPOINT
// ============================================

app.post("/make-server-47a828b2/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const bucketName = 'make-47a828b2-menu-images';

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return c.json({ success: false, error: `Upload error: ${uploadError.message}` }, 500);
    }

    // Generate signed URL (valid for 10 years)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 315360000); // 10 years in seconds

    if (urlError || !urlData) {
      console.error('Error creating signed URL:', urlError);
      return c.json({ success: false, error: 'Failed to create signed URL' }, 500);
    }

    return c.json({ 
      success: true, 
      data: { 
        url: urlData.signedUrl,
        fileName: fileName 
      } 
    });
  } catch (error) {
    console.error('Error in upload-image endpoint:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// INITIALIZATION ENDPOINT
// ============================================

// Initialize database with default data (only if empty)
app.post("/make-server-47a828b2/initialize", async (c) => {
  try {
    const existingMenus = await kv.getByPrefix("menu:");
    if (existingMenus.length > 0) {
      return c.json({ 
        success: true, 
        message: 'Database already initialized',
        alreadyInitialized: true 
      });
    }

    const { menuItems, categories, generalInfo } = await c.req.json();
    const menuId = crypto.randomUUID();

    const promises = [];
    promises.push(kv.set(`menu:${menuId}`, { id: menuId, name: "Main Menu", order: 0 }));

    for (const item of menuItems) {
      promises.push(kv.set(`menu-item:${item.id}`, { ...item, menuId }));
    }
    for (const category of categories) {
      promises.push(kv.set(`category:${category.id}`, { ...category, menuId }));
    }
    promises.push(kv.set("general-info", { ...generalInfo, defaultMenuId: generalInfo.defaultMenuId ?? menuId }));

    await Promise.all(promises);

    return c.json({ 
      success: true, 
      message: 'Database initialized successfully',
      alreadyInitialized: false
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear all menus, menu items and categories from database
app.delete("/make-server-47a828b2/clear-all", async (c) => {
  try {
    const menuItems = await kv.getByPrefix("menu-item:");
    const categories = await kv.getByPrefix("category:");
    const menus = await kv.getByPrefix("menu:");

    const deletePromises = [];
    for (const item of menuItems) {
      deletePromises.push(kv.del(`menu-item:${item.id}`));
    }
    for (const category of categories) {
      deletePromises.push(kv.del(`category:${category.id}`));
    }
    for (const menu of menus) {
      deletePromises.push(kv.del(`menu:${menu.id}`));
    }

    await Promise.all(deletePromises);

    return c.json({ 
      success: true, 
      message: `Deleted ${menus.length} menus, ${menuItems.length} menu items and ${categories.length} categories`,
      deleted: {
        menus: menus.length,
        menuItems: menuItems.length,
        categories: categories.length
      }
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);