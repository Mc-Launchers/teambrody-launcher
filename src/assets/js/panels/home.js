/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer, BrowserWindow, Notification  } = require('electron')
const Swal = require("sweetalert2");
const instanceElement = document.querySelector('.instance-elements');
const webhookURL = "https://discord.com/api/webhooks/1239186229875179520/JpcC4ja_vVQ7JWaO5-5PUuiCfBRW6S3LbSXyll5-ULS1Pk7ayoqcYonPImgTS-24W5BJ";



const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
});


const fetch = require("node-fetch");
let offlineMode = false;
fetch("https://google.com").then(async () => {
    offlineMode = false;
}).catch(async () => {
    offlineMode = true;
})

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        this.IniciarEstadoDiscord();
        this.setBackgroundImage();
    }

    async IniciarEstadoDiscord() {
        ipcRenderer.send('new-status-discord');
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
        function preventDefaultWheel(event) {
            event.preventDefault();
          }
          
          window.addEventListener('DOMContentLoaded', function() {
            window.addEventListener('wheel', preventDefaultWheel, { passive: false });
          });
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">ERROR</div>
                            <div class="month">ERROR</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No pudimos mostrarte las novedades.</br>Posiblemente tengas que hacer un reinicio al lanzador..</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author"><span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">ERROR</div>
                            <div class="month">ERROR</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>No pudimos mostrarte las novedades.</br>Posiblemente tengas que hacer un reinicio al lanzador..</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }
    
    async setBackgroundImage() {
        let body = document.body;
        let configClient = await this.db.readData('configClient');
        let instancesList = await config.getInstanceList();
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct);

        if (instanceSelect) {
            let options = instancesList.find(i => i.name == configClient.instance_selct);
            let background = `url(${options.status.background})`;
            
            let img = new Image();
            img.src = options.status.background;
            
            const startTime = Date.now();
            
            img.onload = () => {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 1000 - elapsedTime);
                
                setTimeout(() => {
                    body.style.backgroundImage = background;
                }, remainingTime);
            };
        }
    }
    
    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct) ? configClient?.instance_selct : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')
        let instanceCloseBTN = document.querySelector('.close-popup')

        if (instancesList.length === 1) {
            document.querySelector('.instance-select').style.display = 'none'
            instanceBTN.style.paddingRight = '0'
        }

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_selct = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Iniciando instancia ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }

        instancePopup.addEventListener('click', async e => {
            let body = document.body;
            let configClient = await this.db.readData('configClient');
            let instance = await config.getInstanceList();
        
            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id;
                let activeInstanceSelect = document.querySelector('.active-instance');
        
                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');
        
                configClient.instance_selct = newInstanceSelect;
                await this.db.updateData('configClient', configClient);
        
                let options = instance.find(i => i.name == configClient.instance_selct);
                
                let loadingPopup = document.getElementById('loading-popup');
                loadingPopup.style.display = 'flex';
        
                let background = `url(${options.status.background})`;
        
                let img = new Image();
                img.src = options.status.background;
                
                const startTime = Date.now();
        
                img.onload = () => {
                    const elapsedTime = Date.now() - startTime;
                    const remainingTime = Math.max(0, 2000 - elapsedTime);
        
                    setTimeout(() => {
                        body.style.backgroundImage = background;
                        loadingPopup.style.display = 'none';
                    }, remainingTime);
                };
        
                instancePopup.style.display = 'none';
        
                let videoPath = options.status.background;
                let videoElement = document.getElementById('background-video');
                videoElement.src = videoPath;
                videoElement.play();
        
                videoElement.addEventListener('playing', () => {
                    loadingPopup.style.display = 'none';
                });
        
                await setStatus(options.status);
            }
        });
        
        

        instanceBTN.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')
            let instanceSelect = configClient.instance_selct
            let auth = await this.db.readData('accounts', configClient.account_selected)

            if (e.target.classList.contains('instance-select')) {
                instancesListPopup.innerHTML = ''
                for (let instance of instancesList) {
                    if (instance.whitelistActive) {
                        instance.whitelist.map(whitelist => {
                            if (whitelist == auth?.name) {
                                if (instance.name == instanceSelect) {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                                } else {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                                }
                            }
                        })
                    } else {
                        if (instance.name == instanceSelect) {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                        } else {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                        }
                    }
                }

                instancePopup.style.display = 'flex'
            }

            if (!e.target.classList.contains('instance-select')) this.startGame()
        })

        instanceCloseBTN.addEventListener('click', () => {
            instancePopup.classList.add('fade-out'); 
            setTimeout(() => {
              instancePopup.style.display = 'none'; 
              instancePopup.classList.remove('fade-out'); 
            }, 500); 
          });
          
        
          instancePopup.style.display = 'none';
          instancePopup.classList.remove('fade-out');
          
        }    

    async startGame() {
        let launch = new Launch()
        let configClient = await this.db.readData('configClient')
        let instance = await config.getInstanceList()
        let authenticator = await this.db.readData('accounts', configClient.account_selected)
        let options = instance.find(i => i.name == configClient.instance_selct)

        let playInstanceBTN = document.querySelector('.play-instance')
        let infoStartingBOX = document.querySelector('.info-starting-game')
        let infoStarting = document.querySelector(".info-starting-game-text")
        let progressBar = document.querySelector('.progress-bar')

        let opt = {
            url: options.url,
            authenticator: authenticator,
            timeout: 10000,
            path: `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `${this.config.dataDirectory}`}`,
            instance: options.name,
            version: options.loadder.minecraft_version,
            detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
            downloadFileMultiple: configClient.launcher_config.download_multi,
            intelEnabledMac: configClient.launcher_config.intelEnabledMac,

            loader: {
                type: options.loadder.loadder_type,
                build: options.loadder.loadder_version,
                enable: options.loadder.loadder_type == 'none' ? false : true
            },

            verify: options.verify,

            ignored: [...options.ignored],

            javaPath: configClient.java_config.java_path,

            screen: {
                width: configClient.game_config.screen_size.width,
                height: configClient.game_config.screen_size.height
            },

            memory: {
                min: `${configClient.java_config.java_memory.min * 1024}M`,
                max: `${configClient.java_config.java_memory.max * 1024}M`
            }
        }

        launch.Launch(opt);

        playInstanceBTN.style.display = "none"
        infoStartingBOX.style.display = "block"
        progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load')
        ipcRenderer.send('new-status-discord-jugando',  `Jugando a ${options.status.discord_info}`, `${options.status.discordrpc_icon}`)
        const mensajeDiscord = {
            embeds: [
                {
                    title: `${pkg.preductname} - Version: ${pkg.version}/Streamers`,
                    thumbnail: {
                        url: `https://minotar.net/helm/${authenticator.name}/600.png`,
                    },
                    fields: [
                        {
                            name: 'Instancia',
                            value: options.name,
                            inline: true,
                        },
                        {
                            name: 'Usuario',
                            value: `${authenticator.name}`,
                            inline: true,
                        },
                        {
                            name: 'RPC Mostrado',
                            value: options.status.discord_info,
                            inline: true,
                        },
                    ],
                    color: 16776960,
                },
            ],
        };
        
        fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mensajeDiscord),
        });

        const Toast = Swal.mixin({
            toast: true,
            position: "top-start",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          });
          Toast.fire({
            icon: "info",
            title: "Preparando el juego.."
          });
          

        launch.on('extract', extract => {
            ipcRenderer.send('main-window-progress-load')
            console.log(extract);
        });

        launch.on('progress', (progress, size) => {
            const progressMB = Math.floor(progress / (1024 * 1024)); 
            const sizeMB = Math.floor(size / (1024 * 1024)); 
            const percentage = size > 0 ? ((progress / size) * 100).toFixed(1) : 0;
            infoStarting.innerHTML = `Descargando ${options.name}`;
            infoStarting.innerHTML += `<br>${progressMB} MB / ${sizeMB} MB`;
            ipcRenderer.send('main-window-progress', { progress, size });
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('check', (progress, size) => {
            infoStarting.innerHTML = `Verificando ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            console.log(`${hours}h ${minutes}m ${seconds}s`);
        })

        launch.on('speed', (speed) => {
            console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
        })

        launch.on('patch', patch => {
            console.log(patch);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Extrayendo Forge`
        });

        launch.on('data', (e) => {
            progressBar.style.display = "none"
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Jugando `
            infoStarting.innerHTML += `${options.name}`
            
            console.log(e);

        });

        launch.on('close', code => {
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "block"
        
            infoStarting.innerHTML = `Volviendo..`
            new logger('2K Logger', '#7289da');
            console.log('Close');
            
            ipcRenderer.send('delete-and-new-status-discord')

        });

        launch.on('error', err => {
            ipcRenderer.send('main-window-progress-reset')
            console.log(err);
        });
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}
export default Home;