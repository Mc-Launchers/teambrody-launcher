/**
 * @author 2K Studio
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { app, ipcMain, nativeTheme } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");
const rpc = require('discord-rpc');

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./data/Launcher').replace(/\\/g, '/');
    let appdata = path.resolve('./data').replace(/\\/g, '/');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    if (!fs.existsSync(appdata)) fs.mkdirSync(appdata, { recursive: true });
    app.setPath('userData', appPath);
    app.setPath('appData', appdata);
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.whenReady().then(() => {
        if (dev) {
            MainWindow.createWindow();
        } else {
            UpdateWindow.createWindow();
        }
    });
}

const setupIpcMainHandlers = () => {
    ipcMain.on('main-window-open', MainWindow.createWindow);
    ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow().webContents.openDevTools({ mode: 'detach' }));
    ipcMain.on('main-window-dev-tools-close', () => MainWindow.getWindow().webContents.closeDevTools());
    ipcMain.on('main-window-close', MainWindow.destroyWindow);
    ipcMain.on('main-window-reload', () => MainWindow.getWindow().reload());
    ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow().setProgressBar(options.progress / options.size));
    ipcMain.on('main-window-progress-reset', () => MainWindow.getWindow().setProgressBar(-1));
    ipcMain.on('main-window-progress-load', () => MainWindow.getWindow().setProgressBar(2));
    ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize());
    ipcMain.on('main-window-maximize', () => {
        const window = MainWindow.getWindow();
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    });
    ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide());
    ipcMain.on('main-window-show', () => MainWindow.getWindow().show());

    ipcMain.on('update-window-close', UpdateWindow.destroyWindow);
    ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools({ mode: 'detach' }));
    ipcMain.on('update-window-progress', (event, options) => UpdateWindow.getWindow().setProgressBar(options.progress / options.size));
    ipcMain.on('update-window-progress-reset', () => UpdateWindow.getWindow().setProgressBar(-1));
    ipcMain.on('update-window-progress-load', () => UpdateWindow.getWindow().setProgressBar(2));

    ipcMain.handle('path-user-data', () => app.getPath('userData'));
    ipcMain.handle('appData', () => app.getPath('appData'));

    ipcMain.handle('Microsoft-window', async (_, client_id) => {
        return await new Microsoft(client_id).getAuth();
    });

    ipcMain.handle('is-dark-theme', (_, theme) => {
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return nativeTheme.shouldUseDarkColors;
    });
};

const setupDiscordRPC = () => {
    let client = new rpc.Client({ transport: 'ipc' });
    let startedAppTime = Date.now();

    ipcMain.on('new-status-discord', async () => {
        client.login({ clientId: '1228439660523552779' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: 'En el Menú',
                    assets: {
                        large_image: 'TeamBrody542',
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });

    ipcMain.on('new-status-discord-jugando', async (event, status, imginstancia) => {
        console.log(status);
        if (client) await client.destroy();
        client = new rpc.Client({ transport: 'ipc' });
        client.login({ clientId: '1228439660523552779' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: status,
                    assets: {
                        large_image: `${imginstancia}`,
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });

    ipcMain.on('delete-and-new-status-discord', async () => {
        if (client) client.destroy();
        client = new rpc.Client({ transport: 'ipc' });
        client.login({ clientId: '1228439660523552779' });
        client.on('ready', () => {
            client.request('SET_ACTIVITY', {
                pid: process.pid,
                activity: {
                    details: 'En el Menú',
                    assets: {
                        large_image: 'TeamBrody542',
                        large_text: 'Streamer'
                    },
                    instance: false,
                    timestamps: {
                        start: startedAppTime
                    }
                },
            });
        });
    });
};

const setupAutoUpdater = () => {
    autoUpdater.autoDownload = false;
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'Mc-Launchers',
        repo: 'TeamBrody',
        token: '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',
    });

    ipcMain.handle('update-app', async () => {
        try {
            const res = await autoUpdater.checkForUpdates();
            return res;
        } catch (error) {
            return { error: true, message: error.message };
        }
    });

    autoUpdater.on('update-available', () => {
        const updateWindow = UpdateWindow.getWindow();
        if (updateWindow) updateWindow.webContents.send('updateAvailable');
    });

    ipcMain.on('start-update', () => {
        autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', () => {
        const updateWindow = UpdateWindow.getWindow();
        if (updateWindow) updateWindow.webContents.send('update-not-available');
    });

    autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('download-progress', (progress) => {
        const updateWindow = UpdateWindow.getWindow();
        if (updateWindow) updateWindow.webContents.send('download-progress', progress);
    });
};

setupIpcMainHandlers();
setupDiscordRPC();
setupAutoUpdater();

app.on('window-all-closed', () => app.quit());
