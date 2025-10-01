export class PerformanceMonitor {
    constructor(monitor) {
        this.monitor = monitor;
        this.performance = {
            loadTimes: [],
            memoryUsage: []
        };
    }

    startMonitoring() {
        const startTime = performance.now();
        
        // Monitor memory usage (if supported)
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // Convert to MB
            this.performance.memoryUsage.push(memoryUsage);
            
            // Keep only last 50 readings
            if (this.performance.memoryUsage.length > 50) {
                this.performance.memoryUsage.shift();
            }
            
            // Update UI
            const avgMemory = this.performance.memoryUsage.reduce((a, b) => a + b, 0) / this.performance.memoryUsage.length;
            document.getElementById('memory-usage').textContent = `Memory: ${avgMemory.toFixed(1)}MB`;
        }
        
        // Return function to calculate load time
        return () => {
            const loadTime = performance.now() - startTime;
            this.performance.loadTimes.push(loadTime);
            
            if (this.performance.loadTimes.length > 50) {
                this.performance.loadTimes.shift();
            }
            
            const avgLoadTime = this.performance.loadTimes.reduce((a, b) => a + b, 0) / this.performance.loadTimes.length;
            document.getElementById('load-time').textContent = `Load: ${avgLoadTime.toFixed(0)}ms`;
            
            // Warn if load time is consistently high
            if (avgLoadTime > 1000) {
                console.warn(`Slow data load: ${avgLoadTime.toFixed(0)}ms`);
            }
        };
    }
}