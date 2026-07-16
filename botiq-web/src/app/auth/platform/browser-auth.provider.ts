import { Injectable } from "@angular/core";
import { AuthProvider } from "./auth-provider";
import { AuthService } from "../auth.service";
import { firstValueFrom } from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class BrowserAuthProvider implements AuthProvider {

    constructor(
        private authService: AuthService
    ) {
    }

    async loginWithMpin(mpin: string): Promise<any> {

        return firstValueFrom(
            this.authService.loginWithMPin(mpin)
        );

    }

    async hasStoredMpin(): Promise<boolean> {
        return false;
    }

    async loginWithStoredMpin(): Promise<any> {
        throw new Error(
            'Not supported'
        );
    }

    async saveMpin(mpin: string): Promise<void> {}

    async clearMpin(): Promise<void> {}
}