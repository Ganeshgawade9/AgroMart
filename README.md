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


Frontend runs at: **http://localhost:5173**