// src/hooks/useAnimes.ts - Versión mejorada
import { JikanAnimeService } from '@/src/services/anime/JikanAnimeService';
import type { Anime } from '@/src/types/anime';
import { useEffect, useState } from 'react';

export const useAnimes = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnimes = async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('🎌 Obteniendo animes de Jikan API...');
// ✅ CORRECTO - Método estático
const popularAnimes = await JikanAnimeService.getTopAnimes(10);      
      // Verificar que tenemos datos
      if (!popularAnimes || popularAnimes.length === 0) {
        throw new Error('No se recibieron datos de la API');
      }
      
      console.log(`✅ ${popularAnimes.length} animes cargados exitosamente`);
      setAnimes(popularAnimes);
      
    } catch (err: any) {
      console.error('❌ Error en useAnimes:', err);
      
      // Mensajes de error específicos
      if (err.message.includes('Failed to fetch')) {
        setError('Error de conexión. Verifica tu internet.');
      } else if (err.message.includes('rate limit')) {
        setError('Límite de API alcanzado. Espera un momento.');
      } else {
        setError('Error al cargar los animes: ' + err.message);
      }
      
      // Datos de ejemplo en caso de error
      setAnimes(getFallbackAnimes());
    } finally {
      setLoading(false);
    }
  };

  // Datos de fallback si la API falla
  const getFallbackAnimes = (): Anime[] => {
    return [
      {
        id: 'fallback-1',
        title: 'Demon Slayer',
        description: 'Tanjiro Kamado se convierte en cazador de demonios...',
        image: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
        genres: ['Action', 'Supernatural'],
        status: 'completed',
        episodes: 26,
        year: 2019,
        score: 8.5
      },
      {
        id: 'fallback-2', 
        title: 'Jujutsu Kaisen',
        description: 'Yuji Itadori se une a la escuela de jujutsu...',
        image: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
        thumbnailUrl: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
        genres: ['Action', 'Supernatural'],
        status: 'ongoing',
        episodes: 24,
        year: 2020,
        score: 8.6
      }
    ];
  };

  useEffect(() => {
    loadAnimes();
  }, []);

  const refetch = async () => {
    await loadAnimes();
  };

  return { 
    animes, 
    loading, 
    error, 
    refetch 
  };
};