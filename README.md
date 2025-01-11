# Instagram Desktop

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

---

### **To-Do**

- ❌ **Notifications**:
  - Desktop notification support.
- ❌ **Download Support**:  
  - Save images or videos from feed or reels to storage.
- ❌ **Update Checker**:  
  - Notify when a new version of the mod is available on GitHub.
- ❌ **Enhanced Security**:  
  - Add a setting to clear sensitive data (e.g., cookies or account stores) when quitting.  
- ❌ **Tray Support**:  
  Close to system tray, include a right-click menu.

---

## Installation

### Prerequisites
- Node.js (v14 or newer)
- npm or yarn

### Steps
1. Clone this repository:
   ```bash
   git clone https://github.com/jqms/instagram-desktop
   cd instagram-desktop-main
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
- Custom window dimensions and account settings will be saved automatically.

---

## Development
- **Static Assets**:
  - Icons and other assets are in the `build` directory.

### Scripts
- `npm run start`: Launch the application.
- `npm run build`: Build the app for production.
