import { getDownloadedChapterById } from '@/src/services/manga/downloadService'
import { saveProgress } from '@/src/services/manga/historyService'
import { MangaDexService } from '@/src/services/manga/MangaDexService'
import { Ionicons } from '@expo/vector-icons'
import { Image, ImageLoadEventData, ImageStyle } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    ListRenderItemInfo,
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
const MAX_WEBTOON_WIDTH = 850;
type ReadingMode = 'webtoon' | 'standard';
type PageMetrics = {
    height: number;
    offsetY: number;
}

type ScrollComponent = ScrollView | FlatList | null;
type Chapter = {
    id: string;
    chapter: string;
};

const REAL_CHAPTER_LIST: Chapter[] = [
    { id: 'chap_10_id', chapter: '10' },
    { id: 'chap_11_id', chapter: '11' },
    { id: 'chap_12_id', chapter: '12' },
    { id: 'chap_13_id', chapter: '13' },
    { id: 'chap_14_id', chapter: '14' },
];


export default function ModernReaderScreen() {
    const { id, mangaId, chapterNumber, mangaTitle, mangaCoverUrl, isOffline } = useLocalSearchParams()
    const router = useRouter()
    const [pages, setPages] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [readingMode, setReadingMode] = useState<ReadingMode>('webtoon')
    const [currentPage, setCurrentPage] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [imageLoadError, setImageLoadError] = useState<boolean[]>([])
    const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
    const scrollViewRef = useRef<ScrollComponent>(null)
    const controlsTimeoutRef = useRef<number | null>(null)
    const fadeAnim = useRef(new Animated.Value(1)).current
    const isWeb = Platform.OS === 'web';
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const flatListRef = useRef<FlatList<string> | null>(null);
    const buscarSiguienteId = (): { id: string, number: string } | null => {
        const currentChapterNumber = chapterNumber as string;
        const currentIndex = REAL_CHAPTER_LIST.findIndex(c => c.chapter === currentChapterNumber);
        if (currentIndex !== -1 && currentIndex < REAL_CHAPTER_LIST.length - 1) {
            return { id: REAL_CHAPTER_LIST[currentIndex + 1].id, number: REAL_CHAPTER_LIST[currentIndex + 1].chapter };
        }
        return null;
    };

    const buscarAnteriorId = (): { id: string, number: string } | null => {
        const currentChapterNumber = chapterNumber as string;
        const currentIndex = REAL_CHAPTER_LIST.findIndex(c => c.chapter === currentChapterNumber);
        if (currentIndex > 0) {
            return { id: REAL_CHAPTER_LIST[currentIndex - 1].id, number: REAL_CHAPTER_LIST[currentIndex - 1].chapter };
        }
        return null;
    };

    const goToNextChapter = () => {
        const nextChapterData = buscarSiguienteId();
        if (nextChapterData) {
            router.replace({
                pathname: '/reader/[id]',
                params: {
                    id: nextChapterData.id,
                    mangaId: mangaId as string,
                    chapterNumber: nextChapterData.number,
                    mangaTitle: mangaTitle as string

                }
            });
            showControlsTemporarily();
        } else {
            router.back();
        }
    };

    const goToPreviousChapter = () => {
        const previousChapterData = buscarAnteriorId();
        if (previousChapterData) {
            router.replace({
                pathname: '/reader/[id]',
                params: {
                    id: previousChapterData.id,
                    mangaId: mangaId as string,
                    chapterNumber: previousChapterData.number,
                    mangaTitle: mangaTitle as string
                }
            });
            showControlsTemporarily();
        } else {
            router.back();
        }
    };

    const scrollToPage = (pageIndex: number) => {
        if (!scrollViewRef.current || readingMode !== 'webtoon') return;

        const offset = pageMetrics[pageIndex]?.offsetY || 0;
        const targetOffset = pageMetrics[pageIndex]?.height > 0 ? offset : 0;

        (scrollViewRef.current as ScrollView).scrollTo({ y: targetOffset, animated: true });
    }

    const goToNextPage = useCallback(() => {
        if (currentPage < pages.length - 1) {
            const nextPage = currentPage + 1
            setCurrentPage(nextPage)

            if (readingMode === 'webtoon') {
                scrollToPage(nextPage)
            } else if (flatListRef.current) {
                (flatListRef.current as FlatList<string>).scrollToIndex({ index: nextPage, animated: true });
            }
            showControlsTemporarily()
        } else {
            goToNextChapter();
        }
    }, [currentPage, pages.length, readingMode, goToNextChapter]);

    const goToPreviousPage = useCallback(() => {
        if (currentPage > 0) {
            const prevPage = currentPage - 1
            setCurrentPage(prevPage)

            if (readingMode === 'webtoon') {
                scrollToPage(prevPage)
            } else if (flatListRef.current) {
                (flatListRef.current as FlatList<string>).scrollToIndex({ index: prevPage, animated: true });
            }
            showControlsTemporarily()
        } else {
            goToPreviousChapter();
        }
    }, [currentPage, readingMode, goToPreviousChapter]);


    useEffect(() => {
        if (!loading && pages.length > 0 && currentPage >= 0 &&
            id && mangaId && chapterNumber && mangaTitle && coverUrl) {
            const entry = {
                mangaId: mangaId as string,
                mangaTitle: mangaTitle as string,
                lastReadChapterId: id as string,
                lastReadChapterNumber: chapterNumber as string,
                lastReadPageIndex: currentPage,
                totalChapterPages: pages.length,
                coverUrl: coverUrl as string,
            };

            saveProgress(entry);
            console.log(`✅ Progreso guardado: Pág. ${currentPage + 1}/${pages.length} del Cap. ${chapterNumber}`);
        } else if (!coverUrl) {
            console.warn('⚠️ coverUrl no disponible aún, esperando...');
        }
    }, [id, mangaId, chapterNumber, mangaTitle, coverUrl, pages.length, currentPage, loading, isOffline]);

    useEffect(() => {
        const fetchCoverUrl = async () => {
            if (mangaCoverUrl) {
                setCoverUrl(mangaCoverUrl as string);
                console.log('✅ Portada de params:', mangaCoverUrl);
                return;
            }

            if (mangaId) {
                try {
                    console.log('🔍 Obteniendo portada desde API...');
                    const manga = await MangaDexService.getMangaById(mangaId as string);
                    if (manga?.coverUrl) {
                        setCoverUrl(manga.coverUrl);
                        console.log('✅ Portada de API:', manga.coverUrl);
                    }
                } catch (error) {
                    console.error('❌ Error obteniendo portada:', error)
                }
            }
        };

        fetchCoverUrl();
    }, [mangaId, mangaCoverUrl]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (loading || showSettings) return;
            if (event.code === 'Space' || event.code === 'ArrowRight' || event.code === 'ArrowDown') {
                event.preventDefault();
                goToNextPage();
            }
            else if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
                event.preventDefault();
                goToPreviousPage();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [goToNextPage, goToPreviousPage, loading, showSettings]);

    useEffect(() => {
        loadChapterPages()
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
            }
        }
    }, [id, isOffline])

    useEffect(() => {
        console.log('=== PARÁMETROS RECIBIDOS ===');
        console.log('id:', id);
        console.log('mangaId:', mangaId);
        console.log('chapterNumber:', chapterNumber);
        console.log('mangaTitle:', mangaTitle);
        console.log('isOffline:', isOffline);
    }, [id, mangaId, chapterNumber, mangaTitle, isOffline]);


    useEffect(() => {
        if (!loading && pages.length > 0) {
            const scrollIndex = 0;
            setCurrentPage(scrollIndex);

            if (readingMode === 'standard') {
                flatListRef.current?.scrollToIndex({ index: scrollIndex, animated: false });
            } else if (scrollViewRef.current) {
                (scrollViewRef.current as ScrollView).scrollTo({ y: 0, animated: false });
            }
        }
    }, [loading, readingMode, pages.length]);

    const loadChapterPages = async () => {
        setLoading(true)
        try {
            let chapterPages: string[] = [];
            if (isOffline === 'true' && id) {
                console.log('🔴 Modo Offline: Intentando cargar páginas de descarga...');
                const downloadedChapter = await getDownloadedChapterById(id as string);
                if (downloadedChapter) {
                    chapterPages = downloadedChapter.pageUrls;
                    console.log(`✅ Páginas cargadas desde offline: ${chapterPages.length}`);
                } else {
                    console.warn('⚠️ Capítulo no encontrado en descargas, intentando cargar de la API.');
                    chapterPages = await MangaDexService.getChapterPages(id as string)
                }
            } else {
                console.log('🌐 Modo Online: Cargando páginas de la API...');
                chapterPages = await MangaDexService.getChapterPages(id as string)
            }

            setPages(chapterPages)
            setImageLoadError(new Array(chapterPages.length).fill(false))
            setPageMetrics(new Array(chapterPages.length).fill({ height: 0, offsetY: 0 }));
            setCurrentPage(0);
        } catch (error) {
            console.error('Error loading chapter pages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageError = (index: number) => {
        const newErrors = [...imageLoadError]
        newErrors[index] = true
        setImageLoadError(newErrors)
    }

    const handleImageLoad = (event: ImageLoadEventData, index: number) => {
        const { width, height } = event.source;

        const containerWidth = isWeb && screenWidth > MAX_WEBTOON_WIDTH
            ? MAX_WEBTOON_WIDTH
            : screenWidth;

        const actualHeight = (height / width) * containerWidth;

        setPageMetrics(prevMetrics => {
            if (actualHeight > 0 && prevMetrics[index]?.height !== actualHeight) {
                const newMetrics = [...prevMetrics];

                let newOffsetY = 0;
                for (let i = 0; i < index; i++) {
                    newOffsetY += (newMetrics[i]?.height || 0) + 10;
                }

                newMetrics[index] = { height: actualHeight, offsetY: newOffsetY };

                return newMetrics;
            }
            return prevMetrics;
        });
    };

    const showControlsTemporarily = () => {
        if (showSettings) return;

        setShowControls(true)
        fadeAnim.setValue(1)

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }

        controlsTimeoutRef.current = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    setShowControls(false)
                }
            })
        }, 3000)
    }

    const handleScreenPress = (event: any) => {
        if (showControls) {
            hideControls()
        } else {
            showControlsTemporarily()
        }
    }

    const hideControls = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
        }
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setShowControls(false)
            }
        })
    }

    const handlePageSelect = (pageIndex: number) => {
        setCurrentPage(pageIndex)
        if (readingMode === 'standard' && flatListRef.current) {
            (flatListRef.current as FlatList<string>).scrollToIndex({ index: pageIndex, animated: true });
        } else {
            scrollToPage(pageIndex)
        }
        setShowSettings(false)
        showControlsTemporarily()
    }

    const handleWebtoonScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (readingMode !== 'webtoon') return;

        const scrollY = event.nativeEvent.contentOffset.y
        const totalMetrics = pageMetrics.filter(m => m.height > 0);
        if (totalMetrics.length === 0) return;
        let currentPageIndex = 0;
        for (let i = 0; i < totalMetrics.length; i++) {
            if (scrollY >= totalMetrics[i].offsetY - (totalMetrics[i].height / 2)) {
                currentPageIndex = i;
            } else {
                break;
            }
        }

        if (currentPageIndex !== currentPage) {
            setCurrentPage(currentPageIndex)
        }
    }

    const renderImageComponent = (pageUrl: string, index: number, isStandardMode: boolean = false) => {
        if (imageLoadError[index]) {
            return (
                <View style={[styles.errorContainer, { height: screenHeight * 0.5 }]}>
                    <Ionicons name="warning-outline" size={50} color="#666" />
                    <Text style={styles.errorText}>Error loading image</Text>
                </View>
            )
        }

        const imageContentFit = isStandardMode ? "contain" : (!isWeb ? "contain" : "cover");

        const baseStyle: ImageStyle = isStandardMode
            ? styles.standardImage
            : styles.manhwaImageFallback as ImageStyle;

        let finalImageStyle: ImageStyle;

        if (isStandardMode) {
            finalImageStyle = styles.standardImage;
        } else {
            finalImageStyle = pageMetrics[index]?.height > 0 ?
                {
                    ...baseStyle,
                    height: pageMetrics[index].height,
                    aspectRatio: undefined,
                    minHeight: undefined,
                } as ImageStyle :
                baseStyle;
        }

        return (
            <View
                style={[
                    styles.webtoonImageContainer,
                    !isStandardMode && pageMetrics[index]?.height > 0 && { height: pageMetrics[index].height },
                    isStandardMode && styles.standardPageContainer
                ]}
            >
                <Image
                    source={{ uri: pageUrl }}
                    style={finalImageStyle}
                    contentFit={imageContentFit}
                    onError={() => handleImageError(index)}
                    onLoad={(event) => handleImageLoad(event, index)}
                    transition={200}
                    cachePolicy="memory-disk"
                />
                {!isStandardMode && pageMetrics[index]?.height === 0 && (
                    <ActivityIndicator size="small" color="#2136f4ff" style={StyleSheet.absoluteFill} />
                )}
            </View>
        )
    }

    const renderWebtoonMode = () => {
        return (
            <View style={styles.webtoonWrapper}>
                <ScrollView
                    ref={scrollViewRef as any}
                    showsVerticalScrollIndicator={true}
                    onScroll={handleWebtoonScroll}
                    scrollEventThrottle={200}
                    style={styles.scrollView}
                    scrollEnabled={readingMode === 'webtoon'}
                >
                    {pages.map((pageUrl, index) => (
                        <View
                            key={index}
                            style={styles.webtoonPageContainer}
                        >
                            {renderImageComponent(pageUrl, index, false)}
                        </View>
                    ))}
                    <View style={{ height: screenHeight / 2 }} />
                </ScrollView>
            </View>
        );
    }

    const renderStandardMode = () => {
        const renderItem = ({ item: pageUrl, index }: ListRenderItemInfo<string>) => (
            <View style={styles.standardPageWrapper}>
                {renderImageComponent(pageUrl, index, true)}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={0.01}
                    onPress={handleScreenPress}
                />
            </View>
        );

        const handleScrollHorizontal = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const xOffset = e.nativeEvent.contentOffset.x;
            const newIndex = Math.round(xOffset / screenWidth);
            if (newIndex !== currentPage) {
                setCurrentPage(newIndex);
                showControlsTemporarily();
            }
        }

        return (
            <FlatList
                ref={flatListRef as any}
                data={pages}
                renderItem={renderItem}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollHorizontal}
                style={styles.standardFlatList}
                getItemLayout={(data, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                })}
            />
        );
    }

    const renderPages = () => {
        if (pages.length === 0) return null

        if (readingMode === 'webtoon') {
            return renderWebtoonMode();
        }

        return renderStandardMode();
    }

    const switchReadingMode = (mode: ReadingMode) => {
        if (readingMode === mode) return;

        setReadingMode(mode);
        setCurrentPage(0);
        setShowSettings(false);
        showControlsTemporarily();

        if (mode === 'standard' && flatListRef.current) {
            (flatListRef.current as FlatList<string>).scrollToIndex({ index: 0, animated: false });
        } else if (mode === 'webtoon' && scrollViewRef.current) {
            (scrollViewRef.current as ScrollView).scrollTo({ y: 0, animated: false });
        }
    }


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2136f4ff" />
                <Text style={styles.loadingText}>Loading chapter..</Text>
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden={!showControls} translucent backgroundColor="transparent" />
            {readingMode === 'webtoon' && (
                <View
                    style={[styles.touchArea, styles.webtoonTouchArea]}
                    pointerEvents={showControls ? 'auto' : 'box-none'}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleScreenPress}
                    >
                    </TouchableOpacity>
                </View>
            )}

            <Animated.View
                style={[
                    styles.headerControls,
                    { opacity: fadeAnim }
                ]}
                pointerEvents={showControls ? 'auto' : 'none'}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.titleContainer}>
                        <Text style={styles.mangaTitle} numberOfLines={1}>
                            {mangaTitle || 'Manga'}
                        </Text>
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
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${((currentPage + 1) / pages.length) * 100}%` }
                            ]}
                        />
                    </View>
                </View>
            </Animated.View>

            <View style={styles.readerContent}>
                {renderPages()}
            </View>

            <Animated.View
                style={[
                    styles.footerControls,
                    { opacity: fadeAnim }
                ]}
                pointerEvents={showControls ? 'auto' : 'none'}
            >
                <View style={styles.footerContent}>
                    <TouchableOpacity
                        onPress={goToPreviousChapter}
                        style={[styles.navButton, { display: 'none' }]}
                    >
                        <Ionicons name="play-skip-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goToPreviousPage}
                        disabled={currentPage === 0}
                        style={[
                            styles.navButton,
                            currentPage === 0 && styles.disabledButton
                        ]}
                    >
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowSettings(true)}
                        style={styles.pageIndicator}
                    >
                        <Text style={styles.pageIndicatorText}>
                            {currentPage + 1}/{pages.length}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goToNextPage}
                        disabled={currentPage === pages.length - 1}
                        style={[
                            styles.navButton,
                            currentPage === pages.length - 1 && styles.disabledButton
                        ]}
                    >
                        <Ionicons name="chevron-forward" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goToNextChapter}
                        style={[styles.navButton, { display: 'none' }]}
                    >
                        <Ionicons name="play-skip-forward" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
            <Modal
                visible={showSettings}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => setShowSettings(false)}
            >
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
                                <TouchableOpacity
                                    onPress={() => switchReadingMode('webtoon')}
                                    style={[styles.modeButton, readingMode === 'webtoon' && styles.activeModeButton, { flex: 1 }]}
                                >
                                    <Ionicons name="phone-portrait" size={24} color="#fff" />
                                    <Text style={styles.modeButtonText}>Webtoon/Manhwa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modeButton, { display: 'none' }]} 
                                >
                                    <Ionicons name="tablet-landscape" size={24} color="#fff" />
                                    <Text style={styles.modeButtonText}>Estándar/Página</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.settingsSection}>
                            <Text style={styles.sectionTitle}>Go to Page</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pagesScroll}>
                                <View style={styles.pagesContainer}>
                                    {pages.map((_, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handlePageSelect(index)}
                                            style={[
                                                styles.pageButton,
                                                currentPage === index && styles.activePageButton
                                            ]}
                                        >
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
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    touchArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    webtoonTouchArea: {
        top: screenHeight / 3,
        bottom: screenHeight / 3,
        left: 0,
        right: 0,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 16,
    },
    errorScreenContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorScreenText: {
        color: '#fff',
        marginBottom: 16,
        fontSize: 18,
        marginTop: 16,
        textAlign: 'center',
    },
    backButton: {
        padding: 16,
        backgroundColor: '#2136f4ff',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    headerControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 10,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    mangaTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    chapterInfo: {
        color: '#aaa',
        fontSize: 13,
    },
    progressContainer: {
        marginTop: 12,
    },
    progressBackground: {
        height: 3,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    progressFill: {
        height: 3,
        backgroundColor: '#2136f4ff',
        borderRadius: 2,
    },
    readerContent: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#000',
    },
    webtoonWrapper: {
        flex: 1,
        width: Platform.OS === 'web' && screenWidth > MAX_WEBTOON_WIDTH
            ? MAX_WEBTOON_WIDTH
            : '100%',
        alignSelf: 'center',
    },
    webtoonPageContainer: {
        width: '100%',
        marginBottom: 10,
    },
    webtoonImageContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    manhwaImageFallback: {
        width: '100%',
        aspectRatio: 0.7,
        minHeight: screenHeight * 0.5,
    } as ImageStyle,

    standardFlatList: {
        flex: 1,
    },
    standardPageWrapper: {
        width: screenWidth,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    standardPageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    standardImage: {
        width: '100%',
        height: '100%',
    } as ImageStyle,

    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    errorText: {
        color: '#fff',
        marginTop: 10,
    },
    footerControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 10,
        padding: 16,
    },
    footerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navButton: {
        padding: 14,
        backgroundColor: '#2136f4ff',
        borderRadius: 12,
        minWidth: 45,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#333',
        opacity: 0.5,
    },
    pageIndicator: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center',
    },
    pageIndicatorText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    settingsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#fff',
        marginBottom: 16,
        fontWeight: '600',
        fontSize: 16,
    },
    modeButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 8,
    },
    modeButton: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        minHeight: 80,
        justifyContent: 'center',
    },
    activeModeButton: {
        backgroundColor: '#2136f4ff',
    },
    modeButtonText: {
        color: '#fff',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    pagesScroll: {
        maxHeight: 60,
    },
    pagesContainer: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    pageButton: {
        padding: 12,
        marginHorizontal: 4,
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        minWidth: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activePageButton: {
        backgroundColor: '#2136f4ff',
    },
    pageButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    instructions: {
        backgroundColor: '#2a2a2a',
        padding: 12,
        borderRadius: 8,
        marginTop: 24,
    },
    instructionsTitle: {
        color: '#fff',
        fontWeight: '600',
        marginBottom: 4,
    },
    instructionsText: {
        color: '#aaa',
        fontSize: 12,
        lineHeight: 18,
    },
})