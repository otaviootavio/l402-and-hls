# L402 Debug Client

A modern, interactive web client for testing and debugging L402 Lightning Network payment authentication flows. This client provides a comprehensive interface for interacting with L402-protected APIs, complete with real-time debugging information and QR code support for Lightning invoices.

## Features

- 🔄 Real-time API interaction
- ⚡ Lightning Network payment flow
- 📱 QR code generation for invoices
- 🔍 Detailed debug logging
- ✅ Payment verification
- 📋 Clipboard support for invoices
- 📱 Responsive design
- 🎨 Modern UI with dark mode debug console

## Project Structure

```
├── index.html              # Main HTML entry point
├── js/
│   ├── api.js             # API interaction logic
│   ├── auth.js            # Authentication handling
│   ├── config.js          # Configuration constants
│   ├── logger.js          # Debug logging functionality
│   ├── state.js           # State management
│   ├── styles.js          # CSS styles
│   └── ui.js              # UI components and interactions
```

## Quick Start

1. Configure your API endpoint in `js/config.js`:

```javascript
export const API_URL = "http://localhost:3000/test/pay";
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to the provided URL.

## Usage

1. Click "Request Access" to initiate the L402 payment flow
2. Scan the QR code or copy the invoice to your Lightning wallet
3. Make the payment
4. Copy the preimage from your wallet
5. Paste the preimage and click "Verify Payment"
6. Watch the debug console for detailed information about each step

## Debug Features

The client includes a comprehensive debug panel that shows:

- API requests and responses
- Authentication flow details
- Payment status updates
- Error messages
- State changes
- Timestamps for all events

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- Modern web browser

### Local Development

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```
