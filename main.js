const electron = require('electron')
const { app, BrowserWindow, Tray, Menu, ipcMain   } = electron
const path = require('path');
const {config} = require('./config')
require('./notification')

const ws = require('./ws')

//Auto Update check
const {autoUpdater} = require("electron-updater")

app.on('ready', function()  {
  autoUpdater.checkForUpdatesAndNotify();
});

let mainWindow = undefined
//defaults
const width = 400;
const height = 600;
let screenBounds
let x
let y


function createWindow () {
  app.allowRendererProcessReuse = true
  // Cree la fenetre du navigateur.
  screenBounds = electron.screen.getPrimaryDisplay().size
  x = screenBounds.width - width
  y = screenBounds.height - height

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    resizable: false,
    useContentSize: true,
    movable: false,
    icon: path.join(__dirname,'assets', 'iconeCo.ico'),
    webPreferences: {
      nodeIntegration: true
    },
    thickFrame: true,
    skipTaskbar: true
  })

  mainWindow.on('minimize',function(event){
    event.preventDefault(); 
    mainWindow.hide();
  });

  mainWindow.on('close', function (event) {
    if(!app.isQuiting){
        event.preventDefault();
        mainWindow.hide();
    }

    return false;
  });

  
  //Envoie de la config
  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.webContents.send('config', JSON.stringify(config.get()))
    //attache retour status
    ws.on('close', ()=>{
      mainWindow.webContents.send('status', 0)
      tray.setImage(path.join(__dirname,'assets', iconNameUnCo))
    })

    ws.on('open', ()=>{
      mainWindow.webContents.send('status', 1)
      tray.setImage(path.join(__dirname,'assets', iconNameCo))
    })

  });

  // et charger le fichier index.html de l'application.
  mainWindow.loadFile('index.html')

  if (!app.isPackaged){ // return true if app is packaged (prod mode)
    mainWindow.webContents.openDevTools()
    /*Vuejs devtools*/
    /*const os = require('os')
    BrowserWindow.addDevToolsExtension(
       path.join(os.homedir(), 'AppData\\Local\\Chromium\\User Data\\Default\\Extensions\\nhdogjmejiglipccpnnnanhbledajbpd\\5.3.3_0')
    )*/
  } else {
    app.setLoginItemSettings({
      openAtLogin: true
    })
  }
}


// Cette méthode sera appelée quant Electron aura fini
// de s'initialiser et prêt à créer des fenêtres de navigation.
// Certaines APIs peuvent être utilisées uniquement quand cet événement est émit.
app.whenReady().then(createWindow)

// Quitter si toutes les fenêtres ont été fermées.
app.on('window-all-closed', () => {
  // Sur macOS, il est commun pour une application et leur barre de menu
  // de rester active tant que l'utilisateur ne quitte pas explicitement avec Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // Sur macOS, il est commun de re-créer une fenêtre de l'application quand
  // l'icône du dock est cliquée et qu'il n'y a pas d'autres fenêtres d'ouvertes.
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('config', (event, arg) => {
  config.save(arg)
  //restart ws
  ws.restart()
})

//systray
let tray = null
const iconNameCo = 'iconeCo.ico'
const iconNameUnCo = 'iconeUnCo.ico'
app.on('ready', () => {
  const iconPath = path.join(__dirname,'assets', iconNameUnCo)
  tray = new Tray(iconPath)
  tray.setToolTip('Notif WS')
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Quit',
    click:  function(){
      app.isQuiting = true;
      app.quit();
    }
  }])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()){
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  })
})
