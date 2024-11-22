import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import type { AuthInitResponse, AuthVerifyResponse, ProtectedResponse } from '../types/lnap';

interface LNAPContextType {
  baseURL: string;
  setBaseURL: (url: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  invoice: string | null;
  paymentHash: string | null;
  token: string | null;
  metadata: any | null;
  protectedData: string | null;
  error: string | null;
  initAuth: () => Promise<void>;
  verifyAuth: (preimage: string) => Promise<void>;
  accessProtected: () => Promise<{
    success: boolean;
    message: string;
    status?: number;
    data?: any;
  }>;
  reset: () => void;
}

const LNAPContext = createContext<LNAPContextType | null>(null);

export function LNAPProvider({ children }: { children: ReactNode }) {
  const [baseURL, setBaseURL] = useState(import.meta.env.VITE_LN_URL_API);
  const [currentStep, setCurrentStep] = useState(1);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [protectedData, setProtectedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const reset = () => {
    setCurrentStep(1);
    setInvoice(null);
    setPaymentHash(null);
    setToken(null);
    setMetadata(null);
    setProtectedData(null);
    setError(null);
  };

  const initAuth = async () => {
    try {
      setError(null);
      const response = await api.get<AuthInitResponse>('/auth/init');
      setInvoice(response.data.invoice);
      setPaymentHash(response.data.paymentHash);
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
    }
  };

  const verifyAuth = async (preimage: string) => {
    try {
      setError(null);
      const response = await api.post<AuthVerifyResponse>('/auth/verify', {
        paymentHash,
        paymentPreimage: preimage,
      });
      setToken(response.data.token);
      setMetadata(response.data.metadata);
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payment');
    }
  };

  const accessProtected = async () => {
    try {
      const response = await api.get<ProtectedResponse>('/api/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      setProtectedData(response.data.message);
      return {
        success: true,
        message: response.data.message,
        status: response.status,
        data: response.data
      };
    } catch (err) {
      if (err instanceof AxiosError) {
        return {
          success: false,
          message: err.response?.data?.message || err.message,
          status: err.response?.status,
          data: err.response?.data
        };
      }
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        data: null
      };
    }
  };

  return (
    <LNAPContext.Provider
      value={{
        baseURL,
        setBaseURL,
        currentStep,
        setCurrentStep,
        invoice,
        paymentHash,
        token,
        metadata,
        protectedData,
        error,
        initAuth,
        verifyAuth,
        accessProtected,
        reset,
      }}
    >
      {children}
    </LNAPContext.Provider>
  );
}

export function useLNAP() {
  const context = useContext(LNAPContext);
  if (!context) {
    throw new Error('useLNAP must be used within a LNAPProvider');
  }
  return context;
}