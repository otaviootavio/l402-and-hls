import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useLNAP } from '../context/LNAPContext';

const steps = [
  'Initialize Auth',
  'Pay Invoice',
  'Verify Payment',
  'Access Protected'
];

export function StepIndicator() {
  const { currentStep } = useLNAP();

  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-8 h-8 mb-2">
              {currentStep > index + 1 ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : currentStep === index + 1 ? (
                <Circle className="w-8 h-8 text-blue-500 animate-pulse" />
              ) : (
                <Circle className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <span className={`text-sm ${currentStep === index + 1 ? 'text-blue-500 font-medium' : 'text-gray-500'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="w-6 h-6 text-gray-300 mt-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}