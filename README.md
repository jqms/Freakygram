# Freakygram 📱
I didn't like having to open my browser to access Instagram. So here's an Electron-based desktop Instagram client complete with a few nifty features.

## Overview 🌟
Freakygram brings Instagram to your desktop with enhanced features and convenience. Built with Electron, it provides a native-like experience while maintaining the familiar Instagram interface you know and love.

## Key Features 🔑
### Security & Authentication 🔒
- Secure configuration storage using encrypted `electron-store`
- Persistent session management with automatic cookie handling
- Custom user agent and headers for platform compatibility

### User Experience ⭐
- Seamless desktop integration with system tray support
- Desktop notifications for important updates and messages
- External links handled by your default browser
- Optional "Always on Top" window mode (Note: May interfere with video downloads)

### Media Management 📸
- Download images directly from your feed
- Save content from reels to local storage
- Streamlined media handling interface

### Social Integration 💬
- Discord Rich Presence support
  - Status updates for feed browsing
  - Reel watching indicators
  - Messaging activity display

### Maintenance 🔧
- Automatic update notifications via GitHub
- Version tracking and compatibility checks

## Getting Started 🚀
### System Requirements
- Node.js v14 or newer
- npm or yarn package manager
- Compatible operating system (Windows, macOS, or Linux)

### Installation
1. Clone the repository
```bash
git clone https://github.com/jqms/Freakygram
cd Freakygram-main
```

2. Install dependencies
```bash
npm install
```

3. Launch the application
```bash
npm run start
```

## Usage Guide 📖
1. Launch Freakygram using the command above or through your system's application launcher
2. Log in with your Instagram credentials
3. Enjoy a customized Instagram experience with:
   - Native desktop notifications
   - System tray integration
   - Quick media downloads
   - Discord activity integration

## Contributing 🤝
Contributions are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.

## Acknowledgments ✨
- Built with Electron
- Powered by Instagram's web platform
- Special thanks to [Flash](https://github.com/O2Flash20) for literally no reason

---
For support, feature requests, or bug reports, please open an issue on the GitHub repository.
