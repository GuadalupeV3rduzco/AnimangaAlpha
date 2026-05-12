import { getDownloadedChapterById } from '@/src/services/manga/downloadService'
import { saveProgress } from '@/src/services/manga/historyService'
import { MangaDexService } from '@/src/services/manga/MangaDexService'
import { Ionicons } from '@expo/vector-icons'
import { FlashList, FlashListRef, ListRenderItemInfo } from '@shopify/flash-list'
import { Image, ImageLoadEventData, ImageStyle } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image as RNImage,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const MAX_WEBTOON_WIDTH = 850
const PAGE_GAP = 10

type ReadingMode = 'webtoon' | 'standard'
type ChapterEntry = { id: string; chapter: string }

// ─────────────────────────────────────────────────────────────────────────────
// WebtoonPage — lives outside the parent so React.memo is never bypassed.
// Each page manages its own loading / height state so parent re-renders never
// cascade into the list.
// ─────────────────────────────────────────────────────────────────────────────
// WebtoonPage is stateless — ratio is computed at load-time by the parent so
// the container never changes size during scroll (zero layout thrash).
// ─────────────────────────────────────────────────────────────────────────────
interface WebtoonPageProps {
    url: string
    ratio: number   // w/h — pre-fetched, stable from first render
    isWeb: boolean
}

const WebtoonPage = memo(function WebtoonPage({ url, ratio, isWeb }: WebtoonPageProps) {
    const containerWidth = isWeb && screenWidth > MAX_WEBTOON_WIDTH ? MAX_WEBTOON_WIDTH : screenWidth
    return (
        <View style={{ width: containerWidth, aspectRatio: ratio, marginBottom: PAGE_GAP, alignSelf: 'center' }}>
            <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="fill"
                cachePolicy="memory-disk"
            />
        </View>
    )
})

