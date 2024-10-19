const { spawn } = require('child_process');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const scriptPath = path.join(__dirname, 'app.js');
const logFilePath = path.join(__dirname, 'error.log');
let appProcess = null;
let restartTimeout = null;
let fileWatcher = null;

const logError = (error) => {
  const errorMessage = `[${moment().tz('Asia/Jakarta').format('YYYY/MM/DD hh:mm:ss')}] Error: ${error}\n`;
  fs.appendFile(logFilePath, errorMessage, (err) => {
    if (err) {
      console.error('Gagal menulis log! Error: ', err);
    }
  });
};

const startApp = () => {
  if (appProcess) {
    appProcess.kill(); 
  }

  appProcess = spawn('node', [scriptPath], {
    stdio: ['inherit', 'inherit', 'pipe'] 
  });

  appProcess.stderr.on('data', (data) => {
    logError(data.toString()); 
  });

  appProcess.on('exit', (code) => {
    console.log(`Aplikasi berhenti dengan kode ${code}. Restarting...`);
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    restartTimeout = setTimeout(startApp, 1000);
  });
};

startApp();

fileWatcher = fs.watch(scriptPath, (eventType) => {
  if (eventType === 'change') {
    console.log(`${scriptPath} telah berubah. Restart dalam 3 detik...`);
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    restartTimeout = setTimeout(startApp, 3000);
  }
});
