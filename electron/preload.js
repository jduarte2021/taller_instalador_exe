// electron/preload.js — expone APIs seguras al renderer vía contextBridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Guardar PDF con diálogo de selección de carpeta
  savePDF: (buffer, filename) =>
    ipcRenderer.invoke('save-pdf', buffer, filename),

  // Guardar PDF directo en ruta (cuando hay carpeta configurada)
  savePDFDirect: (buffer, filePath) =>
    ipcRenderer.invoke('save-pdf-direct', buffer, filePath),

  // Guardar cualquier archivo en carpeta + nombre (para backups, etc.)
  saveFile: (buffer, folder, filename) =>
    ipcRenderer.invoke('save-file', buffer, folder, filename),

  // Seleccionar carpeta de descarga por defecto
  selectFolder: () =>
    ipcRenderer.invoke('select-folder'),

  // Verificar si estamos en Electron
  isElectron: true,
});
