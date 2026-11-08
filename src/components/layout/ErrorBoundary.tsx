"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application Error:", error, info);
  }

  handleRetry = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-center text-slate-100"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500 border border-red-500/20">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            حدث خطأ غير متوقع
          </h1>
          <p className="max-w-md text-sm text-slate-400 leading-relaxed">
            نعتذر، حدثت مشكلة غير متوقعة أثناء تشغيل الواجهة. يمكنك إعادة تحميل
            الصفحة للمحاولة مجدداً.
          </p>
          <Button onClick={this.handleRetry} variant="primary">
            إعادة المحاولة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
