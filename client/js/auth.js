import { logDebug } from './logger.js';
import { updateState } from './state.js';
import { showError } from './ui.js';

export function parseAuthHeader(header) {
    try {
        const macaroonMatch = header.match(/macaroon="([^"]+)"/);
        const invoiceMatch = header.match(/invoice="([^"]+)"/);
        
        if (!macaroonMatch || !invoiceMatch) {
            throw new Error('Invalid WWW-Authenticate header format');
        }

        return {
            macaroon: macaroonMatch[1],
            invoice: invoiceMatch[1]
        };
    } catch (error) {
        logDebug('auth-header-parse-error', { error: error.message, header });
        throw error;
    }
}

export function validatePreimage(value) {
    const preimageInput = document.getElementById('preimage');
    const verifyBtn = document.getElementById('verifyBtn');
    
    const trimmedValue = value.trim();
    const isValid = trimmedValue.length > 0;
    
    updateState({ currentPreimage: isValid ? trimmedValue : '' });
    verifyBtn.disabled = !isValid;
    
    logDebug('preimage-validation', {
        valid: isValid,
        length: trimmedValue.length
    });
    
    return isValid;
}