import { formatBytes } from './utils.js';
import { showToast } from './utils.js';

export class ExportManager {
    constructor(monitor) {
        this.monitor = monitor;
    }

    exportData() {
        if (!this.monitor.currentSystemData) {
            showToast('No data available to export', 'error');
            return;
        }

        const data = {
            timestamp: new Date().toISOString(),
            system: this.monitor.currentSystemData,
            cpu: this.monitor.currentCpuData,
            memory: this.monitor.currentMemoryData,
            gpu: this.monitor.currentGpuData,
            network: this.monitor.currentNetworkData,
            pools: this.monitor.currentPoolsData,
            diskIO: this.monitor.currentDiskIOData,
            temperatures: this.monitor.currentTempsData,
            processes: this.monitor.currentProcessesData
        };

        // Get current theme from the page
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const isHighContrast = document.documentElement.getAttribute('data-contrast') === 'high';

        const htmlContent = this.generateHTMLReport(data, currentTheme, isHighContrast);
        this.downloadHTML(htmlContent);
        showToast('HTML report exported successfully!', 'success');
    }

    generateHTMLReport(data, theme = 'dark', isHighContrast = false) {
        return `
<!DOCTYPE html>
<html lang="en" data-theme="${theme}" ${isHighContrast ? 'data-contrast="high"' : ''}>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Monitor Export - ${new Date().toLocaleString()}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* ===== CSS VARIABLES & THEMES ===== */
        :root {
            --primary-color: #2563eb;
            --secondary-color: #1e40af;
            --accent-color: #3b82f6;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            
            /* Dark theme (default) */
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-tertiary: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border-color: #334155;
            --card-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
            --hover-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
        }

        [data-theme="light"] {
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --card-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --hover-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* ===== BASE STYLES & RESET ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
            min-height: 100vh;
            padding: 24px;
            color: var(--text-primary);
            line-height: 1.6;
        }

        /* ===== EXPORT SPECIFIC STYLES ===== */
        .export-container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .export-header {
            text-align: center;
            margin-bottom: 32px;
            padding: 0;
        }

        .export-header h1 {
            font-size: 2.2em;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            letter-spacing: -0.02em;
        }

        .export-header h1 i {
            color: var(--accent-color);
            font-size: 1.1em;
        }

        .export-version {
            background: var(--bg-tertiary);
            padding: 6px 12px;
            border-radius: 16px;
            font-weight: 500;
            font-size: 0.85em;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            display: inline-block;
            margin: 16px 0;
        }

        .export-section {
            background: var(--bg-secondary);
            padding: 24px;
            border-radius: 16px;
            box-shadow: var(--card-shadow);
            border: 1px solid var(--border-color);
            margin-bottom: 24px;
        }

        .export-section h2 {
            color: var(--text-primary);
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.3em;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .export-section h2 i {
            color: var(--accent-color);
            font-size: 1.1em;
            width: 24px;
            text-align: center;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 12px;
        }

        .export-info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .export-info-item:last-child {
            border-bottom: none;
        }

        .export-label {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            color: var(--text-secondary);
            flex-shrink: 0;
            font-size: 0.95em;
        }

        .export-value {
            font-weight: 600;
            color: var(--text-primary);
            text-align: right;
            flex-shrink: 1;
            min-width: 0;
            font-size: 0.95em;
        }

        .export-label i {
            width: 18px;
            text-align: center;
            color: var(--accent-color);
            font-size: 0.9em;
        }

        /* Progress Bars */
        .progress-bar {
            background: var(--bg-tertiary);
            border-radius: 8px;
            height: 20px;
            margin: 16px 0;
            overflow: hidden;
            position: relative;
            border: 1px solid var(--border-color);
        }

        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
            position: relative;
        }

        .progress-cpu { background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%); }
        .progress-memory { background: linear-gradient(90deg, #10b981 0%, #34d399 100%); }
        .progress-disk { background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%); }
        .progress-gpu { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }

        /* GPU and Pool containers */
        .gpu-export, .pool-export {
            background: var(--bg-tertiary);
            padding: 20px;
            border-radius: 12px;
            margin: 16px 0;
            border-left: 4px solid var(--accent-color);
        }

        .gpu-export h3, .pool-export h3 {
            color: var(--text-primary);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Process items */
        .process-export {
            padding: 12px;
            background: var(--bg-tertiary);
            margin: 8px 0;
            border-radius: 8px;
            border-left: 3px solid var(--success-color);
        }

        .process-export strong {
            color: var(--text-primary);
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 20px 0;
            color: var(--text-muted);
            font-size: 0.9em;
            border-top: 1px solid var(--border-color);
            margin-top: 32px;
        }

        /* High Contrast Mode */
        [data-contrast="high"] {
            --bg-primary: #000000;
            --bg-secondary: #111111;
            --bg-tertiary: #222222;
            --text-primary: #ffffff;
            --text-secondary: #ffffff;
            --text-muted: #cccccc;
            --border-color: #444444;
            --primary-color: #ffffff;
            --accent-color: #ffffff;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            body {
                padding: 16px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .export-section {
                padding: 20px;
            }
            
            .export-header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="export-container">
        <div class="export-header">
            <h1><i class="fas fa-desktop"></i> System Monitor Export</h1>
            <div class="export-version">Exported on: ${new Date().toLocaleString()}</div>
            <p style="color: var(--text-muted);">Generated from: ${data.system.hostname || 'Unknown System'}</p>
        </div>

        ${this.generateSystemSection(data)}
        ${this.generateCPUSection(data)}
        ${this.generateMemorySection(data)}
        ${this.generateGPUSection(data)}
        ${this.generateNetworkSection(data)}
        ${this.generateDiskIOSection(data)}
        ${this.generatePoolsSection(data)}
        ${this.generateTemperaturesSection(data)}
        ${this.generateProcessesSection(data)}

        <footer class="footer">
            <p>System Monitor Export | ${new Date().toLocaleDateString()}</p>
        </footer>
    </div>
</body>
</html>`.trim();
    }

