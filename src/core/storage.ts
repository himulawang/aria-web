export class StorageService {
    static set(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    static get<T>(key: string): T | null {
        const item = localStorage.getItem(key);
        if (!item) return null;
        try {
            return JSON.parse(item) as T;
        } catch (e) {
            console.error(`Error parsing storage key ${key}:`, e);
            return null;
        }
    }

    static remove(key: string): void {
        localStorage.removeItem(key);
    }

    static clear(): void {
        localStorage.clear();
    }
}
