import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_STORAGE_KEY = '@app_watchlist';

export type WatchlistEntry = {
    mangaId: string;
    mangaTitle: string;
    coverUrl: string;
    addedAt: number;
    author?: string;
    status?: string;
    chapters?: number;
    score?: number;
    genres?: string[];
};


export const getWatchlist = async (): Promise<WatchlistEntry[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (jsonValue != null) {
            const watchlist = JSON.parse(jsonValue) as WatchlistEntry[];
            return watchlist.sort((a, b) => b.addedAt - a.addedAt);
        }
        return [];
    } catch (e) {
        console.error("Error retrieving watchlist:", e);
        return [];
    }
};


export const addToWatchlist = async (entry: Omit<WatchlistEntry, 'addedAt'>): Promise<void> => {
    try {
        const currentWatchlist = await getWatchlist();
        
        const exists = currentWatchlist.some(item => item.mangaId === entry.mangaId);
        if (exists) {
            console.log("Manga already in favorites.");
            return;
        }
        
        const newEntry: WatchlistEntry = {
            ...entry,
            addedAt: Date.now()
        };
        
        const updatedWatchlist = [newEntry, ...currentWatchlist];
        
        await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist));
        console.log("✅ Manga agregado a watchlist");
    } catch (e) {
        console.error("Error adding to watchlist:", e);
    }
};


export const removeFromWatchlist = async (mangaId: string): Promise<void> => {
    try {
        const currentWatchlist = await getWatchlist();
        const updatedWatchlist = currentWatchlist.filter(item => item.mangaId !== mangaId);
        
        await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist));
        console.log("✅ Manga removido de watchlist");
    } catch (e) {
        console.error("Error removing from watchlist:", e);
    }
};


export const isInWatchlist = async (mangaId: string): Promise<boolean> => {
    try {
        const watchlist = await getWatchlist();
        return watchlist.some(item => item.mangaId === mangaId);
    } catch (e) {
        console.error("Error checking watchlist:", e);
        return false;
    }
};


export const clearWatchlist = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(WATCHLIST_STORAGE_KEY);
        console.log("Watchlist cleared");
    } catch (e) {
        console.error("Error clearing watchlist:", e);
    }
};