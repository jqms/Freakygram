const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

class Updater {
    constructor() {
        this.currentVersion = require('./package.json').version;
        this.packageUrl = 'https://raw.githubusercontent.com/jqms/Freakygram/main/package.json';
        this.releaseUrl = 'https://api.github.com/repos/jqms/Freakygram/releases/latest';
        this.downloadPath = path.join(app.getPath('temp'), 'instagram-desktop-update');
    }

    async checkForUpdates() {
        try {
            const { data: packageData } = await axios.get(this.packageUrl);
            const latestVersion = packageData.version;
    
            if (this.isNewerVersion(latestVersion)) {
                const { response } = await dialog.showMessageBox({
                    type: 'info',
                    title: 'Update Available',
                    message: `Version ${latestVersion} is available.\nWould you like to download?`,
                    buttons: ['Yes', 'No']
                });
    
                if (response === 0) {
                    const downloadUrl = `https://github.com/jqms/Freakygram/releases/download/${latestVersion}/Freakygram.Setup.exe`;
                    await this.downloadUpdate(downloadUrl);
                }
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    isNewerVersion(latest) {
        const [latestMajor, latestMinor, latestPatch] = latest.split('.').map(Number);
        const [currentMajor, currentMinor, currentPatch] = this.currentVersion.split('.').map(Number);
        
        return latestMajor > currentMajor || 
               (latestMajor === currentMajor && latestMinor > currentMinor) ||
               (latestMajor === currentMajor && latestMinor === currentMinor && latestPatch > currentPatch);
    }

    async downloadUpdate(url) {
        try {
            const { data } = await axios.get(url, { responseType: 'arraybuffer' });
            
            if (!fs.existsSync(this.downloadPath)) {
                fs.mkdirSync(this.downloadPath, { recursive: true });
            }

            const setupPath = path.join(this.downloadPath, 'Freakygram Setup.exe');
            fs.writeFileSync(setupPath, data);

            require('child_process').execSync(`start "" "${setupPath}"`);
            app.quit();
        } catch (error) {
            console.error('Download failed:', error);
            dialog.showErrorBox('Update Failed', 'Failed to download update');
        }
    }
}

module.exports = Updater;