    generateSystemSection(data) {
        return `
<div class="export-section">
    <h2><i class="fas fa-info-circle"></i> System Information</h2>
    <div class="info-grid">
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-desktop"></i>Hostname</span>
            <span class="export-value">${data.system.hostname}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-server"></i>Platform</span>
            <span class="export-value">${data.system.platform}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-code-branch"></i>Kernel</span>
            <span class="export-value">${data.system.kernel}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-microchip"></i>Architecture</span>
            <span class="export-value">${data.system.architecture || 'N/A'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-clock"></i>Uptime</span>
            <span class="export-value">${data.system.uptime}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-power-off"></i>Boot Time</span>
            <span class="export-value">${new Date(data.system.boot_time).toLocaleString()}</span>
        </div>
        ${data.system.load_avg ? `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-chart-line"></i>Load Average</span>
            <span class="export-value">${data.system.load_avg[0].toFixed(2)}, ${data.system.load_avg[1].toFixed(2)}, ${data.system.load_avg[2].toFixed(2)}</span>
        </div>
        ` : ''}
    </div>
</div>`;
    }

    generateCPUSection(data) {
        return `
<div class="export-section">
    <h2><i class="fas fa-microchip"></i> CPU Information</h2>
    <div class="info-grid">
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-microchip"></i>Model</span>
            <span class="export-value">${data.cpu.name || 'Unknown'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-microchip"></i>Cores/Threads</span>
            <span class="export-value">${data.cpu.cores} / ${data.cpu.threads}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-tachometer-alt"></i>Frequency</span>
            <span class="export-value">${data.cpu.frequency ? (data.cpu.frequency / 1000).toFixed(2) + ' GHz' : 'N/A'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-thermometer-half"></i>Temperature</span>
            <span class="export-value">${data.cpu.temperature ? data.cpu.temperature + '°C' : 'N/A'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-chart-line"></i>Usage</span>
            <span class="export-value">${data.cpu.usage}%</span>
        </div>
    </div>
    <div class="progress-bar">
        <div class="progress-fill progress-cpu" style="width: ${data.cpu.usage}%"></div>
    </div>
</div>`;
    }

