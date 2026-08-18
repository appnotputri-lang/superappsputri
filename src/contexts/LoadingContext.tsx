import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppLoader } from '../components/ui/AppLoader';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string | undefined;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);

  const showLoading = useCallback((msg?: string) => {
    setLoadingMessage(msg);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoading, hideLoading }}>
      {children}
      <AppLoader isLoading={isLoading} message={loadingMessage} delayMs={350} />
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      isLoading: false,
      loadingMessage: undefined,
      showLoading: () => {},
      hideLoading: () => {}
    };
  }
  return context;
};
