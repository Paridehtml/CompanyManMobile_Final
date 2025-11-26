# CompanyManMobile - University Project

## 1. Project Overview
**CompanyManMobile** is a full-stack, role-based mobile application designed to streamline management for restaurants and service businesses. It functions as an internal Point-of-Sale (POS) and operational tool, integrating inventory management, staff scheduling, menu planning, and sales analytics into a single platform.

The system is built on a modern stack featuring a **React Native (Expo)** frontend and a **Node.js/Express/MongoDB** backend, leveraging AI (Google Gemini) for predictive business insights.

## 2. Core Features
* **Role-Based Access Control (RBAC):** Distinct interfaces and permissions for **Employees** (POS, Shifts), **Managers** (Inventory, Schedule, Analytics), and **Admins** (User Management).
* **Internal POS:** A fully functional cart and checkout system with atomic transactions that automatically deduct inventory stock upon sale.
* **Smart Inventory:** Real-time stock tracking with **Barcode Scanning** integration for quick product lookups and management.
* **Staff Scheduler:** A monthly calendar view for managing shifts, with role-based visibility.
* **AI Analytics:** A predictive dashboard using **Google Gemini** to generate daily briefs, low-stock alerts, and profit margin analysis.

## 3. Technical Architecture
* **Frontend:** React Native (Expo SDK 54), Expo Router, React Native Paper.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Mongoose ODM).
* **Security:** JWT Authentication with `expo-secure-store` for encrypted token storage.

---

## 4. Installation & Setup Guide

The project is divided into two main folders: `server` (Backend) and `CompanyManMobile` (Frontend). **Both must be running simultaneously.**

### Step A: Setup Backend (Server)
1.  Open a terminal and navigate to the server folder:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Environment Configuration:**
    * Rename the provided `.env.example` file to `.env`.
    * Open `.env` and fill in the required keys (See **`NOTES.md`** for the credentials).
4.  Start the server:
    ```bash
    npm start
    ```
    * *The server should run on port 5001.*

### Step B: Setup Frontend (Client)
1.  Open a **new** terminal window and navigate to the client folder:
    ```bash
    cd CompanyManMobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo development server:
    ```bash
    npx expo start
    ```

### Step C: Running the App
You can run the application in three ways:

* **Option 1: Web Browser**
    * Press `w` in the terminal running Expo.
    * This will launch the PWA version in Chrome/Safari.
    * *Note: Barcode scanning is simulated in the browser.*

* **Option 2: Mobile Device (Physical)**
    * Download the **Expo Go** app (iOS/Android).
    * Scan the QR code displayed in the terminal.
    * *Important:* Your phone and computer must be on the **same WiFi network**.
    * *Configuration:* You must update `services/api.js` to use your computer's local IP address instead of `localhost`.

* **Option 3: Simulator/Emulator**
    * Press `i` for iOS Simulator or `a` for Android Emulator (requires Xcode/Android Studio).

---

## 5. Troubleshooting

**"Network Error" on Mobile:**
If the mobile app fails to connect to the backend:
1.  Find your computer's Local IP Address (e.g., `192.168.1.X`).
2.  Open `CompanyManMobile/services/api.js`.
3.  Update the `LOCAL_IP` variable with your IP address.
4.  Reload the app.

**"401 Unauthorized" on Login:**
If you see a token error, the app is protecting you from stale sessions. Simply log out and log back in to refresh your secure JWT.

---

## 6. Test Credentials
Please refer to the **`NOTES.md`** file included in the root directory for:
* MongoDB Connection URI
* JWT Secret
* Google Gemini API Key
* Login credentials for Admin, Manager, and Employee test accounts.
