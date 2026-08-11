import { Injectable, NgZone } from "@angular/core";
import { AuthProvider } from "./auth-provider";
import { AuthService } from "../auth.service";
import { firstValueFrom } from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class AndroidAuthProvider implements AuthProvider {
    // Stale compiler check trigger comment
    private biometricPromiseResolver: ((value: any) => void) | null = null;
    private biometricPromiseRejecter: ((reason: any) => void) | null = null;

    constructor(
        private authService: AuthService,
        private ngZone: NgZone
    ) {
        this.registerCallbacks();
    }

    private registerCallbacks(): void {
        window.AndroidCallbacks = {
            onBiometricLoginSuccess: (response: string) => {
                this.ngZone.run(() => {
                    console.log("[AndroidAuthProvider] Biometric Success:", response);
                    try {
                        const result = JSON.parse(response);
                        this.biometricPromiseResolver?.(result);
                    } catch (e) {
                        this.biometricPromiseRejecter?.(
                            new Error("Invalid biometric success payload")
                        );
                    } finally {
                        this.biometricPromiseResolver = null;
                        this.biometricPromiseRejecter = null;
                    }
                });
            },
            onBiometricLoginError: (error: string) => {
                this.ngZone.run(() => {
                    this.biometricPromiseRejecter?.(
                        new Error(error)
                    );
                    this.biometricPromiseResolver = null;
                    this.biometricPromiseRejecter = null;
                });
            }
        };
    }

    authenticateWithBiometric(): void {
        if (!window.AndroidBridge) {
            return;
        }
        window.AndroidBridge.authenticateWithBiometric?.();
    }

    async loginWithMpin(mpin: string): Promise<any> {
        console.log("[AndroidAuthProvider] loginWithMpin called with MPIN of length:", mpin?.length);
        const response = await firstValueFrom(
            this.authService.loginWithMPin(mpin)
        );
        console.log("[AndroidAuthProvider] loginWithMpin backend response success");
        try {
            console.log("[AndroidAuthProvider] Attempting to save MPIN locally...");
            await this.saveMpin(mpin);
            console.log("[AndroidAuthProvider] MPIN saved successfully");
        } catch (e) {
            console.error("[AndroidAuthProvider] Failed to automatically save MPIN:", e);
        }
        return response;
    }

    async loginWithStoredMpin(): Promise<any> {
        console.log("[AndroidAuthProvider] loginWithStoredMpin called");
        
        if (window.AndroidBridge) {
            console.log("[AndroidAuthProvider] window.AndroidBridge.isBiometricAvailable", window.AndroidBridge.isBiometricAvailable);
           
            console.log("[AndroidAuthProvider] window.AndroidBridge is available");
            console.log("[AndroidAuthProvider] Calling authenticateWithBiometric()1");
           
            if (typeof window.AndroidBridge.authenticateWithBiometric === 'function') {
                console.log("[AndroidAuthProvider] Calling AndroidBridge.authenticateWithBiometric()");
                if (this.biometricPromiseRejecter) {
                    this.biometricPromiseRejecter(new Error("Biometric flow cancelled by new request"));
                }
                return new Promise((resolve, reject) => {
                    this.biometricPromiseResolver = resolve;
                    this.biometricPromiseRejecter = reject;
                    window.AndroidBridge?.authenticateWithBiometric?.();
                });
            } else if (typeof window.AndroidBridge.loginWithStoredMpin === 'function') {
                console.log("[AndroidAuthProvider] Calling AndroidBridge.loginWithStoredMpin()");
                const response = window.AndroidBridge.loginWithStoredMpin() || '{}';
                console.log("[AndroidAuthProvider] Stored MPIN login response:", response);
                return JSON.parse(response);
            } else {
                console.warn("[AndroidAuthProvider] No login method found on AndroidBridge");
            }
        } else {
            console.warn("[AndroidAuthProvider] window.AndroidBridge is undefined");
        }
        throw new Error('AndroidBridge stored MPIN login is not available');
    }

    async saveMpin(mpin: string): Promise<void> {
        console.log("[AndroidAuthProvider] saveMpin called");
        if (window.AndroidBridge) {
            console.log("[AndroidAuthProvider] window.AndroidBridge is available");
            if (typeof window.AndroidBridge.saveMpin === 'function') {
                console.log("[AndroidAuthProvider] Calling AndroidBridge.saveMpin()");
                const result = window.AndroidBridge.saveMpin(mpin) || '';
                console.log("[AndroidAuthProvider] AndroidBridge.saveMpin response:", result);
                try {
                    const parsed = JSON.parse(result);
                    if (!parsed.success) {
                        console.error("[AndroidAuthProvider] Native saveMpin failed:", parsed.message);
                    }
                } catch (err) {
                    console.error("[AndroidAuthProvider] Error parsing saveMpin response:", err);
                }
            } else {
                console.warn("[AndroidAuthProvider] saveMpin is not a function on AndroidBridge");
            }
        } else {
            console.warn("[AndroidAuthProvider] window.AndroidBridge is undefined");
        }
    }

    async clearMpin(): Promise<void> {
        console.log("[AndroidAuthProvider] clearMpin called");
        if (window.AndroidBridge) {
            console.log("[AndroidAuthProvider] window.AndroidBridge is available");
            try {
                if (typeof window.AndroidBridge.clearMpin === 'function') {
                    console.log("[AndroidAuthProvider] Calling AndroidBridge.clearMpin()");
                    const result = window.AndroidBridge.clearMpin();
                    console.log("[AndroidAuthProvider] MPIN cleared successfully, response:", result);
                } else {
                    console.warn("[AndroidAuthProvider] clearMpin is not a function on AndroidBridge");
                }
            } catch (e) {
                console.error("[AndroidAuthProvider] Failed to clear MPIN on Android:", e);
            }
        } else {
            console.log("[AndroidAuthProvider] window.AndroidBridge is undefined, skipping clearMpin");
        }
    }

    async hasStoredMpin(): Promise<boolean> {
        console.log("[AndroidAuthProvider] hasStoredMpin called");
        if (window.AndroidBridge) {
            console.log("[AndroidAuthProvider] window.AndroidBridge is available");
            try {
                if (typeof window.AndroidBridge.hasStoredMpin === 'function') {
                    const result = window.AndroidBridge.hasStoredMpin();
                    console.log("[AndroidAuthProvider] AndroidBridge.hasStoredMpin() returned:", result);
                    return result;
                }
            } catch (e) {
                console.error("[AndroidAuthProvider] Error checking stored MPIN status:", e);
            }
        } else {
            console.log("[AndroidAuthProvider] window.AndroidBridge is undefined, returning false");
        }
        return false;
    }

    hasServerIp(): boolean {
        const bridge = window.AndroidBridge;
        if (bridge && typeof bridge.hasServerIp === 'function') {
            return bridge.hasServerIp();
        }
        return false;
    }

    getServerIp(): string {
        const bridge = window.AndroidBridge;
        if (bridge && typeof bridge.getServerIp === 'function') {
            return bridge.getServerIp();
        }
        return '';
    }

    saveServerIp(ip: string): boolean {
        const bridge = window.AndroidBridge;
        if (bridge && typeof bridge.saveServerIp === 'function') {
            return bridge.saveServerIp(ip);
        }
        return false;
    }

    reloadApplication(): void {
        const bridge = window.AndroidBridge;
        if (bridge && typeof bridge.reloadApplication === 'function') {
            bridge.reloadApplication();
        }
    }
}