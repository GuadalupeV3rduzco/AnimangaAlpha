import { getHistory } from './historyService';


export async function isChapterRead(chapterId: string): Promise<boolean> {
    try {
        const history = await getHistory();
        const entry = history.find(h => h.lastReadChapterId === chapterId);
        
        if (!entry) return false;
        
        const progressPercentage = ((entry.lastReadPageIndex + 1) / entry.totalChapterPages) * 100;
        console.log(`📖 Capítulo ${chapterId}: ${progressPercentage.toFixed(1)}% Read`);
        return progressPercentage >= 80;
    } catch (error) {
        console.error('Error checking read status:', error);
        return false;
    }
}


export async function getReadChaptersForManga(mangaId: string): Promise<Map<string, boolean>> {
    try {
        const history = await getHistory();
        const readStatus = new Map<string, boolean>();
        const mangaEntries = history.filter(h => h.mangaId === mangaId);
        for (const entry of mangaEntries) {
            const progressPercentage = ((entry.lastReadPageIndex + 1) / entry.totalChapterPages) * 100;
            const isRead = progressPercentage >= 80;
            readStatus.set(entry.lastReadChapterId, isRead);
        }
        
        return readStatus;
    } catch (error) {
        console.error('Error getting read chapters:', error);
        return new Map();
    }
}


export async function getChapterProgress(chapterId: string): Promise<number> {
    try {
        const history = await getHistory();
        const entry = history.find(h => h.lastReadChapterId === chapterId);
        
        if (!entry) return 0;
        
        return ((entry.lastReadPageIndex + 1) / entry.totalChapterPages) * 100;
    } catch (error) {
        return 0;
    }
}