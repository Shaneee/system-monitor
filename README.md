# System Monitor for Unraid

A real-time system monitoring dashboard designed specifically for Unraid servers.

## Features

- **📊 Real-time Monitoring**: Live updates every 2 seconds
- **🎮 NVIDIA GPU Support**: Monitor GPU usage, memory, temperature, and power
- **💾 Storage Pool Monitoring**: Track all your Unraid storage pools and usage
- **🌡️ Temperature Monitoring**: CPU, GPU, and drive temperatures
- **🔔 Smart Alerts**: Configurable thresholds with visual warnings
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🎨 Dark/Light Themes**: Choose your preferred theme
- **📈 Historical Charts**: View usage trends over time
- **📤 Data Export**: Export system data as HTML reports
- **⌨️ Keyboard Shortcuts**: Quick access to common actions

## Quick Start

### Installation via Community Applications (Recommended)

1. Open Unraid WebUI
2. Go to **Apps** → **Community Applications**
3. Search for "System Monitor"
4. Click **Install**
5. Keep all default settings
6. Click **Apply**

### Manual Installation

```bash
docker run -d \
  --name='system-monitor' \
  --net='host' \
  --privileged=true \
  -p 3000:3000 \
  -v '/proc':'/host/proc':'ro' \
  -v '/sys':'/host/sys':'ro' \
  -v '/mnt':'/host/mnt':'ro' \
  -v '/var':'/host/var':'ro' \
  --gpus all \
  shaneee/system-monitor:latest
  ```

## Access

After installation, access the dashboard at:

```http://your-unraid-ip:3000```

### GPU Support
### NVIDIA GPUs

 - Automatically enabled in the template
 - Requires NVIDIA drivers on Unraid
 - Shows GPU usage, memory, temperature, and power
 - Supports multiple GPUs

### Without NVIDIA GPU

 - GPU section will show "No GPUs detected"
 - All other monitoring functions work normally

### Monitoring Capabilities
### System Information

 - Hostname, platform, kernel version
 - Uptime and boot time
 - System architecture
 - Load averages

### CPU Monitoring

 - Usage percentage and per-core stats
 - Temperature monitoring
 - Frequency and model information
 - Historical usage charts

### Memory Monitoring

 - Total, used, and free memory
 - System, VM, and Docker memory breakdown
 - Swap usage
 - Real-time progress bars

### Storage Pools

 - All Unraid storage pools automatically detected
 - Usage percentages and free space
 - Filesystem types
 - Visual progress indicators

### Network

 - Active interface detection
 - Upload/download speeds
 - Total data transferred
 - IPv4 address display

### Temperatures

 - CPU temperatures
 - GPU temperatures
 - Drive temperatures (from Unraid's disks.ini)
 - Various system sensors

### Processes

 - Top processes by CPU usage
 - Memory consumption
 - Real-time process list

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + R` | Refresh data |
| `Ctrl/Cmd + E` | Export data |
| `Ctrl/Cmd + D` | Toggle dark/light mode |
| `Ctrl/Cmd + H` | Toggle charts |
| `Ctrl/Cmd + L` | Toggle layout mode |
| `Esc` | Close modals |

### Configuration
### Refresh Intervals

 - 1s: Real-time monitoring
 - 2s: Default (balanced)
 - 5s: Reduced load
 - 10s: Minimal impact

### Alert Thresholds

Configure custom thresholds for:

 - CPU Usage (default: 90%)
 - Memory Usage (default: 85%)
 - Temperature (default: 80°C)
 - Disk Usage (default: 90%)

### Themes

 - Dark: Default theme
 - Light: Light mode
 - High Contrast: Accessibility mode

### Data Export

Export comprehensive system reports as HTML:

 - Includes all monitoring data
 - Preserves current theme styling
 - Professional formatting
 - Perfect for documentation or troubleshooting

### Troubleshooting
No GPU Data

 - Ensure --gpus all is in Extra Parameters
 - Verify NVIDIA drivers are installed on Unraid
 - Check container is running in Privileged mode

No Storage Pool Data

 - Verify /mnt volume mapping is correct
 - Check pools are mounted in Unraid

No Temperature Data

 - Ensure /sys volume mapping is present
 - Some sensors may require specific kernel modules

Performance Issues

 - Increase refresh interval to 5s or 10s
 - Reduce number of monitored metrics in settings

### Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/shaneee/system-monitor/issues)
- **Unraid Forums**: [Community support](https://forums.unraid.net)

### License

MIT License - see LICENSE file for details
Credits

Created with ❤️ for the Unraid community

*Note: This container requires privileged access and host networking to properly monitor system resources. All data remains on your local network.*