"use client"

import { useAnimes } from "@/./hooks/useAnimes"; // ✅ CORREGIDA LA RUTA
import { useMangas } from "@/./hooks/useMangas"; // ✅ NUEVO IMPORT
import LoadingScreen from "@/src/components/LoadingScreen";
import Section from "@/src/components/Section";
import type { Video } from "@/src/types";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { animes, loading: loadingAnimes, error: errorAnimes, refetch: refetchAnimes } = useAnimes()
  const { mangas, loading: loadingMangas, error: errorMangas, refetch: refetchMangas } = useMangas() // ✅ MANGAS REALES
  const [refreshing, setRefreshing] = useState(false)

  // Transformar los animes de la API al formato que espera tu Video type
  const transformAnimesToVideos = (animes: any[]): Video[] => {
    return animes.map((anime) => ({
      id: anime.id,
      title: anime.title,
      description: anime.description || "No description available",
      thumbnailUrl: anime.thumbnailUrl || anime.image,
      videoUrl: "", // La API de Jikan no proporciona videos directamente
      duration: 0,
      genre: anime.genres || [],
      author: "", // Jikan no proporciona autor directamente
      episodes: Array(anime.episodes || 0).fill({}), // Para que funcione el contador
      rating: anime.score || 0,
      views: 0,
      createdAt: new Date(),
    }))
  }


  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchAnimes(), refetchMangas()]) // ✅ ACTUALIZAR AMBOS
    setRefreshing(false)
  }

  const loading = loadingAnimes || loadingMangas
  const error = errorAnimes || errorMangas

  if (loading && !refreshing) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Usando datos de demostración...</Text>
        </View>
        
        {/* Mostrar datos de demostración aunque haya error */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Animanga</Text>
            <Text style={styles.heroSubtitle}>welcome</Text>
          </View>

          <Section title="Popular Anime" data={transformAnimesToVideos(animes)} type="video" />
          <Section title="Trending Manga" data={mangas} type="manga" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const videos = transformAnimesToVideos(animes)

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F47521" />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>AnimangaPlus</Text>
          <Text style={styles.heroSubtitle}>Welcome</Text>
        </View>

        <Section title="Popular Anime" data={videos} type="video" />
        <Section title="Trending Manga" data={mangas} type="manga" /> {/* ✅ MANGAS REALES */}
        <Section title="New Releases" data={videos.slice().reverse()} type="video" />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  hero: {
    padding: 16,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#2148f4ff",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#ff4444",
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  errorSubtext: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
})