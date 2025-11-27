import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SceneMap, TabBar, TabView } from "react-native-tab-view"

const WatchListRoute = () => (
  <View style={styles.scene}>
    <View style={styles.emptyState}>
      <Ionicons name="bookmark-outline" size={64} color="#333" />
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyText}>Add anime and manga to your watchlist to keep track of them.</Text>
    </View>
  </View>
)

const HistoryRoute = () => (
  <View style={styles.scene}>
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color="#333" />
      <Text style={styles.emptyTitle}>No history</Text>
      <Text style={styles.emptyText}>Start watching or reading to see your history here.</Text>
    </View>
  </View>
)

const DownloadsRoute = () => (
  <View style={styles.scene}>
    <View style={styles.emptyState}>
      <Ionicons name="download-outline" size={64} color="#333" />
      <Text style={styles.emptyTitle}>No downloads</Text>
      <Text style={styles.emptyText}>Download content to watch or read offline.</Text>
    </View>
  </View>
)

const renderScene = SceneMap({
  watchlist: WatchListRoute,
  history: HistoryRoute,
  downloads: DownloadsRoute,
})

export default function Library() {
  const layout = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const [routes] = useState([
    { key: "watchlist", title: "Watchlist" },
    { key: "history", title: "History" },
    { key: "downloads", title: "Offline" },
  ])

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      // ✅ PROPIEDADES CORRECTAS:
      tabStyle={styles.tab}
      labelStyle={styles.label}
      activeColor="#F47521"
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
    backgroundColor: "#F47521",
    height: 3,
  },
  // ✅ ESTILOS CORRECTOS:
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