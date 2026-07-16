import { Injectable } from '@angular/core';
import { AuthProvider } from './auth/platform/auth-provider';
import { BrowserAuthProvider } from './auth/platform/browser-auth.provider';
import { AndroidAuthProvider } from './auth/platform/android-auth.provider';

@Injectable({
  providedIn: 'root',
})

export class PlatformAuthService {

    constructor(
        private browser: BrowserAuthProvider,
        private android: AndroidAuthProvider
    ) {}

    private get provider(): AuthProvider {
        if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
            return this.android;
        }
        return this.browser;
    }

    loginWithMpin(mpin: string) {
        return this.provider.loginWithMpin(mpin);
    }

    hasStoredMpin() {
        return this.provider.hasStoredMpin();
    }

    loginWithStoredMpin() {
        console.log("[PlatformAuthService] loginWithStoredMpin");
        return this.provider.loginWithStoredMpin();
    }

    saveMpin(mpin: string) {
        return this.provider.saveMpin(mpin);
    }

    clearMpin() {
        return this.provider.clearMpin();
    }

}