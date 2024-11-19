import React, { useEffect, useState } from 'react';
import { Lock, Clock, AlertTriangle, History, TestTube } from 'lucide-react';
import { useLNAP } from '../context/LNAPContext';

interface LogEntry {
  timestamp: number;
  type: 'success' | 'error';
  message: string;
  status?: number;
  data?: any;
}

function TokenExpiryTimer({ expiresAt }: { expiresAt: number }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [progress, setProgress] = useState(100);
  const [isExpired, setIsExpired] = useState(false);
  const [initialDuration, setInitialDuration] = useState<number | null>(null);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const duration = expiresAt - now;
    setInitialDuration(duration);
  }, [expiresAt]);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const totalDuration = expiresAt - now;
      
      if (totalDuration <= 0) {
        setTimeLeft('Expired');
        setProgress(0);
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor(totalDuration / 60);
      const seconds = totalDuration % 60;
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);

      if (initialDuration !== null) {
        const progressPercent = (totalDuration / initialDuration) * 100;
        setProgress(Math.max(0, Math.min(100, progressPercent)));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [expiresAt, initialDuration]);

  const getProgressColor = () => {
    if (progress > 66) return 'bg-green-500 dark:bg-green-400';
    if (progress > 33) return 'bg-yellow-500 dark:bg-yellow-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <Clock className={`w-4 h-4 ${isExpired ? 'text-red-500' : ''}`} />
          <span className={`font-mono ${isExpired ? 'text-red-500 dark:text-red-400' : ''}`}>
            {timeLeft}
          </span>
        </div>
        <span className={`text-sm ${
          isExpired 
            ? 'text-red-500 dark:text-red-400' 
            : progress <= 33 
              ? 'text-red-500 dark:text-red-400'
              : progress <= 66 
                ? 'text-yellow-500 dark:text-yellow-400'
                : 'text-green-500 dark:text-green-400'
        }`}>
          {isExpired ? 'Token Expired' : 'Token Expiry'}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ease-linear ${getProgressColor()}`}
          style={{ 
            width: `${progress}%`,
            transition: 'width 100ms linear'
          }}
        />
      </div>
    </div>
  );
}

function ResponseLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">Response Log</h4>
      </div>
      <div className="space-y-3">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              log.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {log.type === 'success' ? (
                  <Lock className="w-4 h-4 text-green-500 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  log.type === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {log.status ? `${log.type === 'success' ? 'Success' : 'Error'} (${log.status})` : log.type}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className={`text-sm ${
              log.type === 'success'
                ? 'text-green-600 dark:text-green-300'
                : 'text-red-600 dark:text-red-300'
            }`}>
              {log.message}
            </p>
            {log.data && (
              <pre className="mt-2 p-2 text-xs font-mono bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto text-gray-700 dark:text-gray-300">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProtectedStep() {
  const { accessProtected, protectedData, token, metadata } = useLNAP();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleAccessProtected = async () => {
    const result = await accessProtected();
    setLogs(prev => [{
      timestamp: Date.now(),
      type: result.success ? 'success' : 'error',
      message: result.message,
      status: result.status,
      data: result.data
    }, ...prev]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-200">Authentication Details</h3>
        
        {metadata && (
          <div className="mb-6">
            <TokenExpiryTimer expiresAt={metadata.expiresAt} />
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Token:</div>
            <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 break-all text-sm font-mono text-gray-800 dark:text-gray-200">
              {token}
            </div>
          </div>
          
          {metadata && (
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Metadata:</div>
              <pre className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 text-sm font-mono overflow-auto text-gray-800 dark:text-gray-200">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleAccessProtected}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors shadow-sm dark:shadow-blue-500/20"
        >
          <TestTube className="w-5 h-5" />
          <span>Test Protected Resource Access</span>
        </button>
      </div>

      {logs.length > 0 && <ResponseLog logs={logs} />}
    </div>
  );
}