    generateMemorySection(data) {
        const total = data.memory.total;
        const systemPercent = total > 0 ? ((data.memory.system / total) * 100).toFixed(1) : 0;
        const vmPercent = total > 0 ? ((data.memory.vm / total) * 100).toFixed(1) : 0;
        const dockerPercent = total > 0 ? ((data.memory.docker / total) * 100).toFixed(1) : 0;
        const freePercent = total > 0 ? ((data.memory.free / total) * 100).toFixed(1) : 0;

        return `
<div class="export-section">
    <h2><i class="fas fa-memory"></i> Memory Information</h2>
    <div class="info-grid">
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-database"></i>Usable Size</span>
            <span class="export-value">${formatBytes(data.memory.total)}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-cogs"></i>System</span>
            <span class="export-value">${formatBytes(data.memory.system)} (${systemPercent}%)</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-server"></i>VM</span>
            <span class="export-value">${formatBytes(data.memory.vm)} (${vmPercent}%)</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-docker"></i>Docker</span>
            <span class="export-value">${formatBytes(data.memory.docker)} (${dockerPercent}%)</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-check-circle"></i>Free</span>
            <span class="export-value">${formatBytes(data.memory.free)} (${freePercent}%)</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-chart-line"></i>Total Usage</span>
            <span class="export-value">${data.memory.percent.toFixed(1)}%</span>
        </div>
        ${data.memory.swap_total > 0 ? `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-exchange-alt"></i>Swap</span>
            <span class="export-value">${formatBytes(data.memory.swap_used)} / ${formatBytes(data.memory.swap_total)} (${data.memory.swap_percent.toFixed(1)}%)</span>
        </div>
        ` : ''}
    </div>
    <div class="progress-bar">
        <div class="progress-fill progress-memory" style="width: ${data.memory.percent}%"></div>
    </div>
</div>`;
    }

    generateGPUSection(data) {
        if (!data.gpu || data.gpu.length === 0) return '';
        
        return `
<div class="export-section">
    <h2><i class="fas fa-video"></i> GPU Information</h2>
    ${data.gpu.map((gpu, index) => {
        const memory_percent = (gpu.memory_used / gpu.memory_total) * 100;
        return `
        <div class="gpu-export">
            <h3><i class="fas fa-microchip"></i> GPU ${index + 1}: ${gpu.name}</h3>
            <div class="info-grid">
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-tachometer-alt"></i>GPU Usage</span>
                    <span class="export-value">${gpu.utilization}%</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-memory"></i>Memory Usage</span>
                    <span class="export-value">${Math.round(gpu.memory_used)} MB / ${Math.round(gpu.memory_total)} MB (${memory_percent.toFixed(1)}%)</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-thermometer-half"></i>Temperature</span>
                    <span class="export-value">${gpu.temperature}°C</span>
                </div>
                ${gpu.driver_version ? `
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-code-branch"></i>Driver</span>
                    <span class="export-value">${gpu.driver_version}</span>
                </div>
                ` : ''}
                ${gpu.clock_graphics ? `
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-clock"></i>GPU Clock</span>
                    <span class="export-value">${gpu.clock_graphics} MHz</span>
                </div>
                ` : ''}
                ${gpu.power_draw ? `
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-bolt"></i>Power</span>
                    <span class="export-value">${gpu.power_draw}W / ${gpu.power_limit}W</span>
                </div>
                ` : ''}
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-gpu" style="width: ${gpu.utilization}%"></div>
            </div>
        </div>
        `;
    }).join('')}
</div>`;
    }

