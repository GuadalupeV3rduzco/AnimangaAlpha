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
  genre?: string[];
  author?: string;
  rating?: number;
  views?: number;
  createdAt?: Date;
}



export interface MangaResponse {
  data: Manga[];
  success: boolean;
  error?: string;
}

export type MangaStatus = 'completed' | 'ongoing' | 'hiatus' | 'cancelled';


