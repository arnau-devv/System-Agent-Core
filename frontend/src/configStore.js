const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigStore {
    constructor() {
        // Carpeta donde se guardará el JSON (compatible con Windows/Mac/Linux)
        this.path = path.join(app.getPath('appData'), '..', 'Local', app.getName(), 'ui', 'config.json');
        this.data = this.read();
    }

    // Lee el archivo del disco
    read() {
        if (!fs.existsSync(this.path)) {
            // Valores por defecto si el archivo no existe en el primer arranque
            return {
                background: {
                    theme: "Aurora",
                    mode: "normal",
                    colors: null
                },
                sphere: "rings",
                language: "es"
            };
        }
        try {
            return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
        } catch (e) {
            console.error("Error al leer el archivo de configuración:", e);
            return {};
        }
    }

    // Guarda una sección específica (ej: 'background' o 'sphere')
    write(key, value) {
        this.data[key] = value;
        try {
            fs.mkdirSync(path.dirname(this.path), { recursive: true });
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (e) {
            console.error("Error al escribir en el disco:", e);
        }
    }

    // Obtiene una sección específica
    get(key) {
        return this.data[key];
    }
}

// Exportamos una única instancia compartida (Singleton)
module.exports = new ConfigStore();