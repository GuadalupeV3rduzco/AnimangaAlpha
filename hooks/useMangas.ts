import { MangaDexService } from '@/src/services/manga/MangaDexService';
import type { Manga } from '@/src/types';
import { useEffect, useState } from 'react';
export const useMangas = () => {
  const [trending, setTrending] = useState<Manga[]>([]);
  const [adapted, setAdapted] = useState<Manga[]>([]);
  const [recommendations, setRecommendations] = useState<Manga[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMangas = async () => {
    try {
      setError(null);
      setLoading(true);

      const totalMangas = 30;
      const allMangas = await MangaDexService.getTopMangas(totalMangas);

      if (!allMangas || allMangas.length === 0) {
        throw new Error('No se recibieron datos de MangaDex');
      }

      const sectionSize = Math.floor(allMangas.length / 3);
      setTrending(allMangas.slice(0, sectionSize));
      setAdapted(allMangas.slice(sectionSize, sectionSize * 2));
      setRecommendations(allMangas.slice(sectionSize * 2));

      console.log('=== CAPÍTULOS REALES DE MANGADEX ===');
      allMangas.slice(0, 3).forEach((manga, index) => {
        console.log(`Manga ${index + 1}:`, {
          title: manga.title,
          chapters: manga.chapters,
          source: 'MangaDex REAL'
        });
      });

    } catch (err: any) {
      console.error('Error en useMangas:', err);
      setError('Error al cargar las secciones de manga: ' + err.message);

      const fallback = await getFallbackMangasWithRealChapters();
      setTrending(fallback.slice(0, 4));
      setAdapted(fallback.slice(4, 8));
      setRecommendations(fallback.slice(8, 12));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackMangasWithRealChapters = async (): Promise<Manga[]> => {
    try {
      const realMangas = await MangaDexService.getTopMangas(12);
      if (realMangas && realMangas.length > 0) {
        return realMangas;
      }
    } catch (error) {
      console.error('Error getting real fallback mangas:', error);
    }

    return [
      {
        id: '13',
        title: 'One Piece',
        description: 'Monkey D. Luffy sails with his crew of Straw Hat Pirates through the Grand Line to find the treasure One Piece.',
        coverUrl: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg',
        genres: ['Adventure', 'Fantasy'],
        authors: ['Eiichiro Oda'],
        chapters: 1100,
        score: 4.9,
        status: 'ongoing',
        year: 1997,
      },
      {
        id: '116778',
        title: 'Chainsaw Man',
        description: 'Denji has a simple dream—to live a happy and peaceful life, spending time with a girl he likes.',
        coverUrl: 'https://cdn.myanimelist.net/images/manga/3/222249.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/manga/3/222249.jpg',
        genres: ['Action', 'Horror'],
        authors: ['Tatsuki Fujimoto'],
        chapters: 120,
        score: 4.6,
        status: 'ongoing',
        year: 2018,
      },
    ];
  };

  useEffect(() => {
    loadMangas();
  }, []);

  const refetch = async () => {
    await loadMangas();
  };

  return {
    trending,
    adapted,
    recommendations,
    loading,
    error,
    refetch
  };
};