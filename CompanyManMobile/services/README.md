# CompanyManMobile - University Project

## 1. Project Overview
CompanyManMobile is a full-stack restaurant management application built with **React Native (Expo)** and **Node.js/Express/MongoDB**. It features role-based access (Admin, Manager, Employee) for managing inventory, staff schedules, menus, and sales analytics.

## 2. Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**
* **MongoDB** (You can run a local instance or use the provided Atlas URI in the notes)
* **Expo Go** mobile app (if testing on a physical device) OR **Android Studio/Xcode** (for emulators)

## 3. Installation & Setup

The project is divided into two main folders: `server` (Backend) and `CompanyManMobile` (Frontend). You must run both terminals simultaneously.

### Step A: Setup Backend
1.  Open a terminal and navigate to the server folder:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Environment Configuration:**
    * Rename the file `.env.example` to `.env`.
    * Open `.env` and fill in the required keys (See `NOTES.md` for the credentials).
4.  Start the server:
    ```bash
    npm start
    ```
    * *The server should run on port 5001.*

### Step B: Setup Frontend
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
4.  **To Run the App:**
    * **Web Browser:** Press `w` in the terminal. (Easiest method)
    * **Mobile Device:** Scan the QR code using the **Expo Go** app (Android) or Camera (iOS). *Note: Your phone must be on the same WiFi as your computer.*
    * **Emulator:** Press `a` for Android or `i` for iOS (requires setup).

## 4. Troubleshooting Connection Issues
If the mobile app cannot connect to the server (Network Error):
1.  Open `CompanyManMobile/services/api.js`.
2.  Locate the `LOCAL_IP` variable at the top of the file.
3.  Change it to your computer's local IP address (e.g., `192.168.1.X`).
4.  Restart the Expo app.

## 5. Test Credentials
(See `NOTES.txt` for login details)