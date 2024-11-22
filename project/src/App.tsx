import React from 'react';
import { Zap } from 'lucide-react';
import { LNAPProvider } from './context/LNAPContext';
import { StepIndicator } from './components/StepIndicator';
import { InitializeStep } from './components/InitializeStep';
import { PaymentStep } from './components/PaymentStep';
import { VerificationStep } from './components/VerificationStep';
import { ProtectedStep } from './components/ProtectedStep';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useLNAP } from './context/LNAPContext';

function LNAPDebugger() {
  const { currentStep, reset } = useLNAP();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Zap className="w-10 h-10 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LNAP Debug Client</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Lightning Network Authentication Protocol Testing Interface
          </p>
        </div>

        <ErrorDisplay />
        <StepIndicator />

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 mb-8">
          {currentStep === 1 && <InitializeStep />}
          {currentStep === 2 && <PaymentStep />}
          {currentStep === 3 && <VerificationStep />}
          {currentStep >= 4 && <ProtectedStep />}
        </div>

        <div className="text-center">
          <button
            onClick={reset}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
          >
            Reset Flow
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <LNAPProvider>
      <LNAPDebugger />
    </LNAPProvider>
  );
}

export default App;