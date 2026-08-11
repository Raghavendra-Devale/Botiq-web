interface Window {
  AndroidBridge?: {
    authenticateWithBiometric?: () => void;
    loginWithStoredMpin?: () => string;
    saveMpin?: (mpin: string) => string;
    clearMpin?: () => string;
    hasStoredMpin?: () => boolean;
    isBiometricAvailable?: () => boolean;
    hasServerIp?: () => boolean;
    getServerIp?: () => string;
    saveServerIp?: (ip: string) => boolean;
    reloadApplication?: () => void;
    [key: string]: any;
  };
  AndroidCallbacks?: {
    onBiometricLoginSuccess: (response: string) => void;
    onBiometricLoginError: (error: string) => void;
    [key: string]: any;
  };
}
