Here's the updated version with the requested changes:

---

# Freakygram

I didn't like having to open a browser to access Instagram. Here's an Electron version.

---

## Features

- **Secure Configuration Management**: 
  - Uses `electron-store` for encrypted storage of application settings and account data.
- **Custom User-Agent and Headers**: 
  - Ensures compatibility with Instagram's web platform.
- **Session Persistence**: 
  - Saves and restores session cookies for a seamless login experience.
- **External Link Handling**: 
  - Opens links in the default browser instead of the app.
- **Tray Support**:  
  - Close to system tray with a right-click menu.
- **Notifications**:  
  - Desktop notification support.
- **Download Support**:  
  - Save images or videos from feed or reels to storage.
- **Update Checker**:  
  - Notify when a new version of the mod is available on GitHub.

---

### **To-Do**
- ❌ **Discord RPC**:  
  - Discord RPC to show that you are Instagram-ing...?
  - Would show the current reel name I guess.
- ❌ **Always On Top**:  
  - Setting to make the window always be on top.
---

## Installation

### Prerequisites
- Node.js (v14 or newer)
- npm or yarn

### Steps
1. Clone this repository:
   ```bash
   git clone https://github.com/jqms/Freakygram
   cd Freakygram-main
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm run start
   ```

---

## Usage

- Run the application to access Instagram's web interface in a desktop environment.
- Custom window
