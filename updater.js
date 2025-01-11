const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

class Updater {
    constructor() {
        this.currentVersion = require('./package.json').version;
        this.updateUrl = 'https://github.com/jqms/Freakygram/releases/latest';
        this.downloadPath = path.join(app.getPath('temp'), 'instagram-desktop-update');
    }

    async checkForUpdates() {
        try {
            const response = await fetch(this.updateUrl);
            const data = await response.json();
            const latestVersion = data.tag_name.replace('v', '');

            if (this.isNewerVersion(latestVersion, this.currentVersion)) {
                const shouldUpdate = await dialog.showMessageBox({
                    type: 'info',
                    title: 'Update Available',
                    message: `Version ${latestVersion} is available. Would you like to update?`,
                    buttons: ['Yes', 'No']
                });

                if (shouldUpdate.response === 0) {
                    await this.downloadUpdate(data.assets[0].browser_download_url);
                }
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    isNewerVersion(latest, current) {
        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (latestParts[i] > currentParts[i]) return true;
            if (latestParts[i] < currentParts[i]) return false;
        }
        return false;
    }

    async downloadUpdate(url) {
        try {
            const response = await fetch(url);
            const buffer = await response.buffer();
            
            if (!fs.existsSync(this.downloadPath)) {
                fs.mkdirSync(this.downloadPath, { recursive: true });
            }

            const updateFile = path.join(this.downloadPath, 'update.exe');
            fs.writeFileSync(updateFile, buffer);

            const scriptContent = `
                @echo off
                timeout /t 2 /nobreak
                copy /Y "${updateFile}" "${process.execPath}"
                start "" "${process.execPath}"
                del "%~f0"
            `;

            const scriptPath = path.join(this.downloadPath, 'update.bat');
            fs.writeFileSync(scriptPath, scriptContent);

            execSync(`start "" "${scriptPath}"`);
            app.quit();
        } catch (error) {
            console.error('Update download failed:', error);
            dialog.showErrorBox('Update Failed', 'Failed to download update.');
        }
    }
}

module.exports = Updater;