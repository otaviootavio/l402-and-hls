import React, { useState } from 'react';
import { CheckCircle2, HelpCircle, Copy, ArrowLeft } from 'lucide-react';
import { useLNAP } from '../context/LNAPContext';

export function VerificationStep() {
  const { verifyAuth, paymentHash, setCurrentStep } = useLNAP();
  const [preimage, setPreimage] = useState('');
  const [showHelp, setShowHelp] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAuth(preimage);
  };

  const copyPaymentHash = () => {
    if (paymentHash) {
      navigator.clipboard.writeText(paymentHash);
    }
  };

  const goBack = () => {
    setCurrentStep(2);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">Payment Verification</h4>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          To verify your payment, please provide the payment preimage from your wallet's payment history.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">Payment Hash:</div>
          <button
            onClick={copyPaymentHash}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
          >
            <Copy className="w-4 h-4" />
            <span className="text-xs">Copy</span>
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 break-all text-sm font-mono text-gray-800 dark:text-gray-200">
          {paymentHash}
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <HelpCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              The preimage is a proof of payment. You can find it in your wallet's payment history after the payment is complete.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="preimage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Preimage
            </label>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            id="preimage"
            value={preimage}
            onChange={(e) => setPreimage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            placeholder="Enter payment preimage"
          />
          {showHelp && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>To find your payment preimage:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open your Lightning wallet</li>
                <li>Find this payment in your transaction history</li>
                <li>Look for "Preimage" or "Payment Proof"</li>
                <li>Copy and paste the preimage here</li>
              </ol>
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Verify</span>
          </button>
        </div>
      </form>
    </div>
  );
}