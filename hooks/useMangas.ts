// src/hooks/useMangas.ts - CORREGIDO
import { MangaDexService } from '@/src/services/manga/MangaDexService';
import type { Manga } from '@/src/types';
import { useEffect, useState } from 'react';

export const useMangas = () => {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMangas = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('📚 Obteniendo mangas de MangaDex API...');
      // Usar la versión simple (más rápida)
      const topMangas = await MangaDexService.getTopMangasSimple(10);
      
      if (!topMangas || topMangas.length === 0) {
        throw new Error('No se recibieron datos de la API');
      }
      
      console.log(`✅ ${topMangas.length} mangas cargados exitosamente`);
      setMangas(topMangas);
      
    } catch (err: any) {
      console.error('❌ Error en useMangas:', err);
      
      // Mensajes de error específicos
      if (err.message.includes('Failed to fetch')) {
        setError('Error de conexión. Verifica tu internet.');
      } else if (err.message.includes('rate limit')) {
        setError('Límite de API alcanzado. Espera un momento.');
      } else {
        setError('Error al cargar los mangas: ' + err.message);
      }
      
      // Datos de ejemplo en caso de error
      setMangas(getFallbackMangas());
    } finally {
      setLoading(false);
    }
  };

  // Datos de fallback si la API falla - CORREGIDO
  const getFallbackMangas = (): Manga[] => {
    return [
      {
        id: 'fallback-1',
        title: 'One Piece',
        description: 'Monkey D. Luffy sails with his crew of Straw Hat Pirates through the Grand Line to find the treasure One Piece.',
        coverUrl: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg',
        genres: ['Adventure', 'Fantasy'], // ✅ CORREGIDO: genres en lugar de genre
        authors: ['Eiichiro Oda'], // ✅ CORREGIDO: authors en lugar de author
        chapters: 1100, // ✅ CORREGIDO: number en lugar de array
        score: 4.9, // ✅ CORREGIDO: score en lugar de rating
        status: 'ongoing',
        year: 1997, // ✅ CORREGIDO: year en lugar de createdAt
      },
      {
        id: 'fallback-2',
        title: 'Chainsaw Man',
        description: 'Denji has a simple dream—to live a happy and peaceful life, spending time with a girl he likes.',
        coverUrl: 'https://cdn.myanimelist.net/images/manga/3/222249.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/manga/3/222249.jpg',
        genres: ['Action', 'Horror'], // ✅ CORREGIDO
        authors: ['Tatsuki Fujimoto'], // ✅ CORREGIDO
        chapters: 120, // ✅ CORREGIDO
        score: 4.6, // ✅ CORREGIDO
        status: 'ongoing',
        year: 2018, // ✅ CORREGIDO
      },
      {
        id: 'fallback-3',
        title: 'Jujutsu Kaisen',
        description: 'A boy swallows a cursed talisman and becomes cursed himself.',
        coverUrl: 'https://cdn.myanimelist.net/images/manga/2/221770.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/manga/2/221770.jpg',
        genres: ['Action', 'Supernatural'], // ✅ CORREGIDO
        authors: ['Gege Akutami'], // ✅ CORREGIDO
        chapters: 200, // ✅ CORREGIDO
        score: 4.7, // ✅ CORREGIDO
        status: 'ongoing',
        year: 2018, // ✅ CORREGIDO
      }
    ];
  };

  useEffect(() => {
    loadMangas();
  }, []);

  const refetch = async () => {
    await loadMangas();
  };

  return { 
    mangas, 
    loading, 
    error, 
    refetch 
  };
};