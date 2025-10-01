#!/usr/bin/env python3
import os
import json
import subprocess
import psutil
import socket
import platform
import re
import time
from datetime import datetime
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Add global variables for disk I/O speed calculation
prev_disk_io = None
prev_disk_io_time = None


def get_cpu_name():
    try:
        if os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if line.strip() and line.startswith("model name"):
                        cpu_name = line.split(":")[1].strip()
                        # Remove (R) and (TM) symbols and clean up extra spaces
                        cpu_name = cpu_name.replace('(R)', '®').replace('(TM)', '™')
                        # Alternative: Remove them completely instead of using symbols
                        # cpu_name = cpu_name.replace('(R)', '').replace('(TM)', '').strip()
                        # Clean up any double spaces that might result from removal
                        cpu_name = re.sub(r'\s+', ' ', cpu_name)
                        return cpu_name
        # Fallback to platform.processor() with same cleaning
        cpu_name = platform.processor()
        cpu_name = cpu_name.replace('(R)', '®').replace('(TM)', '™')
        cpu_name = re.sub(r'\s+', ' ', cpu_name)
        return cpu_name
    except:
        cpu_name = platform.processor()
        cpu_name = cpu_name.replace('(R)', '®').replace('(TM)', '™')
        cpu_name = re.sub(r'\s+', ' ', cpu_name)
        return cpu_name


def get_cpu_info():
    try:
        # Get per-core usage
        per_cpu = psutil.cpu_percent(interval=1, percpu=True)

        cpu_info = {
            "name": get_cpu_name(),
            "cores": psutil.cpu_count(logical=False),
            "threads": psutil.cpu_count(logical=True),
            "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else None,
            "load_avg": os.getloadavg() if hasattr(os, "getloadavg") else None,
            "temperature": get_cpu_temperature(),
            "usage": psutil.cpu_percent(interval=1),
            "per_cpu_usage": per_cpu,
        }
        return cpu_info
    except Exception as e:
        return {"error": str(e)}


def get_cpu_temperature():
    try:
        if hasattr(psutil, "sensors_temperatures"):
            temps = psutil.sensors_temperatures()
            for sensor in ["coretemp", "k10temp", "zenpower"]:
                if sensor in temps:
                    return max(
                        [
                            temp.current
                            for temp in temps[sensor]
                            if temp.current is not None
                        ]
                    )
        return None
    except:
        return None


def get_memory_info():
    try:
        # Read /proc/meminfo
        meminfo = {}
        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if ":" in line:
                        key, value = line.split(":", 1)
                        meminfo[key.strip()] = value.strip()
        except Exception as e:
            return {"error": f"Cannot read memory info: {e}"}

        # Convert all values from kB to bytes
        def get_mem_value(key, default=0):
            if key in meminfo:
                return int(meminfo[key].split()[0]) * 1024
            return default

        # Get values
        mem_total = get_mem_value("MemTotal")
        mem_free = get_mem_value("MemFree")
        buffers = get_mem_value("Buffers")
        cached = get_mem_value("Cached")
        sreclaimable = get_mem_value("SReclaimable")
        shmem = get_mem_value("Shmem")
        slab = get_mem_value("Slab")

        # Calculate like Unraid (approximation)
        # System = Buffers + Cached + SReclaimable
        system_mem = buffers + cached + sreclaimable

        # Docker memory approximation (part of slab memory)
        docker_mem = slab * 0.5  # Estimate 50% of slab is Docker

        # VM memory approximation (shared memory + some buffer)
        vm_mem = shmem * 1.5  # Estimate VM memory

        # Free memory
        actual_free = mem_free + buffers + cached + sreclaimable

        # Used memory
        actual_used = mem_total - actual_free

        # Percent
        percent = (actual_used / mem_total) * 100

        return {
            "total": mem_total,
            "free": actual_free,
            "used": actual_used,
            "percent": percent,
            "system": system_mem,
            "vm": vm_mem,
            "docker": docker_mem,
            "swap_total": get_mem_value("SwapTotal"),
            "swap_used": get_mem_value("SwapTotal") - get_mem_value("SwapFree"),
            "swap_free": get_mem_value("SwapFree"),
            "swap_percent": (
                (get_mem_value("SwapTotal") - get_mem_value("SwapFree"))
                / get_mem_value("SwapTotal")
            )
            * 100
            if get_mem_value("SwapTotal") > 0
            else 0,
        }

    except Exception as e:
        return {"error": str(e)}


