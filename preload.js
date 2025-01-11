const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('minimize'),
    maximize: () => ipcRenderer.send('maximize'),
    close: () => ipcRenderer.send('close'),
    showAccounts: () => ipcRenderer.send('show-accounts'),
    sendNotification: (notification) => ipcRenderer.emit('show-notification', notification),
    downloadVideo: (url) => ipcRenderer.invoke('download-video', url)
});

contextBridge.exposeInMainWorld('accounts', {
    getAll: () => ipcRenderer.invoke('get-accounts'),
    getCurrent: () => ipcRenderer.invoke('get-current-account'),
    add: (username, avatarUrl) => {
        ipcRenderer.send('add-account', username, avatarUrl);
    },
    switch: (username) => ipcRenderer.send('switch-account', username || ''),
    hideWindow: () => ipcRenderer.send('hide-accounts'),
    delete: (username) => ipcRenderer.send('delete-account', username),
    monitorLoginButton: () => {
        console.log('Preload: Starting login monitor');
        let monitorAttempts = 0;
        
        const monitorInterval = setInterval(async () => {
            console.log('Preload: Monitor attempt', monitorAttempts++);
            await ipcRenderer.invoke('monitor-login-button');
            
            if (monitorAttempts > 60) {
                console.log('Preload: Monitor timeout');
                clearInterval(monitorInterval);
            }
        }, 500);
        setTimeout(() => {
            clearInterval(monitorInterval);
            console.log('Preload: Monitor cleanup');
        }, 30000);

        return Promise.resolve();
    },
    getProfileData: () => ipcRenderer.invoke('get-profile-data')
});