    generateNetworkSection(data) {
        const formatSpeed = (bytesPerSec) => {
            if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
            if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
            if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
            return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
        };

        return `
<div class="export-section">
    <h2><i class="fas fa-network-wired"></i> Network Information</h2>
    <div class="info-grid">
        ${data.network.active_interface ? `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-network-wired"></i>Interface</span>
            <span class="export-value">${data.network.active_interface.name}</span>
        </div>
        ${data.network.active_interface.ipv4 ? `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-globe"></i>IPv4</span>
            <span class="export-value">${data.network.active_interface.ipv4}</span>
        </div>
        ` : ''}
        ${data.network.active_interface.speed > 0 ? `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-tachometer-alt"></i>Speed</span>
            <span class="export-value">${data.network.active_interface.speed} Mbps</span>
        </div>
        ` : ''}
        ` : `
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-exclamation-triangle"></i>Interface</span>
            <span class="export-value">No active network interface found</span>
        </div>
        `}
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-upload"></i>Upload Speed</span>
            <span class="export-value">${formatSpeed(data.network.current_sent || 0)}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-download"></i>Download Speed</span>
            <span class="export-value">${formatSpeed(data.network.current_recv || 0)}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-arrow-up"></i>Total Sent</span>
            <span class="export-value">${formatBytes(data.network.bytes_sent)}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-arrow-down"></i>Total Received</span>
            <span class="export-value">${formatBytes(data.network.bytes_recv)}</span>
        </div>
    </div>
</div>`;
    }

    generateDiskIOSection(data) {
        return `
<div class="export-section">
    <h2><i class="fas fa-hdd"></i> Disk I/O</h2>
    <div class="info-grid">
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-download"></i>Read Speed</span>
            <span class="export-value">${data.diskIO.read_speed_formatted || 'N/A'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-upload"></i>Write Speed</span>
            <span class="export-value">${data.diskIO.write_speed_formatted || 'N/A'}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-download"></i>Total Read</span>
            <span class="export-value">${formatBytes(data.diskIO.read_bytes)}</span>
        </div>
        <div class="export-info-item">
            <span class="export-label"><i class="fas fa-upload"></i>Total Written</span>
            <span class="export-value">${formatBytes(data.diskIO.write_bytes)}</span>
        </div>
    </div>
</div>`;
    }

    generatePoolsSection(data) {
        if (!data.pools || data.pools.length === 0) return '';
        
        return `
<div class="export-section">
    <h2><i class="fas fa-database"></i> Storage Pools</h2>
    ${data.pools.map(pool => `
        <div class="pool-export">
            <h3><i class="fas fa-hdd"></i> ${pool.name}</h3>
            <div class="info-grid">
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-database"></i>Total</span>
                    <span class="export-value">${formatBytes(pool.total)}</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-hdd"></i>Used</span>
                    <span class="export-value">${formatBytes(pool.used)}</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-check-circle"></i>Free</span>
                    <span class="export-value">${formatBytes(pool.free)}</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-chart-line"></i>Usage</span>
                    <span class="export-value">${pool.percent.toFixed(1)}%</span>
                </div>
                <div class="export-info-item">
                    <span class="export-label"><i class="fas fa-cogs"></i>Filesystem</span>
                    <span class="export-value">${pool.fstype}</span>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-disk" style="width: ${pool.percent}%"></div>
            </div>
        </div>
    `).join('')}
</div>`;
    }

    generateTemperaturesSection(data) {
        if (!data.temperatures || Object.keys(data.temperatures).length === 0) return '';
        
        return `
<div class="export-section">
    <h2><i class="fas fa-thermometer-half"></i> Temperatures</h2>
    <div class="info-grid">
        ${Object.entries(data.temperatures).map(([sensor, temp]) => `
            <div class="export-info-item">
                <span class="export-label"><i class="fas fa-thermometer-half"></i>${sensor}</span>
                <span class="export-value">${temp}°C</span>
            </div>
        `).join('')}
    </div>
</div>`;
    }

    generateProcessesSection(data) {
        if (!data.processes || data.processes.length === 0) return '';
        
        return `
<div class="export-section">
    <h2><i class="fas fa-tasks"></i> Top Processes</h2>
    ${data.processes.slice(0, 10).map(proc => `
        <div class="process-export">
            <strong>${proc.name}</strong>: 
            ${proc.cpu_percent?.toFixed(1) || '0.0'}% CPU, 
            ${proc.memory_mb ? proc.memory_mb.toFixed(1) + ' MB' : proc.memory_percent?.toFixed(1) + '% RAM'}
        </div>
    `).join('')}
</div>`;
    }

    downloadHTML(htmlContent) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-monitor-export-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}