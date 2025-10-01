export class MobileManager {
    constructor(monitor) {
        this.monitor = monitor;
    }

    setupMobileOptimizations() {
        // Touch gestures for mobile
        let touchStartY = 0;
        let touchStartTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });
        
        document.addEventListener('touchmove', (e) => {
            const touchEndY = e.touches[0].clientY;
            const touchEndTime = Date.now();
            const distance = touchStartY - touchEndY;
            const time = touchEndTime - touchStartTime;
            
            // Pull to refresh (swipe down more than 100px in less than 500ms)
            if (distance > 100 && time < 500) {
                this.monitor.updateData();
                touchStartY = touchEndY; // Prevent multiple triggers
            }
        });
        
        // Adjust update interval for mobile to save battery
        if ('ontouchstart' in window) {
            this.monitor.updateInterval = Math.max(this.monitor.updateInterval, 5000);
            document.getElementById('refresh-interval').value = '5000';
        }
        
        // Touch-friendly card toggles
        document.querySelectorAll('.card-header').forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', (e) => {
                if (!e.target.closest('.card-toggle')) {
                    const card = header.closest('.card');
                    card.classList.toggle('collapsed');
                }
            });
        });
    }
}