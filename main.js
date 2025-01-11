const { app, BrowserWindow, shell, ipcMain, session } = require("electron");
const Store = require("electron-store");
const path = require("path");

const store = new Store({
    name: "config",
    encryptionKey: "instagram-desktop-app",
    clearInvalidConfig: true,
    defaults: {
        windowState: { width: 1200, height: 800 },
        accounts: [],
        currentAccount: null
    },
});

const accountStores = new Map();
function getAccountStore(username) {
    if (!accountStores.has(username)) {
        accountStores.set(username, new Store({
            name: `account_${username}`,
            encryptionKey: "instagram-desktop-app",
            defaults: {}
        }));
    }
    return accountStores.get(username);
}

let mainWindow;
let accountWindow;
let isQuitting = false;

app.on('before-quit', () => {
    isQuitting = true;
});

function createWindow() {
    const defaultState = { width: 1200, height: 800, x: undefined, y: undefined };
    const windowState = store.get("windowState", defaultState);

    try {
        const ses = session.fromPartition('persist:instagram');

        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                callback(true);
            } else {
                callback(false);
            }
        });

        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.executeJavaScript(`
                const oldNotification = window.Notification;
                window.Notification = function(title, options) {
                    if (options.icon && !options.icon.startsWith('http')) {
                        options.icon = 'https://www.instagram.com' + options.icon;
                    }
                    const electronNotification = {
                        title: title,
                        body: options.body,
                        icon: options.icon,
                        silent: options.silent
                    };
                    window.electron.sendNotification(electronNotification);
                    return new oldNotification(title, options);
                };
                window.Notification.requestPermission = function(cb) {
                    if (cb) cb('granted');
                    return Promise.resolve('granted');
                };
                window.Notification.permission = 'granted';
            `);
        });

        ses.webRequest.onBeforeSendHeaders((details, callback) => {
            callback({
                requestHeaders: {
                    ...details.requestHeaders,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
                    'Permissions-Policy': 'attribution-reporting=(), browsing-topics=(), compute-pressure=(), interest-cohort=(), shared-storage=(), shared-storage-select-url=()',
                    'Document-Policy': 'default-src \'self\'; script-src \'self\';'
                }
            });
        });

        ses.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Permissions-Policy': 'attribution-reporting=(), browsing-topics=(), compute-pressure=(), interest-cohort=(), shared-storage=(), shared-storage-select-url=()',
                    'Document-Policy': 'default-src \'self\'; script-src \'self\';'
                }
            });
        });

    } catch (error) {
        console.error('Session configuration error:', error);
    }

    mainWindow = new BrowserWindow({
        ...windowState,
        frame: true,
        autoHideMenuBar: true,
        backgroundColor: '#000000',
        titleBarOverlay: {
            color: '#000000',
            symbolColor: '#FFFFFF'
        },
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'persist:instagram',
            webSecurity: true
        }
    });

    mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0');

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.insertCSS(`
            ::-webkit-scrollbar {
                width: 14px;
                background: #000000;
            }
            ::-webkit-scrollbar-thumb {
                background: #262626;
                border-radius: 7px;
                border: 3px solid #000000;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: #363636;
            }
        `);
    });

    const cookies = mainWindow.webContents.session.cookies.get({ url: 'https://www.instagram.com' }).then((cookies) => {
        cookies.forEach((cookie) => {
            const { name, value, domain, path, secure, httpOnly, expirationDate } = cookie;
            mainWindow.webContents.session.cookies.set({ url: 'https://www.instagram.com', name, value, domain, path, secure, httpOnly, expirationDate });
        }
        );
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('https://www.instagram.com/');

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.on('close', () => {
        if (!isQuitting) {
            mainWindow.hide();
            return false;
        }
        store.set("windowState", mainWindow.getBounds());
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (accountWindow && !accountWindow.isDestroyed()) {
            accountWindow.destroy();
        }
    });

    mainWindow.on("close", () => {
        store.set("windowState", mainWindow.getBounds());
    });

    return mainWindow;
}

ipcMain.on('show-notification', (event, notification) => {
    new Notification({
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        silent: notification.silent
    }).show();
});

ipcMain.handle('get-current-account', () => {
    return store.get('currentAccount');
});

ipcMain.handle('get-profile-data', async () => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return null;

        const data = await mainWindow.webContents.executeJavaScript(`
            try {
                let username = null;
                let avatarUrl = null;

                const storageData = localStorage.getItem('one_tap_storage_version');
                if (storageData) {
                    const data = JSON.parse(storageData);
                    for (const userId in data) {
                        const profile = data[userId];
                        if (profile.username && profile.profilePicUrl) {
                            username = profile.username;
                            avatarUrl = profile.profilePicUrl;
                            break;
                        }
                    }
                }

                console.log('Found profile data:', { username, avatarUrl });
                ({ username, avatarUrl });
            } catch (error) {
                console.error('Error getting profile data:', error);
                null;
            }
        `);

        return data;
    } catch (error) {
        console.error('Failed to get profile data:', error);
        return null;
    }
});

app.whenReady().then(() => {
    app.setName("Instagram Desktop");
    mainWindow = createWindow();
    if (process.platform === "win32") {
        mainWindow.setIcon(path.join(__dirname, "build", "icon.ico"));
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (!mainWindow) {
        mainWindow = createWindow();
    } else {
        mainWindow.show();
    }
});
