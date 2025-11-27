// src/types/manga.ts
export interface Manga {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  thumbnailUrl: string;
  genres: string[];
  status: string;
  chapters: number;
  authors?: string[];
  year?: number;
  score?: number;
  volumes?: number;
}

export interface MangaResponse {
  data: Manga[];
  success: boolean;
  error?: string;
}

export type MangaStatus = 'completed' | 'ongoing' | 'hiatus' | 'cancelled';