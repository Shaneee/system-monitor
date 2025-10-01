export class ChartManager {
    constructor(monitor) {
        this.monitor = monitor;
        this.cpuChart = null;
        this.memoryChart = null;
        this.networkChart = null;
        this.cpuHistory = [];
        this.chartsVisible = false;
    }

    setupCharts() {
        // CPU Usage Chart
        const cpuCtx = document.getElementById('cpu-chart')?.getContext('2d');
        if (cpuCtx) {
            this.cpuChart = new Chart(cpuCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU Usage %',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: this.getChartOptions('CPU Usage %')
            });
        }

        // Memory Usage Chart
        const memoryCtx = document.getElementById('memory-chart')?.getContext('2d');
        if (memoryCtx) {
            this.memoryChart = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: this.getChartOptions('Memory Usage %')
            });
        }

        // Network Usage Chart
        const networkCtx = document.getElementById('network-chart')?.getContext('2d');
        if (networkCtx) {
            this.networkChart = new Chart(networkCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Download MB/s',
                            data: [],
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Upload MB/s',
                            data: [],
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: this.getChartOptions('Network Usage')
            });
        }
    }

    getChartOptions(title) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                y: {
                    beginAtZero: true,
                    max: title.includes('Usage %') ? 100 : undefined,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            }
        };
    }

    updateCharts(data) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Update CPU Chart
        if (this.cpuChart && data.cpu) {
            this.updateChartData(this.cpuChart, timestamp, data.cpu.usage);
        }
        
        // Update Memory Chart
        if (this.memoryChart && data.memory) {
            this.updateChartData(this.memoryChart, timestamp, data.memory.percent);
        }
        
        // Update Network Chart
        if (this.networkChart && data.network) {
            const downloadMB = (data.network.current_recv || 0) / 1024 / 1024;
            const uploadMB = (data.network.current_sent || 0) / 1024 / 1024;
            
            this.networkChart.data.labels.push(timestamp);
            this.networkChart.data.datasets[0].data.push(downloadMB);
            this.networkChart.data.datasets[1].data.push(uploadMB);
            
            this.trimChartData(this.networkChart, 20);
            this.networkChart.update('none');
        }
    }

    updateChartData(chart, timestamp, value) {
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(value);
        this.trimChartData(chart, 20);
        chart.update('none');
    }

    trimChartData(chart, maxPoints) {
        if (chart.data.labels.length > maxPoints) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
    }

    updateCpuHistory(currentUsage) {
        this.cpuHistory.push(currentUsage);
        if (this.cpuHistory.length > 30) {
            this.cpuHistory.shift();
        }
    }

    createCpuHistoryGraph() {
        if (this.cpuHistory.length < 2) return '';
        const maxHistory = Math.max(...this.cpuHistory);
        return `
            <div class="cpu-history">
                ${this.cpuHistory.map((value, i) => {
                    const height = (value / maxHistory) * 80;
                    const left = (i / (this.cpuHistory.length - 1)) * 100;
                    return `<div class="cpu-history-line" style="left: ${left}%; height: ${height}px"></div>`;
                }).join('')}
            </div>
        `;
    }

    toggleCharts() {
        const chartsContainer = document.getElementById('charts-container');
        if (chartsContainer) {
            this.chartsVisible = !this.chartsVisible;
            chartsContainer.style.display = this.chartsVisible ? 'grid' : 'none';
            this.monitor.showToast(this.chartsVisible ? 'Charts enabled' : 'Charts disabled');
        }
    }

    updateChartsTheme(theme) {
        const isDark = theme === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        
        [this.cpuChart, this.memoryChart, this.networkChart].forEach(chart => {
            if (chart) {
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
                chart.options.scales.y.ticks.color = textColor;
                chart.options.plugins.legend.labels.color = textColor;
                chart.update();
            }
        });
    }
}