import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { useLNAP } from '../context/LNAPContext';

export function PaymentStep() {
  const { invoice, setCurrentStep } = useLNAP();
  
  const copyToClipboard = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice);
    }
  };

  const openInWallet = () => {
    if (invoice) {
      window.location.href = `lightning:${invoice}`;
    }
  };

  const proceedToVerification = () => {
    setCurrentStep(3);
  };

  if (!invoice) return null;

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <QRCodeSVG 
          value={invoice} 
          size={200} 
          includeMargin 
          bgColor="transparent"
          fgColor="currentColor"
          className="text-black dark:text-white" 
        />
      </div>
      
      <div className="w-full max-w-md space-y-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Lightning Invoice:</div>
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 break-all text-sm font-mono text-gray-800 dark:text-gray-200">
          {invoice}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row w-full max-w-md space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={copyToClipboard}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy Invoice</span>
        </button>
        
        <button
          onClick={openInWallet}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in Wallet</span>
        </button>
      </div>

      <div className="w-full max-w-md p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">Payment Instructions</h4>
        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal ml-4">
          <li>Pay the invoice using your Lightning wallet</li>
          <li>Click the button below to proceed to verification</li>
        </ol>
      </div>

      <button
        onClick={proceedToVerification}
        className="w-full max-w-md flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium"
      >
        <span>I've Paid</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}