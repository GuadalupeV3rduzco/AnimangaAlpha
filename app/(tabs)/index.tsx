"use client"

import { useMangas } from "@/hooks/useMangas"
import LoadingScreen from "@/src/components/LoadingScreen"
import Section from "@/src/components/Section"
import { useState } from "react"
import {
    Image,

    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const logoImage = require('@/assets/images/animangaplus.png'); 

export default function Home() {
    const {
        trending,
        adapted,
        recommendations,
        loading: loadingMangas,
        error: errorMangas,
        refetch: refetchMangas
    } = useMangas()
    const [refreshing, setRefreshing] = useState(false)

    const onRefresh = async () => {
        setRefreshing(true)
        await refetchMangas()
        setRefreshing(false)
    }

    const loading = loadingMangas
    const error = errorMangas

    if (loading && !refreshing) {
        return <LoadingScreen />
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.errorSubtext}>Usando datos de demostración de Manga...</Text>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>MangaDex Reader</Text>
                        <Text style={styles.heroSubtitle}>Welcome</Text>
                    </View>
                    <Section title="Trending Manga" data={trending || []} type="manga" />
                </ScrollView>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2136f4ff" />}
            >
                <View style={styles.hero}>
                    <Image source={logoImage} style={styles.logo} /> 
                    <Text style={styles.heroTitle}>Animanga Plus</Text>
                </View>

                <Section title="🔥 Trending Manga" data={trending || []} type="manga" />

                {adapted.length > 0 && (
                    <Section title="🎬 Adapted to Anime" data={adapted || []} type="manga" />
                )}

                {recommendations.length > 0 && (
                    <Section title="⭐ Manga Recommendations" data={recommendations || []} type="manga" />
                )}

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
    paddingHorizontal: 0,
    marginBottom: 0,
    width: "100%",            
    flexDirection: "row",         
    alignItems: "center", 
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
 logo: {
    width: 100,      
    height: 100,
    resizeMode: "contain",
    alignSelf: "flex-start", 
    marginTop: -10,         
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