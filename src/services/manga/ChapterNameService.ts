import { HttpClient } from '../api/httpClient';
interface MangaHookChapter {
  id?: string;
  chapter?: number;
  chapter_number?: number;
  title?: string;
  volume?: number;
}

export class ChapterNameService {
  private static baseUrl = 'https://mangahook.xyz/api';

  static async getChapterNames(mangaId: string): Promise<{ chapter: number, title: string }[]> {
    try {
      const response = await HttpClient.get(
        `${this.baseUrl}/manga/${mangaId}/chapters`
      );
      const chapters: MangaHookChapter[] = response.data || response.chapters || [];
      return chapters.map((chapter: MangaHookChapter) => ({
        chapter: chapter.chapter || chapter.chapter_number || 0,
        title: chapter.title || `Capítulo ${chapter.chapter || chapter.chapter_number}`
      }));
    } catch (error) {
      console.error(`Error fetching chapter names from MangaHook for ${mangaId}:`, error);
      return [];
    }
  }
}