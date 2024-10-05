import APIService from './APIService';

class VersionManager {
    private static instance: VersionManager;
    private updateCallback: (() => void) | null = null;

    private constructor() {
        // Simulate updating to a newer version after 5 seconds
        setTimeout(() => {
            APIService.updateAppVersion("1.2.0");
            if (this.updateCallback) {
                this.updateCallback();
            }
        }, 5000);
    }

    public static getInstance(): VersionManager {
        if (!VersionManager.instance) {
            VersionManager.instance = new VersionManager();
        }
        return VersionManager.instance;
    }

    public setUpdateCallback(callback: () => void): void {
        this.updateCallback = callback;
    }
}

export default VersionManager.getInstance();