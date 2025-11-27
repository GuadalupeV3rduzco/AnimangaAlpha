// src/services/anime/JikanAnimeService.ts - VERSIÓN ESTÁTICA CORREGIDA
import type { Anime } from '@/src/types/anime';
import { ANIME_APIS } from '../api/config';
import { HttpClient } from '../api/httpClient';

export class JikanAnimeService {
  private static baseUrl = ANIME_APIS.JIKAN.url;

  // ✅ MÉTODOS ESTÁTICOS
  static async getTopAnimes(limit: number = 10, page: number = 1): Promise<Anime[]> {
    const response = await this.makeRequest(
      `${this.baseUrl}/top/anime?limit=${limit}&page=${page}`
    );
    
    return response.data.map((apiData: any) => this.transformAnimeData(apiData));
  }

  static async searchAnimes(query: string, limit: number = 20): Promise<Anime[]> {
    const response = await this.makeRequest(
      `${this.baseUrl}/anime?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    return response.data.map((apiData: any) => this.transformAnimeData(apiData));
  }

  static async getAnimeById(id: string): Promise<Anime | null> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/anime/${id}`);
      return this.transformAnimeData(response.data);
    } catch (error) {
      console.error(`Error fetching anime ${id}:`, error);
      return null;
    }
  }

  private static transformAnimeData(apiData: any): Anime {
    return {
      id: `jikan-${apiData.mal_id}`,
      title: apiData.title,
      description: apiData.synopsis || 'No description available',
      image: apiData.images?.jpg?.large_image_url,
      thumbnailUrl: apiData.images?.jpg?.large_image_url,
      genres: apiData.genres?.map((g: any) => g.name) || [],
      status: this.mapStatus(apiData.status),
      episodes: apiData.episodes || 0,
      year: apiData.year,
      score: apiData.score
    };
  }

  private static mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Finished Airing': 'completed',
      'Currently Airing': 'ongoing',
      'Not yet aired': 'upcoming'
    };
    return statusMap[status] || status.toLowerCase();
  }

  // ✅ makeRequest estático sin dependencia de BaseAnimeService
  private static async makeRequest(url: string) {
    try {
      return await HttpClient.get(url);
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  }
  // En JikanAnimeService.ts - AGREGAR este método
static async getAnimeEpisodes(animeId: string, page: number = 1): Promise<any[]> {
  try {
    const response = await this.makeRequest(
      `${this.baseUrl}/anime/${animeId}/episodes?page=${page}`
    );
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching episodes for ${animeId}:`, error);
    return [];
  }
}
}