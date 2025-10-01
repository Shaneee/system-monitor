// Import all modules
import {
    ChartManager
} from './modules/charts.js';
import {
    AlertManager
} from './modules/alerts.js';
import {
    ExportManager
} from './modules/export.js';
import {
    LayoutManager
} from './modules/layout.js';
import {
    PerformanceMonitor
} from './modules/performance.js';
import {
    KeyboardManager
} from './modules/keyboard.js';
import {
    MobileManager
} from './modules/mobile.js';
import {
    ModalManager
} from './modules/modals.js';
import {
    SettingsManager
} from './modules/settings.js';
import {
    formatBytes,
    showToast,
    updateThemeButton,
    updateHighContrastButton,
    validateData
} from './modules/utils.js';

class SystemMonitor {
    constructor() {
        this.updateInterval = 2000;
        this.prevNetwork = {
            bytes_sent: 0,
            bytes_recv: 0
        };

        // Initialize modules
        this.charts = new ChartManager(this);
        this.alerts = new AlertManager(this);
        this.export = new ExportManager(this);
        this.layout = new LayoutManager(this);
        this.performance = new PerformanceMonitor(this);
        this.keyboard = new KeyboardManager(this);
        this.mobile = new MobileManager(this);
        this.modals = new ModalManager(this);
        this.settings = new SettingsManager(this);

        // Store current data for export
        this.currentSystemData = null;
        this.currentCpuData = null;
        this.currentMemoryData = null;
        this.currentGpuData = null;
        this.currentNetworkData = null;
        this.currentPoolsData = null;
        this.currentDiskIOData = null;
        this.currentTempsData = null;
        this.currentProcessesData = null;

        this.init();
    }

    init() {
        this.initTheme();
        this.setupEventListeners();
        this.settings.loadSettings();
        this.charts.setupCharts();
        this.alerts.setupAlerts();
        this.layout.setupCustomLayout();
        this.keyboard.setupKeyboardShortcuts();
        this.mobile.setupMobileOptimizations();
        this.setupServiceWorker();
        updateHighContrastButton();

        // Initial data load with polling
        setTimeout(() => {
            this.updateData(false); // false = initial load, no toast
            setInterval(() => this.updateData(false), this.updateInterval);
        }, 100);
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // High contrast toggle
        document.getElementById('high-contrast-toggle').addEventListener('click', () => {
            this.toggleHighContrast();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.export.exportData();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.updateData(true);
        });

        // Interval selector
        document.getElementById('refresh-interval').addEventListener('change', (e) => {
            this.updateInterval = parseInt(e.target.value);
            this.settings.saveSettings();
        });

        // Export link in footer
        document.getElementById('export-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.export.exportData();
        });

        // Layout toggle
        document.getElementById('layout-toggle').addEventListener('click', () => {
            this.layout.toggleLayoutMode();
        });

