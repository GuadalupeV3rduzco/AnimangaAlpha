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

export type AnimeStatus = 'completed' | 'ongoing' | 'upcoming' | 'cancelled';

export type AnimeType = 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special';