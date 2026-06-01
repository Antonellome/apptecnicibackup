import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode; // Aggiunto fallback per personalizzare UI di errore
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Aggiorna lo stato per mostrare la UI di fallback.
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Puoi anche loggare l'errore a un servizio di reportistica errori
    console.error("ErrorBoundary ha catturato un errore:", error, errorInfo);
    // Esempio: logErrorToMyService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Renderizza la UI di fallback personalizzata fornita tramite props
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
