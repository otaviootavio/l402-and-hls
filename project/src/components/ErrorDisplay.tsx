import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLNAP } from '../context/LNAPContext';

export function ErrorDisplay() {
  const { error } = useLNAP();

  if (!error) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
        <span className="text-red-700">{error}</span>
      </div>
    </div>
  );
}