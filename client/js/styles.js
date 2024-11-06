export const styles = `
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #1a1a1a;
        background: #f5f7fa;
        margin: 0;
        padding: 2rem;
    }

    .container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        padding: 2rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
    }

    h1 {
        font-size: 1.875rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
    }

    .status {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        background: #f9fafb;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
        transition: background-color 0.2s ease;
    }

    .button-container {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
    }

    button {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.875rem;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #3b82f6;
        color: white;
    }

    button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }

    .copy-button {
        background: #6b7280;
    }

    .copy-button:hover {
        background: #4b5563;
    }

    #paymentInfo {
        background: #f8fafc;
        border-radius: 12px;
        padding: 2rem;
        margin: 1.5rem 0;
    }

    #qrcode {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin: 1.5rem 0;
        display: flex;
        justify-content: center;
    }

    .invoice {
        background: #1a1a1a;
        color: #a5f3fc;
        padding: 1rem;
        border-radius: 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.75rem;
        overflow-wrap: break-word;
        margin: 1rem 0;
    }

    .input-container {
        margin: 1.5rem 0;
    }

    label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.2s ease;
        margin-bottom: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .message {
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .error {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fee2e2;
    }

    .success {
        background: #f0fdf4;
        color: #16a34a;
        border: 1px solid #dcfce7;
    }

    .debug-container {
        margin-top: 2rem;
        background: #1a1a1a;
        border-radius: 12px;
        overflow: hidden;
    }

    .debug-container:before {
        content: 'Debug Log';
        display: block;
        padding: 0.75rem 1rem;
        background: #2d3748;
        color: #e5e7eb;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .debug-entry {
        padding: 1rem;
        border-bottom: 1px solid #2d3748;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.75rem;
        line-height: 1.5;
    }

    .debug-timestamp {
        color: #6b7280;
        margin-right: 0.75rem;
    }

    .debug-type {
        color: #10b981;
        font-weight: 600;
        margin-right: 0.75rem;
        padding: 0.125rem 0.375rem;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 4px;
    }

    .debug-data {
        color: #93c5fd;
        margin: 0.5rem 0 0;
        padding: 0.5rem;
        background: rgba(147, 197, 253, 0.05);
        border-radius: 4px;
        overflow-x: auto;
    }

    @media (max-width: 640px) {
        body {
            padding: 1rem;
        }

        .container {
            padding: 1rem;
        }

        .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }

        .button-container {
            flex-direction: column;
        }

        button {
            width: 100%;
        }
    }
`;