def get_host_disk_usage(path):
    """Get disk usage from host filesystem using df"""
    try:
        # Use absolute path to ensure we're checking the host mount
        result = subprocess.run(
            ["df", "-B1", path], capture_output=True, text=True, timeout=5
        )

        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            if len(lines) > 1:
                parts = lines[1].split()
                if len(parts) >= 4:
                    return {
                        "total": int(parts[1]),
                        "used": int(parts[2]),
                        "available": int(parts[3]),
                        "percent": (int(parts[2]) / int(parts[1])) * 100
                        if int(parts[1]) > 0
                        else 0,
                    }
        return None
    except Exception as e:
        print(f"Error getting disk usage for {path}: {e}")
        return None


def get_host_filesystem_type(path):
    """Get filesystem type from host"""
    try:
        result = subprocess.run(
            ["df", "-T", path], capture_output=True, text=True, timeout=5
        )

        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            if len(lines) > 1:
                parts = lines[1].split()
                if len(parts) >= 2:
                    return parts[1].lower()
        return "unknown"
    except:
        return "unknown"


def is_valid_storage_pool(path, name):
    """Check if this is a valid storage pool (not system directory)"""
    # Exclude system directories and small partitions
    excluded_dirs = [
        "user0",
        "disks",
        "remotes",
        "addons",
        "plugins",
        "appdata",
        "domains",
        "system",
        "libvirt",
    ]

    if name.startswith(".") or name in excluded_dirs:
        return False

    # Check if it's a reasonable size for a storage pool (> 1GB)
    try:
        usage = get_host_disk_usage(path)
        if usage and usage["total"] < 1000000000:  # Less than 1GB
            return False
        return True
    except:
        return False


def get_pools_info():
    try:
        pools_info = []
        host_mnt_path = "/host/mnt"

        if os.path.exists(host_mnt_path):
            try:
                items = os.listdir(host_mnt_path)
                for item in items:
                    mount_path = os.path.join(host_mnt_path, item)

                    # Check if it's a directory and potentially a storage pool
                    if os.path.isdir(mount_path) and is_valid_storage_pool(
                        mount_path, item
                    ):
                        try:
                            disk_usage = get_host_disk_usage(mount_path)
                            if disk_usage and disk_usage["total"] > 0:
                                fs_type = get_host_filesystem_type(mount_path)

                                # Get friendly name
                                if item == "cache":
                                    pool_name = "Cache Pool"
                                elif item.startswith("disk"):
                                    pool_name = f'Disk {item.replace("disk", "")}'
                                else:
                                    pool_name = item.capitalize()

                                pools_info.append(
                                    {
                                        "name": pool_name,
                                        "mountpoint": f"/mnt/{item}",
                                        "fstype": fs_type,
                                        "total": disk_usage["total"],
                                        "used": disk_usage["used"],
                                        "free": disk_usage["available"],
                                        "percent": disk_usage["percent"],
                                    }
                                )

                        except (PermissionError, FileNotFoundError, OSError) as e:
                            print(f"Error processing {mount_path}: {e}")
                            continue
            except (PermissionError, OSError) as e:
                print(f"Error reading host mnt directory: {e}")

        # If no pools found in /host/mnt, try to detect from host's mounted filesystems
        if not pools_info:
            try:
                # Read host's mounted filesystems by checking /host/proc/mounts
                if os.path.exists("/host/proc/mounts"):
                    with open("/host/proc/mounts", "r") as f:
                        for line in f:
                            parts = line.split()
                            if len(parts) >= 3:
                                mount_point = parts[1]
                                fs_type = parts[2]

                                # Look for storage-like mount points
                                if (
                                    mount_point.startswith("/mnt/")
                                    and not any(
                                        x in mount_point
                                        for x in [
                                            "/mnt/user0",
                                            "/mnt/disks",
                                            "/mnt/remotes",
                                        ]
                                    )
                                    and fs_type
                                    not in [
                                        "autofs",
                                        "tmpfs",
                                        "devtmpfs",
                                        "sysfs",
                                        "proc",
                                    ]
                                ):

                                    disk_usage = get_host_disk_usage(mount_point)
                                    if (
                                        disk_usage and disk_usage["total"] > 1000000000
                                    ):  # >1GB
                                        pool_name = os.path.basename(mount_point)
                                        if pool_name == "cache":
                                            pool_name = "Cache Pool"
                                        elif pool_name.startswith("disk"):
                                            pool_name = (
                                                f'Disk {pool_name.replace("disk", "")}'
                                            )
                                        else:
                                            pool_name = pool_name.capitalize()

                                        pools_info.append(
                                            {
                                                "name": pool_name,
                                                "mountpoint": mount_point,
                                                "fstype": fs_type,
                                                "total": disk_usage["total"],
                                                "used": disk_usage["used"],
                                                "free": disk_usage["available"],
                                                "percent": disk_usage["percent"],
                                            }
                                        )
            except Exception as e:
                print(f"Error reading host mounts: {e}")

        return pools_info
    except Exception as e:
        print(f"Error getting pools info: {e}")
        return {"error": str(e)}


