# Restaurant Menu API Documentation

Base URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2`

All requests require the following header:
```
Authorization: Bearer YOUR_ANON_KEY
```

---

## 📋 Menu Items

### Get All Menu Items
**GET** `/menu-items`

Returns all menu items from the database.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Original Burger",
      "category": "Beef Sandwiches",
      "description": "Juicy beef patty with fresh lettuce...",
      "pricing": {
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
      },
      "image": "https://...",
      "isAvailable": true,
      "isPopular": true,
      "variations": ["Single", "Double"],
      "mealTypes": ["Sandwich", "+Fries", "Combo"]
    }
  ]
}
```

### Get Single Menu Item
**GET** `/menu-items/:id`

**Response:**
```json
{
  "success": true,
  "data": { /* MenuItem object */ }
}
```

### Create Menu Item
**POST** `/menu-items`

**Request Body:**
```json
{
  "id": "optional-custom-id",
  "name": "New Burger",
  "category": "Beef Sandwiches",
  "description": "Delicious new burger",
  "pricing": {
    "Single": { "Sandwich": 160 }
  },
  "image": "https://...",
  "isAvailable": true,
  "isPopular": false,
  "variations": ["Single"],
  "mealTypes": ["Sandwich"]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Created MenuItem with generated ID if not provided */ }
}
```

### Update Menu Item
**PUT** `/menu-items/:id`

**Request Body:** Same as Create (full MenuItem object)

**Response:**
```json
{
  "success": true,
  "data": { /* Updated MenuItem */ }
}
```

### Delete Menu Item
**DELETE** `/menu-items/:id`

**Response:**
```json
{
  "success": true
}
```

---

## 🏷️ Categories

### Get All Categories
**GET** `/categories`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Beef Sandwiches",
      "color": "#f43f5e",
      "description": "Premium beef burgers and sandwiches"
    }
  ]
}
```

### Get Single Category
**GET** `/categories/:id`

### Create Category
**POST** `/categories`

**Request Body:**
```json
{
  "id": "optional-custom-id",
  "name": "New Category",
  "color": "#3b82f6",
  "description": "Category description"
}
```

### Update Category
**PUT** `/categories/:id`

### Delete Category
**DELETE** `/categories/:id`

---

## 📍 Branches

### Get All Branches
**GET** `/branches`

Returns branches sorted by `order` field.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Hadayek El Kobba",
      "locationUrl": "https://maps.google.com/?q=Hadayek+El+Kobba",
      "order": 1
    }
  ]
}
```

### Get Single Branch
**GET** `/branches/:id`

### Create Branch
**POST** `/branches`

**Request Body:**
```json
{
  "id": "optional-custom-id",
  "name": "New Branch",
  "locationUrl": "https://maps.google.com/?q=...",
  "order": 12
}
```

### Update Branch
**PUT** `/branches/:id`

### Delete Branch
**DELETE** `/branches/:id`

### Reorder Branches (Bulk Update)
**PUT** `/branches/reorder`

**Request Body:**
```json
{
  "branches": [
    {
      "id": "1",
      "name": "First Branch",
      "locationUrl": "...",
      "order": 1
    },
    {
      "id": "2",
      "name": "Second Branch",
      "locationUrl": "...",
      "order": 2
    }
  ]
}
```

---

## ℹ️ General Info

### Get General Info
**GET** `/general-info`

**Response:**
```json
{
  "success": true,
  "data": {
    "phoneNumber": "15879",
    "tagline": "Your Burger Destination",
    "backgroundImage": "https://...",
    "logoImage": "https://...",
    "brandColor": "#e7000b",
    "socialMedia": {
      "facebook": "https://facebook.com/...",
      "instagram": "https://instagram.com/...",
      "tiktok": "https://tiktok.com/@...",
      "messenger": "https://m.me/..."
    }
  }
}
```

### Update General Info
**PUT** `/general-info`

**Request Body:** Same as response data (full GeneralInfo object)

---

## 🖼️ Image Upload

### Upload Image
**POST** `/upload-image`

**Request:** Multipart form data with `file` field

**Example:**
```javascript
const formData = new FormData();
formData.append('file', fileObject);

fetch('BASE_URL/upload-image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://...signed-url...",
    "fileName": "uuid.jpg"
  }
}
```

**Notes:**
- Maximum file size: 5MB
- Supported formats: All image types (PNG, JPG, etc.)
- Returns signed URL valid for 10 years
- Images stored in private Supabase Storage bucket

