import { LightningElement, api, track } from 'lwc';

export default class CustomToast extends LightningElement {
    @track showToast = false;
    @track title = '';
    @track message = '';
    @track variant = 'info'; // success, error, warning, info
    @track progress = 100;
    
    toastTimeout = null;
    progressInterval = null;
    duration = 7000; // 5 seconds default

    @api
    showNotification(title, message, variant = 'info', duration = 5000) {
        this.title = title;
        this.message = message;
        this.variant = variant;
        this.duration = duration;
        this.progress = 100;
        this.showToast = true;

        // Clear any existing timeouts
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        // Start progress bar animation
        this.startProgressAnimation();

        // Auto-hide after duration
        this.toastTimeout = setTimeout(() => {
            this.hideToast();
        }, this.duration);
    }

    startProgressAnimation() {
        const interval = 50; // Update every 50ms
        const decrement = (100 * interval) / this.duration;
        
        this.progressInterval = setInterval(() => {
            this.progress -= decrement;
            if (this.progress <= 0) {
                this.progress = 0;
                clearInterval(this.progressInterval);
            }
        }, interval);
    }

    closeToast() {
        this.hideToast();
    }

    hideToast() {
        this.showToast = false;
        this.progress = 100;
        
        // Clear timeouts
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }

    get toastClass() {
        return `toast toast-${this.variant} ${this.showToast ? 'toast-show' : ''}`;
    }

    get progressStyle() {
        return `width: ${this.progress}%`;
    }

    get isSuccess() {
        return this.variant === 'success';
    }

    get isError() {
        return this.variant === 'error';
    }

    get isWarning() {
        return this.variant === 'warning';
    }

    get isInfo() {
        return this.variant === 'info';
    }
}