# 📱 Mobile App Examples

Complete examples for integrating your restaurant menu API into mobile applications.

---

## React Native Example

### Setup

```bash
npm install @react-native-async-storage/async-storage
```

### Configuration

```javascript
// config/api.js
export const API_CONFIG = {
  baseUrl: 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2',
  anonKey: 'YOUR_ANON_KEY'
};
```

### API Service

```javascript
// services/MenuService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

const headers = {
  'Authorization': `Bearer ${API_CONFIG.anonKey}`,
  'Content-Type': 'application/json'
};

class MenuService {
  // Fetch all menu items with caching
  async getMenuItems(useCache = true) {
    const CACHE_KEY = 'menu_items';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (useCache) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/menu-items`, { headers });
    const result = await response.json();
    
    if (result.success) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: result.data,
        timestamp: Date.now()
      }));
      return result.data;
    }
    
    throw new Error(result.error || 'Failed to fetch menu items');
  }

  async getCategories() {
    const response = await fetch(`${API_CONFIG.baseUrl}/categories`, { headers });
    const result = await response.json();
    return result.success ? result.data : [];
  }

  async getBranches() {
    const response = await fetch(`${API_CONFIG.baseUrl}/branches`, { headers });
    const result = await response.json();
    return result.success ? result.data : [];
  }

  async getGeneralInfo() {
    const response = await fetch(`${API_CONFIG.baseUrl}/general-info`, { headers });
    const result = await response.json();
    return result.success ? result.data : null;
  }
}

