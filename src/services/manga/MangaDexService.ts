import type { Manga } from '@/src/types/manga';
import { MANGA_APIS } from '../api/config';
import { HttpClient } from '../api/httpClient';

export class MangaDexService {
    private static baseUrl = MANGA_APIS.MANGADEX.url;

    static async getMangaById(mangaId: string): Promise<Manga | null> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga/${mangaId}?includes[]=cover_art&includes[]=author`
            );

            const chapterCount = await this.getChapterCount(mangaId);
            return this.transformMangaData(response.data, chapterCount);
        } catch (error) {
            console.error(`Error fetching manga ${mangaId}:`, error);
            return null;
        }
    }

    static async getMangaChaptersWithNames(mangaId: string, limit: number = 100): Promise<any[]> {
        try {
            const chapters = await this.getMangaChapters(mangaId, limit);

            return chapters.map((chapter: any, index: number) => {
                const chapterNumber = chapter.attributes?.chapter ||
                    chapter.chapter ||
                    (index + 1);

                const rawTitle = chapter.attributes?.title || chapter.title || '';

                let cleanTitle = rawTitle
                    .replace(/^Chapter\s+[\d.]+\s*[:\-]\s*/i, '')
                    .replace(/^Capítulo\s+[\d.]+\s*[:\-]\s*/i, '')
                    .replace(/^Chapter\s+[\d.]+\s*/i, '')
                    .replace(/^Capítulo\s+[\d.]+\s*/i, '')
                    .trim();

                let finalTitle = `Capítulo ${chapterNumber}`;

                if (cleanTitle && cleanTitle !== '') {
                    finalTitle = `Capítulo ${chapterNumber} - ${cleanTitle}`;
                }

                return {
                    ...chapter,
                    title: finalTitle,
                    chapter: chapterNumber,
                    number: chapterNumber
                };
            });

        } catch (error) {
            console.error(`Error fetching chapters for ${mangaId}:`, error);
            return [];
        }
    }

    static async getMangaChapters(mangaId: string, limit: number = 100): Promise<any[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga/${mangaId}/feed?limit=${limit}&translatedLanguage[]=en&order[chapter]=asc&includes[]=scanlation_group`
            );

            return response.data || [];
        } catch (error) {
            console.error(`Error fetching chapters for ${mangaId}:`, error);
            return [];
        }
    }

    static async getTopMangas(limit: number = 10): Promise<Manga[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga?limit=${limit}&order[rating]=desc&includes[]=cover_art`
            );

            const mangasWithChapters = await Promise.all(
                response.data.map(async (mangaData: any) => {
                    const chapterCount = await this.getChapterCount(mangaData.id);
                    return this.transformMangaData(mangaData, chapterCount);
                })
            );

            console.log('=== CAPÍTULOS ÚNICOS DE MANGADEX ===');
            mangasWithChapters.slice(0, 5).forEach((manga, index) => {
                console.log(`${index + 1}. ${manga.title}: ${manga.chapters} capítulos`);
            });

            return mangasWithChapters;
        } catch (error) {
            console.error('Error fetching top mangas:', error);
            return [];
        }
    }

    private static async getChapterCount(mangaId: string): Promise<number> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga/${mangaId}/aggregate?translatedLanguage[]=en`
            );

            let uniqueChapters = 0;

            if (response.volumes) {
                Object.keys(response.volumes).forEach((volumeKey) => {
                    const volume = response.volumes[volumeKey];
                    if (volume && volume.chapters) {
                        uniqueChapters += Object.keys(volume.chapters).length;
                    }
                });
            }

            console.log(`📚 Manga ${mangaId}: ${uniqueChapters} capítulos únicos (vía /aggregate)`);

            return uniqueChapters;

        } catch (error) {
            console.error(`Error getting chapter count for ${mangaId}:`, error);

            return this.getChapterCountFallback(mangaId);
        }
    }

    private static async getChapterCountFallback(mangaId: string): Promise<number> {
        try {
            console.log(`⚠️ Usando método fallback para ${mangaId}...`);

            let offset = 0;
            const limit = 500;
            const uniqueChapterNumbers = new Set<string>();
            let hasMore = true;

            while (hasMore && offset < 2000) {
                const response = await HttpClient.get(
                    `${this.baseUrl}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&translatedLanguage[]=en`
                );

                if (response.data && response.data.length > 0) {
                    response.data.forEach((chapter: any) => {
                        const chapterNum = chapter.attributes?.chapter;
                        if (chapterNum) {
                            uniqueChapterNumbers.add(chapterNum);
                        }
                    });

                    offset += limit;
                    hasMore = response.data.length === limit;
                } else {
                    hasMore = false;
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log(`✅ Fallback: ${uniqueChapterNumbers.size} capítulos únicos`);
            return uniqueChapterNumbers.size;

        } catch (error) {
            console.error(`Error in fallback method for ${mangaId}:`, error);
            return 0;
        }
    }

    private static async getLatestChapterNumber(mangaId: string): Promise<number | null> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga/${mangaId}/feed?limit=1&translatedLanguage[]=en&order[chapter]=desc`
            );

            if (response.data && response.data.length > 0) {
                const chapterNumber = parseFloat(response.data[0].attributes?.chapter || '0');
                return chapterNumber;
            }

            return null;
        } catch (error) {
            console.error(`Error fetching latest chapter for ${mangaId}:`, error);
            return null;
        }
    }

    private static transformMangaData(apiData: any, chapterCount: number): Manga {
        const attributes = apiData.attributes;
        const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0];

        const coverArt = apiData.relationships?.find((rel: any) => rel.type === 'cover_art');
        const coverFileName = coverArt?.attributes?.fileName;
        const coverUrl = coverFileName
            ? `https://uploads.mangadex.org/covers/${apiData.id}/${coverFileName}`
            : 'https://cdn.myanimelist.net/images/manga/2/253146.jpg';

        return {
            id: apiData.id,
            title: title,
            description: attributes.description?.en || 'No description available',
            coverUrl: coverUrl,
            thumbnailUrl: coverUrl,
            genres: attributes.tags?.filter((tag: any) => tag.attributes.group === 'genre')
                .map((tag: any) => tag.attributes.name.en) || [],
            authors: [this.getAuthor(apiData.relationships)],
            chapters: chapterCount,
            score: attributes.averageRating ? attributes.averageRating / 20 : 0,
            status: this.mapStatus(attributes.status),
            year: new Date(attributes.createdAt).getFullYear(),
            volumes: attributes.lastVolume ? parseInt(attributes.lastVolume) : undefined,
        };
    }

    private static transformMangaDataSimple(apiData: any): Manga {
        const attributes = apiData.attributes;
        const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0];

        const coverArt = apiData.relationships?.find((rel: any) => rel.type === 'cover_art');
        const coverFileName = coverArt?.attributes?.fileName;
        const coverUrl = coverFileName
            ? `https://uploads.mangadex.org/covers/${apiData.id}/${coverFileName}`
            : 'https://cdn.myanimelist.net/images/manga/2/253146.jpg';

        const lastChapter = attributes.lastChapter || '100';
        const estimatedChapters = parseInt(lastChapter) || 100;

        return {
            id: apiData.id,
            title: title,
            description: attributes.description?.en || 'No description available',
            coverUrl: coverUrl,
            thumbnailUrl: coverUrl,
            genres: attributes.tags?.filter((tag: any) => tag.attributes.group === 'genre')
                .map((tag: any) => tag.attributes.name.en) || [],
            authors: [this.getAuthor(apiData.relationships)],
            chapters: estimatedChapters,
            score: attributes.averageRating ? attributes.averageRating / 20 : 0,
            status: this.mapStatus(attributes.status),
            year: new Date(attributes.createdAt).getFullYear(),
            volumes: attributes.lastVolume ? parseInt(attributes.lastVolume) : undefined,
        };
    }

    private static getAuthor(relationships: any[]): string {
        const author = relationships?.find((rel: any) => rel.type === 'author');
        return author?.attributes?.name || 'Unknown Author';
    }

    private static mapStatus(status: string): string {
        const statusMap: { [key: string]: string } = {
            'ongoing': 'ongoing',
            'completed': 'completed',
            'hiatus': 'hiatus',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'ongoing';
    }

    static async searchMangas(query: string, limit: number = 20): Promise<Manga[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga?title=${encodeURIComponent(query)}&limit=${limit}&includes[]=cover_art`
            );

            return response.data.map((data: any) => this.transformMangaDataSimple(data));
        } catch (error) {
            console.error('Error searching mangas:', error);
            return [];
        }
    }

    static async getChapterPages(chapterId: string): Promise<string[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/at-home/server/${chapterId}`
            );

            const baseUrl = response.baseUrl;
            const chapterHash = response.chapter.hash;
            const pages = response.chapter.data;

            return pages.map((page: string) =>
                `${baseUrl}/data/${chapterHash}/${page}`
            );
        } catch (error) {
            console.error(`Error fetching pages for chapter ${chapterId}:`, error);
            return [];
        }
    }

    static async getTopMangasWithRealChapters(limit: number = 10): Promise<Manga[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga?limit=${limit}&order[rating]=desc&includes[]=cover_art`
            );

            const mangasWithRealChapters = await Promise.all(
                response.data.map(async (mangaData: any) => {
                    const chapterCount = await this.getChapterCount(mangaData.id);
                    return this.transformMangaData(mangaData, chapterCount);
                })
            );

            return mangasWithRealChapters;
        } catch (error) {
            console.error('Error fetching top mangas with real chapters:', error);
            return this.getTopMangasSimple(limit);
        }
    }

    static async getTopMangasSimple(limit: number = 10): Promise<Manga[]> {
        try {
            const response = await HttpClient.get(
                `${this.baseUrl}/manga?limit=${limit}&order[rating]=desc&includes[]=cover_art`
            );

            return response.data.map((data: any) => this.transformMangaDataImproved(data));
        } catch (error) {
            console.error('Error fetching top mangas:', error);
            return [];
        }
    }

    private static transformMangaDataImproved(apiData: any): Manga {
        const attributes = apiData.attributes;
        const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0];

        const coverArt = apiData.relationships?.find((rel: any) => rel.type === 'cover_art');
        const coverFileName = coverArt?.attributes?.fileName;
        const coverUrl = coverFileName
            ? `https://uploads.mangadex.org/covers/${apiData.id}/${coverFileName}`
            : 'https://cdn.myanimelist.net/images/manga/2/253146.jpg';

        let estimatedChapters = 0;

        if (attributes.lastChapter && !isNaN(parseFloat(attributes.lastChapter))) {
            estimatedChapters = Math.round(parseFloat(attributes.lastChapter));
        } else {
            estimatedChapters = attributes.status === 'completed' ? 50 : 25;
        }

        estimatedChapters = Math.max(estimatedChapters, 1);

        return {
            id: apiData.id,
            title: title,
            description: attributes.description?.en || 'No description available',
            coverUrl: coverUrl,
            thumbnailUrl: coverUrl,
            genres: attributes.tags?.filter((tag: any) => tag.attributes.group === 'genre')
                .map((tag: any) => tag.attributes.name.en) || [],
            authors: [this.getAuthor(apiData.relationships)],
            chapters: estimatedChapters,
            score: attributes.averageRating ? attributes.averageRating / 20 : 0,
            status: this.mapStatus(attributes.status),
            year: new Date(attributes.createdAt).getFullYear(),
            volumes: attributes.lastVolume ? parseInt(attributes.lastVolume) : undefined,
        };
    }
}