import type { Anime } from '@/src/types/anime';
import { ANIME_APIS } from '../api/config';
import { HttpClient } from '../api/httpClient';

export class JikanAnimeService {
    private static baseUrl = ANIME_APIS.JIKAN.url;

    static async getAnimeById(id: string): Promise<Anime | null> {
        try {
            const response = await this.makeRequest(`${this.baseUrl}/anime/${id}`);
            return this.transformAnimeData(response.data);
        } catch (error) {
            console.error(`Error fetching anime ${id}:`, error);
            return null;
        }
    }

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

    static async getTopManga(limit: number = 10, page: number = 1): Promise<any> {
        try {
            const response = await this.makeRequest(
                `${this.baseUrl}/top/manga?limit=${limit}&page=${page}`
            );
            return response.data.map((apiData: any) => this.transformMangaData(apiData));
        } catch (error) {
            console.error('Error fetching Top Manga:', error);
            throw error;
        }
    }

    static async getMangaRecommendations(limit: number = 10, page: number = 1): Promise<any> {
        try {
            const response = await this.makeRequest(
                `${this.baseUrl}/top/manga?filter=bypopularity&limit=${limit}&page=${page}`
            );
            return response.data.map((apiData: any) => this.transformMangaData(apiData));
        } catch (error) {
            console.error('Error fetching Manga Recommendations:', error);
            throw error;
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

    private static transformMangaData(apiData: any): Anime {
        return {
            id: `jikan-${apiData.mal_id}`,
            title: apiData.title,
            description: apiData.synopsis || 'No description available',
            image: apiData.images?.jpg?.large_image_url || apiData.images?.webp?.large_image_url || '',
            thumbnailUrl: apiData.images?.jpg?.large_image_url,
            genres: apiData.genres?.map((g: any) => g.name) || [],
            status: this.mapStatus(apiData.status),
            episodes: apiData.chapters || 0,
            year: apiData.published?.prop?.from?.year || apiData.year,
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

    private static async makeRequest(url: string) {
        try {
            return await HttpClient.get(url);
        } catch (error) {
            console.error(`API Request failed for ${url}:`, error);
            throw error;
        }
    }
}