        // Alerts settings
        document.getElementById('alerts-toggle').addEventListener('click', () => {
            this.modals.showModal('alerts-modal');
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.modals.showModal('help-modal');
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                this.modals.closeModals();
            });
        });

        // Save alerts settings
        document.getElementById('save-alerts').addEventListener('click', () => {
            this.alerts.saveAlertSettings();
            this.modals.closeModals();
            showToast('Alert settings saved', 'success');
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.modals.closeModals();
                }
            });
        });
    }

    async updateData(isManualRefresh = false) {
        const endPerformanceMonitor = this.performance.startMonitoring();

        try {
            const responses = await Promise.allSettled([
                fetch('/api/system-info'), fetch('/api/cpu-info'),
                fetch('/api/memory-info'), fetch('/api/pools'),
                fetch('/api/gpu-info'), fetch('/api/network'),
                fetch('/api/disk-io'), fetch('/api/temperatures'),
                fetch('/api/top-processes')
            ]);

            const data = {};
            const endpoints = ['system', 'cpu', 'memory', 'pools', 'gpu', 'network', 'diskIO', 'temps', 'processes'];

            responses.forEach((response, index) => {
                if (response.status === 'fulfilled' && response.value.ok) {
                    data[endpoints[index]] = response.value.json();
                } else {
                    data[endpoints[index]] = {
                        error: 'Failed to fetch'
                    };
                    console.error(`Failed to fetch ${endpoints[index]}:`, response.reason);
                }
            });

            // Wait for all JSON parsing to complete
            const allData = await Promise.all(Object.values(data).map(item =>
                Promise.resolve(item).catch(error => ({
                    error: error.message
                }))
            ));

            const finalData = {};
            endpoints.forEach((endpoint, index) => {
                finalData[endpoint] = allData[index];
            });

            if (validateData(finalData)) {
                this.updateAllSections(finalData);
                this.charts.updateCharts(finalData);
                this.alerts.checkAlerts(finalData);

                // Only show success toast for manual refreshes
                if (isManualRefresh) {
                    showToast('Data updated successfully', 'success');
                }
            } else {
                showToast('Some data failed to load', 'warning');
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Connection error', 'error');
        } finally {
            if (endPerformanceMonitor) endPerformanceMonitor();
        }
    }

    updateAllSections(data) {
        // Store data for export
        this.currentSystemData = data.system;
        this.currentCpuData = data.cpu;
        this.currentMemoryData = data.memory;
        this.currentGpuData = data.gpu;
        this.currentNetworkData = data.network;
        this.currentPoolsData = data.pools;
        this.currentDiskIOData = data.diskIO;
        this.currentTempsData = data.temps;
        this.currentProcessesData = data.processes;

        this.updateCPU(data.cpu);
        this.updateMemory(data.memory);
        this.updatePools(data.pools);
        this.updateGPU(data.gpu);
        this.updateNetwork(data.network);
        this.updateSystem(data.system);
        this.updateDiskIO(data.diskIO);
        this.updateTemperatures(data.temps);
        this.updateProcesses(data.processes);

        document.getElementById('last-update-time').textContent =
            new Date().toLocaleTimeString();
    }

    // ==================== UPDATE METHODS ====================

    updateCPU(cpu) {
        const element = document.getElementById('cpu-info');
        if (cpu.error) {
            element.innerHTML = `<div class="error">Error: ${cpu.error}</div>`;
            return;
        }

        this.charts.updateCpuHistory(cpu.usage);

        element.innerHTML = `
            <div class="info-item">
                <span><i class="fas fa-microchip"></i> Model:</span>
                <span>${cpu.name || 'Unknown'}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-microchip"></i> Cores/Threads:</span>
                <span>${cpu.cores} / ${cpu.threads}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-tachometer-alt"></i> Frequency:</span>
                <span>${cpu.frequency ? (cpu.frequency / 1000).toFixed(2) + ' GHz' : 'N/A'}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-thermometer-half"></i> Temperature:</span>
                <span>${cpu.temperature ? cpu.temperature + '°C' : 'N/A'}</span>
            </div>
            <div class="cpu-graph-container">
                <div class="cpu-main-graph">
                    <div class="cpu-main-bar" style="height: ${cpu.usage}%"></div>
                    ${this.charts.createCpuHistoryGraph()}
                </div>
                <div class="cpu-usage-text">CPU Usage: ${cpu.usage}%</div>
            </div>
        `;
    }

    updateMemory(memory) {
        const element = document.getElementById('memory-info');
        if (memory.error) {
            element.innerHTML = `<div class="error">Error: ${memory.error}</div>`;
            return;
        }

        const total = memory.total;
        const systemPercent = total > 0 ? ((memory.system / total) * 100).toFixed(1) : 0;
        const vmPercent = total > 0 ? ((memory.vm / total) * 100).toFixed(1) : 0;
        const dockerPercent = total > 0 ? ((memory.docker / total) * 100).toFixed(1) : 0;
        const freePercent = total > 0 ? ((memory.free / total) * 100).toFixed(1) : 0;

        element.innerHTML = `
            <div class="info-item">
                <span><i class="fas fa-database"></i> Usable Size:</span>
                <span>${formatBytes(memory.total)}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-cogs"></i> System:</span>
                <span>${formatBytes(memory.system)} (${systemPercent}%)</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-server"></i> VM:</span>
                <span>${formatBytes(memory.vm)} (${vmPercent}%)</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-docker"></i> Docker:</span>
                <span>${formatBytes(memory.docker)} (${dockerPercent}%)</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-check-circle"></i> Free:</span>
                <span>${formatBytes(memory.free)} (${freePercent}%)</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-chart-line"></i> Total Usage:</span>
                <span>${memory.percent.toFixed(1)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-memory" style="width: ${memory.percent}%"></div>
            </div>
            ${memory.swap_total > 0 ? `
                <div class="info-item">
                    <span><i class="fas fa-exchange-alt"></i> Swap:</span>
                    <span>${formatBytes(memory.swap_used)} / ${formatBytes(memory.swap_total)} (${memory.swap_percent.toFixed(1)}%)</span>
                </div>
            ` : ''}
        `;
    }

    updatePools(pools) {
        const element = document.getElementById('pools-info');
        if (pools.error) {
            element.innerHTML = `<div class="error">Error: ${pools.error}</div>`;
            return;
        }

        let html = '';
        if (pools.length === 0) {
            html = '<div>No pools detected</div>';
        } else {
            pools.forEach(pool => {
                html += `
                    <div class="pool">
                        <div class="info-item">
                            <span>${pool.name}:</span>
                            <span>${formatBytes(pool.used)} / ${formatBytes(pool.total)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill progress-disk" style="width: ${pool.percent}%"></div>
                        </div>
                        <div class="info-item">
                            <span>Usage:</span>
                            <span>${pool.percent.toFixed(1)}%</span>
                        </div>
                    </div>
                `;
            });
        }
        element.innerHTML = html;
    }

    updateGPU(gpus) {
        const element = document.getElementById('gpu-info');
        if (gpus.error) {
            element.innerHTML = `<div class="error">Error: ${gpus.error}</div>`;
            return;
        }

        if (gpus.length === 0) {
            element.innerHTML = '<div class="info-item"><i class="fas fa-exclamation-triangle"></i> No GPUs detected</div>';
            return;
        }

        let html = '';
        gpus.forEach((gpu, index) => {
            const memory_percent = (gpu.memory_used / gpu.memory_total) * 100;
            html += `
                <div class="gpu">
                    <div class="info-item">
                        <span><i class="fas fa-microchip"></i> GPU ${index + 1}:</span>
                        <span>${gpu.name}</span>
                    </div>
                    <div class="info-item">
                        <span><i class="fas fa-tachometer-alt"></i> GPU Usage:</span>
                        <span>${gpu.utilization}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-gpu" style="width: ${gpu.utilization}%"></div>
                    </div>
                    <div class="info-item">
                        <span><i class="fas fa-memory"></i> Memory Usage:</span>
                        <span>${Math.round(gpu.memory_used)} MB / ${Math.round(gpu.memory_total)} MB (${memory_percent.toFixed(1)}%)</span>
                    </div>
                    <div class="info-item">
                        <span><i class="fas fa-thermometer-half"></i> Temperature:</span>
                        <span>${gpu.temperature}°C</span>
                    </div>
                    ${gpu.driver_version ? `
                        <div class="info-item">
                            <span><i class="fas fa-code-branch"></i> Driver:</span>
                            <span>${gpu.driver_version}</span>
                        </div>
                    ` : ''}
                    ${gpu.clock_graphics ? `
                        <div class="info-item">
                            <span><i class="fas fa-clock"></i> GPU Clock:</span>
                            <span>${gpu.clock_graphics} MHz</span>
                        </div>
                    ` : ''}
                    ${gpu.power_draw ? `
                        <div class="info-item">
                            <span><i class="fas fa-bolt"></i> Power:</span>
                            <span>${gpu.power_draw}W / ${gpu.power_limit}W</span>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        element.innerHTML = html;
    }

    updateNetwork(network) {
        const element = document.getElementById('network-info');
        if (network.error) {
            element.innerHTML = `<div class="error">Error: ${network.error}</div>`;
            return;
        }

        const formatSpeed = (bytesPerSec) => {
            if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
            if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
            return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
        };

        let activeInterface = network.active_interface;
        let html = '';

        if (activeInterface) {
            html += `
                <div class="info-item">
                    <span><i class="fas fa-network-wired"></i> Interface:</span>
                    <span>${activeInterface.name}</span>
                </div>
                ${activeInterface.ipv4 ? `
                    <div class="info-item">
                        <span><i class="fas fa-globe"></i> IPv4:</span>
                        <span>${activeInterface.ipv4}</span>
                    </div>
                ` : ''}
                ${activeInterface.speed > 0 ? `
                    <div class="info-item">
                        <span><i class="fas fa-tachometer-alt"></i> Speed:</span>
                        <span>${activeInterface.speed} Mbps</span>
                    </div>
                ` : ''}
            `;
        } else {
            html += `<div class="info-item"><i class="fas fa-exclamation-triangle"></i> No active network interface found</div>`;
        }

        html += `
            <div class="info-item">
                <span><i class="fas fa-upload"></i> Upload Speed:</span>
                <span>${formatSpeed(network.current_sent || 0)}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-download"></i> Download Speed:</span>
                <span>${formatSpeed(network.current_recv || 0)}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-arrow-up"></i> Total Sent:</span>
                <span>${formatBytes(network.bytes_sent)}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-arrow-down"></i> Total Received:</span>
                <span>${formatBytes(network.bytes_recv)}</span>
            </div>
        `;
        element.innerHTML = html;
    }

    updateSystem(system) {
        const element = document.getElementById('system-info');
        if (system.error) {
            element.innerHTML = `<div class="error">Error: ${system.error}</div>`;
            return;
        }

        let html = `
            <div class="info-item">
                <span><i class="fas fa-desktop"></i> Hostname:</span>
                <span>${system.hostname}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-server"></i> Platform:</span>
                <span>${system.platform}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-code-branch"></i> Kernel:</span>
                <span>${system.kernel}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-microchip"></i> Architecture:</span>
                <span>${system.architecture || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-clock"></i> Uptime:</span>
                <span>${system.uptime}</span>
            </div>
            <div class="info-item">
                <span><i class="fas fa-power-off"></i> Boot Time:</span>
                <span>${new Date(system.boot_time).toLocaleString()}</span>
            </div>
        `;

        if (system.load_avg) {
            html += `
                <div class="info-item">
                    <span><i class="fas fa-chart-line"></i> Load Average:</span>
                    <span>${system.load_avg[0].toFixed(2)}, ${system.load_avg[1].toFixed(2)}, ${system.load_avg[2].toFixed(2)}</span>
                </div>
            `;
        }

        element.innerHTML = html;
    }

    updateDiskIO(diskIO) {
        const element = document.getElementById('disk-io-info');
        if (!element || diskIO.error) return;

        if (diskIO.read_speed_formatted && diskIO.write_speed_formatted) {
            element.innerHTML = `
                <div class="info-item">
                    <span><i class="fas fa-download"></i> Read Speed:</span>
                    <span>${diskIO.read_speed_formatted}</span>
                </div>
                <div class="info-item">
                    <span><i class="fas fa-upload"></i> Write Speed:</span>
                    <span>${diskIO.write_speed_formatted}</span>
                </div>
            `;
        } else {
            const readSpeed = diskIO.read_bytes / 1024 / 1024;
            const writeSpeed = diskIO.write_bytes / 1024 / 1024;

            element.innerHTML = `
                <div class="info-item">
                    <span><i class="fas fa-download"></i> Read Speed:</span>
                    <span>${readSpeed.toFixed(2)} MB/s</span>
                </div>
                <div class="info-item">
                    <span><i class="fas fa-upload"></i> Write Speed:</span>
                    <span>${writeSpeed.toFixed(2)} MB/s</span>
                </div>
            `;
        }
    }

    updateTemperatures(temps) {
        const element = document.getElementById('temp-info');
        if (!element || temps.error) return;

        let html = '';
        Object.entries(temps).forEach(([sensor, temp]) => {
            html += `
                <div class="info-item">
                    <span><i class="fas fa-thermometer-half"></i> ${sensor}:</span>
                    <span>${temp}°C</span>
                </div>
            `;
        });

        element.innerHTML = html || '<div class="info-item">No temperature data</div>';
    }

    updateProcesses(processes) {
        const element = document.getElementById('process-info');
        if (!element) return;

        let html = processes.slice(0, 5).map(proc => `
            <div class="info-item">
                <span><i class="fas fa-cog"></i> ${proc.name}:</span>
                <span>${proc.cpu_percent?.toFixed(1) || '0.0'}% CPU, ${proc.memory_mb ? proc.memory_mb.toFixed(1) + ' MB' : proc.memory_percent?.toFixed(1) + '% RAM'}</span>
            </div>
        `).join('');

        element.innerHTML = html || '<div class="info-item">No process data</div>';
    }

    // ==================== UTILITY METHODS ====================

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeButton(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
        this.charts.updateChartsTheme(newTheme);
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
    }

    toggleHighContrast() {
        const isHighContrast = document.documentElement.getAttribute('data-contrast') === 'high';

        if (isHighContrast) {
            document.documentElement.removeAttribute('data-contrast');
            showToast('High contrast mode disabled');
        } else {
            document.documentElement.setAttribute('data-contrast', 'high');
            showToast('High contrast mode enabled');
        }

        updateHighContrastButton();
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed:', err));
        }
    }
}

// Initialize the monitor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SystemMonitor();
});