---

## 🔧 Initialization

### Initialize Database
**POST** `/initialize`

**Request Body:**
```json
{
  "menuItems": [/* Array of MenuItem objects */],
  "categories": [/* Array of Category objects */],
  "branches": [/* Array of Branch objects */],
  "generalInfo": {/* GeneralInfo object */}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "alreadyInitialized": false
}
```

**Notes:**
- Only initializes if database is empty
- If data exists, returns `alreadyInitialized: true` without making changes
- Useful for first-time setup

---

## 🚨 Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `404` - Resource not found
- `500` - Server error

---

## 💡 Usage Examples

### React Native Example

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image } from 'react-native';

const API_BASE = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2';
const ANON_KEY = 'YOUR_ANON_KEY';

const headers = {
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      // Fetch all data in parallel
      const [itemsRes, categoriesRes, generalRes] = await Promise.all([
        fetch(`${API_BASE}/menu-items`, { headers }),
        fetch(`${API_BASE}/categories`, { headers }),
        fetch(`${API_BASE}/general-info`, { headers })
      ]);

      const items = await itemsRes.json();
      const cats = await categoriesRes.json();
      const info = await generalRes.json();

      // Filter only available items
      setMenuItems(items.data.filter(item => item.isAvailable));
      setCategories(cats.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading menu:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <FlatList
      data={menuItems}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View>
          <Image 
            source={{ uri: item.image }} 
            style={{ width: '100%', height: 200 }}
          />
          <Text>{item.name}</Text>
          <Text>{item.description}</Text>
          {item.isPopular && <Text>⭐ Popular</Text>}
        </View>
      )}
    />
  );
}
```

### Flutter Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class MenuService {
  static const String baseUrl = 
    'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2';
  static const String anonKey = 'YOUR_ANON_KEY';

  static Future<List<dynamic>> getMenuItems() async {
    final response = await http.get(
      Uri.parse('$baseUrl/menu-items'),
      headers: {
        'Authorization': 'Bearer $anonKey',
        'Content-Type': 'application/json'
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data['success']) {
        return data['data'];
      }
    }
    throw Exception('Failed to load menu items');
  }

  static Future<dynamic> getGeneralInfo() async {
    final response = await http.get(
      Uri.parse('$baseUrl/general-info'),
      headers: {
        'Authorization': 'Bearer $anonKey',
        'Content-Type': 'application/json'
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data['success']) {
        return data['data'];
      }
    }
    throw Exception('Failed to load general info');
  }
}
```

---

## 🔐 Security Notes

1. **Anonymous Key**: The `publicAnonKey` is safe to use in mobile apps for read operations
2. **Admin Protection**: Consider adding authentication for write operations in production
3. **Rate Limiting**: Implement appropriate rate limiting in your mobile app
4. **Caching**: Cache API responses to reduce server load and improve performance

---

## 📊 Best Practices

### Filtering Data

**Show only available items:**
```javascript
const availableItems = menuItems.filter(item => item.isAvailable);
```

**Show only popular items:**
```javascript
const popularItems = menuItems.filter(item => item.isPopular);
```

**Filter by category:**
```javascript
const beefItems = menuItems.filter(item => item.category === 'Beef Sandwiches');
```

### Caching Strategy

```javascript
// Cache menu data locally
const CACHE_KEY = 'menu_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getMenuItems() {
  const cached = localStorage.getItem(CACHE_KEY);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  const response = await fetch(`${API_BASE}/menu-items`, { headers });
  const result = await response.json();
  
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data: result.data,
    timestamp: Date.now()
  }));
  
  return result.data;
}
```

### Pricing Display

```javascript
// Display pricing matrix
function renderPricing(item) {
  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          {item.mealTypes.map(type => <th key={type}>{type}</th>)}
        </tr>
      </thead>
      <tbody>
        {item.variations.map(variation => (
          <tr key={variation}>
            <td>{variation}</td>
            {item.mealTypes.map(mealType => (
              <td key={mealType}>
                {item.pricing[variation]?.[mealType] || '-'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🆘 Support

For questions or issues:
1. Check the error response message
2. Verify your API credentials
3. Ensure all required fields are included
4. Check network connectivity

**Common Issues:**
- **401 Unauthorized**: Check your `Authorization` header
- **404 Not Found**: Verify the endpoint URL and ID
- **500 Server Error**: Check request body format and required fields
