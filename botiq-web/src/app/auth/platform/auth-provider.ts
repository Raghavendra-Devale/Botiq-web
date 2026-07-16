export interface AuthProvider {

    loginWithMpin(mpin: string): Promise<any>;

    hasStoredMpin(): Promise<boolean>;

    loginWithStoredMpin(): Promise<any>;

    saveMpin(mpin: string): Promise<void>;

    clearMpin(): Promise<void>;

}