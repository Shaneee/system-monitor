import { showToast } from './utils.js';

export class LayoutManager {
    constructor(monitor) {
        this.monitor = monitor;
        this.isLayoutMode = false;
    }

    setupCustomLayout() {
        this.makeSectionsDraggable();
        this.loadLayout();
    }

    makeSectionsDraggable() {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('dragover', this.handleDragOver.bind(this));
            card.addEventListener('drop', this.handleDrop.bind(this));
            card.addEventListener('dragenter', this.handleDragEnter.bind(this));
            card.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    }

    handleDragStart(e) {
        if (!this.isLayoutMode) return;
        
        e.dataTransfer.setData('text/plain', e.target.dataset.section);
        e.target.classList.add('dragging');
        setTimeout(() => e.target.style.opacity = '0.4', 0);
    }

    handleDragEnd(e) {
        if (!this.isLayoutMode) return;
        
        e.target.classList.remove('dragging');
        e.target.style.opacity = '1';
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drop-zone');
        });
    }

    handleDragOver(e) {
        if (!this.isLayoutMode) return;
        e.preventDefault();
    }

    handleDragEnter(e) {
        if (!this.isLayoutMode) return;
        e.preventDefault();
        e.target.closest('.card')?.classList.add('drop-zone');
    }

    handleDragLeave(e) {
        if (!this.isLayoutMode) return;
        e.target.closest('.card')?.classList.remove('drop-zone');
    }

    handleDrop(e) {
        if (!this.isLayoutMode) return;
        e.preventDefault();
        
        const draggedSection = e.dataTransfer.getData('text/plain');
        const targetCard = e.target.closest('.card');
        
        if (targetCard && draggedSection !== targetCard.dataset.section) {
            this.swapCards(draggedSection, targetCard.dataset.section);
            this.saveLayout();
        }
        
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('drop-zone');
        });
    }

    swapCards(section1, section2) {
        const card1 = document.querySelector(`[data-section="${section1}"]`);
        const card2 = document.querySelector(`[data-section="${section2}"]`);
        
        if (card1 && card2) {
            const temp = document.createElement('div');
            card1.parentNode.insertBefore(temp, card1);
            card2.parentNode.insertBefore(card1, card2);
            temp.parentNode.insertBefore(card2, temp);
            temp.parentNode.removeChild(temp);
        }
    }

    saveLayout() {
        const layout = Array.from(document.querySelectorAll('.card')).map(card => card.dataset.section);
        localStorage.setItem('dashboardLayout', JSON.stringify(layout));
    }

    loadLayout() {
        const savedLayout = localStorage.getItem('dashboardLayout');
        if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            const dashboard = document.getElementById('dashboard');
            
            layout.forEach(section => {
                const card = document.querySelector(`[data-section="${section}"]`);
                if (card) {
                    dashboard.appendChild(card);
                }
            });
        }
    }

    toggleLayoutMode() {
        this.isLayoutMode = !this.isLayoutMode;
        document.body.classList.toggle('layout-mode', this.isLayoutMode);
        showToast(this.isLayoutMode ? 'Layout mode enabled - drag to rearrange' : 'Layout mode disabled');
    }
}