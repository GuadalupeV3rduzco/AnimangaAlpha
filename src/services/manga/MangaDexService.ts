// src/services/manga/MangaDexService.ts - COMPLETO Y CORREGIDO
import type { Manga } from '@/src/types/manga';
import { MANGA_APIS } from '../api/config';
import { HttpClient } from '../api/httpClient';

export class MangaDexService {
  private static baseUrl = MANGA_APIS.MANGADEX.url;

  // ✅ MÉTODO NUEVO: Obtener manga por ID
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

  // ✅ MÉTODO SIMPLIFICADO: Solo MangaDex, sin MangaHook
 // ✅ MÉTODO CORREGIDO: Limpiar títulos duplicados
static async getMangaChaptersWithNames(mangaId: string, limit: number = 100): Promise<any[]> {
  try {
    const chapters = await this.getMangaChapters(mangaId, limit);
    
    return chapters.map((chapter: any, index: number) => {
      const chapterNumber = chapter.attributes?.chapter || 
                           chapter.chapter || 
                           (index + 1);
      
      // ✅ Obtener título original y LIMPIARLO
      const rawTitle = chapter.attributes?.title || chapter.title || '';
      
      // ✅ LIMPIAR: Remover "Chapter X", "Capítulo X", etc. del título
      let cleanTitle = rawTitle
        .replace(/^Chapter\s+[\d.]+\s*[:\-]\s*/i, '')  // Remover "Chapter X - "
        .replace(/^Capítulo\s+[\d.]+\s*[:\-]\s*/i, '') // Remover "Capítulo X - "
        .replace(/^Chapter\s+[\d.]+\s*/i, '')          // Remover "Chapter X "
        .replace(/^Capítulo\s+[\d.]+\s*/i, '')         // Remover "Capítulo X "
        .trim();
      
      // ✅ CONSTRUIR TÍTULO FINAL
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

  // ✅ MÉTODO: Obtener capítulos del manga
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
      // Obtener mangas populares de MangaDex
      const response = await HttpClient.get(
        `${this.baseUrl}/manga?limit=${limit}&order[rating]=desc&includes[]=cover_art`
      );

      // Obtener el número de capítulos para cada manga
      const mangasWithChapters = await Promise.all(
        response.data.map(async (mangaData: any) => {
          const chapterCount = await this.getChapterCount(mangaData.id);
          return this.transformMangaData(mangaData, chapterCount);
        })
      );

      return mangasWithChapters;
    } catch (error) {
      console.error('Error fetching top mangas:', error);
      return [];
    }
  }

  // Obtener el conteo de capítulos para un manga
  private static async getChapterCount(mangaId: string): Promise<number> {
    try {
      const response = await HttpClient.get(
        `${this.baseUrl}/manga/${mangaId}/aggregate?translatedLanguage[]=en`
      );
      
      // Contar todos los capítulos disponibles
      let totalChapters = 0;
      if (response.volumes) {
        Object.values(response.volumes).forEach((volume: any) => {
          totalChapters += Object.keys(volume.chapters || {}).length;
        });
      }
      
      return totalChapters;
    } catch (error) {
      console.error(`Error getting chapter count for ${mangaId}:`, error);
      return 0;
    }
  }

  // Versión simplificada sin conteo de capítulos (más rápida)
  static async getTopMangasSimple(limit: number = 10): Promise<Manga[]> {
    try {
      const response = await HttpClient.get(
        `${this.baseUrl}/manga?limit=${limit}&order[rating]=desc&includes[]=cover_art`
      );

      return response.data.map((data: any) => this.transformMangaDataSimple(data));
    } catch (error) {
      console.error('Error fetching top mangas:', error);
      return [];
    }
  }

  private static transformMangaData(apiData: any, chapterCount: number): Manga {
    const attributes = apiData.attributes;
    const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0];
    
    // Obtener la imagen de portada
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

  // Versión simple sin conteo de capítulos (usa lastChapter como aproximación)
  private static transformMangaDataSimple(apiData: any): Manga {
    const attributes = apiData.attributes;
    const title = attributes.title.en || attributes.title.ja || Object.values(attributes.title)[0];
    
    const coverArt = apiData.relationships?.find((rel: any) => rel.type === 'cover_art');
    const coverFileName = coverArt?.attributes?.fileName;
    const coverUrl = coverFileName 
      ? `https://uploads.mangadex.org/covers/${apiData.id}/${coverFileName}`
      : 'https://cdn.myanimelist.net/images/manga/2/253146.jpg';

    // Usar lastChapter como aproximación del número de capítulos
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

  // ✅ MÉTODO ADICIONAL: Buscar mangas por título
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

  // ✅ MÉTODO ADICIONAL: Obtener páginas de un capítulo
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
}