def get_gpu_info():
    try:
        # Use the simple query that was working before
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,temperature.gpu,utilization.gpu,memory.total,memory.used,memory.free,utilization.memory",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            gpus = []
            for line in result.stdout.strip().split("\n"):
                if line:
                    parts = line.split(", ")
                    if len(parts) >= 7:
                        gpu_data = {
                            "name": parts[0],
                            "temperature": float(parts[1]),
                            "utilization": float(parts[2]),
                            "memory_total": float(parts[3]),
                            "memory_used": float(parts[4]),
                            "memory_free": float(parts[5]),
                            "memory_utilization": float(parts[6]),
                        }

                        # Now add additional information with separate safe queries
                        try:
                            # Get driver version and PCI info
                            info_result = subprocess.run(
                                [
                                    "nvidia-smi",
                                    "--query-gpu=driver_version,pci.bus_id",
                                    "--format=csv,noheader,nounits",
                                ],
                                capture_output=True,
                                text=True,
                                timeout=5,
                            )

                            if info_result.returncode == 0:
                                info_parts = info_result.stdout.strip().split(", ")
                                if len(info_parts) >= 2:
                                    gpu_data["driver_version"] = info_parts[0]
                                    gpu_data["pci_bus"] = info_parts[1]
                        except:
                            pass

                        # Get clock speeds
                        try:
                            clock_result = subprocess.run(
                                [
                                    "nvidia-smi",
                                    "--query-gpu=clocks.gr,clocks.mem",
                                    "--format=csv,noheader,nounits",
                                ],
                                capture_output=True,
                                text=True,
                                timeout=5,
                            )

                            if clock_result.returncode == 0:
                                clock_parts = clock_result.stdout.strip().split(", ")
                                if len(clock_parts) >= 2:
                                    gpu_data["clock_graphics"] = float(clock_parts[0])
                                    gpu_data["clock_memory"] = float(clock_parts[1])
                        except:
                            pass

                        # Get power information
                        try:
                            power_result = subprocess.run(
                                [
                                    "nvidia-smi",
                                    "--query-gpu=power.draw,power.limit",
                                    "--format=csv,noheader,nounits",
                                ],
                                capture_output=True,
                                text=True,
                                timeout=5,
                            )

                            if power_result.returncode == 0:
                                power_parts = power_result.stdout.strip().split(", ")
                                if len(power_parts) >= 2:
                                    gpu_data["power_draw"] = float(power_parts[0])
                                    gpu_data["power_limit"] = float(power_parts[1])
                        except:
                            pass

                        # Get process count
                        try:
                            process_result = subprocess.run(
                                [
                                    "nvidia-smi",
                                    "--query-compute-apps=pid",
                                    "--format=csv,noheader",
                                ],
                                capture_output=True,
                                text=True,
                                timeout=5,
                            )

                            if process_result.returncode == 0:
                                processes = process_result.stdout.strip().split("\n")
                                gpu_data["process_count"] = len(
                                    [p for p in processes if p.strip()]
                                )
                            else:
                                gpu_data["process_count"] = 0
                        except:
                            gpu_data["process_count"] = 0

                        gpus.append(gpu_data)
            return gpus
        return []
    except (
        subprocess.TimeoutExpired,
        subprocess.CalledProcessError,
        FileNotFoundError,
    ):
        return []
    except Exception as e:
        print(f"Error in get_gpu_info: {e}")
        return []


