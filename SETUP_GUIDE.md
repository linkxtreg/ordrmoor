# Restaurant Menu System - Setup & Integration Guide

## 🎉 Overview

Your restaurant admin backend has been successfully transformed from a demo into a **fully functional, live product** with real database persistence, image storage, and a customer-facing mobile menu interface.

## 🏗️ Architecture

```
┌─────────────────────┐
│   Admin Dashboard   │ ← You manage menu, categories, branches, general info
└──────────┬──────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────┐              ┌──────────────────────┐
│  Customer Mobile UI  │              │  Future Mobile App   │
│  (Built-in Preview)  │              │  (React Native, etc) │
└──────────────────────┘              └──────────────────────┘
           │                                     │
           └─────────────────┬───────────────────┘
                             ▼
                 ┌───────────────────────┐
                 │   Supabase Backend    │
                 ├───────────────────────┤
                 │ • REST API Endpoints  │
                 │ • PostgreSQL Database │
                 │ • Image Storage       │
                 └───────────────────────┘
```

## 🚀 What's Been Implemented

### 1. **Backend Server** (`/supabase/functions/server/index.tsx`)
Complete REST API with the following endpoints:

#### Menu Items
- `GET /make-server-47a828b2/menu-items` - Get all menu items
- `GET /make-server-47a828b2/menu-items/:id` - Get single menu item
- `POST /make-server-47a828b2/menu-items` - Create menu item
- `PUT /make-server-47a828b2/menu-items/:id` - Update menu item
- `DELETE /make-server-47a828b2/menu-items/:id` - Delete menu item

#### Categories
- `GET /make-server-47a828b2/categories` - Get all categories
- `POST /make-server-47a828b2/categories` - Create category
- `PUT /make-server-47a828b2/categories/:id` - Update category
- `DELETE /make-server-47a828b2/categories/:id` - Delete category

#### Branches
- `GET /make-server-47a828b2/branches` - Get all branches (sorted by order)
- `POST /make-server-47a828b2/branches` - Create branch
- `PUT /make-server-47a828b2/branches/:id` - Update branch
- `DELETE /make-server-47a828b2/branches/:id` - Delete branch
- `PUT /make-server-47a828b2/branches/reorder` - Bulk reorder branches

#### General Info
- `GET /make-server-47a828b2/general-info` - Get restaurant info
- `PUT /make-server-47a828b2/general-info` - Update restaurant info

#### Image Upload
- `POST /make-server-47a828b2/upload-image` - Upload image to Supabase Storage
  - Returns signed URL (valid for 10 years)
  - Stores in private bucket: `make-47a828b2-menu-images`
  - Max file size: 5MB

#### Initialization
- `POST /make-server-47a828b2/initialize` - Initialize database with demo data
  - Only runs once
  - Populates categories, menu items, branches, and general info

### 2. **Frontend API Service** (`/src/app/services/api.ts`)
Typed API client with functions for all CRUD operations:
- `menuItemsApi` - Menu items operations
- `categoriesApi` - Categories operations
- `branchesApi` - Branches operations
- `generalInfoApi` - General info operations
- `imageApi` - Image upload functionality
- `initApi` - Database initialization

### 3. **Data Persistence**
All data is stored in Supabase's key-value store:
- **Menu items**: `menu-item:{id}`
- **Categories**: `category:{id}`
- **Branches**: `branch:{id}`
- **General info**: `general-info`
- **Images**: Stored in Supabase Storage bucket with signed URLs

### 4. **Customer-Facing Menu** (`/src/app/components/CustomerMenu.tsx`)
Beautiful, responsive mobile menu with:
- Hero section with background image and logo
- Social media links
- Expandable branches list
- Popular items section
- Category filtering
- Pricing matrix for each item
- Fully responsive design

### 5. **Admin Dashboard Enhancements**
- **Preview Button**: Click "Preview Menu" to see customer view
- **Real-time Updates**: All changes sync to database immediately
- **Image Upload**: Uploads to Supabase Storage with progress indicators
- **Toast Notifications**: Success/error feedback for all operations

## 📱 How to Connect a Mobile App

Your backend is now ready to be consumed by ANY mobile application (React Native, Flutter, Swift, Kotlin, etc).

### Mobile App Integration Steps:

#### 1. **Use the Same API Endpoints**
Your mobile app should make HTTP requests to the same endpoints:

```javascript
// Example: Fetch menu items in React Native
const API_BASE = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2';
const ANON_KEY = 'YOUR_ANON_KEY';

async function fetchMenuItems() {
  const response = await fetch(`${API_BASE}/menu-items`, {
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  const result = await response.json();
  return result.data;
}
```