export default new MenuService();
```

### Menu Screen Component

```javascript
// screens/MenuScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import MenuService from '../services/MenuService';

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generalInfo, setGeneralInfo] = useState(null);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu(useCache = true) {
    try {
      setLoading(true);
      const [items, cats, info] = await Promise.all([
        MenuService.getMenuItems(useCache),
        MenuService.getCategories(),
        MenuService.getGeneralInfo()
      ]);

      // Filter only available items
      setMenuItems(items.filter(item => item.isAvailable));
      setCategories(cats);
      setGeneralInfo(info);
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMenu(false); // Force refresh, skip cache
    setRefreshing(false);
  }

  function getFilteredItems() {
    if (selectedCategory === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === selectedCategory);
  }

  function renderCategoryButton({ item }) {
    const isSelected = selectedCategory === item.name;
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isSelected && { backgroundColor: item.color }
        ]}
        onPress={() => setSelectedCategory(item.name)}
      >
        <Text style={[
          styles.categoryText,
          isSelected && styles.categoryTextActive
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderMenuItem({ item }) {
    return (
      <TouchableOpacity style={styles.menuItem}>
        <Image 
          source={{ uri: item.image }} 
          style={styles.menuImage}
          resizeMode="cover"
        />
        
        {item.isPopular && (
          <View style={[
            styles.popularBadge,
            { backgroundColor: generalInfo?.brandColor || '#e7000b' }
          ]}>
            <Text style={styles.popularText}>⭐ Popular</Text>
          </View>
        )}

        <View style={styles.menuDetails}>
          <Text style={styles.menuName}>{item.name}</Text>
          <Text style={styles.menuDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Pricing Table */}
          <View style={styles.pricingContainer}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingHeader}>Type</Text>
              {item.mealTypes.map(mealType => (
                <Text key={mealType} style={styles.pricingHeader}>
                  {mealType}
                </Text>
              ))}
            </View>
            
            {item.variations.map(variation => (
              <View key={variation} style={styles.pricingRow}>
                <Text style={styles.variationText}>{variation}</Text>
                {item.mealTypes.map(mealType => (
                  <Text
                    key={mealType}
                    style={[
                      styles.priceText,
                      { color: generalInfo?.brandColor || '#e7000b' }
                    ]}
                  >
                    {item.pricing[variation]?.[mealType] || '-'}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e7000b" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with branding */}
      {generalInfo && (
        <View style={[
          styles.header,
          { backgroundColor: generalInfo.brandColor }
        ]}>
          {generalInfo.logoImage && (
            <Image 
              source={{ uri: generalInfo.logoImage }}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
          <Text style={styles.tagline}>{generalInfo.tagline}</Text>
          <Text style={styles.phone}>📞 {generalInfo.phoneNumber}</Text>
        </View>
      )}

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All Items', color: '#6b7280' }, ...categories]}
          keyExtractor={item => item.id}
          renderItem={renderCategoryButton}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Menu Items */}
      <FlatList
        data={getFilteredItems()}
        keyExtractor={item => item.id}
        renderItem={renderMenuItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.menuList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items in this category</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    color: '#fff',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryTextActive: {
    color: '#fff',
  },
  menuList: {
    padding: 16,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuImage: {
    width: '100%',
    height: 200,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuDetails: {
    padding: 16,
  },
  menuName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  pricingContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pricingHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  variationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  priceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 32,
  },
});
```

---

## Flutter Example

### Setup

```yaml
# pubspec.yaml
dependencies:
  http: ^1.1.0
  shared_preferences: ^2.2.2
```

### API Service

```dart
// lib/services/menu_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String baseUrl = 
    'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-47a828b2';
  static const String anonKey = 'YOUR_ANON_KEY';
}

class MenuItem {
  final String id;
  final String name;
  final String category;
  final String description;
  final Map<String, Map<String, dynamic>> pricing;
  final String image;
  final bool isAvailable;
  final bool isPopular;
  final List<String> variations;
  final List<String> mealTypes;

  MenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.pricing,
    required this.image,
    required this.isAvailable,
    required this.isPopular,
    required this.variations,
    required this.mealTypes,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'],
      name: json['name'],
      category: json['category'],
      description: json['description'],
      pricing: Map<String, Map<String, dynamic>>.from(json['pricing']),
      image: json['image'],
      isAvailable: json['isAvailable'],
      isPopular: json['isPopular'],
      variations: List<String>.from(json['variations']),
      mealTypes: List<String>.from(json['mealTypes']),
    );
  }
}

class Category {
  final String id;
  final String name;
  final String color;
  final String description;

  Category({
    required this.id,
    required this.name,
    required this.color,
    required this.description,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'],
      name: json['name'],
      color: json['color'],
      description: json['description'],
    );
  }
}

class GeneralInfo {
  final String phoneNumber;
  final String tagline;
  final String backgroundImage;
  final String logoImage;
  final String brandColor;
  final Map<String, String> socialMedia;

  GeneralInfo({
    required this.phoneNumber,
    required this.tagline,
    required this.backgroundImage,
    required this.logoImage,
    required this.brandColor,
    required this.socialMedia,
  });

  factory GeneralInfo.fromJson(Map<String, dynamic> json) {
    return GeneralInfo(
      phoneNumber: json['phoneNumber'],
      tagline: json['tagline'],
      backgroundImage: json['backgroundImage'],
      logoImage: json['logoImage'],
      brandColor: json['brandColor'],
      socialMedia: Map<String, String>.from(json['socialMedia']),
    );
  }
}

class MenuService {
  static final Map<String, String> _headers = {
    'Authorization': 'Bearer ${ApiConfig.anonKey}',
    'Content-Type': 'application/json',
  };

  Future<List<MenuItem>> getMenuItems({bool useCache = true}) async {
    const cacheKey = 'menu_items';
    const cacheDuration = Duration(minutes: 5);

    if (useCache) {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(cacheKey);
      
      if (cached != null) {
        final data = json.decode(cached);
        final timestamp = DateTime.parse(data['timestamp']);
        
        if (DateTime.now().difference(timestamp) < cacheDuration) {
          return (data['items'] as List)
              .map((item) => MenuItem.fromJson(item))
              .toList();
        }
      }
    }

    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/menu-items'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final result = json.decode(response.body);
      if (result['success']) {
        final items = (result['data'] as List)
            .map((item) => MenuItem.fromJson(item))
            .toList();

        // Cache the result
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(cacheKey, json.encode({
          'items': result['data'],
          'timestamp': DateTime.now().toIso8601String(),
        }));

        return items;
      }
    }

    throw Exception('Failed to load menu items');
  }

  Future<List<Category>> getCategories() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/categories'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final result = json.decode(response.body);
      if (result['success']) {
        return (result['data'] as List)
            .map((item) => Category.fromJson(item))
            .toList();
      }
    }

    return [];
  }

  Future<GeneralInfo?> getGeneralInfo() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/general-info'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final result = json.decode(response.body);
      if (result['success']) {
        return GeneralInfo.fromJson(result['data']);
      }
    }

    return null;
  }
}
```

### Menu Screen Widget

```dart
// lib/screens/menu_screen.dart
import 'package:flutter/material.dart';
import '../services/menu_service.dart';

class MenuScreen extends StatefulWidget {
  @override
  _MenuScreenState createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final MenuService _menuService = MenuService();
  
  List<MenuItem> _menuItems = [];
  List<Category> _categories = [];
  GeneralInfo? _generalInfo;
  String _selectedCategory = 'all';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMenu();
  }

  Future<void> _loadMenu({bool useCache = true}) async {
    try {
      final results = await Future.wait([
        _menuService.getMenuItems(useCache: useCache),
        _menuService.getCategories(),
        _menuService.getGeneralInfo(),
      ]);

      setState(() {
        _menuItems = (results[0] as List<MenuItem>)
            .where((item) => item.isAvailable)
            .toList();
        _categories = results[1] as List<Category>;
        _generalInfo = results[2] as GeneralInfo?;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading menu: $e');
      setState(() => _isLoading = false);
    }
  }

  List<MenuItem> _getFilteredItems() {
    if (_selectedCategory == 'all') {
      return _menuItems;
    }
    return _menuItems
        .where((item) => item.category == _selectedCategory)
        .toList();
  }

  Color _hexToColor(String hex) {
    hex = hex.replaceAll('#', '');
    return Color(int.parse('FF$hex', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading menu...'),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => _loadMenu(useCache: false),
        child: CustomScrollView(
          slivers: [
            // Header
            if (_generalInfo != null)
              SliverAppBar(
                expandedHeight: 200,
                backgroundColor: _hexToColor(_generalInfo!.brandColor),
                flexibleSpace: FlexibleSpaceBar(
                  background: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_generalInfo!.logoImage.isNotEmpty)
                        Image.network(
                          _generalInfo!.logoImage,
                          height: 80,
                        ),
                      SizedBox(height: 8),
                      Text(
                        _generalInfo!.tagline,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '📞 ${_generalInfo!.phoneNumber}',
                        style: TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),

            // Category Filter
            SliverPersistentHeader(
              pinned: true,
              delegate: _CategoryFilterDelegate(
                categories: _categories,
                selectedCategory: _selectedCategory,
                onCategorySelected: (category) {
                  setState(() => _selectedCategory = category);
                },
                hexToColor: _hexToColor,
              ),
            ),

            // Menu Items
            SliverPadding(
              padding: EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final item = _getFilteredItems()[index];
                    return _buildMenuItem(item);
                  },
                  childCount: _getFilteredItems().length,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(MenuItem item) {
    return Card(
      margin: EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              Image.network(
                item.image,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
              if (item.isPopular)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _generalInfo != null 
                          ? _hexToColor(_generalInfo!.brandColor)
                          : Colors.red,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '⭐ Popular',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  item.description,
                  style: TextStyle(color: Colors.grey[600]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 12),
                _buildPricingTable(item),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricingTable(MenuItem item) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      padding: EdgeInsets.all(12),
      child: Column(
        children: [
          // Header row
          Row(
            children: [
              Expanded(child: Text('Type', style: TextStyle(fontWeight: FontWeight.bold))),
              ...item.mealTypes.map((mealType) => Expanded(
                child: Text(
                  mealType,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
              )),
            ],
          ),
          Divider(),
          // Price rows
          ...item.variations.map((variation) => Padding(
            padding: EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(child: Text(variation)),
                ...item.mealTypes.map((mealType) => Expanded(
                  child: Text(
                    item.pricing[variation]?[mealType]?.toString() ?? '-',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _generalInfo != null
                          ? _hexToColor(_generalInfo!.brandColor)
                          : Colors.red,
                    ),
                  ),
                )),
              ],
            ),
          )),
        ],
      ),
    );
  }
}

// Category filter delegate for sticky header
class _CategoryFilterDelegate extends SliverPersistentHeaderDelegate {
  final List<Category> categories;
  final String selectedCategory;
  final Function(String) onCategorySelected;
  final Color Function(String) hexToColor;

  _CategoryFilterDelegate({
    required this.categories,
    required this.selectedCategory,
    required this.onCategorySelected,
    required this.hexToColor,
  });

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          _buildCategoryChip('All Items', 'all', Colors.grey),
          ...categories.map((cat) => _buildCategoryChip(
            cat.name,
            cat.name,
            hexToColor(cat.color),
          )),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, String value, Color color) {
    final isSelected = selectedCategory == value;
    return Padding(
      padding: EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onCategorySelected(value),
        backgroundColor: Colors.grey[200],
        selectedColor: color,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.black87,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  double get maxExtent => 60;

  @override
  double get minExtent => 60;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => true;
}
```

---

## 🎯 Best Practices

### 1. Caching Strategy
- Cache menu data for 5-10 minutes
- Force refresh on pull-to-refresh
- Clear cache when app is backgrounded

### 2. Error Handling
```javascript
try {
  const items = await MenuService.getMenuItems();
  setMenuItems(items);
} catch (error) {
  // Show user-friendly error
  Alert.alert(
    'Connection Error',
    'Unable to load menu. Please check your internet connection.',
    [{ text: 'Retry', onPress: () => loadMenu() }]
  );
}
```

### 3. Offline Support
```javascript
// Store last successful fetch
await AsyncStorage.setItem('last_menu_data', JSON.stringify(menuItems));

// On error, load from storage
const cached = await AsyncStorage.getItem('last_menu_data');
if (cached) {
  setMenuItems(JSON.parse(cached));
}
```

### 4. Image Optimization
```javascript
// React Native
<Image 
  source={{ uri: item.image }}
  defaultSource={require('./placeholder.png')}
  style={styles.image}
/>

// Flutter
FadeInImage.memoryNetwork(
  placeholder: kTransparentImage,
  image: item.image,
)
```

### 5. Performance
- Use FlatList/ListView for long lists
- Implement pagination if needed
- Lazy load images
- Memoize expensive computations

---

## 📱 Platform-Specific Tips

### iOS (Swift)
```swift
let url = URL(string: "\(apiBase)/menu-items")!
var request = URLRequest(url: url)
request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

URLSession.shared.dataTask(with: request) { data, response, error in
    // Handle response
}.resume()
```

### Android (Kotlin)
```kotlin
val client = OkHttpClient()
val request = Request.Builder()
    .url("$apiBase/menu-items")
    .addHeader("Authorization", "Bearer $anonKey")
    .build()

client.newCall(request).enqueue(object : Callback {
    // Handle response
})
```

---

## 🔄 Real-Time Updates

For real-time menu updates, poll the API periodically:

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // Refresh menu silently in background
    MenuService.getMenuItems(false);
  }, 30000); // Every 30 seconds

  return () => clearInterval(interval);
}, []);
```

Or use Supabase real-time subscriptions for instant updates (requires additional setup).

---

## 🎨 UI/UX Recommendations

1. **Show popular items first** - Highlight items with `isPopular: true`
2. **Visual category indicators** - Use category colors from API
3. **Loading states** - Show skeletons while loading
4. **Empty states** - Friendly message when no items
5. **Pull to refresh** - Let users manually refresh
6. **Search functionality** - Filter items by name
7. **Item details modal** - Show full pricing matrix
8. **Share functionality** - Share menu items
9. **Favorites** - Let users save favorite items
10. **Dark mode support** - Respect system theme

---

## 🚀 Ready to Build!

These examples provide a complete starting point for your mobile app. Customize the UI to match your brand while keeping the API integration patterns.

**Next Steps:**
1. Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY` with your actual credentials
2. Copy the relevant code for your platform
3. Customize styling to match your brand
4. Add additional features (search, favorites, etc.)
5. Test thoroughly and deploy!

Good luck building your restaurant app! 🍔📱
