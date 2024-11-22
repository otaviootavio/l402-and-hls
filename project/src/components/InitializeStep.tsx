import React from "react";
import { Zap } from "lucide-react";
import { useLNAP } from "../context/LNAPContext";

export function InitializeStep() {
  const { initAuth } = useLNAP();

  return (
    <div className="flex flex-col gap-2 text-center">
      <div>
        <button
          onClick={initAuth}
          className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm dark:shadow-blue-500/20"
        >
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Initialize Authentication</span>
          </div>
        </button>
      </div>
      <div className="text-center">
        <p className=" text-sm text-gray-600 dark:text-gray-400">
          Click to start the Lightning Network authentication process
        </p>
      </div>
    </div>
  );
}
