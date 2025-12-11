const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0f172a', // Match app background
        show: false, // Don't show until ready
        title: 'Server Monitor',
        icon: path.join(__dirname, '../public/icon.png')
    });

    win.removeMenu(); // Remove default toolbar/menu


    // In development, load from Vite dev server
    // If running via 'electron .' locally but with --prod flag, treat as production
    const isDev = !app.isPackaged && !process.argv.includes('--prod');

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, load the local index.html
        // We need to point to the sibling 'dist' folder relative to this file's location in the build
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    win.once('ready-to-show', () => {
        win.show();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
