import { showToast } from './utils.js';

export class AlertManager {
    constructor(monitor) {
        this.monitor = monitor;
        this.alertThresholds = {
            cpu: 90,
            memory: 85,
            temperature: 80,
            disk: 90
        };
        this.activeAlerts = new Set();
    }

    setupAlerts() {
        this.loadAlertThresholds();
    }

    loadAlertThresholds() {
        const saved = localStorage.getItem('alertThresholds');
        if (saved) {
            this.alertThresholds = { ...this.alertThresholds, ...JSON.parse(saved) };
            this.updateAlertModal();
        }
    }

    saveAlertSettings() {
        this.alertThresholds.cpu = parseInt(document.getElementById('cpu-threshold').value);
        this.alertThresholds.memory = parseInt(document.getElementById('memory-threshold').value);
        this.alertThresholds.temperature = parseInt(document.getElementById('temp-threshold').value);
        this.alertThresholds.disk = parseInt(document.getElementById('disk-threshold').value);
        this.saveAlertThresholds();
    }

    saveAlertThresholds() {
        localStorage.setItem('alertThresholds', JSON.stringify(this.alertThresholds));
    }

    updateAlertModal() {
        document.getElementById('cpu-threshold').value = this.alertThresholds.cpu;
        document.getElementById('memory-threshold').value = this.alertThresholds.memory;
        document.getElementById('temp-threshold').value = this.alertThresholds.temperature;
        document.getElementById('disk-threshold').value = this.alertThresholds.disk;
    }

    checkAlerts(data) {
        // CPU alert
        if (data.cpu && data.cpu.usage > this.alertThresholds.cpu) {
            this.showAlert(`High CPU usage: ${data.cpu.usage}%`, 'warning', 'cpu_high_usage');
        } else {
            this.clearAlert('cpu_high_usage');
        }
        
        // Memory alert
        if (data.memory && data.memory.percent > this.alertThresholds.memory) {
            this.showAlert(`High memory usage: ${data.memory.percent.toFixed(1)}%`, 'warning', 'memory_high_usage');
        } else {
            this.clearAlert('memory_high_usage');
        }
        
        // Temperature alert
        if (data.cpu && data.cpu.temperature > this.alertThresholds.temperature) {
            this.showAlert(`High temperature: ${data.cpu.temperature}°C`, 'error', 'high_temperature');
        } else {
            this.clearAlert('high_temperature');
        }
        
        // Disk space alerts
        if (data.pools && Array.isArray(data.pools)) {
            data.pools.forEach(pool => {
                const alertId = `disk_low_${pool.name}`;
                if (pool.percent > this.alertThresholds.disk) {
                    this.showAlert(`Low disk space on ${pool.name}: ${pool.percent.toFixed(1)}%`, 'warning', alertId);
                } else {
                    this.clearAlert(alertId);
                }
            });
        }
    }

    showAlert(message, type, alertId) {
        if (this.activeAlerts.has(alertId)) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.getElementById('alerts-container').appendChild(alert);
        this.activeAlerts.add(alertId);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
                this.activeAlerts.delete(alertId);
            }
        }, 10000);
    }

    clearAlert(alertId) {
        this.activeAlerts.delete(alertId);
    }
}