def get_network_info():
    try:
        net_io = psutil.net_io_counters()
        net_if_addrs = psutil.net_if_addrs()
        net_if_stats = psutil.net_if_stats()

        # Find active physical interface (skip virtual/docker bridges)
        active_interface = None

        for interface, addrs in net_if_addrs.items():
            # Skip virtual/docker interfaces
            if (
                interface.startswith("docker")
                or interface.startswith("br-")
                or interface.startswith("veth")
                or interface == "lo"
                or interface.startswith("virbr")
            ):
                continue

            stats = net_if_stats.get(interface)
            if stats and stats.isup:
                ipv4_addrs = [
                    addr.address for addr in addrs if addr.family == socket.AF_INET
                ]

                interface_data = {
                    "name": interface,
                    "ipv4": ipv4_addrs[0] if ipv4_addrs else None,
                    "speed": stats.speed,
                    "mtu": stats.mtu,
                    "is_up": stats.isup,
                }

                # Prefer interfaces with IPv4 addresses and higher speed
                if interface_data["ipv4"] and (
                    active_interface is None
                    or stats.speed > active_interface.get("speed", 0)
                ):
                    active_interface = interface_data

        return {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "errors_in": net_io.errin,
            "errors_out": net_io.errout,
            "drops_in": net_io.dropin,
            "drops_out": net_io.dropout,
            "active_interface": active_interface,
            "current_sent": 0,
            "current_recv": 0,
        }
    except Exception as e:
        return {"error": str(e)}


def get_system_info():
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time

        # Convert uptime to human readable format
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if days > 0:
            uptime_str = f"{days}d {hours}h {minutes}m"
        else:
            uptime_str = f"{hours}h {minutes}m {seconds}s"

        # Get additional system information
        try:
            # CPU architecture
            arch = platform.machine()

            # System load averages
            load_avg = os.getloadavg() if hasattr(os, "getloadavg") else (0, 0, 0)

            return {
                "hostname": socket.gethostname(),
                "platform": platform.platform(),
                "architecture": arch,
                "boot_time": boot_time.isoformat(),
                "uptime": uptime_str,
                "kernel": platform.release(),
                "load_avg": load_avg,
            }

        except Exception as e:
            # Fallback to basic info if additional details fail
            return {
                "hostname": socket.gethostname(),
                "platform": platform.platform(),
                "boot_time": boot_time.isoformat(),
                "uptime": uptime_str,
                "kernel": platform.release(),
            }

    except Exception as e:
        return {"error": str(e)}


def format_speed(bytes_per_sec):
    """Convert bytes per second to human readable format"""
    if bytes_per_sec is None:
        return "0 B/s"

    # Convert to appropriate unit
    for unit in ["B/s", "KB/s", "MB/s", "GB/s"]:
        if bytes_per_sec < 1024.0:
            return f"{bytes_per_sec:.2f} {unit}"
        bytes_per_sec /= 1024.0
    return f"{bytes_per_sec:.2f} TB/s"


def get_disk_io_info():
    """Get disk I/O statistics with actual speed calculation"""
    global prev_disk_io, prev_disk_io_time

    try:
        disk_io = psutil.disk_io_counters()
        current_time = time.time()

        if disk_io and prev_disk_io and prev_disk_io_time:
            time_diff = current_time - prev_disk_io_time
            if time_diff > 0:
                read_speed = (disk_io.read_bytes - prev_disk_io.read_bytes) / time_diff
                write_speed = (
                    disk_io.write_bytes - prev_disk_io.write_bytes
                ) / time_diff
            else:
                read_speed = 0
                write_speed = 0
        else:
            read_speed = 0
            write_speed = 0

        # Update previous values
        prev_disk_io = disk_io
        prev_disk_io_time = current_time

        if disk_io:
            return {
                "read_bytes": disk_io.read_bytes,
                "write_bytes": disk_io.write_bytes,
                "read_count": disk_io.read_count,
                "write_count": disk_io.write_count,
                "read_time": disk_io.read_time,
                "write_time": disk_io.write_time,
                "read_speed": read_speed,
                "write_speed": write_speed,
                "read_speed_formatted": format_speed(read_speed),
                "write_speed_formatted": format_speed(write_speed),
            }
        return {"error": "No disk I/O counters available"}
    except Exception as e:
        print(f"Error getting disk I/O info: {e}")
        return {"error": "Disk I/O stats unavailable"}


