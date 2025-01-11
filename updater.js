const { app, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const fetch = require('node-fetch');
const ps = require('ps-node');
const util = require('util');
const psLookup = util.promisify(ps.lookup);

class Updater {
    constructor() {
        this.currentVersion = require('./package.json').version;
        this.packageUrl = 'https://raw.githubusercontent.com/jqms/Freakygram/main/package.json';
        this.releaseUrl = 'https://api.github.com/repos/jqms/Freakygram/releases/latest';
        this.downloadPath = path.join(app.getPath('temp'), 'instagram-desktop-update');
    }

    async killOtherInstances() {
        try {
            const output = execSync('tasklist /FI "IMAGENAME eq Freakygram.exe" /FO CSV /NH', { encoding: 'utf8' });
            const processes = output.split('\r\n')
                .filter(line => line.includes('Freakygram.exe'))
                .map(line => {
                    const [, pid] = line.split(',');
                    return parseInt(pid.replace(/"/g, ''));
                });

            const currentPid = process.pid;

            let killed = 0;
            for (const pid of processes) {
                if (pid !== currentPid) {
                    execSync(`taskkill /PID ${pid} /F`);
                    killed++;
                }
            }

            return killed > 0;
        } catch (error) {
            console.error('[Update] Failed to kill processes:', error);
            return false;
        }
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
        await this.killOtherInstances();
        let progressWin = new BrowserWindow({
            width: 400,
            height: 100,
            frame: false,
            resizable: false,
            center: true,
            icon: path.join(__dirname, 'assets/icon.ico'),
            backgroundColor: '#00000000',
            transparent: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        progressWin.loadFile('download-progress.html');
        progressWin.removeMenu();

        try {
            const { data, headers } = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                onDownloadProgress: (progressEvent) => {
                    const percentage = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    progressWin.webContents.send('download-progress', percentage);
                }
            });

            if (!fs.existsSync(this.downloadPath)) {
                fs.mkdirSync(this.downloadPath, { recursive: true });
            }

            const setupPath = path.join(this.downloadPath, 'Freakygram Setup.exe');
            const writer = fs.createWriteStream(setupPath);

            data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            progressWin.destroy();

            require('child_process').execSync(`start "" "${setupPath}"`);
            
            setTimeout(() => {
                app.exit(0);
                process.exit(0);
            }, 500);
        } catch (error) {
            if (!progressWin.isDestroyed()) {
                progressWin.destroy();
            }
            console.error('Download failed:', error);
            dialog.showErrorBox('Update Failed', 'Failed to download update');
        }
    }
}

module.exports = Updater;