import { MenuItem, Category, GeneralInfo } from "../types/menu";

export const initialCategories: Category[] = [
  {
    id: "1",
    name: "Beef Sandwiches",
    color: "#f43f5e",
    description: "Premium beef burgers and sandwiches"
  },
  {
    id: "2",
    name: "Chicken Sandwiches",
    color: "#f59e0b",
    description: "Crispy and grilled chicken options"
  },
  {
    id: "3",
    name: "Sides",
    color: "#64748b",
    description: "Appetizers and side dishes"
  },
  {
    id: "4",
    name: "Beverages",
    color: "#0ea5e9",
    description: "Soft drinks and refreshments"
  }
];

export const initialMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Original",
    category: "Beef Sandwiches",
    description: "Juicy beef patty with fresh lettuce, tomatoes, pickles, and our signature sauce on a toasted bun.",
    pricing: {
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
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: true,
    variations: ["Single", "Double"],
    mealTypes: ["Sandwich", "+Fries", "Combo"]
  },
  {
    id: "2",
    name: "Republic",
    category: "Beef Sandwiches",
    description: "Our signature burger with double beef patty, cheddar cheese, crispy bacon, and tangy BBQ sauce.",
    pricing: {
      "Single": {
        "Sandwich": 160,
        "+Fries": 190,
        "Combo": 215
      },
      "Double": {
        "Sandwich": 190,
        "+Fries": 220,
        "Combo": 245
      }
    },
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Single", "Double"],
    mealTypes: ["Sandwich", "+Fries", "Combo"]
  },
  {
    id: "3",
    name: "Juicy Lucy",
    category: "Beef Sandwiches",
    description: "Beef burger stuffed with melted cheese, topped with crispy onion rings, jalapeños, and special sauce.",
    pricing: {
      "Single": {
        "Sandwich": 185,
        "+Fries": 215,
        "Combo": 240
      },
      "Double": {
        "Sandwich": 215,
        "+Fries": 245,
        "Combo": 270
      }
    },
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Single", "Double"],
    mealTypes: ["Sandwich", "+Fries", "Combo"]
  },
  {
    id: "4",
    name: "Barbecue King",
    category: "Beef Sandwiches",
    description: "Smoky BBQ beef patty with cheddar, crispy bacon, onion rings, and tangy BBQ glaze.",
    pricing: {
      "Single": {
        "Sandwich": 160,
        "+Fries": 190,
        "Combo": 215
      },
      "Double": {
        "Sandwich": 190,
        "+Fries": 220,
        "Combo": 245
      }
    },
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Single", "Double"],
    mealTypes: ["Sandwich", "+Fries", "Combo"]
  },
  {
    id: "5",
    name: "OG Chicken",
    category: "Chicken Sandwiches",
    description: "Crispy fried chicken breast with lettuce, tomato, and mayo on a soft bun.",
    pricing: {
      "Single": {
        "Sandwich": 140,
        "+Fries": 170,
        "Combo": 195
      },
      "Double": {
        "Sandwich": 170,
        "+Fries": 200,
        "Combo": 225
      }
    },
    image: "https://images.unsplash.com/photo-1562059390-a761a084768e?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Single", "Double"],
    mealTypes: ["Sandwich", "+Fries", "Combo"]
  },
  {
    id: "6",
    name: "Classic Fries",
    category: "Sides",
    description: "Golden crispy French fries seasoned with sea salt.",
    pricing: {
      "Regular": {
        "Item": 35
      },
      "Large": {
        "Item": 50
      }
    },
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Regular", "Large"],
    mealTypes: ["Item"]
  },
  {
    id: "7",
    name: "Soft Drink",
    category: "Beverages",
    description: "Choice of Coca-Cola, Sprite, or Fanta.",
    pricing: {
      "Small": {
        "Item": 20
      },
      "Medium": {
        "Item": 25
      },
      "Large": {
        "Item": 30
      }
    },
    image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500&h=500&fit=crop",
    isAvailable: true,
    isPopular: false,
    variations: ["Small", "Medium", "Large"],
    mealTypes: ["Item"]
  }
];

export const initialGeneralInfo: GeneralInfo = {
  phoneNumber: "15879",
  tagline: "Your Burger Destination",
  backgroundImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop",
  logoImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop",
  brandColor: "#e7000b",
  socialMedia: {
    facebook: "https://facebook.com/burgerrepublic",
    instagram: "https://instagram.com/burgerrepublic",
    tiktok: "https://tiktok.com/@burgerrepublic",
    messenger: "https://m.me/burgerrepublic",
  },
};