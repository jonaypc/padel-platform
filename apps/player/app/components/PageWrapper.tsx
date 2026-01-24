"use client";

import { ReactNode } from "react";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";

interface PageWrapperProps {
  children: ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-900 pb-20 overflow-x-hidden">
      <AppHeader />
      <div className="max-w-md mx-auto px-4 py-6 w-full overflow-x-hidden">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
