import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@app_reading_history';

export type HistoryEntry = {
    mangaId: string;
    mangaTitle: string;
    lastReadChapterId: string;
    lastReadChapterNumber: string;
    lastReadPageIndex: number;
    totalChapterPages: number;
    lastReadAt: number;
    type: 'manga';
    coverUrl: string;
};

export const getHistory = async (): Promise<HistoryEntry[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (jsonValue != null) {
            const history = JSON.parse(jsonValue) as HistoryEntry[];
            return history.sort((a, b) => b.lastReadAt - a.lastReadAt);
        }
        return [];
    } catch (e) {
        console.error("Error retrieving history:", e);
        return [];
    }
};

export const saveProgress = async (newEntry: Omit<HistoryEntry, 'lastReadAt' | 'type'> & { type?: 'manga' }) => {
    try {
        const currentHistory = await getHistory();

        const timestampedEntry: HistoryEntry = {
            ...newEntry,
            lastReadAt: Date.now(),
            type: newEntry.type || 'manga'
        };

        const existingIndex = currentHistory.findIndex(
            (item) => item.mangaId === newEntry.mangaId
        );

        let updatedHistory: HistoryEntry[];

        if (existingIndex > -1) {
            const historyWithoutOldEntry = [
                ...currentHistory.slice(0, existingIndex),
                ...currentHistory.slice(existingIndex + 1),
            ];
            updatedHistory = [timestampedEntry, ...historyWithoutOldEntry];
        } else {
            updatedHistory = [timestampedEntry, ...currentHistory];
        }

        const jsonValue = JSON.stringify(updatedHistory);
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, jsonValue);

    } catch (e) {
        console.error("Error saving progress:", e);
    }
};

export const deleteHistoryEntry = async (mangaId: string) => {
    try {
        const currentHistory = await getHistory();

        const updatedHistory = currentHistory.filter(item => item.mangaId !== mangaId);

        const jsonValue = JSON.stringify(updatedHistory);
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, jsonValue);
    } catch (e) {
        console.error("Error deleting history entry:", e);
    }
}

export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
        console.log("History cleared successfully.");
    } catch (e) {
        console.error("Error clearing history:", e);
    }
}