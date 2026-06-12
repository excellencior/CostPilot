// local-backup.ts
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalRepository } from './local-repository';

export interface BackupPayload {
    version: 1;
    timestamp: string;
    settings: Record<string, any>;
    categories: any[];
    transactions: any[];
}

const DB_KEY = 'costpilot_backup_db';
const HANDLE_KEY = 'costpilot_backup_dir_handle';
const NATIVE_BACKUP_DIR = 'CostPilot';

class LocalBackupService {
    private dirHandle: FileSystemDirectoryHandle | null = null;
    private db: IDBDatabase | null = null;

    constructor() {
        if (!Capacitor.isNativePlatform() && window.showDirectoryPicker) {
            this.initDB();
        }
    }

    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_KEY, 1);
            request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            request.onsuccess = (e: Event) => {
                this.db = (e.target as IDBOpenDBRequest).result;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    private async saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            const request = store.put(handle, HANDLE_KEY);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async loadHandle(): Promise<FileSystemDirectoryHandle | null> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('handles', 'readonly');
            const store = tx.objectStore('handles');
            const request = store.get(HANDLE_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async hasAccess(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) return true; // Mobile uses fixed App directory
        if (!window.showDirectoryPicker) return false; // Not supported on Firefox/Safari

        try {
            if (!this.dirHandle) {
                this.dirHandle = await this.loadHandle();
            }
            if (this.dirHandle) {
                const permission = await this.dirHandle.queryPermission({ mode: 'readwrite' });
                return permission === 'granted';
            }
            return false;
        } catch (e) {
            console.error('Error checking directory access:', e);
            return false;
        }
    }

    async requestPersistedPermission(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) return true;
        try {
            if (!this.dirHandle) {
                this.dirHandle = await this.loadHandle();
            }
            if (this.dirHandle) {
                const permission = await this.dirHandle.requestPermission({ mode: 'readwrite' });
                return permission === 'granted';
            }
            return false;
        } catch (e) {
            console.error('Error requesting persisted permission:', e);
            return false;
        }
    }

    async requestAccess(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) return true;
        if (!window.showDirectoryPicker) return false;

        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await this.saveHandle(this.dirHandle);
            return true;
        } catch (e) {
            console.error('User cancelled or error requesting access:', e);
            return false;
        }
    }

    getDirectoryName(): string | null {
        if (Capacitor.isNativePlatform()) return `Documents/${NATIVE_BACKUP_DIR}`;
        return this.dirHandle?.name || null;
    }

    private getMonthDir(now: Date = new Date()): string {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthName = monthNames[now.getMonth()];
        const yearYY = String(now.getFullYear()).substring(2);
        return `${monthName}-${yearYY}`;
    }

    private async ensureNativeDir(targetDate: Date = new Date()): Promise<void> {
        const monthPath = `${NATIVE_BACKUP_DIR}/${this.getMonthDir(targetDate)}`;
        try {
            await Filesystem.readdir({ path: monthPath, directory: Directory.Documents });
        } catch {
            await Filesystem.mkdir({ path: monthPath, directory: Directory.Documents, recursive: true });
        }
    }

    private generateFileName(targetDate: Date = new Date()): string {
        const date = targetDate.toISOString().split('T')[0];
        return `costpilot_backup_${date}.json`;
    }

    private generateNativePath(targetDate: Date = new Date()): string {
        return `${NATIVE_BACKUP_DIR}/${this.getMonthDir(targetDate)}/${this.generateFileName(targetDate)}`;
    }

    private buildPayload(targetDate: Date = new Date()): BackupPayload {
        const monthPrefix = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const allExpenses = Object.values(LocalRepository.getRawExpenses());
        const monthExpenses = allExpenses.filter(e => e.date && e.date.startsWith(monthPrefix));

        return {
            version: 1,
            timestamp: targetDate.toISOString(),
            settings: LocalRepository.getSettings(),
            categories: LocalRepository.getAllCategories(),
            transactions: monthExpenses
        };
    }

    async createBackup(targetDate: Date = new Date()): Promise<string> {
        const payload = this.buildPayload(targetDate);
        const jsonString = JSON.stringify(payload, null, 2);
        const fileName = this.generateFileName(targetDate);

        if (Capacitor.isNativePlatform()) {
            await this.ensureNativeDir(targetDate);
            await Filesystem.writeFile({
                path: this.generateNativePath(targetDate),
                data: jsonString,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
        } else {
            if (!await this.hasAccess()) {
                throw new Error('No directory access');
            }
            const monthDirName = this.getMonthDir(targetDate);
            const monthDirHandle = await this.dirHandle!.getDirectoryHandle(monthDirName, { create: true });
            const fileHandle = await monthDirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        }

        await this.pruneOldBackups();
        const currentHash = await this.getCurrentDataHash(targetDate);
        LocalRepository.updateSettings({ lastBackupDate: payload.timestamp, lastBackupHash: currentHash });
        return fileName;
    }

    async getCurrentDataHash(targetDate: Date = new Date()): Promise<string> {
        const payload = this.buildPayload(targetDate);
        const objToHash = {
            categories: payload.categories,
            transactions: payload.transactions,
            settings: { ...payload.settings, lastBackupDate: undefined, lastBackupHash: undefined }
        };
        const str = JSON.stringify(objToHash);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    async checkAndCreateMissingFinalBackups(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            if (!this.dirHandle) {
                this.dirHandle = await this.loadHandle();
            }
            if (!this.dirHandle) return;
            const permission = await this.dirHandle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') return;
        }

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const monthKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('costpilot_local_db_') && !key.endsWith('_migrated')) {
                const parts = key.split('_');
                const yyyymm = parts[parts.length - 1]; // e.g. "2026-03"
                if (yyyymm && yyyymm < currentMonthKey) {
                    monthKeys.push(yyyymm);
                }
            }
        }

        for (const yyyymm of monthKeys) {
            const [yearStr, monthStr] = yyyymm.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);

            // Calculate last day of this month
            const lastDay = new Date(year, month, 0).getDate();
            const targetDate = new Date(year, month - 1, lastDay, 23, 59, 0);

            const fileName = this.generateFileName(targetDate);
            const monthDirName = this.getMonthDir(targetDate);
            let exists = false;

            if (Capacitor.isNativePlatform()) {
                const path = `${NATIVE_BACKUP_DIR}/${monthDirName}/${fileName}`;
                try {
                    await Filesystem.stat({ path, directory: Directory.Documents });
                    exists = true;
                } catch {
                    exists = false;
                }
            } else {
                try {
                    const monthDirHandle = await this.dirHandle!.getDirectoryHandle(monthDirName, { create: false });
                    await monthDirHandle.getFileHandle(fileName, { create: false });
                    exists = true;
                } catch {
                    exists = false;
                }
            }

            if (!exists) {
                console.log(`Creating missing final backup for past month ${monthDirName}...`);
                try {
                    await this.createBackup(targetDate);
                } catch (e) {
                    console.error(`Failed to create retrospective backup for ${monthDirName}:`, e);
                }
            }
        }
    }

    async restoreBackup(file: File): Promise<{ newTransactions: any[], newCategoriesCount: number }> {
        try {
            const payload = await this.parseBackupFile(file);
            
            if (payload.version !== 1 || !payload.transactions || !payload.categories || !payload.settings) {
                throw new Error("Invalid backup file format");
            }

            // Merge transactions (grouped by month and saved to their respective keys)
            const backupTransactions = payload.transactions || [];
            const addedTransactions: any[] = [];
            const transactionsByMonth: Record<string, any[]> = {};

            backupTransactions.forEach((t: any) => {
                if (t && t.date) {
                    const monthKey = t.date.substring(0, 7);
                    if (!transactionsByMonth[monthKey]) {
                        transactionsByMonth[monthKey] = [];
                    }
                    transactionsByMonth[monthKey].push(t);
                }
            });

            Object.entries(transactionsByMonth).forEach(([monthKey, tList]) => {
                const storageKey = `costpilot_local_db_${monthKey}`;
                const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');

                tList.forEach((t: any) => {
                    const existing = currentData[t.id];
                    if (!existing) {
                        currentData[t.id] = t;
                        addedTransactions.push(t);
                    } else if (existing.deleted && !t.deleted) {
                        // Revive deleted item if it's active in the backup
                        currentData[t.id] = { ...t, deleted: false };
                        addedTransactions.push(currentData[t.id]);
                    }
                });

                localStorage.setItem(storageKey, JSON.stringify(currentData));
            });

            // Merge categories (stored as map/object in costpilot_local_categories)
            const currentCatData = JSON.parse(localStorage.getItem('costpilot_local_categories') || '{}');
            const backupCategories = payload.categories;
            const categoryNames = new Set(Object.values(currentCatData).map((c: any) => (c as any).name.toUpperCase()));
            let mergedCatCount = 0;

            backupCategories.forEach((c: any) => {
                const existing = currentCatData[c.id];
                if (!existing && !categoryNames.has(c.name.toUpperCase())) {
                    currentCatData[c.id] = c;
                    mergedCatCount++;
                } else if (existing && existing.deleted && !c.deleted) {
                    // Revive deleted category
                    currentCatData[c.id] = { ...c, deleted: false };
                    mergedCatCount++;
                }
            });

            localStorage.setItem('costpilot_local_categories', JSON.stringify(currentCatData));

            // Dispatch event for App to reload
            window.dispatchEvent(new Event('costpilot-settings-updated'));

            return {
                newTransactions: addedTransactions,
                newCategoriesCount: mergedCatCount
            };
        } catch (err) {
            throw err;
        }
    }

    async parseBackupFile(file: File): Promise<BackupPayload> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const payload = JSON.parse(content) as BackupPayload;
                    resolve(payload);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    async pruneOldBackups(retentionDays = 30): Promise<void> {
        // Keep all backup files as requested: make this a no-op
        return;
    }

    async getMostRecentBackup(): Promise<File | null> {
        try {
            if (Capacitor.isNativePlatform()) {
                // Scan all month subdirectories to find the most recent backup
                const topLevel = await Filesystem.readdir({
                    path: NATIVE_BACKUP_DIR,
                    directory: Directory.Documents
                });

                let latestFilePath: string | null = null;
                let latestFileName: string | null = null;
                let latestDate = 0;

                for (const monthEntry of topLevel.files) {
                    if (monthEntry.type === 'directory') {
                        const monthPath = `${NATIVE_BACKUP_DIR}/${monthEntry.name}`;
                        const monthFiles = await Filesystem.readdir({
                            path: monthPath,
                            directory: Directory.Documents
                        });

                        for (const file of monthFiles.files) {
                            if (file.name.startsWith('costpilot_backup_') && file.name.endsWith('.json')) {
                                const dateStr = file.name.replace('costpilot_backup_', '').replace('.json', '');
                                const fileDate = new Date(dateStr).getTime();
                                if (!isNaN(fileDate) && fileDate > latestDate) {
                                    latestDate = fileDate;
                                    latestFilePath = `${monthPath}/${file.name}`;
                                    latestFileName = file.name;
                                }
                            }
                        }
                    }
                }

                if (latestFilePath && latestFileName) {
                    const contentRes = await Filesystem.readFile({
                        path: latestFilePath,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8
                    });
                    const blob = new Blob([contentRes.data as string], { type: 'application/json' });
                    return new File([blob], latestFileName, { type: 'application/json' });
                }
                return null;
            } else {
                if (!await this.hasAccess()) return null;

                let latestFileHandle: FileSystemFileHandle | null = null;
                let latestDate = 0;

                // Scan subdirectories on Web
                for await (const entry of this.dirHandle!.values()) {
                    if (entry.kind === 'directory') {
                        const subDirHandle = entry as FileSystemDirectoryHandle;
                        for await (const subEntry of subDirHandle.values()) {
                            if (subEntry.kind === 'file' && subEntry.name.startsWith('costpilot_backup_') && subEntry.name.endsWith('.json')) {
                                const dateStr = subEntry.name.replace('costpilot_backup_', '').replace('.json', '');
                                const fileDate = new Date(dateStr).getTime();
                                if (!isNaN(fileDate) && fileDate > latestDate) {
                                    latestDate = fileDate;
                                    latestFileHandle = subEntry as FileSystemFileHandle;
                                }
                            }
                        }
                    }
                }

                if (latestFileHandle) {
                    return await latestFileHandle.getFile();
                }
                return null;
            }
        } catch (e) {
            console.error('Error finding recent backup:', e);
            return null;
        }
    }

    getMonthDirFromKey(monthKey: string): string {
        const [yearStr, monthStr] = monthKey.split('-');
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthIndex = parseInt(monthStr, 10) - 1;
        const monthName = monthNames[monthIndex] || 'January';
        const yearYY = yearStr.substring(2);
        return `${monthName}-${yearYY}`;
    }

    async getBackupTransactionsForMonth(monthKey: string): Promise<any[] | null> {
        try {
            const monthDir = this.getMonthDirFromKey(monthKey);
            if (Capacitor.isNativePlatform()) {
                const monthPath = `${NATIVE_BACKUP_DIR}/${monthDir}`;
                const monthFiles = await Filesystem.readdir({
                    path: monthPath,
                    directory: Directory.Documents
                });

                let latestFileName: string | null = null;
                let latestDate = 0;

                for (const file of monthFiles.files) {
                    if (file.name.startsWith('costpilot_backup_') && file.name.endsWith('.json')) {
                        const dateStr = file.name.replace('costpilot_backup_', '').replace('.json', '');
                        const fileDate = new Date(dateStr).getTime();
                        if (!isNaN(fileDate) && fileDate > latestDate) {
                            latestDate = fileDate;
                            latestFileName = file.name;
                        }
                    }
                }

                if (latestFileName) {
                    const contentRes = await Filesystem.readFile({
                        path: `${monthPath}/${latestFileName}`,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8
                    });
                    const payload = JSON.parse(contentRes.data as string);
                    return payload.transactions || [];
                }
                return null;
            } else {
                if (!await this.hasAccess()) return null;

                try {
                    const subDirHandle = await this.dirHandle!.getDirectoryHandle(monthDir, { create: false });
                    let latestFileHandle: FileSystemFileHandle | null = null;
                    let latestDate = 0;

                    for await (const entry of subDirHandle.values()) {
                        if (entry.kind === 'file' && entry.name.startsWith('costpilot_backup_') && entry.name.endsWith('.json')) {
                            const dateStr = entry.name.replace('costpilot_backup_', '').replace('.json', '');
                            const fileDate = new Date(dateStr).getTime();
                            if (!isNaN(fileDate) && fileDate > latestDate) {
                                latestDate = fileDate;
                                latestFileHandle = entry as FileSystemFileHandle;
                            }
                        }
                    }

                    if (latestFileHandle) {
                        const file = await latestFileHandle.getFile();
                        const text = await file.text();
                        const payload = JSON.parse(text);
                        return payload.transactions || [];
                    }
                } catch {
                    return null;
                }
                return null;
            }
        } catch (e) {
            console.error(`Error loading backup transactions for ${monthKey}:`, e);
            return null;
        }
    }

    async getAvailableBackupMonths(): Promise<{ monthKey: string; year: number; month: number }[]> {
        const results: { monthKey: string; year: number; month: number }[] = [];
        try {
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            if (Capacitor.isNativePlatform()) {
                const topLevel = await Filesystem.readdir({
                    path: NATIVE_BACKUP_DIR,
                    directory: Directory.Documents
                });

                for (const entry of topLevel.files) {
                    if (entry.type === 'directory') {
                        const parts = entry.name.split('-');
                        if (parts.length === 2) {
                            const [mName, yYY] = parts;
                            const mIndex = monthNames.indexOf(mName);
                            if (mIndex !== -1) {
                                const year = 2000 + parseInt(yYY, 10);
                                const month = mIndex + 1;
                                const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                                results.push({ monthKey, year, month });
                            }
                        }
                    }
                }
            } else {
                if (!await this.hasAccess()) return [];

                for await (const entry of this.dirHandle!.values()) {
                    if (entry.kind === 'directory') {
                        const parts = entry.name.split('-');
                        if (parts.length === 2) {
                            const [mName, yYY] = parts;
                            const mIndex = monthNames.indexOf(mName);
                            if (mIndex !== -1) {
                                const year = 2000 + parseInt(yYY, 10);
                                const month = mIndex + 1;
                                const monthKey = `${year}-${String(month).padStart(2, '0')}`;
                                results.push({ monthKey, year, month });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error scanning backup directory for months:', e);
        }
        return results;
    }
}

export const localBackupService = new LocalBackupService();