#### 2. **Get Your Credentials**
The API credentials are available in:
- **File**: `/utils/supabase/info.tsx`
- **Project ID**: `projectId`
- **Anon Key**: `publicAnonKey`

#### 3. **Data Models**
Use the same TypeScript types from `/src/app/types/menu.ts`:

```typescript
interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  pricing: Record<string, Record<string, number>>;
  image: string;
  isAvailable: boolean;
  isPopular: boolean;
  variations: string[];
  mealTypes: string[];
}

interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface Branch {
  id: string;
  name: string;
  locationUrl: string;
  order: number;
}

interface GeneralInfo {
  phoneNumber: string;
  tagline: string;
  backgroundImage: string;
  logoImage: string;
  brandColor: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    tiktok: string;
    messenger: string;
  };
}
```

#### 4. **Example React Native Screen**

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image } from 'react-native';

const API_BASE = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2';

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    // Fetch menu items
    const itemsResponse = await fetch(`${API_BASE}/menu-items`, {
      headers: { 'Authorization': 'Bearer YOUR_ANON_KEY' }
    });
    const items = await itemsResponse.json();
    
    // Fetch categories
    const categoriesResponse = await fetch(`${API_BASE}/categories`, {
      headers: { 'Authorization': 'Bearer YOUR_ANON_KEY' }
    });
    const cats = await categoriesResponse.json();
    
    setMenuItems(items.data.filter(item => item.isAvailable));
    setCategories(cats.data);
  }

  return (
    <FlatList
      data={menuItems}
      renderItem={({ item }) => (
        <View>
          <Image source={{ uri: item.image }} />
          <Text>{item.name}</Text>
          <Text>{item.description}</Text>
        </View>
      )}
    />
  );
}
```

## 🎯 Key Features for Mobile Apps

### Real-Time Updates
Your mobile app can poll the API every few seconds to get the latest menu:
```javascript
setInterval(() => {
  fetchMenuItems();
}, 5000); // Refresh every 5 seconds
```

### Filter Available Items
Only show items where `isAvailable === true`:
```javascript
const availableItems = menuItems.filter(item => item.isAvailable);
```

### Show Popular Items
Highlight items marked as popular:
```javascript
const popularItems = menuItems.filter(item => item.isPopular);
```

### Display Pricing Matrix
Each item has flexible pricing:
```javascript
// item.pricing structure:
{
  "Single": {
    "Sandwich": 155,
    "+Fries": 185,
    "Combo": 210
  },
  "Double": {
    "Sandwich": 185,
    "+Fries": 215,
    "Combo": 240
  }
}
```

### Use Brand Colors
Apply the restaurant's brand color from `generalInfo.brandColor`:
```javascript
<View style={{ backgroundColor: generalInfo.brandColor }}>
  {/* Your content */}
</View>
```

## 🔄 Data Flow

### Admin Makes Changes:
1. Admin edits menu item in dashboard
2. Frontend calls API: `PUT /menu-items/:id`
3. Server updates Supabase database
4. Success message shown to admin

### Mobile App Sees Updates:
1. Mobile app fetches menu: `GET /menu-items`
2. Server retrieves data from Supabase
3. Mobile app receives updated menu
4. UI refreshes with new data

## 🛡️ Security Notes

1. **Public Access**: Current setup uses anonymous key (read-only recommended)
2. **Admin Protection**: For production, add authentication to admin routes
3. **Image Storage**: Images are in private bucket with signed URLs (10-year expiry)
4. **PII Warning**: Figma Make is for prototyping - don't store sensitive customer data

## 🚀 Next Steps

### To Deploy Your Mobile App:

1. **Copy API Credentials** from `/utils/supabase/info.tsx`
2. **Implement API Calls** using the endpoints documented above
3. **Test with Demo Data** - Your database is already populated
4. **Build Your UI** using the data models
5. **Deploy** to App Store / Play Store

### To Enhance the System:

- **Add Authentication**: Protect admin routes with login
- **Add Orders System**: Create order endpoints
- **Add Analytics**: Track popular items, sales data
- **Add Push Notifications**: Notify customers of new items
- **Add Real-time Sync**: Use Supabase real-time subscriptions

## 📞 Support

The system is fully functional and ready for mobile app integration. All changes made in the admin dashboard are immediately available through the API endpoints.

**Test it now:**
1. Click "Preview Menu" in the admin dashboard
2. See the customer-facing interface
3. Go back to admin, make changes
4. Preview again to see updates

Your restaurant menu system is now live! 🎉
