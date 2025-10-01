FROM nvidia/cuda:11.8.0-base-ubuntu22.04

# Set version from build argument with default
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    GUNICORN_WORKERS=2 \
    GUNICORN_THREADS=4 \
    GUNICORN_TIMEOUT=120

# Add Unraid and OpenContainer labels
LABEL net.unraid.docker.name="system-monitor" \
      net.unraid.docker.description="System monitoring dashboard for Unraid" \
      net.unraid.docker.icon="https://cdn-icons-png.flaticon.com/512/148/148824.png" \
      org.opencontainers.image.title="System Monitor" \
      org.opencontainers.image.description="Real-time system monitoring dashboard" \
      org.opencontainers.image.url="https://github.com/shaneee/system-monitor" \
      org.opencontainers.image.vendor="Shaneee" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/shaneee/system-monitor"

# Install system dependencies - optimized layer caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
	procps \
	coreutils \
	util-linux \
    lm-sensors \
	smartmontools \
    pciutils \
    dmidecode \
    net-tools \
    hwinfo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create app directory
WORKDIR /app

# Copy requirements first for better layer caching
COPY app/requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy application files including the startup script
COPY app/ .

# Make the startup script executable
RUN sed -i 's/\r$//' start.sh && \
    chmod +x start.sh

# Create non-root user and set permissions
RUN useradd -m -r -s /bin/bash appuser && \
    chown -R appuser:appuser /app && \
    # Add appuser to video group for GPU access (if needed)
    usermod -a -G video appuser

USER appuser

# Expose port
EXPOSE 3000

# Health check (more robust with connection timeout)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f --connect-timeout 5 http://localhost:3000/health || exit 1

# Use the startup script
CMD ["./start.sh"]
