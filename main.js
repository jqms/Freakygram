const { app, BrowserWindow, shell, ipcMain, session, Tray, Menu, dialog, nativeImage, clipboard } = require("electron");
const Store = require("electron-store");
const path = require("path");
const axios = require('axios');
const stream = require('stream');
const util = require('util');
const fs = require('fs');
const fetch = require('node-fetch');
const pipeline = util.promisify(stream.pipeline);
const IgDownloader = require("ig-downloader").IgDownloader;
const Updater = require('./updater');

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

const settingsStore = new Store({
    name: "settings",
    defaults: {
        closeToTray: false,
        notifications: false,
        downloadPath: app.getPath('downloads'),
        discordRPC: false,
        autoUpdate: true
    }
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
let settingsWindow = null;

function createSvgIcon(svg) {
    return nativeImage.createFromBuffer(Buffer.from(svg));
}

const fetchInstagramVideo = async (url) => {
    try {
        const data = await IgDownloader(url);
        return data;
    } catch (error) {
        console.error("Failed to fetch video:", error);
        return null;
    }
}

async function download(url) {
    try {
        const videoData = await fetchInstagramVideo(url.replace("reels", "p"));
        let filename = videoData.shortcode + '.mp4';
        
        const { canceled, filePath } = await dialog.showSaveDialog({
            defaultPath: filename,
            filters: [
                { name: 'MP4 Videos', extensions: ['mp4'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['createDirectory']
        });

        if (canceled) {
            return { success: false, error: 'File save cancelled by user' };
        }

        const response = await fetch(videoData.video_url);
        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.statusText}`);
        }

        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);
        
        return { success: true, filePath };
    } catch (error) {
        console.error('Download error:', error);
        return { success: false, error: error.message };
    }
}

const icons = {
    copy: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4v8h8V4H4zM3 2h10v11H3V2zm-2 3h1v9h9v1H1V5z" fill="currentColor"/>
    </svg>`,
    browser: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2h12v12H2V2zm1 4h10v7H3V6zm0-3h10v2H3V3zm2 1h-1V3h1v1zm2 0H6V3h1v1zm2 0H8V3h1v1z" fill="currentColor"/>
    </svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.4 3.7L12 2.3 8 6.3 4 2.3 2.6 3.7 6.6 7.7l-4 4 1.4 1.4 4-4 4 4 1.4-1.4-4-4 4-4z" fill="currentColor"/>
    </svg>`,
    download: `<svg width="32" height="32" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 9.333a.667.667 0 0 0-.667.667v2.667a.667.667 0 0 1-.666.666H3.333a.667.667 0 0 1-.666-.666V10a.667.667 0 0 0-1.334 0v2.667A2 2 0 0 0 3.333 14.667h9.334A2 2 0 0 0 14.667 12.667V10A.667.667 0 0 0 14 9.333zm-6.473 1.14a.667.667 0 0 0 .22.14.627.627 0 0 0 .506 0 .667.667 0 0 0 .22-.14l2.667-2.666a.667.667 0 0 0-.946-.947L8.667 8.393V2a.667.667 0 0 0-1.334 0v6.393L5.807 6.86a.667.667 0 1 0-.947.947l2.667 2.666z" fill="currentColor"/>
    </svg>`,
};
app.on('before-quit', () => {
    isQuitting = true;
});

function injectDownloadButton() {
        return `
        (function() {
            function addDownloadButtons() {
            if (!window.location.href.includes('reels')) return;
                const shareBtns = document.querySelectorAll('[aria-label="Share"]');
                
                shareBtns.forEach(shareBtn => {
                    const container = shareBtn?.parentElement?.parentElement;
                    if (!container) return;
                    
                    const existingBtn = container.parentElement.querySelector('[data-testid="download-button"]');
                    if (existingBtn) return;
                    
                    const newDownloadBtn = document.createElement('div');
                    newDownloadBtn.setAttribute('data-testid', 'download-button');
                    newDownloadBtn.className = container.className;
                    newDownloadBtn.innerHTML = \`
                        <div class="x1i10hfl x1qjc9v5 xjbqb8w xjqpnuy xa49m3k xqeqjp1 x2hbi6w x13fuv20 xu3j5b3 x1q0q8m5 x26u7qi x972fbf xcfux6l x1qhh985 xm0m39n x9f619 x1ypdohk xdl72j9 x2lah0s xe8uvvx xdj266r x11i5rnm xat24cr x1mh8g0r x2lwn1j xeuugli xexx8yu x4uap5 x18d9i69 xkhd6sd x1n2onr6 x16tdsg8 x1hl2dhg xggy1nq x1ja2u2z x1t137rt x1o1ewxj x3x9cwd x1e5q0jg x13rtm0m x3nfvp2 x1q0g3np x87ps6o x1lku1pv x1a2a7pz x1mywscw" role="button" tabindex="0">
                            <svg aria-label="Download" class="x1lliihq x1n2onr6 xyb1xck" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                                <title>Download</title>
                                <path d="M21,14a1,1,0,0,0-1,1v4a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V15a1,1,0,0,0-2,0v4a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V15A1,1,0,0,0,21,14Zm-9.71,1.71a1,1,0,0,0,.33.21.94.94,0,0,0,.76,0,1,1,0,0,0,.33-.21l4-4a1,1,0,0,0-1.42-1.42L13,12.59V3a1,1,0,0,0-2,0v9.59l-2.29-2.3a1,1,0,1,0-1.42,1.42Z"/>
                            </svg>
                        </div>
                    \`;
                    
                    if (window.electron) {
                        const clickHandler = async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                                const reelArticle = container.closest('article');
                                const reelLink = window.location.href;
                                
                                if (reelLink) {
                                    const videoUrl = reelLink;
                                    const result = await window.electron.downloadVideo(videoUrl);
                                } else {
                                    console.error('No reel link found');
                                }
                            } catch (error) {
                                console.error('Download failed:', error);
                            }
                        };
    
                        newDownloadBtn.querySelector('div').addEventListener('click', clickHandler);
                        container.parentElement.insertBefore(newDownloadBtn, container.nextSibling);
                    }
                });
            }

        addDownloadButtons();

        const observer = new MutationObserver((mutations) => {
            addDownloadButtons();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window._downloadButtonObserver = observer;
    })();
    `;
}

function injectSettingsButton() {
    return `
    (function() {
        let menuObserver = null;
        
        function setupMenuObserver() {
            if (menuObserver) {
                menuObserver.disconnect();
            }

            menuObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length) {
                        const menu = document.querySelector('div[role="dialog"]');
                        if (menu) {
                            checkAndInjectButton();
                        }
                    }
                }
            });

            menuObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        function checkAndInjectButton() {
    try {
        const menuList = document.querySelector('div[role="dialog"] .x1y1aw1k');
        if (!menuList) return false;
        
        const existingBtn = menuList.querySelector('[data-testid="freakygram-settings"]');
        if (existingBtn) return false;

        const templateButton = Array.from(menuList.children).find(el => 
            el.textContent.includes('Settings') && 
            !el.textContent.includes('Freakygram')
        );
        if (!templateButton) return false;

        const settingsBtn = templateButton.cloneNode(true);
        
        settingsBtn.className = templateButton.className;
        settingsBtn.setAttribute('data-testid', 'freakygram-settings');  
        settingsBtn.setAttribute('role', 'button');
        settingsBtn.setAttribute('tabindex', '0');
        settingsBtn.style.backgroundColor = 'rgb(var(--ig-banner-background))';

        const hoverDiv = settingsBtn.querySelector('div[role="none"]');
        if (hoverDiv) {
            hoverDiv.className = templateButton.querySelector('div[role="none"]').className;
            hoverDiv.setAttribute('role', 'none');
            hoverDiv.setAttribute('data-visualcompletion', 'ignore');
            
            const originalHoverStyles = window.getComputedStyle(templateButton.querySelector('div[role="none"]'));
            hoverDiv.style.cssText = originalHoverStyles.cssText;
            hoverDiv.style.backgroundColor = 'transparent';

            settingsBtn.addEventListener('mouseenter', () => {
                hoverDiv.style.backgroundColor = 'rgba(var(--ig-highlight-background),0.1)';
            });
            
            settingsBtn.addEventListener('mouseleave', () => {
                hoverDiv.style.backgroundColor = 'transparent';
            });
        }

        const textSpan = settingsBtn.querySelector('span.x1lliihq span');
        if (textSpan) textSpan.textContent = 'Freakygram Settings';

        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.electron.showSettings();
        });

        const switchAccountsBtn = Array.from(menuList.children).find(el => 
            el.textContent.includes('Switch accounts')
        );
        if (!switchAccountsBtn) return false;

        menuList.insertBefore(settingsBtn, switchAccountsBtn);
        return true;
    } catch (error) {
        console.error('[Freakygram] Error:', error);
        return false;
    }
}

        setupMenuObserver();
        checkAndInjectButton();

        window.addEventListener('unload', () => {
            if (menuObserver) {
                menuObserver.disconnect();
            }
        });
    })();
    `;
}

function createWindow() {
    const defaultState = { width: 1200, height: 800, x: undefined, y: undefined };
    const windowState = store.get("windowState", defaultState);
    const settings = settingsStore.store;

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

        mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                callback(settings.notifications);
            } else {
                callback(false);
            }
        });


        mainWindow.webContents.on('context-menu', async (event, params) => {
            const { x, y } = params;
            //console.log('Context menu event:', { x, y, params });
            //try {
            //    const currentUrl = await mainWindow.webContents.executeJavaScript(`window.location.href`);
            //    console.log('Current URL:', currentUrl);
            //
            //    const menu = Menu.buildFromTemplate([
            //        {
            //            label: 'Save Video',
            //            icon: createSvgIcon(icons.video),
            //            click: async () => {
            //                try {
            //                    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            //                        defaultPath: path.join(app.getPath('downloads'), `instagram_${Date.now()}.mp4`),
            //                        filters: [{ name: 'Videos', extensions: ['mp4'] }]
            //                    });
            //
            //                    if (!canceled && filePath) {
            //                        const result = await download(currentUrl);
            //                        if (result.success) {
            //                            console.log('Video downloaded:', result.filePath);
            //                        } else {
            //                            throw new Error(result.error);
            //                        }
            //                    }
            //                } catch (error) {
            //                    console.error('Failed to save video:', error);
            //                }
            //            }
            //        }
            //    ]);
            //
            //    menu.popup();
            //
            //} catch (error) {
            //    console.error('Context menu error:', error);
            //}

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
            .xols6we {
                height: 1px;
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

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(injectDownloadButton());
        mainWindow.webContents.executeJavaScript(injectSettingsButton());
    });
    
    mainWindow.webContents.on('did-navigate-in-page', () => {
        mainWindow.webContents.executeJavaScript(injectDownloadButton());
        mainWindow.webContents.executeJavaScript(injectSettingsButton());
    });
    
    mainWindow.webContents.on('did-navigate', () => {
        mainWindow.webContents.executeJavaScript(injectDownloadButton());
        mainWindow.webContents.executeJavaScript(injectSettingsButton());
    });
    
    mainWindow.webContents.executeJavaScript(`
        window.addEventListener('hashchange', () => {
            if (window._downloadButtonObserver) {
                window._downloadButtonObserver.disconnect();
            }
            ${injectDownloadButton()}
        });
    `);

    mainWindow.webContents.executeJavaScript(`
        window.addEventListener('hashchange', () => {
            if (window._settingsButtonObserver) {
                window._settingsButtonObserver.disconnect();
            }
            ${injectSettingsButton()}
        });
    `);

    mainWindow.on('close', (event) => {
        if (!isQuitting && settingsStore.get('closeToTray')) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
        store.set("windowState", mainWindow.getBounds());
    });

    isQuitting = !settings.closeToTray;

    return mainWindow;
}

ipcMain.on('show-settings', () => {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 400,
        height: 500,
        title: 'Freakygram Settings',
        autoHideMenuBar: true,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    settingsWindow.loadFile('settings.html');
    settingsWindow.once('ready-to-show', () => {
        settingsWindow.show();
    });

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
});

ipcMain.handle('get-settings', () => {
    return settingsStore.store;
});

ipcMain.on('save-settings', (event, newSettings) => {
    settingsStore.set(newSettings);
    
    if (mainWindow) {
        isQuitting = !newSettings.closeToTray;
    }
    
    if (mainWindow) {
        mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                callback(newSettings.notifications);
            } else {
                callback(false);
            }
        });
    }
    
    if (newSettings.discordRPC) {

    }
    
    if (newSettings.autoUpdate) {
    }
});

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

ipcMain.handle('download-video', async (event, url) => {
    try {
        const result = await download(url);
        return result;
    } catch (error) {
        console.error('Download error:', error);
        throw error;
    }
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

app.whenReady().then(async () => {
    const trayIconPath = path.join(__dirname, 'assets', 'tray.png');
    if (!require('fs').existsSync(trayIconPath)) {
        throw new Error('Required tray icon missing');
    }
    if (settingsStore.get('autoUpdate')) {
        const updater = new Updater();
        await updater.checkForUpdates();
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
