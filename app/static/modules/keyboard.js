export class KeyboardManager {
    constructor(monitor) {
        this.monitor = monitor;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only trigger if not in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'r':
                        e.preventDefault();
                        this.monitor.updateData(true);
                        break;
                    case 'e':
                        e.preventDefault();
                        this.monitor.exportData();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.monitor.toggleTheme();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.monitor.charts.toggleCharts();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.monitor.layout.toggleLayoutMode();
                        break;
                }
            }

            // Escape key
            if (e.key === 'Escape') {
                this.monitor.modals.closeModals();
                if (this.monitor.layout.isLayoutMode) {
                    this.monitor.layout.toggleLayoutMode();
                }
            }
        });
    }
}