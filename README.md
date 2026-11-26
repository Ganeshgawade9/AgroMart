# 🌿 AgroMart (AgroConnect) — Agricultural E-Commerce & Delivery Platform

> A personal self-practice full-stack web and Android mobile project designed to connect farmers directly with nearby agricultural input shops and local delivery partners.

---

## 🌐 Live Links

- **Live Web Application:** https://ganeshpatil007.pythonanywhere.com/
- **Android APK Download (GitHub Actions):** https://github.com/Ganeshgawade9/AgroMart/actions  
  *(Open **Actions** → select the latest green **Build AgroMart Android APK** workflow → download the **`AgroMart-APK`** artifact and install `app-debug.apk` on Android.)*
- **Source Repository:** https://github.com/Ganeshgawade9/AgroMart

---

## 📖 Project Overview

**AgroMart (AgroConnect)** is an end-to-end agricultural marketplace built as a self-learning practice project. It brings **Farmers**, **Local Agro Shop Sellers**, and **Delivery Partners** onto a single unified platform accessible from both web browsers and an Android mobile application.

Farmers can search for seeds, fertilizers, pesticides, fungicides, herbicides, organic inputs, and farm equipment by crop or category, locate nearby trusted agro-centers on a live map, place orders using flexible payment options, download invoices, and track deliveries right to their village or farm.

---

## 🎯 Purpose of the Project

The core purpose of AgroMart is to simplify how agricultural supplies are discovered, compared, ordered, and delivered in rural and semi-urban regions by providing:
1. **Direct digital access** between farmers and verified nearby agricultural stores.
2. **Transparent pricing and stock visibility** so buyers know exact discounts, pack sizes, and availability before visiting or ordering.
3. **Localized, easy-to-use interfaces** in **English, Hindi (हिन्दी), and Marathi (मराठी)**.
4. **Guided crop-care support** through a built-in AI assistant for common crop queries.
5. **Coordinated last-mile delivery** using live location routing and OTP-verified handovers.

---

## 💡 Need for the Project

Traditional agricultural input purchasing often involves challenges for both farmers and local shopkeepers:

| Real-World Challenge | How AgroMart Addresses It |
| :--- | :--- |
| Farmers travel long distances only to find a fertilizer or seed out of stock | Real-time stock status (`In Stock`, `Only N left`, `Sold Out`) and **"Notify Me"** alerts when items return |
| Difficulty knowing which nearby shops carry specific products | **GPS Nearby Shops** discovery with distance, interactive map view, and estimated travel routes |
| Limited price and discount comparison across local sellers | Smart multi-filter catalog (category, brand, crop, price range, discount offers, rating, pack size) |
| Language barriers in agricultural portals | One-click switching between **English**, **Hindi**, and **Marathi** across the entire UI |
| Uncertainty during rural product delivery | Step-by-step live order tracking plus secure **pickup and delivery handover OTPs** |
| Lack of digital bills for farm expense records | Instant downloadable **PDF invoices** for completed orders |

---

## ✨ Key Features

### 🌾 For Farmers
- **Easy Discovery:** Browse promotional banners, categories, and **Shop by Crop** recommendations.
- **Powerful Search & Filters:** Filter products by category, brand, price range, organic tag, free delivery, offers, customer rating, and stock availability.
- **Nearby Shop Map:** Auto-detect location to find nearby agricultural shops, view distance, and check route directions.
- **Smart Shopping Tools:** Wishlist, Shopping Cart, Recently Viewed history, and back-in-stock notifications.
- **Flexible Checkout:** Support for Cash on Delivery (COD), UPI QR payments, and Razorpay checkout.
- **Order Tracking & Invoices:** Track every order stage from placement to delivery and download PDF bills.
- **Product Reviews:** Read and submit ratings and feedback for purchased products.

### 🏪 For Sellers
- **Dedicated Shop Profile:** Set up store details, village/taluka/district location, and payment preferences.
- **Inventory & Product Management:** Add, edit, and manage product listings, pricing, MRP/discounts, images, and stock quantities with low-stock visibility.
- **Order Management:** Accept, pack, and dispatch incoming customer orders with handover OTP confirmation.
- **Sales Overview:** Monitor shop orders, product performance, and revenue insights on the seller dashboard.

