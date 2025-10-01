import { updateThemeButton } from './utils.js';

export class SettingsManager {
    constructor(monitor) {
        this.monitor = monitor;
    }

    loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
        
        // Load refresh interval
        const savedInterval = localStorage.getItem('refreshInterval');
        if (savedInterval) {
            this.monitor.updateInterval = parseInt(savedInterval);
            const intervalSelect = document.getElementById('refresh-interval');
            if (intervalSelect) {
                intervalSelect.value = savedInterval;
            }
        }
    }

    saveSettings() {
        localStorage.setItem('refreshInterval', this.monitor.updateInterval.toString());
    }
}