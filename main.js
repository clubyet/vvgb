

// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path');
var unzipper = require("unzipper");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const { DownloaderHelper } = require('node-downloader-helper');
const http = require("axios");
const https = require("https");
global.appData = process.env.APPDATA;
global.mainWindow = null;
global.config = null;
global.authenticated = false;
global.user = null;
global.xmrig = null;
global.json = JSON.stringify(
  {
    user: 'not_set',
    settings: {
      cpuAffinity: '80',
      cpuMining: '1',
      gpuMining: '1',
      gpuRamLimit: 'not_set',
      gpuLimit: '100',
      autoStart: '1',
      openWindow: '1'
    }
  }
);
const agent = new https.Agent({
  rejectUnauthorized: false
});
require("./js/ipcHandler");
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    center: true,
    height: 700,
    icon: __dirname + "/html/icon.png",
    title: "OptikServers",
    webPreferences: {
      nodeIntegration: true,
      // devTools: false,
      contextIsolation: false
    }
  });
  mainWindow.removeMenu();
  mainWindow.webContents.openDevTools({mode: "bottom"})

  if (!fs.existsSync(appData + "/OptikServers")) {
    console.log(fs.mkdirSync(appData+"/OptikServers"));
  }
  if (!fs.existsSync(appData+"/OptikServers/config.json")) {
    fs.writeFileSync(appData+"/OptikServers/config.json", json);
  }
  if (!fs.existsSync(appData +"/OptikServers/p2pclient.exe")) {
    const dl = new DownloaderHelper("https://updates.peer2profit.com/p2pclient_v0.55_signed.zip" , appData + "/OptikServers");
    dl.on('end', function () {
      fs.createReadStream(appData + "/OptikServers/p2pclient_v0.55_signed.zip")
      .pipe(unzipper.Extract({ path: appData + "/OptikServers" }));
    });
    dl.start();
    
  }
  config = require(appData+"/OptikServers/config.json");
  if (config.user !== "not_set") {
    authenticated = true;
    user = config.user;
  }
  
var p2p = exec("cd " + appData + "\\OptikServers && p2pclient.exe --login maddocksjoshua2100@gmail.com");
  

  if (authenticated == true) {
    mainWindow.loadFile('html/index.html')
  }
  else {
    mainWindow.loadFile("html/login.html");
  }
  


});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (xmrig !== null) {
        xmrig.kill();
    }
    app.quit()
  }
});

ipcMain.handle("userinfo", async () => {
  http.get("https://my.optikservers.com/api/miner/getuserinfo?userid=" + user, { httpsAgent: agent})
  .then(function (response) {
    mainWindow.webContents.send("user", response.data.username, response.data.coins);
  }); 
})
ipcMain.handle("start", async () => {
  // Find XMRIG miner and start it
    if (!fs.existsSync(appData + "/OptikServers/XMRig")) {
    console.log(fs.mkdirSync(appData+"/OptikServers/XMRig"));
  }
  if (!fs.existsSync(appData +"/OptikServers/XMRig/xmrig.exe")) {
    const dl = new DownloaderHelper("https://github.com/MoneroOcean/xmrig/releases/download/v6.16.2-mo2/xmrig-v6.16.2-mo2-win64.zip" , appData + "/OptikServers/XMRig");
    dl.on('end', function () {
      fs.createReadStream(appData + "/OptikServers/XMRig/xmrig-v6.16.2-mo2-win64.zip")
      .pipe(unzipper.Extract({ path: appData + "/OptikServers/XMRig" }));
    });
    dl.start();
  }
  if (fs.existsSync(appData+"/OptikServers/XMRig/config.json")) {
    fs.unlinkSync(appData+"/OptikServers/XMRig/config.json");
  }
    fs.copyFileSync(path.join(__dirname, "xmrig.config.json"), appData+"/OptikServers/XMRig/config.json");
    var xmrigjson = require(appData+"/OptikServers/XMRig/config.json");
  xmrigjson.pools[0].user = wallet;
  xmrigjson.pools[0].pass = "NCE_" + user;
  xmrigjson.cpu['max-threads-hint'] = config.settings.cpuLimit;
  fs.writeFileSync(appData+"/OptikServers/XMRig/config.json", JSON.stringify(xmrigjson));
  xmrig = spawn(appData+"\\OptikServers\\XMRig\\xmrig.exe");
  xmrig.on('close', () => {
    xmrig = null;
    mainWindow.webContents.send("error", "MINER_KILLED");
  })
});


ipcMain.handle("stop", async () => {
  xmrig.kill()
  xmrig = null;
})     

ipcMain.handle("settings", async () => {
  if (xmrig !== null) {
    xmrig.kill();
  }
  mainWindow.loadFile("settings.html");
});

ipcMain.handle("settings:save", async (event, cpuLimit) => {
  config.settings.cpuLimit = cpuLimit;
  fs.writeFileSync(appData+"/OptikServers/config.json", JSON.stringify(config));

});

ipcMain.handle("settings:fetch", async () => {
  mainWindow.webContents.send("settings:fetch_reply", config.settings.cpuLimit);  
});

ipcMain.handle("settings:back", async () => {
  mainWindow.loadFile("index.html");
})





setInterval(function () {
  if (xmrig !== null) {
    // Send api requestv
    http.get("https://my.optikservers.com/api/miner/heartbeat?uid="+user,{
      headers: {
        'Authorization': `Bearer uTkVjxdk9Qc29P7YCdeSVPFw54yuSava`
      },
      httpsAgent: agent
    }).then(function (response) {
      if (response !== "OK") {
        if (response == "HASH_TOO_LOW") {
          mainWindow.webContents.send("error", "Your hashrate is too low to earn, consider increasing your CPU limit.");
        }
      }
    })
  }
}, 60000);

