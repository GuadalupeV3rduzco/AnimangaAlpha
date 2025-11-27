"use client"

import { JikanAnimeService } from "@/src/services/anime/JikanAnimeService"
import type { Anime } from "@/src/types/anime"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

// Interfaces para manejar temporadas y episodios
interface Episode {
  id: string
  number: number
  title: string
  duration: string
  thumbnail?: string
  description?: string
}

interface Season {
  id: string
  name: string
  number: number
  episodes: Episode[]
  year: number
}

export default function AnimeDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [continueWatching, setContinueWatching] = useState<Episode | null>(null)

  useEffect(() => {
    loadAnime()
  }, [id])

  const loadAnime = async () => {
    try {
      const animeId = typeof id === 'string' ? id.replace('jikan-', '') : id
      const animeData = await JikanAnimeService.getAnimeById(animeId as string)
      setAnime(animeData)
      
      if (animeData) {
        // ✅ USAR EL MÉTODO REAL para obtener episodios
        const realSeasons = await generateRealSeasonsData(animeData, animeId as string)
        setSeasons(realSeasons)
        setSelectedSeason(realSeasons[0] || null)
        
        if (realSeasons[0]?.episodes && realSeasons[0].episodes.length > 0) {
          setContinueWatching(realSeasons[0].episodes[0])
        }
      }
    } catch (error) {
      console.error('Error loading anime:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ OBTENER EPISODIOS REALES desde la API
  const generateRealSeasonsData = async (animeData: Anime, animeId: string): Promise<Season[]> => {
    try {
      const episodesData = await JikanAnimeService.getAnimeEpisodes(animeId)
      
      if (episodesData && episodesData.length > 0) {
        // Usar episodios reales de la API
        const realEpisodes: Episode[] = episodesData.map((ep: any) => ({
          id: `ep-${ep.mal_id || ep.episode_id}`,
          number: ep.mal_id || ep.episode_id || 0,
          title: ep.title || `Episodio ${ep.mal_id || ep.episode_id}`,
          duration: ep.duration || "24 min",
          description: ep.title_japanese || ''
        }))

        return [{
          id: 'season-1',
          name: 'Temporada 1',
          number: 1,
          year: animeData.year || new Date().getFullYear(),
          episodes: realEpisodes
        }]
      }
    } catch (error) {
      console.error('Error loading real episodes:', error)
    }

    // Fallback si no hay episodios
    return [{
      id: 'season-1',
      name: 'Temporada 1',
      number: 1,
      year: animeData.year || new Date().getFullYear(),
      episodes: []
    }]
  }

  const handleEpisodePress = (episode: Episode) => {
    router.push(`/player/${episode.id}?animeId=${anime?.id}&episode=${episode.number}`)
  }

  const handlePlayFromStart = () => {
    if (selectedSeason && selectedSeason.episodes && selectedSeason.episodes[0]) {
      handleEpisodePress(selectedSeason.episodes[0])
    }
  }

  const handleContinueWatching = () => {
    if (continueWatching) {
      handleEpisodePress(continueWatching)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F47521" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando anime...</Text>
      </SafeAreaView>
    )
  }

  if (!anime) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Anime no encontrado</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: '#F47521', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Regresar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView>
        {/* Header con imagen */}
        <View style={{ position: 'relative' }}>
          <Image 
            source={{ uri: anime.image }} 
            style={{ width: '100%', height: 300 }}
            resizeMode="cover"
          />
          
          {/* Overlay para gradiente */}
          <View style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: 150,
            backgroundColor: 'transparent'
          }} />
          
          {/* Segundo overlay para el efecto de gradiente */}
          <View style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: 150,
            backgroundColor: '#121212',
            opacity: 0.6
          }} />
          
          {/* Botón de regreso */}
          <TouchableOpacity 
            style={{ 
              position: 'absolute', 
              top: 50, 
              left: 16, 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              borderRadius: 20, 
              padding: 8 
            }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Información del anime */}
        <View style={{ padding: 16 }}>
          {/* Título */}
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            {anime.title}
          </Text>
          
          {/* Rating y info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
              <Ionicons name="star" size={16} color="#F47521" />
              <Text style={{ color: '#fff', marginLeft: 4 }}>{anime.score || 'N/A'}</Text>
            </View>
            <Text style={{ color: '#aaa', marginRight: 16, marginBottom: 4 }}>
              {anime.episodes || 0} Episodios
            </Text>
            <Text style={{ color: '#aaa', textTransform: 'capitalize', marginBottom: 4 }}>
              {anime.status || 'Desconocido'}
            </Text>
            {anime.year && (
              <Text style={{ color: '#aaa', marginLeft: 16, marginBottom: 4 }}>
                {anime.year}
              </Text>
            )}
          </View>

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                backgroundColor: '#2124f4ff', 
                padding: 12, 
                borderRadius: 8, 
                alignItems: 'center',
                marginRight: 8
              }}
              onPress={handlePlayFromStart}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reproducir desde el inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ 
              width: 50, 
              backgroundColor: '#2a2a2a', 
              padding: 12, 
              borderRadius: 8, 
              alignItems: 'center' 
            }}>
              <Ionicons name="bookmark-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Descripción */}
          <Text style={{ color: '#fff', lineHeight: 20, marginBottom: 20 }}>
            {anime.description || 'No hay descripción disponible.'}
          </Text>

          {/* Géneros */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
            {anime.genres?.map((genre, index) => {
              const genreName = typeof genre === 'string' ? genre : 'Género'
              return (
                <View key={index} style={{ 
                  backgroundColor: '#2a2a2a', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 16,
                  marginRight: 8,
                  marginBottom: 8
                }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{genreName}</Text>
                </View>
              )
            })}
          </View>

          {/* CONTINUAR VIENDO */}
          {continueWatching && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                CONTINUAR VIENDO
              </Text>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#2a2a2a', 
                  padding: 12, 
                  borderRadius: 8 
                }}
                onPress={handleContinueWatching}
              >
                <View style={{ 
                  width: 40, 
                  height: 40, 
                  backgroundColor: '#F47521', 
                  borderRadius: 6, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginRight: 12
                }}>
                  <Ionicons name="play" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '500' }}>
                    E{continueWatching.number} - {continueWatching.title}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>{continueWatching.duration} restantes</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* TEMPORADAS */}
          {seasons.length > 1 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                TEMPORADAS ({seasons.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  {seasons.map((season) => (
                    <TouchableOpacity
                      key={season.id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: selectedSeason?.id === season.id ? '#F47521' : '#2a2a2a',
                        borderRadius: 20,
                        marginRight: 8
                      }}
                      onPress={() => setSelectedSeason(season)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '500' }}>
                        {season.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* EPISODIOS */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                EPISODIOS {selectedSeason && `- ${selectedSeason.name}`}
              </Text>
              {selectedSeason && selectedSeason.episodes && (
                <Text style={{ color: '#aaa', fontSize: 14 }}>
                  {selectedSeason.episodes.length} episodios
                </Text>
              )}
            </View>
            
            {selectedSeason && selectedSeason.episodes && selectedSeason.episodes.length > 0 ? (
              selectedSeason.episodes.map((episode) => (
                <TouchableOpacity 
                  key={episode.id}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 12, 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                  onPress={() => handleEpisodePress(episode)}
                >
                  <View style={{ 
                    width: 40, 
                    height: 40, 
                    backgroundColor: '#2a2a2a', 
                    borderRadius: 6, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 12
                  }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                      {episode.number}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '500' }}>
                      Episodio {episode.number} - {episode.title}
                    </Text>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>{episode.duration}</Text>
                  </View>
                  <Ionicons name="play-circle" size={24} color="#F47521" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>
                No hay episodios disponibles
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}