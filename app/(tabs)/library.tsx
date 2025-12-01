import { DownloadedChapterEntry, getDownloadedChapters } from '@/src/services/manga/downloadService'
import { getHistory, HistoryEntry } from '@/src/services/manga/historyService'
import { getWatchlist, WatchlistEntry } from '@/src/services/manga/watchlistService'
import { Ionicons } from "@expo/vector-icons"
import { FlashList } from '@shopify/flash-list'
import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Image } from 'expo-image'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SceneMap, TabBar, TabView } from "react-native-tab-view"


type ListItem = HistoryEntry | DownloadedChapterEntry | WatchlistEntry;

const ListItemComponent = ({ item }: { item: ListItem }) => {
    const router = useRouter();
    
    const isHistory = (item as HistoryEntry).lastReadPageIndex !== undefined && (item as HistoryEntry).lastReadChapterId !== undefined;
    const isWatchlist = (item as WatchlistEntry).addedAt !== undefined && !isHistory;
    const mangaTitle = item.mangaTitle;
    const coverUrl = item.coverUrl;
    let infoLine1 = "";
    let infoLine2 = "";
    let navigateParams: any = {};
    let icon = null;

  if (isWatchlist) {
    const watchlistItem = item as WatchlistEntry;
    infoLine1 = watchlistItem.author ? `Autor: ${watchlistItem.author}` : `Chapters: ${watchlistItem.chapters || 'N/A'}`;
    infoLine2 = `Added ${formatDistanceToNowStrict(watchlistItem.addedAt, { addSuffix: true, locale: es })}`;
    icon = <Ionicons name="bookmark" size={20} color="#2136f4ff" style={{ position: 'absolute', right: 0, top: 10 }} />;
    navigateParams = {
        pathname: '/manga/[id]',
        params: {
            id: watchlistItem.mangaId, 
        }
    };
}else if (isHistory) {
        const historyItem = item as HistoryEntry;
        const progressPercentage = historyItem.totalChapterPages > 0
            ? Math.floor(((historyItem.lastReadPageIndex + 1) / historyItem.totalChapterPages) * 100)
            : 100;

        infoLine1 = `Cha. ${historyItem.lastReadChapterNumber} - Pag. ${historyItem.lastReadPageIndex + 1}/${historyItem.totalChapterPages}`;
        infoLine2 = `Read ${formatDistanceToNowStrict(historyItem.lastReadAt, { addSuffix: true, locale: es })} (${progressPercentage}%)`;
        navigateParams = {
            pathname: '/reader/[id]',
            params: {
                id: historyItem.lastReadChapterId,
                mangaId: historyItem.mangaId,
                chapterNumber: historyItem.lastReadChapterNumber,
                mangaTitle: historyItem.mangaTitle,
                mangaCoverUrl: historyItem.coverUrl,
                isOffline: 'false',
            }
        };
    } else { 
        const downloadItem = item as DownloadedChapterEntry;
        infoLine1 = `Cha. ${downloadItem.chapterNumber} - Downloaded`;
        infoLine2 = `Downloaded ${formatDistanceToNowStrict(downloadItem.downloadedAt, { addSuffix: true, locale: es })}`;
        icon = <Ionicons name="cloud-offline" size={20} color="#4CAF50" style={{ position: 'absolute', right: 0, top: 10 }} />;
        navigateParams = {
            pathname: '/reader/[id]',
            params: {
                id: downloadItem.chapterId,
                mangaId: downloadItem.mangaId,
                chapterNumber: downloadItem.chapterNumber,
                mangaTitle: downloadItem.mangaTitle,
                mangaCoverUrl: downloadItem.coverUrl,
                isOffline: 'true',
            }
        };
    }

    return (
        <TouchableOpacity
            style={historyStyles.itemContainer}
            onPress={() => router.push(navigateParams)}
        >
            <Image
                source={{ uri: coverUrl }}
                style={historyStyles.coverImage}
                contentFit="cover"
            />
            <View style={historyStyles.detailsContainer}>
                <Text style={historyStyles.mangaTitle} numberOfLines={2}>
                    {mangaTitle}
                </Text>
                <Text style={historyStyles.chapterInfo} numberOfLines={1}>
                    {infoLine1}
                </Text>

                {isHistory && (item as HistoryEntry).totalChapterPages > 0 && (
                    <View style={historyStyles.progressContainer}>
                        <View style={historyStyles.progressBackground}>
                            <View
                                style={[
                                    historyStyles.progressFill,
                                    { width: `${Math.floor((((item as HistoryEntry).lastReadPageIndex + 1) / (item as HistoryEntry).totalChapterPages) * 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={historyStyles.progressText}>
                            {Math.floor((((item as HistoryEntry).lastReadPageIndex + 1) / (item as HistoryEntry).totalChapterPages) * 100)}%
                        </Text>
                    </View>
                )}

                <Text style={historyStyles.lastReadTime}>
                    {infoLine2}
                </Text>

                {icon}
            </View>
        </TouchableOpacity>
    );
};


const WatchListRoute = () => {
    const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadWatchlist = useCallback(async () => {
        setLoading(true);
        const data = await getWatchlist();
        setWatchlist(data);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadWatchlist();
        }, [loadWatchlist])
    );

    if (loading) {
        return (
            <View style={styles.scene}>
                <ActivityIndicator size="large" color="#2136f4ff" style={{ marginTop: 20 }} />
            </View>
        );
    }

    if (watchlist.length === 0) {
        return (
            <View style={styles.scene}>
                <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={64} color="#333" />
                    <Text style={styles.emptyTitle}>No favorites yet.</Text>
                    <Text style={styles.emptyText}>Add manga to your watchlist to keep track of them.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.scene}>
            <FlashList<WatchlistEntry>
                data={watchlist}
                renderItem={({ item }) => <ListItemComponent item={item} />}
                keyExtractor={(item) => item.mangaId}
                contentContainerStyle={historyStyles.listContent}
            />
        </View>
    );
}



const HistoryRoute = () => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    const loadHistory = useCallback(async () => {
        setLoading(true);
        const data = await getHistory();
        setHistory(data);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [loadHistory])
    );

    if (loading) {
        return (
            <View style={styles.scene}>
                <ActivityIndicator size="large" color="#2136f4ff" style={{ marginTop: 20 }} />
            </View>
        );
    }

    if (history.length === 0) {
        return (
            <View style={styles.scene}>
                <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={64} color="#333" />
                    <Text style={styles.emptyTitle}>No history</Text>
                    <Text style={styles.emptyText}>Start reading a manga to see your history here.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.scene}>
            <FlashList<HistoryEntry>
                data={history}
                renderItem={({ item }) => <ListItemComponent item={item} />}
                keyExtractor={(item) => item.mangaId + (item as HistoryEntry).lastReadChapterId}
                contentContainerStyle={historyStyles.listContent}
            />
        </View>
    );
};

const DownloadsRoute = () => {
    const [downloads, setDownloads] = useState<DownloadedChapterEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDownloads = useCallback(async () => {
        setLoading(true);
        const data = await getDownloadedChapters();
        setDownloads(data);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDownloads();
        }, [loadDownloads])
    );

    if (loading) {
        return (
            <View style={styles.scene}>
                <ActivityIndicator size="large" color="#2136f4ff" style={{ marginTop: 20 }} />
            </View>
        );
    }

    if (downloads.length === 0) {
        return (
            <View style={styles.scene}>
                <View style={styles.emptyState}>
                    <Ionicons name="download-outline" size={64} color="#333" />
                    <Text style={styles.emptyTitle}>No downloaded chapters.</Text>
                    <Text style={styles.emptyText}>Download content to read offline.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.scene}>
            <FlashList<DownloadedChapterEntry>
                data={downloads}
                renderItem={({ item }) => <ListItemComponent item={item} />}
                keyExtractor={(item) => item.mangaId + item.chapterId}
                contentContainerStyle={historyStyles.listContent}
            />
        </View>
    );
};


const renderScene = SceneMap({
    watchlist: WatchListRoute,
    history: HistoryRoute,
    downloads: DownloadsRoute,
})

export default function Library() {
    const layout = useWindowDimensions()
    const [index, setIndex] = useState(0)
    const [routes] = useState([
        { key: "watchlist", title: "Favorites" },
        { key: "history", title: "History" },
        { key: "downloads", title: "Offline" },
    ])

    const renderTabBar = (props: any) => (
        <TabBar
            {...props}
            style={styles.tabBar}
            indicatorStyle={styles.indicator}
            tabStyle={styles.tab}
            labelStyle={styles.label}
            activeColor="#2136f4ff"
            inactiveColor="#888"
        />
    )

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <Text style={styles.headerTitle}>My Library</Text>
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={renderTabBar}
            />
        </SafeAreaView>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#121212",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        padding: 16,
    },
    tabBar: {
        backgroundColor: "#121212",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        elevation: 0,
    },
    indicator: {
        backgroundColor: "#2136f4ff",
        height: 3,
    },
    tab: {
        height: 48,
    },
    label: {
        fontWeight: "600",
        textTransform: "none",
        fontSize: 14,
        margin: 0,
    },
    scene: {
        flex: 1,
        backgroundColor: "#121212",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        color: "#888",
        fontSize: 16,
        textAlign: "center",
        lineHeight: 24,
    },
})

const historyStyles = StyleSheet.create({
    listContent: {
        paddingTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    coverImage: {
        width: 80,
        height: 100,
        borderRadius: 8,
        backgroundColor: '#1a1a1a',
        marginRight: 15,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    mangaTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    chapterInfo: {
        color: '#aaa',
        fontSize: 13,
        marginBottom: 8,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressBackground: {
        flex: 1,
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginRight: 8,
    },
    progressFill: {
        height: 4,
        backgroundColor: '#2136f4ff',
        borderRadius: 2,
    },
    progressText: {
        color: '#2136f4ff',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 35,
        textAlign: 'right',
    },
    lastReadTime: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
});