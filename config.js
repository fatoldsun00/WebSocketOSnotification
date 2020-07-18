
const fs = require('fs')
const path = require('path')
const electron = require('electron')

//const configPath =  path.join(__dirname, 'config.json')
const userDataPath = (electron.app || electron.remote.app).getPath('userData')
const configPath= path.join(userDataPath, 'config.json.json')

const saveConfig = (param) => {
    if (typeof(param) == 'object') param = JSON.stringify(param)
    fs.writeFileSync(configPath,param)
}

const getConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(configPath))
    } catch (err) {
        return false
    }
}

module.exports = {
    config : {
        save: saveConfig,
        get: getConfig
    }
}