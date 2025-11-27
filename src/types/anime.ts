// src/types/anime.ts
export interface Anime {
  id: string;
  title: string;
  description: string;
  image: string;
  thumbnailUrl: string;
  genres: string[];
  status: string;
  episodes: number;
  year?: number;
  score?: number;
  rating?: number;
  duration?: string;
  trailer_url?: string;
  season?: string;
  studios?: string[];
}

export interface AnimeResponse {
  data: Anime[];
  success: boolean;
  error?: string;
}

// Estados posibles para anime
export type AnimeStatus = 'completed' | 'ongoing' | 'upcoming' | 'cancelled';

// Tipos de anime
export type AnimeType = 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special';