def get_temperature_info():
    """Get all available temperature sensors with friendly names"""
    try:
        temps = psutil.sensors_temperatures()
        temperature_data = {}
        
        # Sensor name mappings for better readability
        sensor_names = {
            'coretemp': 'CPU',
            'k10temp': 'CPU',
            'zenpower': 'CPU',
            'nvme': 'NVMe Drive',
            'acpitz': 'System',
            'pch_skylake': 'Chipset',
            'iwlwifi': 'Wi-Fi',
            'amdgpu': 'GPU',
            'radeon': 'GPU',
            'nouveau': 'GPU'
        }
        
        # Get CPU and system temps from psutil
        for sensor, readings in temps.items():
            if readings:
                friendly_name = sensor_names.get(sensor, sensor.title())
                max_temp = max([reading.current for reading in readings if reading.current is not None])
                temperature_data[friendly_name] = max_temp
        
        # Get drive temperatures from Unraid's data
        drive_temps = get_drive_temperatures()
        temperature_data.update(drive_temps)
        
        return temperature_data
        
    except Exception as e:
        print(f"Error getting temperature info: {e}")
        return {"error": "Temperature sensors unavailable"}

def get_drive_temperatures():
    """Get drive temperatures from Unraid's disks.ini file"""
    drive_temps = {}
    
    disks_ini_path = '/host/var/local/emhttp/disks.ini'
    
    if not os.path.exists(disks_ini_path):
        return {}
    
    try:
        with open(disks_ini_path, 'r') as f:
            content = f.read()
        
        # Parse the INI-like format
        lines = content.split('\n')
        current_drive = None
        drive_data = {}
        
        for line in lines:
            line = line.strip()
            
            # Look for drive sections [drive_name]
            if line.startswith('[') and line.endswith(']'):
                # Save previous drive data if it has a temperature
                if current_drive and 'temp' in drive_data:
                    temp_value = drive_data['temp']
                    if temp_value != '*' and temp_value != '':
                        try:
                            temp = int(temp_value)
                            if 10 <= temp <= 100:  # Reasonable range
                                drive_temps[f"Drive {current_drive}"] = temp
                        except ValueError:
                            pass
                
                # Start new drive section
                current_drive = line[1:-1]  # Remove brackets
                drive_data = {}
            
            # Parse key=value pairs
            elif '=' in line and current_drive:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"')
                drive_data[key] = value
        
        # Don't forget the last drive
        if current_drive and 'temp' in drive_data:
            temp_value = drive_data['temp']
            if temp_value != '*' and temp_value != '':
                try:
                    temp = int(temp_value)
                    if 10 <= temp <= 100:
                        drive_temps[f"Drive {current_drive}"] = temp
                except ValueError:
                    pass
    
    except Exception as e:
        print(f"Error reading disks.ini: {e}")
    
    return drive_temps

