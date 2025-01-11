const { app, BrowserWindow, shell, ipcMain, session, Tray, Menu, dialog, nativeImage, clipboard } = require("electron");
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
let tray = null;

app.on('before-quit', () => {
    isQuitting = true;
});

function createWindow() {
    const defaultState = { width: 1200, height: 800, x: undefined, y: undefined };
    const windowState = store.get("windowState", defaultState);

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

    try {
        const ses = session.fromPartition('persist:instagram');

        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                callback(true);
            } else {
                callback(false);
            }
        });

        mainWindow.webContents.on('context-menu', async (event, params) => {
            const { x, y } = params;
        
            try {
                const imageUrl = await mainWindow.webContents.executeJavaScript(`
                    (function() {
                        const element = document.elementFromPoint(${x}, ${y});
                        const container = element.closest('._aagu');
                        if (container) {
                            const img = container.querySelector('._aagv img');
                            return img ? img.src : null;
                        }
                        return null;
                    })()
                `);
        
                if (imageUrl) {
                    const getFilename = (url) => {
                        try {
                            const urlObj = new URL(url);
                            const pathParts = urlObj.pathname.split('/');
                            const filename = pathParts[pathParts.length - 1];
                            return filename.split('?')[0].replace(/[^\w\-_.]/g, '');
                        } catch (e) {
                            return 'instagram_image.jpg';
                        }
                    };

                    function createSvgIcon(svg) {
                        return nativeImage.createFromBuffer(Buffer.from(svg));
                    }
                    
                    const icons = {
                        download: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 12L3 7h3V2h4v5h3L8 12z M3 14v-2h10v2H3z" fill="currentColor"/>
                        </svg>`,
                        copy: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 2v9h9V2H5zM3 0h13v13H3V0z M0 3h2v13h13v-2H3V3H0v13h0z" fill="currentColor"/>
                        </svg>`,
                        browser: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 3H2v2h12V3zM2 14h12V7H2v7z M0 1h16v14H0V1z" fill="currentColor"/>
                        </svg>`,
                        close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.7 4.7l-1.4-1.4L8 6.6 4.7 3.3 3.3 4.7 6.6 8l-3.3 3.3 1.4 1.4L8 9.4l3.3 3.3 1.4-1.4L9.4 8l3.3-3.3z" fill="currentColor"/>
                        </svg>`
                    };

                    const menu = Menu.buildFromTemplate([
                        {
                            label: 'Save Image',
                            icon: createSvgIcon(icons.download),
                            click: async () => {
                                try {
                                    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                                        defaultPath: path.join(app.getPath('downloads'), getFilename(imageUrl)),
                                        filters: [
                                            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }
                                        ]
                                    });
                    
                                    if (!canceled && filePath) {
                                        mainWindow.webContents.downloadURL(imageUrl);
                                        mainWindow.webContents.session.on('will-download', (event, item) => {
                                            item.setSavePath(filePath);
                                        });
                                    }
                                } catch (error) {
                                    console.error('Failed to save image:', error);
                                }
                            }
                        },
                        {
                            label: 'Copy Image',
                            icon: createSvgIcon(icons.copy),
                            click: async () => {
                                try {
                                    const imageData = await mainWindow.webContents.executeJavaScript(`
                                        (function() {
                                            const element = document.elementFromPoint(${x}, ${y});
                                            const img = element.closest('._aagu').querySelector('._aagv img');
                                            return img ? {
                                                src: img.src,
                                                naturalWidth: img.naturalWidth,
                                                naturalHeight: img.naturalHeight
                                            } : null;
                                        })()
                                    `);
                        
                                    if (imageData) {
                                        await mainWindow.webContents.copyImageAt(x, y);
                                        
                                        if (!clipboard.availableFormats().includes('image/png')) {
                                            const response = await fetch(imageData.src);
                                            const buffer = Buffer.from(await response.arrayBuffer());
                                            clipboard.writeImage(nativeImage.createFromBuffer(buffer));
                                        }
                                    }
                                } catch (error) {
                                    console.error('Copy failed:', error);
                                }
                            }
                        },
                        { type: 'separator' },
                        {
                            label: 'Open in Browser',
                            icon: createSvgIcon(icons.browser),
                            click: () => {
                                shell.openExternal(imageUrl);
                            }
                        },
                        { type: 'separator' }
                    ]);
                    menu.popup();
                }
            } catch (error) {
                console.error('Context menu error:', error);
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

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
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

function createTray() {
    tray = new Tray(path.join(__dirname, 'assets/tray.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Open Instagram',
            click: () => mainWindow.show()
        },
        { type: 'separator' },
        { 
            label: 'Exit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Instagram Desktop');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        mainWindow.show();
    });
}


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
    const trayIconPath = path.join(__dirname, 'assets', 'tray.png');
    if (!require('fs').existsSync(trayIconPath)) {
        throw new Error('Required tray icon missing');
    }
    
    app.setName("Instagram Desktop");
    mainWindow = createWindow();
    createTray();
    
    if (process.platform === "win32") {
        mainWindow.setIcon(path.join(__dirname, "assets", "icon.ico"));
    }
}).catch(error => {
    console.error('Failed to initialize app:', error);
    app.quit();
});

app.on('window-all-closed', () => {
    if (tray) tray.destroy();
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
