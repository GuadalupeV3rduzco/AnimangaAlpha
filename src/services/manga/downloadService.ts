import AsyncStorage from "@react-native-async-storage/async-storage";

const DOWNLOADS_STORAGE_KEY = 'MangaDexReader:DownloadedChapters'

export type DownloadedChapterEntry = {
    mangaId: string;
    mangaTitle: string;
    chapterId: string;
    chapterNumber: string;
    coverUrl: string;
    downloadedAt: Date;
    pageUrls: string[];
}

export async function saveChapterDownload(entry: Omit<DownloadedChapterEntry, 'downloadedAt'> & { pageUrls: string[] }): Promise<void> {
    try {
        const existingDownloads = await getDownloadedChapters();

        const newEntry: DownloadedChapterEntry = {
            ...entry,
            downloadedAt: new Date(),
        };

        const filteredDownloads = existingDownloads.filter(
            (d) => d.chapterId !== newEntry.chapterId
        );

        const updatedDownloads = [newEntry, ...filteredDownloads];

        await AsyncStorage.setItem(
            DOWNLOADS_STORAGE_KEY,
            JSON.stringify(updatedDownloads)
        );
        console.log(`Capítulo ${entry.chapterNumber} descargado.`);
    } catch (error) {
        console.error('Error saving chapter download:', error);
    }
}

export async function getDownloadedChapters(): Promise<DownloadedChapterEntry[]> {
    try {
        const jsonValue = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
        if (jsonValue != null) {
            const downloads: DownloadedChapterEntry[] = JSON.parse(jsonValue).map((item: any) => ({
                ...item,
                downloadedAt: new Date(item.downloadedAt),
            }));
            return downloads.sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime());
        }
        return [];
    } catch (error) {
        console.error('Error getting downloaded chapters:', error);
        return [];
    }
}

export async function getDownloadedChapterById(chapterId: string): Promise<DownloadedChapterEntry | undefined> {
    const downloads = await getDownloadedChapters();
    return downloads.find(d => d.chapterId === chapterId);
}