import React from "react";
import { ShieldAlert, RotateCcw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };
  declare props: Readonly<{ children: React.ReactNode }>;

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(message);
      if (parsed && parsed.error && parsed.operationType) {
        message = `Firestore ${parsed.operationType} failed on "${parsed.path || "unknown"}": ${parsed.error}`;
      }
    } catch {
      // keep original message
    }
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-veteran-sand flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-serif font-bold text-veteran-navy">
              Portal Data Error
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-veteran-navy text-white text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reload Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
