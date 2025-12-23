import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500 ${sizeClasses[size]} ${className}`}
    ></div>
  );
};

interface LoadingViewProps {
  message?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20">
      <Spinner size="lg" />
      <p className="mt-6 text-sm font-medium text-zinc-500">{message}</p>
    </div>
  );
};
