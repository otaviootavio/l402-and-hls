import { API_URL } from './config.js';
import { updateState, getMacaroon } from './state.js';
import { logDebug } from './logger.js';
import { parseAuthHeader } from './auth.js';
import { showError, showSuccess, showPaymentInfo, updateStatus } from './ui.js';

export async function requestAccess() {
    try {
        const response = await fetch(API_URL);
        logDebug('api-request', {
            url: API_URL,
            status: response.status
        });

        const data = await response.json();
        logDebug('api-response', data);

        if (response.status === 402 && data.paymentHash) {
            const authHeader = response.headers.get('WWW-Authenticate');
            if (!authHeader) {
                throw new Error('No WWW-Authenticate header received');
            }

            const { macaroon, invoice } = parseAuthHeader(authHeader);
            
            updateState({ currentMacaroon: macaroon });
            
            showPaymentInfo({
                price: data.price,
                description: data.description,
                invoice: invoice
            });
            
            updateStatus('Payment Required', false);
        } else {
            showError('Invalid response format');
        }
    } catch (error) {
        showError(`Request failed: ${error.message}`);
        logDebug('api-error', { error: error.message });
    }
}

export async function verifyPayment() {
    const preimage = document.getElementById('preimage').value.trim();
    const macaroon = getMacaroon();
    
    if (!macaroon || !preimage) {
        showError('Missing macaroon or preimage');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `L402 ${macaroon}:${preimage}`
            }
        });

        logDebug('verify-request', {
            url: API_URL,
            status: response.status,
            headers: {
                'Authorization': `L402 ${macaroon}:${preimage.substring(0, 10)}...`
            }
        });

        if (response.ok) {
            updateState({ isConnected: true });
            showSuccess('Payment verified successfully!');
            updateStatus('Connected', true);
            document.getElementById('paymentInfo').style.display = 'none';
        } else {
            const error = await response.json();
            showError(`Verification failed: ${error.message}`);
        }
    } catch (error) {
        showError(`Verification failed: ${error.message}`);
        logDebug('verify-error', { error: error.message });
    }
}