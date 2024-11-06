export function logDebug(type, data) {
    const debugContainer = document.getElementById('debug-log');
    const timestamp = new Date().toISOString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'debug-entry';
    
    const logContent = `
        <span class="debug-timestamp">${timestamp}</span>
        <span class="debug-type">${type}</span>
        <pre class="debug-data">${JSON.stringify(data, null, 2)}</pre>
    `;
    
    logEntry.innerHTML = logContent;
    debugContainer.insertBefore(logEntry, debugContainer.firstChild);
    
    // Keep only last 50 entries
    const entries = debugContainer.getElementsByClassName('debug-entry');
    if (entries.length > 50) {
        debugContainer.removeChild(entries[entries.length - 1]);
    }
}