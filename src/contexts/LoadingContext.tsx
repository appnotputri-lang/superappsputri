import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { AppLoader, AppLoaderVariant } from '../components/ui/AppLoader';

export interface LoadingState {
  isLoading: boolean;
  message: string | undefined;
  variant: AppLoaderVariant;
}

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string | undefined;
  loadingVariant: AppLoaderVariant;
  startLoading: (message?: string, variant?: AppLoaderVariant) => number;
  stopLoading: (tokenId?: number) => void;
  showLoading: (message?: string, variant?: AppLoaderVariant) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: undefined,
    variant: 'fullscreen',
  });

  const activeTokensRef = useRef<Set<number>>(new Set());
  const tokenCounterRef = useRef<number>(0);

  const startLoading = useCallback((msg?: string, variant: AppLoaderVariant = 'page') => {
    tokenCounterRef.current += 1;
    const newTokenId = tokenCounterRef.current;
    activeTokensRef.current.add(newTokenId);

    setLoadingState({
      isLoading: true,
      message: msg,
      variant: variant,
    });

    return newTokenId;
  }, []);

  const stopLoading = useCallback((tokenId?: number) => {
    if (tokenId !== undefined) {
      activeTokensRef.current.delete(tokenId);
    } else {
      // If no token passed, clear all
      activeTokensRef.current.clear();
    }

    if (activeTokensRef.current.size === 0) {
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  const showLoading = useCallback((msg?: string, variant: AppLoaderVariant = 'page') => {
    startLoading(msg, variant);
  }, [startLoading]);

  const hideLoading = useCallback(() => {
    stopLoading();
  }, [stopLoading]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingState.isLoading,
        loadingMessage: loadingState.message,
        loadingVariant: loadingState.variant,
        startLoading,
        stopLoading,
        showLoading,
        hideLoading,
      }}
    >
      {children}
      <AppLoader
        isLoading={loadingState.isLoading}
        message={loadingState.message}
        variant={loadingState.variant}
        delayMs={350}
      />
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    return {
      isLoading: false,
      loadingMessage: undefined,
      loadingVariant: 'page',
      startLoading: () => 0,
      stopLoading: () => {},
      showLoading: () => {},
      hideLoading: () => {},
    };
  }
  return context;
};

export const useLoading = useGlobalLoading;
