import { MangaDexService } from '@/src/services/manga/MangaDexService'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native'
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

type ReadingMode = 'single' | 'continuous' | 'webtoon'

export default function ModernReaderScreen() {
  const { id, mangaId, chapterNumber, mangaTitle } = useLocalSearchParams()
  const router = useRouter()
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [readingMode, setReadingMode] = useState<ReadingMode>('single')
  const [imageLoadError, setImageLoadError] = useState<boolean[]>([])
  
  // ✅ CORREGIDO: Estados para zoom sin usar _value
  const [isManhwaMode, setIsManhwaMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isZooming, setIsZooming] = useState(false)
  
  const scale = useRef(new Animated.Value(1)).current
  const baseScale = useRef(new Animated.Value(1)).current
  const pinchScale = useRef(new Animated.Value(1)).current
  const lastScale = useRef(1) // ✅ Usar useRef en lugar de _value

  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    loadChapterPages()
  }, [id])

  const loadChapterPages = async () => {
    try {
      const chapterPages = await MangaDexService.getChapterPages(id as string)
      setPages(chapterPages)
      setImageLoadError(new Array(chapterPages.length).fill(false))
    } catch (error) {
      console.error('Error loading chapter pages:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ CORREGIDO: Gestos de zoom sin _value
  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true }
  )

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.min(Math.max(lastScale.current * event.nativeEvent.scale, 0.8), 3)
      
      // Actualizar valores animados
      scale.setValue(newScale)
      baseScale.setValue(1)
      pinchScale.setValue(1)
      
      // Actualizar estados
      setZoomLevel(newScale)
      setIsZooming(newScale > 1.1)
      lastScale.current = newScale
    }
  }

  const handleImageError = (index: number) => {
    const newErrors = [...imageLoadError]
    newErrors[index] = true
    setImageLoadError(newErrors)
  }

  const toggleControls = () => {
    setShowControls(!showControls)
  }

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
      scrollToPage(currentPage + 1)
      resetZoom()
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      scrollToPage(currentPage - 1)
      resetZoom()
    }
  }

  const scrollToPage = (pageIndex: number) => {
    if (scrollViewRef.current) {
      if (readingMode === 'single') {
        scrollViewRef.current.scrollTo({ x: pageIndex * screenWidth, animated: true })
      } else {
        scrollViewRef.current.scrollTo({ y: pageIndex * screenHeight, animated: true })
      }
    }
  }

  const handlePageSelect = (pageIndex: number) => {
    setCurrentPage(pageIndex)
    scrollToPage(pageIndex)
    setShowSettings(false)
    resetZoom()
  }

  // ✅ CORREGIDO: Resetear zoom
  const resetZoom = () => {
    scale.setValue(1)
    baseScale.setValue(1)
    pinchScale.setValue(1)
    setZoomLevel(1)
    setIsZooming(false)
    lastScale.current = 1
  }

  // Renderizado con soporte para zoom
  const renderPages = () => {
    if (pages.length === 0) return null

    const imageScale = Animated.multiply(baseScale, pinchScale)

    const renderImage = (pageUrl: string, index: number) => {
      if (imageLoadError[index]) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
            <Ionicons name="warning-outline" size={50} color="#666" />
            <Text style={{ color: '#fff', marginTop: 10 }}>Error cargando imagen</Text>
          </View>
        )
      }

      return (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchHandlerStateChange}
          >
            <Animated.View style={{ 
              flex: 1, 
              transform: [{ scale: isManhwaMode ? imageScale : scale }],
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Image
                source={{ uri: pageUrl }}
                style={{ 
                  width: '100%', 
                  height: isManhwaMode ? undefined : '100%',
                  aspectRatio: isManhwaMode ? 0.6 : undefined,
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
                contentFit={isManhwaMode && !isZooming ? "cover" : "contain"}
                onError={() => handleImageError(index)}
                transition={200}
              />
            </Animated.View>
          </PinchGestureHandler>
        </GestureHandlerRootView>
      )
    }

    switch (readingMode) {
      case 'single':
        return (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const page = Math.round(event.nativeEvent.contentOffset.x / screenWidth)
              setCurrentPage(page)
            }}
            scrollEventThrottle={16}
            style={{ flex: 1, backgroundColor: '#000' }}
          >
            {pages.map((pageUrl, index) => (
              <View key={index} style={{ width: screenWidth, height: screenHeight }}>
                {renderImage(pageUrl, index)}
              </View>
            ))}
          </ScrollView>
        )

      case 'continuous':
        return (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              const page = Math.floor(event.nativeEvent.contentOffset.y / screenHeight)
              setCurrentPage(Math.min(pages.length - 1, Math.max(0, page)))
            }}
            scrollEventThrottle={16}
            style={{ flex: 1, backgroundColor: '#000' }}
          >
            {pages.map((pageUrl, index) => (
              <View key={index} style={{ width: screenWidth, height: screenHeight }}>
                {renderImage(pageUrl, index)}
              </View>
            ))}
          </ScrollView>
        )

      case 'webtoon':
        return (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: '#000' }}
          >
            {pages.map((pageUrl, index) => (
              <View key={index} style={{ width: screenWidth, marginBottom: 2 }}>
                {renderImage(pageUrl, index)}
              </View>
            ))}
          </ScrollView>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F47521" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>Cargando capítulo...</Text>
      </View>
    )
  }

  if (pages.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="sad-outline" size={64} color="#666" />
        <Text style={{ color: '#fff', marginBottom: 16, fontSize: 18, marginTop: 16, textAlign: 'center' }}>
          No se pudieron cargar las páginas
        </Text>
        <TouchableOpacity 
          style={{ 
            padding: 16, 
            backgroundColor: '#F47521', 
            borderRadius: 12, 
            flexDirection: 'row', 
            alignItems: 'center',
            marginTop: 20
          }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Regresar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showControls} />
      
      {/* Header */}
      {showControls && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 20,
            paddingTop: 50,
            paddingBottom: 16,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>
                {mangaTitle || 'Manga'}
              </Text>
              <Text style={{ color: '#aaa', fontSize: 13 }}>
                Cap. {chapterNumber} • Pág. {currentPage + 1}/{pages.length}
                {isZooming && " • Zoom: " + zoomLevel.toFixed(1) + "x"}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setShowSettings(true)}
              style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
            >
              <Ionicons name="options" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={{ marginTop: 12 }}>
            <View style={{ height: 3, backgroundColor: '#333', borderRadius: 2 }}>
              <View 
                style={{ 
                  height: 3, 
                  backgroundColor: '#F47521', 
                  borderRadius: 2,
                  width: `${((currentPage + 1) / pages.length) * 100}%`
                }} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Área de lectura principal */}
      <View style={{ flex: 1 }} onTouchStart={toggleControls}>
        {renderPages()}
      </View>

      {/* Footer */}
      {showControls && (
        <View 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 20,
            padding: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <TouchableOpacity 
            onPress={goToPreviousPage}
            disabled={currentPage === 0}
            style={{
              padding: 14,
              backgroundColor: currentPage === 0 ? '#333' : '#F47521',
              borderRadius: 12,
              opacity: currentPage === 0 ? 0.5 : 1,
              minWidth: 60,
              alignItems: 'center'
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Botón de reset zoom */}
            {isZooming && (
              <TouchableOpacity 
                onPress={resetZoom}
                style={{
                  padding: 10,
                  backgroundColor: '#2a2a2a',
                  borderRadius: 8,
                  marginRight: 8
                }}
              >
                <Ionicons name="scan-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={() => setShowSettings(true)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: '#2a2a2a',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 100,
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                {currentPage + 1}/{pages.length}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={goToNextPage}
            disabled={currentPage === pages.length - 1}
            style={{
              padding: 14,
              backgroundColor: currentPage === pages.length - 1 ? '#333' : '#F47521',
              borderRadius: 12,
              opacity: currentPage === pages.length - 1 ? 0.5 : 1,
              minWidth: 60,
              alignItems: 'center'
            }}
          >
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Configuración */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
          <View style={{ 
            backgroundColor: '#1a1a1a', 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20, 
            padding: 20,
            maxHeight: '70%'
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Ajustes de Lectura</Text>
              <TouchableOpacity 
                onPress={() => setShowSettings(false)}
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Modo de Lectura */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#fff', marginBottom: 16, fontWeight: '600', fontSize: 16 }}>Modo de Lectura</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                {[
                  { mode: 'single' as ReadingMode, icon: 'document', label: 'Página' },
                  { mode: 'continuous' as ReadingMode, icon: 'albums', label: 'Continuo' },
                  { mode: 'webtoon' as ReadingMode, icon: 'phone-portrait', label: 'Webtoon' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.mode}
                    onPress={() => setReadingMode(item.mode)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      padding: 16,
                      backgroundColor: readingMode === item.mode ? '#F47521' : '#2a2a2a',
                      borderRadius: 12,
                      minHeight: 80,
                      justifyContent: 'center'
                    }}
                  >
                    <Ionicons name={item.icon as any} size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '500' }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Modo Manga/Manhwa */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#fff', marginBottom: 12, fontWeight: '600', fontSize: 16 }}>Formato</Text>
              <View style={{ flexDirection: 'row', backgroundColor: '#2a2a2a', borderRadius: 12, padding: 4 }}>
                <TouchableOpacity
                  onPress={() => setIsManhwaMode(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: !isManhwaMode ? '#F47521' : 'transparent',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Manga</Text>
                  <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>Horizontal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsManhwaMode(true)}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: isManhwaMode ? '#F47521' : 'transparent',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Manhwa</Text>
                  <Text style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>Vertical</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selector de Páginas */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#fff', marginBottom: 12, fontWeight: '600', fontSize: 16 }}>Ir a Página</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 60 }}>
                <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
                  {pages.slice(0, 20).map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handlePageSelect(index)}
                      style={{
                        padding: 12,
                        marginHorizontal: 4,
                        backgroundColor: currentPage === index ? '#F47521' : '#2a2a2a',
                        borderRadius: 8,
                        minWidth: 45,
                        height: 45,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Instrucciones de Zoom */}
            <View style={{ backgroundColor: '#2a2a2a', padding: 12, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 4 }}>📱 Controles Táctiles</Text>
              <Text style={{ color: '#aaa', fontSize: 12 }}>
                • Pellizcar para hacer zoom{'\n'}
                • Tocar botón ↻ para resetear{'\n'}
                • Deslizar para cambiar página
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}