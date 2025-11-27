// src/services/api/config.ts
export const ANIME_APIS = {
  JIKAN: {
    name: "Jikan REST",
    url: "https://api.jikan.moe/v4",
    rateLimit: "60 requests/minuto",
    features: ["Anime", "Manga", "Búsqueda", "Top"]
  },
  ANILIST: {
    name: "AniList GraphQL",
    url: "https://graphql.anilist.co",
    rateLimit: "90 requests/minuto", 
    features: ["Anime", "Manga", "Caracteres", "Estudios"]
  },
  KITSU: {
    name: "Kitsu",
    url: "https://kitsu.io/api/edge",
    rateLimit: "Sin límite claro",
    features: ["Anime", "Manga", "Biblioteca"]
  }
};

export const MANGA_APIS = {
  MANGADEX: {
    name: "MangaDex",
    url: "https://api.mangadex.org",
    rateLimit: "5-10 requests/segundo",
    features: ["Manga", "Capítulos", "Imágenes", "Scanlations"]
  },
  COMICK: {
    name: "ComicK",
    url: "https://api.comick.fun",
    rateLimit: "100 requests/hora",
    features: ["Manga", "Capítulos", "Imágenes"]
  }
};

// ✅ AGREGAR: Configuración de prioridad
export const API_PRIORITY = {
  anime: ['JIKAN', 'ANILIST', 'KITSU'] as const,
  manga: ['MANGADEX', 'COMICK'] as const
};

// ✅ AGREGAR: Timeouts y retry config
export const API_CONFIG = {
  timeout: 10000, // 10 segundos
  maxRetries: 2,
  retryDelay: 1000 // 1 segundo
};

// ✅ AGREGAR: Tipos para TypeScript
export type AnimeApiKey = keyof typeof ANIME_APIS;
export type MangaApiKey = keyof typeof MANGA_APIS;