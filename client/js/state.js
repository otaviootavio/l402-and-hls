// State management
const state = {
    currentMacaroon: '',
    currentPreimage: '',
    currentInvoice: '',
    isConnected: false
};

export function updateState(updates) {
    Object.assign(state, updates);
}

export function getState() {
    return { ...state };
}

export function getMacaroon() {
    return state.currentMacaroon;
}

export function getPreimage() {
    return state.currentPreimage;
}

export function getInvoice() {
    return state.currentInvoice;
}

export function isConnected() {
    return state.isConnected;
}