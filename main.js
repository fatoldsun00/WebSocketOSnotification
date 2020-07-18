const electron = require('electron')
const { app, BrowserWindow, Tray, Menu, ipcMain   } = electron
const path = require('path');
require('./notification')
const {config} = require('./config')
const ws = require('./ws')

let mainWindow = undefined
//defaults
let width = 350;
let height = 250;

let margin_x = 0;
let margin_y = 0;

const appFolder = path.dirname(process.execPath)
const updateExe = path.resolve(appFolder, '..', 'Update.exe')
const exeName = path.basename(process.execPath)

//lancement au démarrage
app.setLoginItemSettings({
  openAtLogin: true,
  path: updateExe,
  args: [
    '--processStart', `"${exeName}"`,
    '--process-start-args', `"--hidden"`
  ]
})


function createWindow () {
  app.allowRendererProcessReuse = true
  // Cree la fenetre du navigateur.
  mainWindow = new BrowserWindow({
    width,
    height,
    icon: path.join(__dirname,'assets', 'iconeCo.ico'),
    webPreferences: {
      nodeIntegration: true
    },
    frame: false,
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

  
  mainWindow.hide()
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
  //mainWindow.webContents.openDevTools()
}

app.setLoginItemSettings({
  openAtLogin: true
})

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
      showWindow()
    }
  })
})

//Gestion de la position de la fenetre popup
function showWindow() {
  alignWindow();
  mainWindow.show();
}

function alignWindow() {
  const position = calculateWindowPosition();
  mainWindow.setBounds({
    width: width,
    height: height,
    x: position.x,
    y: position.y
  });
}

function calculateWindowPosition() {
  const screenBounds = electron.screen.getPrimaryDisplay().size;
  const trayBounds = tray.getBounds();

  //where is the icon on the screen?
  let trayPos = 4; // 1:top-left 2:top-right 3:bottom-left 4.bottom-right
  trayPos = trayBounds.y > screenBounds.height / 2 ? trayPos : trayPos / 2;
  trayPos = trayBounds.x > screenBounds.width / 2 ? trayPos : trayPos - 1;

  let DEFAULT_MARGIN = { x: margin_x, y: margin_y };

  //calculate the new window position
  switch (trayPos) {
    case 1: // for TOP - LEFT
      x = Math.floor(trayBounds.x + DEFAULT_MARGIN.x + trayBounds.width / 2);
      y = Math.floor(trayBounds.y + DEFAULT_MARGIN.y + trayBounds.height / 2);
      break;

    case 2: // for TOP - RIGHT
      x = Math.floor(
        trayBounds.x - width - DEFAULT_MARGIN.x + trayBounds.width / 2
      );
      y = Math.floor(trayBounds.y + DEFAULT_MARGIN.y + trayBounds.height / 2);
      break;

    case 3: // for BOTTOM - LEFT
      x = Math.floor(trayBounds.x + DEFAULT_MARGIN.x + trayBounds.width / 2);
      y = Math.floor(
        trayBounds.y - height - DEFAULT_MARGIN.y + trayBounds.height / 2
      );
      break;

    case 4: // for BOTTOM - RIGHT
      x = Math.floor(
        trayBounds.x - width - DEFAULT_MARGIN.x + trayBounds.width / 2
      );
      y = Math.floor(
        trayBounds.y - height - DEFAULT_MARGIN.y + trayBounds.height / 2
      );
      break;
  }

  return { x: x, y: y };
}
