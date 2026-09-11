# Salase Plumbing & Bathware - Wholesale B2B ERP/CRM & Field Sales Platform

A complete digital transformation platform built for plumbing & bathware wholesale distribution, transitioning business operations from pen-and-paper to online field sales management, real-time warehouse dispatching, and Miracle Accounting integration.

---

## 🌟 Key Modules & Business Capabilities

### 1. Web Admin & Warehouse Portal (`http://localhost:5000`)
* **Dual-Book Wholesale Ledger Management**:
  - Independent tracking of **GST Tax Invoices** and **Without GST (Rough / Cash Bills)**.
  - Shop-level balance sheets, credit limit monitoring, and aging debt tracking.
* **Pre-Visit Calling Sheet (2–3 Days Advance Beat Reminder)**:
  - Back-office/warehouse staff view shops on the salesman's upcoming route 2–3 days ahead.
  - Displays GST and Rough dues so staff can call and ensure payment is ready.
  - Direct WhatsApp reminder generator with pre-filled debt summary.
* **Live Warehouse Dispatch Queue**:
  - Real-time Socket.io order alert with synthesized audio chime.
  - Pick-list breakdown with loose pcs and master box carton quantities.
  - Driver & tempo assignment workflow (`Pending` &rarr; `Packed` &rarr; `Dispatched` &rarr; `Delivered`).
* **Inventory & Instant Out-of-Stock Toggle**:
  - Complete catalog (Astral/Ashirvad pipes, Jaquar/Cera bib cocks, sanitaryware, valves).
  - 1-click **OUT OF STOCK** toggle button immediately locks depleted items from salesman mobile apps.
* **Multi-City Beat / Route Planner**:
  - Boss can group 2–3 cities together in 1 day (e.g. Morbi & Wankaner).
  - Flexible schedule day assignment and visit date adjustments.
* **Anti-Fraud Salesman Audit & Cash Drawer**:
  - GPS Geofence verification logs (< 150m proximity).
  - Live storefront photo proofs and mock location detection flags.
  - **Day-End Cash Settlement**: Admin/Warehouse confirms physical cash handover from salesman to zero out their wallet.
* **1-Click Miracle Accounting Software Export**:
  - Generates standard `.xlsx` spreadsheets for Miracle Sales Invoices and Payment Receipts.

---

### 2. React Native Android Mobile Application (`mobile-app/`)
* **Salesman Field Mode**:
  - **Today's Beat**: Shows assigned cities and shops sorted by proximity distance.
  - **1-Tap Navigation**: Opens turn-by-turn Google Maps directions to the shop.
  - **Visit Check-In**: Calculates live GPS distance (< 150m) to verify physical shop visit.
  - **Shop 360 & Dual Ledger**: View full history of past GST and Rough bills and receipts.
  - **Take Order**: Browse catalog, calculate loose pcs + full carton boxes, choose GST vs. Non-GST mode, and punch directly to warehouse in real time.
  - **Collect Payment**: Cash, Cheque (with bank, cheque number), UPI. Auto-updates shop ledger and salesman's cash wallet.
  - **Onboard New Shop**: Captures GPS pin, creates shop record, and auto-generates mobile app login credentials for the shop owner.
* **Shop Owner Mode**:
  - Shop owners log in using credentials provided by their salesman.
  - Track live order dispatch progress (`Packed` &rarr; `In Tempo` &rarr; `Delivered`).
  - View ledger balances and download payment receipts.

---

## 🚀 Quick Start Guide

### 1. Start Backend & Admin Portal
```bash
cd backend
npm install
node src/server.js
```
The backend API and compiled Admin CRM web portal will run at:
👉 **`http://localhost:5000`**

### 2. Demo Login Credentials

| Role | Name | Phone (Login ID) | Password | Default Beat / Role |
|---|---|---|---|---|
| **Uncle / Boss (Super Admin)** | Sanjaybhai Patel | `9898011111` | `admin123` | Full ERP/CRM Access & Miracle Exporter |
| **Warehouse In-Charge** | Kishorbhai | `9898022222` | `warehouse123` | Calling Sheet, Dispatch Queue, Catalog Stock |
| **Salesman 1** | Ramesh Kumar | `9898033333` | `sales123` | Morbi & Wankaner Beat (Mobile App) |
| **Salesman 2** | Prakash Joshi | `9898044444` | `sales123` | Rajkot & Gondal Beat (Mobile App) |
| **Shop Owner** | Jayeshbhai Shah | `9898055555` | `shop123` | Shri Krishna Hardware (Mobile App) |

---

## 🔒 Security Architecture Highlights
1. **Device Binding**: Salesman account is bound to their Android Device ID to prevent account sharing.
2. **Mock GPS Detection**: Detects and logs simulated location apps in Android Developer options.
3. **Data Segregation**: Sensitive profit margins and non-GST company summaries are restricted to Super Admin.
4. **Day-End Cash Reconciliation**: Digital cash wallet automatically enforces physical cash handover.
