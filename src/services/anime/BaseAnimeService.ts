// src/services/anime/BaseAnimeService.ts
import type { Anime } from '@/src/types/anime';
import { HttpClient } from '../api/httpClient';

export abstract class BaseAnimeService {
  abstract getTopAnimes(limit?: number, page?: number): Promise<Anime[]>;
  abstract searchAnimes(query: string, limit?: number): Promise<Anime[]>;
  abstract getAnimeById(id: string): Promise<Anime | null>;

  protected async makeRequest(url: string) {
    try {
      return await HttpClient.get(url);
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  }
}