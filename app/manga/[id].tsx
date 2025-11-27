import { MangaDexService } from "@/src/services/manga/MangaDexService"
import type { Manga } from "@/src/types/manga"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

// Interfaces para manejar capítulos y volúmenes
interface Chapter {
  id: string
  number: number
  title: string
  pages: number
  thumbnail?: string
  description?: string
  volume?: number
}

interface Volume {
  id: string
  name: string
  number: number
  chapters: Chapter[]
  year: number
}

export default function MangaDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [manga, setManga] = useState<Manga | null>(null)
  const [loading, setLoading] = useState(true)
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(null)
  const [continueReading, setContinueReading] = useState<Chapter | null>(null)

  useEffect(() => {
    loadManga()
  }, [id])

  const loadManga = async () => {
    try {
      const mangaId = typeof id === 'string' ? id.replace('manqa-', '') : id
      const mangaData = await MangaDexService.getMangaById(mangaId as string)
      setManga(mangaData)
      
      if (mangaData) {
        // ✅ USAR EL MÉTODO MEJORADO con nombres de capítulos
        const realVolumes = await generateRealVolumesData(mangaData, mangaId as string)
        setVolumes(realVolumes)
        setSelectedVolume(realVolumes[0] || null)
        
        if (realVolumes[0]?.chapters && realVolumes[0].chapters.length > 0) {
          setContinueReading(realVolumes[0].chapters[0])
        }
      }
    } catch (error) {
      console.error('Error loading manga:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ OBTENER CAPÍTULOS REALES con nombres desde MangaHook
  const generateRealVolumesData = async (mangaData: Manga, mangaId: string): Promise<Volume[]> => {
    try {
      // ✅ CAMBIO: Usar el método con nombres en lugar del normal
      const chaptersData = await MangaDexService.getMangaChaptersWithNames(mangaId)
      
      if (chaptersData && chaptersData.length > 0) {
        // Agrupar capítulos por volúmenes
        const volumesMap = new Map<number, Chapter[]>()

        chaptersData.forEach((chapter: any) => {
          const volumeNumber = chapter.volume || 1
          if (!volumesMap.has(volumeNumber)) {
            volumesMap.set(volumeNumber, [])
          }

          volumesMap.get(volumeNumber)?.push({
    id: chapter.id, // ✅ USAR EL ID REAL de MangaDex, no "chapter-${chapter.id}"
            number: chapter.chapter || 0,
            title: chapter.title, // ✅ SOLO usar el título que ya viene formateado
            pages: chapter.pages || 20,
            volume: volumeNumber,
            description: chapter.title || ''
          })
        })

        // Convertir map a array de volúmenes
        const volumesArray: Volume[] = Array.from(volumesMap.entries()).map(([volumeNumber, chapters]) => ({
          id: `volume-${volumeNumber}`,
          name: `Volumen ${volumeNumber}`,
          number: volumeNumber,
          year: mangaData.year || new Date().getFullYear(),
          chapters: chapters.sort((a, b) => a.number - b.number)
        }))

        return volumesArray.sort((a, b) => a.number - b.number)
      }
    } catch (error) {
      console.error('Error loading real chapters:', error)
    }

    // Fallback si no hay capítulos
    return [{
      id: 'volume-1',
      name: 'Volumen 1',
      number: 1,
      year: mangaData.year || new Date().getFullYear(),
      chapters: []
    }]
  }

  const handleChapterPress = (chapter: Chapter) => {
    router.push({
      pathname: "/reader/[id]" as any,
      params: {
        id: chapter.id,
        mangaId: manga?.id,
        chapterNumber: chapter.number,
        mangaTitle: manga?.title
      }
    })
  }

  const handleReadFromStart = () => {
    if (selectedVolume?.chapters && selectedVolume.chapters[0]) {
      handleChapterPress(selectedVolume.chapters[0])
    }
  }

  const handleContinueReading = () => {
    if (continueReading) {
      handleChapterPress(continueReading)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F47521" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando manga...</Text>
      </SafeAreaView>
    )
  }

  if (!manga) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Manga no encontrado</Text>
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
            source={{ uri: manga.coverUrl || manga.thumbnailUrl }} 
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

        {/* Información del manga */}
        <View style={{ padding: 16 }}>
          {/* Título */}
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            {manga.title}
          </Text>
          
          {/* Rating y info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
              <Ionicons name="star" size={16} color="#F47521" />
              <Text style={{ color: '#fff', marginLeft: 4 }}>{manga.score || 'N/A'}</Text>
            </View>
            <Text style={{ color: '#aaa', marginRight: 16, marginBottom: 4 }}>
              {manga.chapters || 0} Capítulos
            </Text>
            <Text style={{ color: '#aaa', textTransform: 'capitalize', marginBottom: 4 }}>
              {manga.status || 'Desconocido'}
            </Text>
            {manga.year && (
              <Text style={{ color: '#aaa', marginLeft: 16, marginBottom: 4 }}>
                {manga.year}
              </Text>
            )}
          </View>

          {/* Botones de acción */}
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <TouchableOpacity 
              style={{ 
                flex: 1, 
                backgroundColor: '#F47521', 
                padding: 12, 
                borderRadius: 8, 
                alignItems: 'center',
                marginRight: 8
              }}
              onPress={handleReadFromStart}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Leer desde el inicio</Text>
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
            {manga.description || 'No hay descripción disponible.'}
          </Text>

          {/* Géneros */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
            {manga.genres?.map((genre, index) => {
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

          {/* CONTINUAR LEYENDO */}
          {continueReading && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                CONTINUAR LEYENDO
              </Text>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#2a2a2a', 
                  padding: 12, 
                  borderRadius: 8 
                }}
                onPress={handleContinueReading}
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
                  <Ionicons name="book" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '500' }}>
                    Capítulo {continueReading.number} - {continueReading.title}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>{continueReading.pages} páginas</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* VOLÚMENES */}
          {volumes.length > 1 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                VOLÚMENES ({volumes.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  {volumes.map((volume) => (
                    <TouchableOpacity
                      key={volume.id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: selectedVolume?.id === volume.id ? '#F47521' : '#2a2a2a',
                        borderRadius: 20,
                        marginRight: 8
                      }}
                      onPress={() => setSelectedVolume(volume)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '500' }}>
                        {volume.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* CAPÍTULOS */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                CAPÍTULOS {selectedVolume && `- ${selectedVolume.name}`}
              </Text>
              {selectedVolume && selectedVolume.chapters && (
                <Text style={{ color: '#aaa', fontSize: 14 }}>
                  {selectedVolume.chapters.length} capítulos
                </Text>
              )}
            </View>
            
            {selectedVolume && selectedVolume.chapters && selectedVolume.chapters.length > 0 ? (
              selectedVolume.chapters.map((chapter) => (
                <TouchableOpacity 
                  key={chapter.id}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 12, 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                  onPress={() => handleChapterPress(chapter)}
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
                      {chapter.number}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '500' }}>
                      {chapter.title}
                    </Text>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>{chapter.pages} páginas</Text>
                  </View>
                  <Ionicons name="book" size={24} color="#F47521" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>
                No hay capítulos disponibles
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}