def get_top_processes():
    """Get top processes from host using psutil with PROCFS_PATH"""
    
    def is_container_process(process_name):
        """Check if a process is related to containers or this app"""
        container_processes = [
            'gunicorn', 'python', 'flask', 'main.py',
            'docker', 'containerd', 'runc', 'containerd-shim',
            'system-monitor', 'monitor'
        ]
        
        process_lower = process_name.lower()
        return any(container_proc in process_lower for container_proc in container_processes)
    
    class HostProcessContext:
        def __enter__(self):
            self.original_procfs = getattr(psutil, 'PROCFS_PATH', '/proc')
            psutil.PROCFS_PATH = "/host/proc"
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            psutil.PROCFS_PATH = self.original_procfs
    
    try:
        with HostProcessContext():
            processes = []
            # Get all processes and calculate CPU usage more efficiently
            all_procs = []
            
            # First pass: collect all processes
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    all_procs.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
            
            # Small sleep for CPU percentage calculation
            time.sleep(0.1)
            
            # Second pass: get CPU and memory info, filter out container processes
            for proc in all_procs:
                try:
                    with proc.oneshot():
                        process_name = proc.name()
                        
                        # Skip container-related processes
                        if is_container_process(process_name):
                            continue
                            
                        cpu_percent = proc.cpu_percent(interval=0.0)
                        memory_info = proc.memory_info()
                        
                        processes.append({
                            'pid': proc.pid,
                            'name': process_name,
                            'cpu_percent': cpu_percent,
                            'memory_percent': proc.memory_percent(),
                            'memory_mb': memory_info.rss / 1024 / 1024
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
            
            # Sort by CPU usage and return top processes
            processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
            return processes[:10]
            
    except Exception as e:
        print(f"Error getting host processes: {e}")
        return []


@app.route("/")
def index():
    try:
        # Read version from version.json instead of environment variable
        with open("version.json", "r") as f:
            version_data = json.load(f)
        version = version_data.get("version", "1.0.0")
    except Exception as e:
        print(f"Error reading version.json: {e}")
        version = "1.0.0"  # Fallback
    
    return render_template("index.html", version=version)


@app.route("/version.json")
def version_info():
    try:
        with open("version.json", "r") as f:
            version_data = json.load(f)
    except FileNotFoundError:
        version_data = {
            "version": os.environ.get("CONTAINER_VERSION", "1.0.0"),
            "buildDate": datetime.now().isoformat(),
        }

    return jsonify(version_data)
    
   
@app.route("/test-css")
def test_css():
    """Test if CSS loads without JavaScript"""
    return """
    <html>
    <head>
        <link rel="stylesheet" href="/static/style.css">
        <title>CSS Test</title>
    </head>
    <body style="padding: 20px;">
        <h1>CSS Test Page</h1>
        <div class="card">
            <h2>Test Card</h2>
            <p>If this is styled, CSS is loading correctly.</p>
        </div>
        <button class="btn btn-primary">Test Button</button>
    </body>
    </html>
    """

@app.route("/test-js")
def test_js():
    """Test if JavaScript loads"""
    return """
    <html>
    <head>
        <title>JS Test</title>
    </head>
    <body>
        <h1>JavaScript Test</h1>
        <div id="test-output">JavaScript not loaded yet...</div>
        <script type="module">
            document.getElementById('test-output').textContent = 'JavaScript loaded successfully!';
            console.log('JavaScript test: OK');
        </script>
    </body>
    </html>
    """


import time
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from cachetools import TTLCache
import functools

# Custom TTL cache decorator
def ttl_cache(maxsize=128, ttl=300):
    def decorator(func):
        cache = TTLCache(maxsize=maxsize, ttl=ttl)

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            if key in cache:
                return cache[key]
            result = func(*args, **kwargs)
            cache[key] = result
            return result

        return wrapper

    return decorator


# Initialize limiter
limiter = Limiter(key_func=get_remote_address)
limiter.init_app(app)

# Add caching to expensive operations
@ttl_cache(maxsize=32, ttl=2)
def get_cached_system_info():
    return get_system_info()


@ttl_cache(maxsize=32, ttl=2)
def get_cached_memory_info():
    return get_memory_info()


@ttl_cache(maxsize=32, ttl=2)
def get_cached_cpu_info():
    return get_cpu_info()


@ttl_cache(maxsize=32, ttl=2)
def get_cached_gpu_info():
    return get_gpu_info()


@ttl_cache(maxsize=32, ttl=5)
def get_cached_pools_info():
    return get_pools_info()


@ttl_cache(maxsize=32, ttl=2)
def get_cached_network_info():
    return get_network_info()


@ttl_cache(maxsize=32, ttl=1)
def get_cached_disk_io():
    return get_disk_io_info()


@ttl_cache(maxsize=32, ttl=2)
def get_cached_temperatures():
    return get_temperature_info()


@ttl_cache(maxsize=32, ttl=5)
def get_cached_top_processes():
    return get_top_processes()


# Update API endpoints with caching and rate limiting
@app.route("/api/system-info")
@limiter.limit("10 per second")
def api_system_info():
    return jsonify(get_cached_system_info())


@app.route("/api/memory-info")
@limiter.limit("10 per second")
def api_memory_info():
    return jsonify(get_cached_memory_info())


@app.route("/api/cpu-info")
@limiter.limit("10 per second")
def api_cpu_info():
    return jsonify(get_cached_cpu_info())


@app.route("/api/gpu-info")
@limiter.limit("10 per second")
def api_gpu_info():
    return jsonify(get_cached_gpu_info())


@app.route("/api/pools")
@limiter.limit("5 per second")
def api_pools():
    return jsonify(get_cached_pools_info())


@app.route("/api/network")
@limiter.limit("5 per second")
def api_network():
    return jsonify(get_cached_network_info())


@app.route("/api/disk-io")
@limiter.limit("5 per second")
def api_disk_io():
    return jsonify(get_cached_disk_io())


@app.route("/api/temperatures")
@limiter.limit("5 per second")
def api_temperatures():
    return jsonify(get_cached_temperatures())


@app.route("/api/top-processes")
@limiter.limit("10 per second")
def api_top_processes():
    return jsonify(get_cached_top_processes())


@app.route("/health")
def health():
    try:
        # Read version from version.json
        with open("version.json", "r") as f:
            version_data = json.load(f)
        version = version_data.get("version", "1.0.0")
    except Exception as e:
        version = "1.0.0"  # Fallback
    
    return jsonify({"status": "healthy", "version": version})

if __name__ == "__main__":
    pass