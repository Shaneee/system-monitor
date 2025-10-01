export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const displayDecimals = i >= 4 ? 1 : dm;
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(displayDecimals));
    return `${formatted} ${sizes[i]}`;
}

export function showToast(message, type = 'info') {
    const existingToast = document.getElementById('system-monitor-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'system-monitor-toast';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

export function updateThemeButton(theme) {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const icon = button.querySelector('i');
    const text = button.querySelector('span');

    if (!icon || !text) return;

    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        text.textContent = 'Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        text.textContent = 'Dark Mode';
    }
}

export function updateHighContrastButton() {
    const button = document.getElementById('high-contrast-toggle');
    if (!button) {
        console.warn('High contrast button not found');
        return;
    }

    const icon = button.querySelector('i');
    const text = button.querySelector('span');

    if (!icon || !text) {
        console.warn('Icon or text element not found in high contrast button');
        return;
    }

    const isHighContrast = document.documentElement.getAttribute('data-contrast') === 'high';

    if (isHighContrast) {
        icon.className = 'fas fa-adjust';
        text.textContent = 'Normal Contrast';
    } else {
        icon.className = 'fas fa-contrast';
        text.textContent = 'High Contrast';
    }
}

export function validateData(data) {
    const requiredSections = ['system', 'cpu', 'memory'];
    return requiredSections.every(section => 
        data[section] && !data[section].error && Object.keys(data[section]).length > 0
    );
}