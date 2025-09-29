import { logger } from './utils.js';
new logger('Updater', '#1fd449');

const { ipcRenderer } = require('electron');
import { config, database } from './utils.js';

let dev = process.env.NODE_ENV === 'dev';


class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");
        document.addEventListener('DOMContentLoaded', async () => {
            let databaseLauncher = new database();
            let configClient = await databaseLauncher.readData('configClient');
            let theme = configClient?.launcher_config?.theme || "sombre"
            let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
            document.body.className = isDarkTheme ? 'dark global' : 'light global';
            if (process.platform == 'win32') ipcRenderer.send('update-window-progress-load')
            this.startAnimation()
        });
    }

	async startAnimation() {
		let splashes = [{
			"message": "  ",
			"author": "Teambrody Launcher"
		}, ]
        let splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = splash.author;
        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);
        this.checkUpdate();
    }

    async checkUpdate() {
        if (dev) return this.startLauncher();
        this.setStatus(`Revisando version...`);

        const printEnhancedError = (error) => {
            return (error.message || error) + (error.extraInfo ? `<br><h2>${error.extraInfo}</h2>` : '');
        };

        const token = await config.GetConfig().then(res => res.gh_token || '').catch(err => {
            console.error(`Error al obtener el token: ${printEnhancedError(err)}`);
            return '';
        });

        ipcRenderer.invoke('update-app', token).then(update => {
            console.log(update);
        }).catch(err => {
            return this.shutdown(`Error al buscar actualizaciones.<br>${printEnhancedError(err)}`);
        });


        ipcRenderer.on('updateAvailable', () => {
            this.setStatus(`Actualizando el launcher, espera un momento... `);
            this.toggleProgress();
            ipcRenderer.send('start-update');
        })

        ipcRenderer.on('download-progress', (event, progress) => {
            ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
            this.setProgress(progress.transferred, progress.total);
        })

        ipcRenderer.on('update-not-available', () => {
            this.setStatus("Tienes la version mas reciente.");
            this.maintenanceCheck();
        })

        ipcRenderer.on('update-error', (event, error) => {
            console.error(`Error en el auto-updater: ${error}`);
            this.setStatus(`Error al actualizar.<br>${printEnhancedError(error)}`);
        });

        ipcRenderer.on('unzip-start', () => {
            console.warn(`Descomprimiendo localmente...`);
            this.setStatus(`Intentando descomprimir localmente...`);
        });

        ipcRenderer.on('unzip-error', (event, error) => {
            console.error(`Error al descomprimir: ${error}`);
            this.shutdown(`Error al descomprimir.<br>${printEnhancedError(error)}`);
        });
    }

    async maintenanceCheck() {
        config.GetConfig().then(res => {
            if (res.maintenance) return this.shutdown(res.maintenance_message);
            this.startLauncher();
        }).catch(e => {
            console.error(e);
            return this.shutdown("No se detecto conexion a<br>Internet.");
        })
    }

    startLauncher() {
        this.setStatus(`Iniciando`);
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        this.setStatus(`${text}<br>`);
        let i = 10;
        setInterval(() => {
            this.setStatus(`${text}<br>${i--}s`);
            if (i < 0) ipcRenderer.send('update-window-close');
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// document.addEventListener("keydown", (e) => {
//     if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
//         ipcRenderer.send("update-window-dev-tools");
//     }
// })
new Splash();