// ─────────────────────────────────────────────────────────────────────────────
// Main reader screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ModernReaderScreen() {
    const { id, mangaId, chapterNumber, mangaTitle, mangaCoverUrl, isOffline } = useLocalSearchParams()
    const router = useRouter()

    const [pages, setPages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [readingMode, setReadingMode] = useState<ReadingMode>('webtoon')
    const [currentPage, setCurrentPage] = useState(0)
    const [showSettings, setShowSettings] = useState(false)
    const [chapterList, setChapterList] = useState<ChapterEntry[]>([])
    const [coverUrl, setCoverUrl] = useState<string | null>(null)

    const [pageRatios, setPageRatios] = useState<number[]>([])        // webtoon: w/h per page
    // Standard-mode image state
    const [imageLoadError, setImageLoadError] = useState<boolean[]>([])
    const [pageHeightsState, setPageHeightsState] = useState<number[]>([])

    // Refs that must NOT trigger re-renders
    const webtoonListRef = useRef<FlatList<string>>(null)
    const flatListRef = useRef<FlashListRef<string> | null>(null)
    const pageHeightsRef = useRef<number[]>([])
    const pageOffsetsRef = useRef<number[]>([])
    const controlsTimerRef = useRef<number | null>(null)
    const saveTimerRef = useRef<number | null>(null)

    const fadeAnim = useRef(new Animated.Value(1)).current
    const isWeb = Platform.OS === 'web'

    // ── Chapter list ────────────────────────────────────────────────────────

    useEffect(() => {
        if (!mangaId) return
        MangaDexService.getMangaChaptersWithNames(mangaId as string)
            .then(chapters => {
                if (chapters?.length) {
                    setChapterList(
                        chapters
                            .map((c: any) => ({ id: c.id as string, chapter: String(c.chapter || 0) }))
                            .sort((a: ChapterEntry, b: ChapterEntry) =>
                                parseFloat(a.chapter) - parseFloat(b.chapter)
                            )
                    )
                }
            })
            .catch(() => { })
    }, [mangaId])

    // ── Cover URL ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (mangaCoverUrl) { setCoverUrl(mangaCoverUrl as string); return }
        if (mangaId) {
            MangaDexService.getMangaById(mangaId as string)
                .then(m => { if (m?.coverUrl) setCoverUrl(m.coverUrl) })
                .catch(() => { })
        }
    }, [mangaId, mangaCoverUrl])

    // ── Chapter navigation ──────────────────────────────────────────────────

    const findAdjacentChapter = (dir: 1 | -1): ChapterEntry | null => {
        if (!chapterList.length) return null
        const idx = chapterList.findIndex(c => c.chapter === String(chapterNumber))
        if (idx === -1) return null
        const next = idx + dir
        if (next < 0 || next >= chapterList.length) return null
        return chapterList[next]
    }

    const goToNextChapter = useCallback(() => {
        const next = findAdjacentChapter(1)
        if (next) {
            router.replace({ pathname: '/reader/[id]', params: { id: next.id, mangaId: mangaId as string, chapterNumber: next.chapter, mangaTitle: mangaTitle as string } })
            showControlsTemporarily()
        } else { router.back() }
    }, [chapterList, chapterNumber, mangaId, mangaTitle])

    const goToPreviousChapter = useCallback(() => {
        const prev = findAdjacentChapter(-1)
        if (prev) {
            router.replace({ pathname: '/reader/[id]', params: { id: prev.id, mangaId: mangaId as string, chapterNumber: prev.chapter, mangaTitle: mangaTitle as string } })
            showControlsTemporarily()
        } else { router.back() }
    }, [chapterList, chapterNumber, mangaId, mangaTitle])

    // ── Page navigation ─────────────────────────────────────────────────────

    const scrollToWebtoonPage = useCallback((pageIndex: number) => {
        webtoonListRef.current?.scrollToIndex({ index: pageIndex, animated: true, viewPosition: 0 })
    }, [])

    const goToNextPage = useCallback(() => {
        if (currentPage < pages.length - 1) {
            const next = currentPage + 1
            setCurrentPage(next)
            if (readingMode === 'webtoon') { scrollToWebtoonPage(next) }
            else { flatListRef.current?.scrollToIndex({ index: next, animated: true }) }
            showControlsTemporarily()
        } else { goToNextChapter() }
    }, [currentPage, pages.length, readingMode, goToNextChapter, scrollToWebtoonPage])

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 0) {
            const prev = currentPage - 1
            setCurrentPage(prev)
            if (readingMode === 'webtoon') { scrollToWebtoonPage(prev) }
            else { flatListRef.current?.scrollToIndex({ index: prev, animated: true }) }
            showControlsTemporarily()
        } else { goToPreviousChapter() }
    }, [currentPage, readingMode, goToPreviousChapter, scrollToWebtoonPage])

    // ── Save progress (debounced 1.5 s) ────────────────────────────────────

    useEffect(() => {
        if (!loading && pages.length > 0 && currentPage >= 0 && id && mangaId && chapterNumber && mangaTitle && coverUrl) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
            saveTimerRef.current = setTimeout(() => {
                saveProgress({
                    mangaId: mangaId as string, mangaTitle: mangaTitle as string,
                    lastReadChapterId: id as string, lastReadChapterNumber: chapterNumber as string,
                    lastReadPageIndex: currentPage, totalChapterPages: pages.length,
                    coverUrl: coverUrl as string,
                })
            }, 1500)
        }
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
    }, [id, mangaId, chapterNumber, mangaTitle, coverUrl, pages.length, currentPage, loading])

    // ── Keyboard shortcuts (web) ────────────────────────────────────────────

    useEffect(() => {
        if (Platform.OS !== 'web') return
        const onKey = (e: KeyboardEvent) => {
            if (loading || showSettings) return
            if (['Space', 'ArrowRight', 'ArrowDown'].includes(e.code)) { e.preventDefault(); goToNextPage() }
            else if (['ArrowLeft', 'ArrowUp'].includes(e.code)) { e.preventDefault(); goToPreviousPage() }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [goToNextPage, goToPreviousPage, loading, showSettings])

    // ── Load pages ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadChapterPages()
        return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }
    }, [id, isOffline])

    useEffect(() => {
        if (!loading && pages.length > 0) {
            setCurrentPage(0)
            if (readingMode === 'standard') { flatListRef.current?.scrollToIndex({ index: 0, animated: false }) }
            else { webtoonListRef.current?.scrollToIndex({ index: 0, animated: false }) }
        }
    }, [loading, readingMode, pages.length])

    const loadChapterPages = async () => {
        setLoading(true)
        pageHeightsRef.current = []
        try {
            let chapterPages: string[] = []
            if (isOffline === 'true' && id) {
                const downloaded = await getDownloadedChapterById(id as string)
                chapterPages = downloaded ? downloaded.pageUrls : await MangaDexService.getChapterPages(id as string)
            } else {
                chapterPages = await MangaDexService.getChapterPages(id as string)
            }

            const containerW = isWeb && screenWidth > MAX_WEBTOON_WIDTH ? MAX_WEBTOON_WIDTH : screenWidth
            const fallbackRatio = 1 / 1.42

            // Fetch every page's w/h ratio before rendering so heights are stable
            // from the first frame — no layout recalculations during scroll.
            // RNImage.getSize shares the OS HTTP cache with expo-image, so images
            // are not downloaded twice.
            const getRatio = (url: string): Promise<number> =>
                new Promise(resolve => {
                    const timer = setTimeout(() => resolve(fallbackRatio), 8000)
                    RNImage.getSize(
                        url,
                        (w, h) => { clearTimeout(timer); resolve(w / h) },
                        () => { clearTimeout(timer); resolve(fallbackRatio) }
                    )
                })

            const ratios = await Promise.all(chapterPages.map(getRatio))

            let cumOffset = 0
            ratios.forEach((r, i) => {
                const h = (1 / r) * containerW
                pageHeightsRef.current[i] = h
                pageOffsetsRef.current[i] = cumOffset
                cumOffset += h + PAGE_GAP
            })

            setPages(chapterPages)
            setPageRatios(ratios)
            setImageLoadError(new Array(chapterPages.length).fill(false))
            setPageHeightsState(new Array(chapterPages.length).fill(0))
            setCurrentPage(0)
        } catch (err) {
            console.error('Error loading chapter pages:', err)
        } finally {
            setLoading(false)
        }
    }

    // ── Controls ────────────────────────────────────────────────────────────

    const showControlsTemporarily = useCallback(() => {
        if (showSettings) return
        fadeAnim.setValue(1)
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
        controlsTimerRef.current = setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0.15, duration: 300, useNativeDriver: true })
                .start()
        }, 3000)
    }, [showSettings, fadeAnim])

    const handleScreenPress = useCallback(() => {
        showControlsTemporarily()
    }, [showControlsTemporarily])

    // ── Webtoon scroll ──────────────────────────────────────────────────────



    // ── Standard mode image helpers ─────────────────────────────────────────

    const handleImageError = useCallback((index: number) => {
        setImageLoadError(prev => { const n = [...prev]; n[index] = true; return n })
    }, [])

    const handleImageLoad = useCallback((event: ImageLoadEventData, index: number) => {
        const { width: w, height: h } = event.source
        const cw = isWeb && screenWidth > MAX_WEBTOON_WIDTH ? MAX_WEBTOON_WIDTH : screenWidth
        const actual = (h / w) * cw
        setPageHeightsState(prev => {
            if (!actual || prev[index] === actual) return prev
            const n = [...prev]; n[index] = actual; return n
        })
    }, [isWeb])

    const handlePageSelect = useCallback((pageIndex: number) => {
        setCurrentPage(pageIndex)
        if (readingMode === 'standard') { flatListRef.current?.scrollToIndex({ index: pageIndex, animated: true }) }
        else { scrollToWebtoonPage(pageIndex) }
        setShowSettings(false)
        showControlsTemporarily()
    }, [readingMode, scrollToWebtoonPage, showControlsTemporarily])

    const switchReadingMode = (mode: ReadingMode) => {
        if (readingMode === mode) return
        setReadingMode(mode); setCurrentPage(0); setShowSettings(false); showControlsTemporarily()
        if (mode === 'standard') { flatListRef.current?.scrollToIndex({ index: 0, animated: false }) }
        else { webtoonListRef.current?.scrollToIndex({ index: 0, animated: false }) }
    }

    // ── Standard mode render ────────────────────────────────────────────────

    const renderStandardItem = useCallback(({ item: pageUrl, index }: ListRenderItemInfo<string>) => {
        const hasError = imageLoadError[index]
        const imgHeight = pageHeightsState[index] || 0

        const finalStyle: ImageStyle = imgHeight > 0
            ? { width: '100%', height: imgHeight } as ImageStyle
            : { width: '100%', aspectRatio: 0.7, minHeight: screenHeight * 0.5 } as ImageStyle

        return (
            <View style={styles.standardPageWrapper}>
                {hasError ? (
                    <View style={[styles.errorContainer, { height: screenHeight * 0.5 }]}>
                        <Ionicons name="warning-outline" size={50} color="#666" />
                        <Text style={styles.errorText}>Error loading image</Text>
                    </View>
                ) : (
                    <Image
                        source={{ uri: pageUrl }}
                        style={finalStyle}
                        contentFit="contain"
                        onError={() => handleImageError(index)}
                        onLoad={(e) => handleImageLoad(e, index)}
                        transition={150}
                        cachePolicy="memory-disk"
                    />
                )}
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.01} onPress={handleScreenPress} />
            </View>
        )
    }, [imageLoadError, pageHeightsState, handleImageError, handleImageLoad, handleScreenPress])

    // ── Loading / error ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2136f4ff" />
                <Text style={styles.loadingText}>Loading chapter...</Text>
            </View>
        )
    }

    if (pages.length === 0) {
        return (
            <View style={styles.errorScreenContainer}>
                <Ionicons name="sad-outline" size={64} color="#666" />
                <Text style={styles.errorScreenText}>Failed to load pages</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    // ── Main render ─────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden translucent backgroundColor="transparent" />

            {/* Reader content — zero touch handlers here, pure native scroll */}
            <View style={styles.readerContent}>
                {readingMode === 'webtoon' ? (
                    <FlatList
                        ref={webtoonListRef}
                        data={pages}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={({ item: url, index }) => (
                            <WebtoonPage
                                url={url}
                                ratio={pageRatios[index] ?? 1 / 1.42}
                                isWeb={isWeb}
                            />
                        )}
                        getItemLayout={(_, index) => ({
                            length: pageHeightsRef.current[index] + PAGE_GAP,
                            offset: pageOffsetsRef.current[index] ?? 0,
                            index,
                        })}
                        onViewableItemsChanged={({ viewableItems }) => {
                            if (viewableItems[0]?.index != null) setCurrentPage(viewableItems[0].index)
                        }}
                        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
                        showsVerticalScrollIndicator={true}
                        overScrollMode="never"
                        decelerationRate="normal"
                        initialNumToRender={3}
                        maxToRenderPerBatch={3}
                        windowSize={5}
                        ListFooterComponent={<View style={{ height: screenHeight / 2 }} />}
                    />
                ) : (
                    <View style={styles.standardFlatList}>
                        <FlashList
                            ref={flatListRef as any}
                            data={pages}
                            renderItem={renderStandardItem}
                            keyExtractor={(_, i) => i.toString()}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                                const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
                                if (newIndex !== currentPage) { setCurrentPage(newIndex); showControlsTemporarily() }
                            }}
                        />
                    </View>
                )}
            </View>

            {/* Header */}
            <Animated.View style={[styles.headerControls, { opacity: fadeAnim }]} pointerEvents="auto">
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.mangaTitle} numberOfLines={1}>{mangaTitle || 'Manga'}</Text>
                        <Text style={styles.chapterInfo}>
                            Pág. {currentPage + 1}/{pages.length}
                            {isOffline === 'true' && <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}> (Offline)</Text>}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconButton}>
                        <Ionicons name="options" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                        <View style={[styles.progressFill, { width: `${((currentPage + 1) / pages.length) * 100}%` }]} />
                    </View>
                </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footerControls, { opacity: fadeAnim }]} pointerEvents="auto">
                <View style={styles.footerContent}>
                    <TouchableOpacity onPress={goToPreviousPage} disabled={currentPage === 0} style={[styles.navButton, currentPage === 0 && styles.disabledButton]}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.pageIndicator}>
                        <Text style={styles.pageIndicatorText}>{currentPage + 1}/{pages.length}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={goToNextPage} disabled={currentPage === pages.length - 1} style={[styles.navButton, currentPage === pages.length - 1 && styles.disabledButton]}>
                        <Ionicons name="chevron-forward" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Settings modal */}
            <Modal visible={showSettings} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reading Settings</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>Reading Mode</Text>
                            <View style={styles.modeButtons}>
                                <TouchableOpacity onPress={() => switchReadingMode('webtoon')} style={[styles.modeButton, readingMode === 'webtoon' && styles.activeModeButton, { flex: 1 }]}>
                                    <Ionicons name="phone-portrait" size={24} color="#fff" />
                                    <Text style={styles.modeButtonText}>Webtoon/Manhwa</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>Go to Page</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pagesScroll}>
                                <View style={styles.pagesContainer}>
                                    {pages.map((_, index) => (
                                        <TouchableOpacity key={index} onPress={() => handlePageSelect(index)} style={[styles.pageButton, currentPage === index && styles.activePageButton]}>
                                            <Text style={styles.pageButtonText}>{index + 1}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#fff', marginTop: 16, fontSize: 16 },
    errorScreenContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    errorScreenText: { color: '#fff', marginBottom: 16, fontSize: 18, marginTop: 16, textAlign: 'center' },
    backButton: { padding: 16, backgroundColor: '#2136f4ff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    backButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    readerContent: { flex: 1, backgroundColor: '#000' },
    scrollView: { flex: 1, backgroundColor: '#000' },
    webtoonWrapper: {
        width: Platform.OS === 'web' && screenWidth > MAX_WEBTOON_WIDTH ? MAX_WEBTOON_WIDTH : '100%',
        alignSelf: 'center',
    },
    standardFlatList: { flex: 1 },
    standardPageWrapper: { width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    errorContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
    errorText: { color: '#fff', marginTop: 10 },
    headerControls: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconButton: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
    titleContainer: { flex: 1, marginHorizontal: 12 },
    mangaTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    chapterInfo: { color: '#aaa', fontSize: 13 },
    progressContainer: { marginTop: 12 },
    progressBackground: { height: 3, backgroundColor: '#333', borderRadius: 2 },
    progressFill: { height: 3, backgroundColor: '#2136f4ff', borderRadius: 2 },
    footerControls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 10, padding: 16 },
    footerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    navButton: { padding: 14, backgroundColor: '#2136f4ff', borderRadius: 12, minWidth: 45, alignItems: 'center' },
    disabledButton: { backgroundColor: '#333', opacity: 0.5 },
    pageIndicator: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#2a2a2a', borderRadius: 12, minWidth: 100, alignItems: 'center' },
    pageIndicatorText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    closeButton: { padding: 8 },
    settingsSection: { marginBottom: 24 },
    sectionTitle: { color: '#fff', marginBottom: 16, fontWeight: '600', fontSize: 16 },
    modeButtons: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
    modeButton: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#2a2a2a', borderRadius: 12, minHeight: 80, justifyContent: 'center' },
    activeModeButton: { backgroundColor: '#2136f4ff' },
    modeButtonText: { color: '#fff', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '500' },
    pagesScroll: { maxHeight: 60 },
    pagesContainer: { flexDirection: 'row', paddingVertical: 4 },
    pageButton: { padding: 12, marginHorizontal: 4, backgroundColor: '#2a2a2a', borderRadius: 8, minWidth: 45, height: 45, justifyContent: 'center', alignItems: 'center' },
    activePageButton: { backgroundColor: '#2136f4ff' },
    pageButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    tapZoneTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 72, zIndex: 2 },
    tapZoneBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, zIndex: 2 },
})
