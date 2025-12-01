import { MangaDexService } from "@/src/services/manga/MangaDexService"
import type { Manga } from "@/src/types/manga"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getDownloadedChapterById,
  saveChapterDownload
} from '@/src/services/manga/downloadService'
import { getReadChaptersForManga } from '@/src/services/manga/readStatusService'
import {
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist
} from '@/src/services/manga/watchlistService'


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
  const [downloadingChapters, setDownloadingChapters] = useState<Set<string>>(new Set())
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set())
  const [readChapters, setReadChapters] = useState<Map<string, boolean>>(new Map())
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const loadWatchlistStatus = async (mangaId: string) => {
    const isAdded = await isInWatchlist(mangaId);
    setIsWatchlisted(isAdded);
  };
  useEffect(() => {
    loadManga()
  }, [id])

  useFocusEffect(
    useCallback(() => {
      if (manga) {
        loadReadStatus()
        loadWatchlistStatus(manga.id)
      }
    }, [manga])
  )

  useEffect(() => {
    if (volumes.length > 0) {
      loadDownloadedStatus()
      loadReadStatus()
    }
  }, [volumes])

  const loadManga = async () => {
    try {
      const mangaId = typeof id === 'string' ? id.replace('manqa-', '') : id
      const mangaData = await MangaDexService.getMangaById(mangaId as string)
      setManga(mangaData)
      await loadWatchlistStatus(mangaId as string);
      if (mangaData) {
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

  const loadDownloadedStatus = async () => {
    const downloaded = new Set<string>()

    for (const volume of volumes) {
      for (const chapter of volume.chapters) {
        const isDownloaded = await getDownloadedChapterById(chapter.id)
        if (isDownloaded) {
          downloaded.add(chapter.id)
        }
      }
    }

    setDownloadedChapters(downloaded)
  }

  const loadReadStatus = async () => {
    if (!manga) return

    const readStatus = await getReadChaptersForManga(manga.id)
    setReadChapters(readStatus)
  }


  const handleDownloadChapter = async (chapter: Chapter) => {
    if (!manga) return

    if (downloadedChapters.has(chapter.id)) {
      Alert.alert('Already downloaded', 'This chapter is already available offline')
      return
    }

    setDownloadingChapters(prev => new Set(prev).add(chapter.id))

    try {
      console.log(`📥 Downloading chapter ${chapter.number}...`)

      const pageUrls = await MangaDexService.getChapterPages(chapter.id)

      if (!pageUrls || pageUrls.length === 0) {
        throw new Error('Failed to get pages')
      }

      await saveChapterDownload({
        mangaId: manga.id,
        mangaTitle: manga.title,
        chapterId: chapter.id,
        chapterNumber: chapter.number.toString(),
        coverUrl: manga.coverUrl || manga.thumbnailUrl || '',
        pageUrls: pageUrls,
      })

      setDownloadedChapters(prev => new Set(prev).add(chapter.id))

      

    } catch (error) {
      console.error('Error downloading chapter:', error)
      Alert.alert('Error', 'Failed to download chapter. Please try again.')
    } finally {
      setDownloadingChapters(prev => {
        const next = new Set(prev)
        next.delete(chapter.id)
        return next
      })
    }
  }

  const handleToggleWatchlist = async () => {
    if (!manga) return;

    if (isWatchlisted) {
      await removeFromWatchlist(manga.id);
      setIsWatchlisted(false);
    } else {
      await addToWatchlist({
        mangaId: manga.id,
        mangaTitle: manga.title,
        coverUrl: manga.coverUrl || manga.thumbnailUrl || '',
        status: manga.status,
        chapters: manga.chapters,
        score: manga.score,
        genres: manga.genres,
      });
      setIsWatchlisted(true);
    }
  };


  const renderReadIcon = (chapter: Chapter) => {
    const isRead = readChapters.get(chapter.id) || false

    if (isRead) {
      return <Ionicons name="eye" size={24} color="#4CAF50" />
    } else {
      return <Ionicons name="eye-off" size={24} color="#666" />
    }
  }

  const renderDownloadButton = (chapter: Chapter) => {
    const isDownloading = downloadingChapters.has(chapter.id)
    const isDownloaded = downloadedChapters.has(chapter.id)

    if (isDownloading) {
      return (
        <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#2136f4ff" />
        </View>
      )
    }

    if (isDownloaded) {
      return (
        <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
        </View>
      )
    }

    return (
      <TouchableOpacity
        style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => handleDownloadChapter(chapter)}
      >
        <Ionicons name="download-outline" size={28} color="#888" />
      </TouchableOpacity>
    )
  }

  const generateRealVolumesData = async (mangaData: Manga, mangaId: string): Promise<Volume[]> => {
    try {
      const chaptersData = await MangaDexService.getMangaChaptersWithNames(mangaId)

      if (chaptersData && chaptersData.length > 0) {
        const volumesMap = new Map<number, Chapter[]>()

        chaptersData.forEach((chapter: any) => {
          const volumeNumber = chapter.volume || 1
          if (!volumesMap.has(volumeNumber)) {
            volumesMap.set(volumeNumber, [])
          }

          volumesMap.get(volumeNumber)?.push({
            id: chapter.id,
            number: chapter.chapter || 0,
            title: chapter.title,
            pages: chapter.pages || 20,
            volume: volumeNumber,
            description: chapter.title || ''
          })
        })

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

    return [{
      id: 'volume-1',
      name: 'Volumen 1',
      number: 1,
      year: mangaData.year || new Date().getFullYear(),
      chapters: []
    }]
  }

  const handleChapterPress = (chapter: Chapter) => {
    const isDownloaded = downloadedChapters.has(chapter.id)

    router.push({
      pathname: "/reader/[id]" as any,
      params: {
        id: chapter.id,
        mangaId: manga?.id,
        chapterNumber: chapter.number,
        mangaTitle: manga?.title,
        mangaCoverUrl: manga?.coverUrl || manga?.thumbnailUrl,
        isOffline: isDownloaded ? 'true' : 'false',
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
        <ActivityIndicator size="large" color="#2136f4ff" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading manga...</Text>
      </SafeAreaView>
    )
  }

  if (!manga) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Manga not found</Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 12, backgroundColor: '#2136f4ff', borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView>
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: manga.coverUrl || manga.thumbnailUrl }}
            style={{ width: '100%', height: 300 }}
            resizeMode="cover"
          />

          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 150,
            backgroundColor: 'transparent'
          }} />

          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 150,
            backgroundColor: '#121212',
            opacity: 0.6
          }} />

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

        <View style={{ padding: 16 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
            {manga.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
              <Ionicons name="star" size={16} color="#2136f4ff" />
              <Text style={{ color: '#fff', marginLeft: 4 }}>{manga.score || 'N/A'}</Text>
            </View>
            <Text style={{ color: '#aaa', marginRight: 16, marginBottom: 4 }}>
              {manga.chapters || 0} Chapters
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

          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#2136f4ff',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
                marginRight: 8
              }}
              onPress={handleReadFromStart}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Read from the beginning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 50,
                backgroundColor: isWatchlisted ? '#2136f4ff' : '#2a2a2a',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={handleToggleWatchlist}
            >
              <Ionicons
                name={isWatchlisted ? "bookmark" : "bookmark-outline"}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <Text style={{ color: '#fff', lineHeight: 20, marginBottom: 20 }}>
            {manga.description || 'No hay descripción disponible.'}
          </Text>

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
                  backgroundColor: '#2136f4ff',
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
                        backgroundColor: selectedVolume?.id === volume.id ? '#2136f4ff' : '#2a2a2a',
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
                <View
                  key={chapter.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    borderRadius: 8,
                    marginBottom: 8,
                    overflow: 'hidden'
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12
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
                      <Text style={{ color: '#aaa', fontSize: 12 }}>{chapter.pages} Pages</Text>
                    </View>

                    <View style={{ marginRight: 8 }}>
                      {renderReadIcon(chapter)}
                    </View>
                  </TouchableOpacity>

                  {renderDownloadButton(chapter)}
                </View>
              ))
            ) : (
              <Text style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>
                No chapters available
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
} 