### 🚚 For Delivery Partners
- **Online Duty Toggle:** Switch availability online/offline to receive nearby delivery requests.
- **Nearest-Rider Offers:** Accept or decline incoming pickup requests from local agro shops.
- **Live Location & Navigation:** Share active delivery location and follow routes between shop and buyer.
- **OTP-Verified Handover:** Confirm both store pickup and customer delivery securely via OTP.

### 🤖 Smart Assistance & Accessibility
- **Floating AI Crop Assistant:** Available on every page with quick symptom/crop guidance, product suggestions, and voice search support.
- **Multilingual UI:** Instant **English / Hindi / Marathi** translation across navigation, filters, product cards, and pages.
- **Cross-Platform Experience:** Responsive web application plus native **Android APK** packaged with Capacitor so web and mobile accounts stay completely synced.

---

## 📝 How to Create an Account

All user roles register directly from the **Create Account** (`/register`) page on the live website or mobile app:

### 1. Creating a 🌾 Farmer Account
1. Open the live app (`https://ganeshpatil007.pythonanywhere.com/`) and click **Register** (or go to `/register`).
2. Under **"I am a..."**, select **🌾 Farmer**.
3. Enter your **Full Name**, **Email**, **10-digit Mobile Number**, and **Password** (minimum 6 characters).
4. *(Optional)* Click **Auto-detect** or manually fill in your **Village**, **Taluka**, and **District** for better nearby shop discovery.
5. Click **Verify Mobile & Create Account**, enter the 6-digit OTP sent to your mobile number, and complete registration.
6. You will be signed in directly to your **Farmer Dashboard**.

### 2. Creating a 🏪 Seller Account
1. Open the **Create Account** page (`/register`).
2. Under **"I am a..."**, select **🏪 Seller**.
3. Enter your **Full Name**, **Email**, **10-digit Mobile Number**, and **Password**.
4. Enter your **Shop Name** *(required for sellers, e.g., your agricultural store name)*.
5. *(Optional)* Use **Auto-detect** or fill in your store's **Village**, **Taluka**, and **District**.
6. Click **Verify Mobile & Create Account** and enter the 6-digit mobile OTP.
7. Once your seller profile is active, log in to access the **Seller Dashboard** to set up your shop location, payment preferences, add products, and manage orders.

### 3. Creating a 🚚 Delivery Partner Account
1. Open the **Create Account** page (`/register`).
2. Under **"I am a..."**, select **🚚 Delivery Partner**.
3. Enter your **Full Name**, **Email**, **10-digit Mobile Number**, and **Password**.
4. *(Optional)* Click **Auto-detect** or enter your **Village**, **Taluka**, and **District** operating area.
5. Click **Verify Mobile & Create Account** and confirm the 6-digit mobile OTP.
6. You will be taken directly to the **Delivery Dashboard**, where you can toggle **Online Duty** to receive delivery offers.

---

## 🌟 Advantages & Positive Highlights

- **Empowering Rural Commerce:** Connects local agricultural shops and farmers digitally without middlemen, keeping purchases grounded in trusted neighborhood stores.
- **Regional Language Inclusivity:** Full English, Hindi, and Marathi support makes the platform approachable for regional farmers who prefer native languages.
- **Location-First Architecture:** Built-in GPS shop discovery and distance routing save travel time and fuel costs in rural areas.
- **Safe & Accountable Deliveries:** Two-step OTP handover ensures every package picked up from a seller reaches the right buyer safely.
- **Stock Transparency:** Buyers never waste trips or place blind orders thanks to live inventory counts, low-stock badges, and back-in-stock alerts.
- **Seamless Web + Mobile Sync:** Works smoothly in desktop/mobile browsers as well as the installable Android APK using the exact same user account.
- **Clean Responsive UI & Test Coverage:** Built with modern React UI components, interactive Leaflet maps, automated unit/UI tests, and automated CI/CD mobile APK builds.

---

## 🛠️ Technology Overview

- **Frontend:** React, Vite, Tailwind CSS, React Router, Zustand, TanStack Query, Leaflet Maps, Recharts
- **Server Framework:** Python & Django
- **Mobile Packaging:** Capacitor Android (`in.agromart.app`)
- **Automation & Hosting:** GitHub Actions (automated Android APK builds) & PythonAnywhere (live web hosting)

---

*Built as a self-learning personal practice project to design and ship a complete multi-role agricultural e-commerce and delivery experience.*
