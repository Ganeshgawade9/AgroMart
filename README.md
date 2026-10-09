<<<<<<< HEAD
# 🌿 AgroConnect — Agricultural E-Commerce Platform

> **MCA Final Year Project** | JSPM University, Pune  
> Department of Computer Applications

A full-stack production-grade platform connecting Maharashtra farmers with nearby fertilizer and pesticide sellers, featuring GPS-based shop discovery, AI crop disease diagnosis, real-time order tracking, and automated PDF invoicing.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup (Windows)](#local-setup-windows)
- [API Reference](#api-reference)
- [Demo Credentials](#demo-credentials)
- [Deployment](#deployment)
- [Screenshots Guide](#screenshots-guide)

---

## Project Overview

AgroConnect solves real problems faced by Maharashtra farmers:

| Problem | Solution |
|---------|----------|
| Don't know nearby fertilizer shops | GPS-based nearby shop discovery with distance sorting |
| Need to travel long distances | Online ordering with home delivery |
| Can't compare prices | Product search with price/brand/rating filters |
| No order tracking | Amazon-style real-time order status tracking |
| No purchase history | Complete order history with downloadable PDF invoices |
| Can't identify crop diseases | AI chatbot — describe symptom → get medicine recommendation |

---

## Features

### 🌾 Farmer
- Register/Login with JWT authentication
- Search products by name, shop, village, taluka, district
- GPS-based nearby shop discovery (Haversine formula)
- Flipkart-style filters: price, brand, category, distance, rating, in-stock
- Add to cart, wishlist, buy now
- Place order (COD / UPI / Razorpay)
- Amazon-style order tracking (5 stages)
- Download PDF invoice for each order
- Rate and review products
- AI Chatbot: describe crop problem → get disease + medicine + nearby shop

### 🏪 Seller
- Register shop (requires admin approval)
- Add/edit/delete products with images
- Manage stock — low stock alerts on dashboard
- Accept/reject orders, update delivery status
- View revenue and order analytics
- Assign delivery partner to packed orders

### 🚚 Delivery Partner
- View assigned deliveries with customer address
- Google Maps navigation link
- OTP-based delivery confirmation (farmer gives OTP)
- Delivery history

### 🔧 Admin
- Dashboard: farmers, sellers, products, orders, revenue overview
- Approve/reject new seller registrations
- Block/activate any user account
- View all recent orders

### 🤖 AI Features
- Floating chatbot on every page
- Voice input (Hindi + English)
- Rule-based diagnosis (works without API key)
- Cohere AI integration for smarter responses
- Recommends: disease name, medicine with dosage, nearby shops

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.11 | Core language |
| Django 5.0 | Web framework |
| Django REST Framework | REST API |
| JWT (SimpleJWT) | Authentication |
| SQLite (dev) / PostgreSQL (prod) | Database |
| ReportLab | PDF invoice generation |
| Cohere API | AI chatbot responses |
| Cloudinary | Product image storage |
| Razorpay | Payment gateway |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + Vite | UI framework |
| Tailwind CSS v3 | Styling |
| React Router v6 | Routing |
| Zustand | State management |
| Axios | HTTP client |
| Lucide React | Icons |
| React Hot Toast | Notifications |

### Deployment
| Service | Use |
|---------|-----|
| Vercel | Frontend hosting |
| Render.com | Backend hosting |
| Neon PostgreSQL | Production database |
| Cloudinary | Image CDN |

---

## Project Structure

```
agroconnect/
│
├── backend/                        # Django REST API
│   ├── core/                       # Settings, URLs, WSGI
│   │   ├── settings.py             # Development settings
│   │   ├── settings_prod.py        # Production settings
│   │   └── urls.py                 # Root URL config
│   │
│   ├── accounts/                   # User management
│   │   ├── models.py               # User, SellerProfile, FarmerProfile
│   │   ├── serializers.py          # Registration, profile serializers
│   │   ├── views.py                # Auth views (login, register, profile)
│   │   ├── admin_views.py          # Admin dashboard API
│   │   └── urls.py                 # Auth + admin URLs
│   │
│   ├── products/                   # Product catalog
│   │   ├── models.py               # Product, Category, Brand, Cart, Wishlist, Review
│   │   ├── serializers.py          # Product serializers with Haversine distance
│   │   ├── views.py                # CRUD + search + filter views
│   │   ├── filters.py              # Django-filter: price, brand, distance, rating
│   │   └── urls.py
│   │
│   ├── orders/                     # Order management
│   │   ├── models.py               # Order, OrderItem, Invoice
│   │   ├── views.py                # Place order, track, delivery OTP, Razorpay
│   │   ├── invoice.py              # ReportLab PDF generator
│   │   ├── invoice_views.py        # PDF download endpoint
│   │   └── urls.py
│   │
│   ├── maps/                       # Location features
│   │   └── views.py                # Nearby shops API (Haversine)
│   │
│   ├── notifications/              # Push notifications (DB-based)
│   │   └── models.py
│   │
│   ├── ai_chat/                    # AI features
│   │   └── views.py                # Chatbot (Cohere + rule-based fallback)
│   │
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile                    # Render.com deploy
│   └── build.sh                    # Render.com build script
│
└── frontend/                       # React application
    ├── src/
    │   ├── api/                    # Axios API service files
    │   │   ├── axios.js            # Base config + auto token refresh
    │   │   ├── auth.js
    │   │   ├── products.js
    │   │   ├── orders.js
    │   │   ├── maps.js
    │   │   └── notifications.js
    │   │
    │   ├── store/                  # Zustand state
    │   │   ├── authStore.js        # User auth + tokens
    │   │   └── cartStore.js        # Cart item count
    │   │
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Navbar.jsx      # Top nav with search, cart, user menu
    │   │   │   ├── Footer.jsx
    │   │   │   ├── Spinner.jsx
    │   │   │   ├── ProtectedRoute.jsx   # Role-based route guard
    │   │   │   └── AIChatbot.jsx   # Floating AI assistant
    │   │   ├── products/
    │   │   │   ├── ProductCard.jsx      # Flipkart-style card
    │   │   │   └── FilterSidebar.jsx    # Smart filter panel
    │   │   └── orders/
    │   │       └── OrderStatusTracker.jsx  # Amazon-style tracker
    │   │
    │   ├── pages/
    │   │   ├── Home.jsx            # Landing page with banner, categories, featured
    │   │   ├── Products.jsx        # Product listing with filters
    │   │   ├── ProductDetail.jsx   # Detail with reviews, buy now
    │   │   ├── NearbyShops.jsx     # GPS shop discovery + Google Maps nav
    │   │   ├── Notifications.jsx
    │   │   ├── Profile.jsx
    │   │   ├── auth/               # Login, Register
    │   │   ├── farmer/             # Dashboard, Orders, Cart, Checkout, Wishlist
    │   │   ├── seller/             # Dashboard, Products CRUD, Orders
    │   │   ├── admin/              # Dashboard (stats, user mgmt)
    │   │   └── delivery/           # Dashboard, OTP confirmation
    │   │
    │   ├── hooks/
    │   │   └── useLocation.js      # GPS hook
    │   ├── utils/
    │   │   └── helpers.js          # formatPrice, formatDate, getStatusColor
    │   ├── App.jsx                 # Routes + layout
    │   └── main.jsx
    │
    ├── .env                        # Dev environment variables
    ├── .env.production             # Production env variables
    ├── tailwind.config.js
    ├── vite.config.js
    └── vercel.json                 # Vercel SPA routing config
```

---

## Local Setup (Windows)

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Step 1 — Clone / Extract project

```
agroconnect/
├── backend/
└── frontend/
```

### Step 2 — Backend Setup

```bash
# Open Command Prompt or PowerShell
cd agroconnect\backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and edit)
copy .env.example .env
# Open .env in Notepad and fill in your API keys

# Run database migrations
python manage.py migrate

# Load demo data (creates test users + 16 products)
python manage.py seed_data

# Create your own superuser (optional, seed_data already creates one)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**  
Django Admin:   **http://localhost:8000/admin**

### Step 3 — Frontend Setup

```bash
# Open a NEW terminal window
cd agroconnect\frontend

# Install Node packages
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

=======
# AgroMart
>>>>>>> 4e51f4ed554f1dfc94848841fdd86d1357186186
