import { logDebug } from './logger.js';
import { updateState, getInvoice, getState } from './state.js';
import { QR_CONFIG } from './config.js';

export function showPaymentInfo(data) {
    document.getElementById('paymentInfo').style.display = 'block';
    document.getElementById('verifiedInfo').style.display = 'none';
    document.getElementById('amount').textContent = data.price || 0;
    document.getElementById('paymentDescription').textContent = data.description || '';
    document.getElementById('invoice').textContent = data.invoice;

    updateState({ currentInvoice: data.invoice });

    // Generate QR Code
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';
    
    if (window.QRCode) {
        try {
            new window.QRCode(qrcodeElement, {
                text: data.invoice,
                width: QR_CONFIG.width,
                height: QR_CONFIG.height,
                colorDark: QR_CONFIG.colorDark,
                colorLight: QR_CONFIG.colorLight,
                correctLevel: window.QRCode.CorrectLevel.M
            });
        } catch (error) {
            logDebug('qr-code-error', { error: error.message });
        }
    }

    logDebug('payment-info', {
        price: data.price,
        description: data.description,
        invoice: `${data.invoice.substring(0, 20)}...`
    });
}

export function updateStatus(message, isConnected = false) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = message;
    statusDot.style.backgroundColor = isConnected ? '#10B981' : '#DC2626';
    
    logDebug('status-update', { message, isConnected });
}

export function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
    
    logDebug('error-message', { message });
}

export function showSuccess(message) {
    const successDiv = document.getElementById('success');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    logDebug('success-message', { message });
}

export function copyInvoice() {
    const invoice = getInvoice();
    if (invoice) {
        navigator.clipboard.writeText(invoice)
            .then(() => {
                showSuccess('Invoice copied to clipboard');
                logDebug('invoice-copy', { success: true });
            })
            .catch(error => {
                showError('Failed to copy invoice');
                logDebug('invoice-copy', {
                    success: false,
                    error: error.message
                });
            });
    }
}

export function resetSession() {
    // Reset state
    updateState({
        currentMacaroon: '',
        currentPreimage: '',
        currentInvoice: '',
        isConnected: false
    });

    // Reset UI
    document.getElementById('paymentInfo').style.display = 'none';
    document.getElementById('verifiedInfo').style.display = 'none';
    document.getElementById('preimage').value = '';
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('accessBtn').style.display = 'block';
    document.getElementById('qrcode').innerHTML = '';
    
    // Reset status
    updateStatus('Not Connected', false);
    
    logDebug('session-reset', { timestamp: new Date().toISOString() });
}