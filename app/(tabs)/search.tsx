"use client"

import { useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Input from "@/src/components/Input"
import ContentCard from "@/src/components/ContentCard"

// Reuse mock data for now
const MOCK_DATA = [
  {
    id: "1",
    title: "Demon Slayer",
    type: "video",
    thumbnailUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "2",
    title: "Jujutsu Kaisen",
    type: "video",
    thumbnailUrl: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "1",
    title: "One Piece",
    type: "manga",
    coverUrl: "https://images.unsplash.com/photo-1590412259952-61d6d549c91e?w=800&auto=format&fit=crop&q=60",
  },
  {
    id: "2",
    title: "Chainsaw Man",
    type: "manga",
    coverUrl: "https://images.unsplash.com/photo-1612404730960-5c7157acca2a?w=800&auto=format&fit=crop&q=60",
  },
]

export default function Search() {
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "anime" | "manga">("all")

  const filteredData = MOCK_DATA.filter((item) => {
    const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase())
    const matchesType =
      activeFilter === "all" ? true : activeFilter === "anime" ? item.type === "video" : item.type === "manga"
    return matchesQuery && matchesType
  })

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Input placeholder="Search anime or manga..." value={query} onChangeText={setQuery} style={styles.input} />

        <View style={styles.filters}>
          {["All", "Anime", "Manga"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter.toLowerCase() && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter.toLowerCase() as any)}
            >
              <Text style={[styles.filterText, activeFilter === filter.toLowerCase() && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredData}
        renderItem={({ item }) => <ContentCard item={item as any} type={item.type as any} style={styles.card} />}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {query ? "No results found" : "Start searching for your favorite content"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#333",
  },
  activeFilterChip: {
    backgroundColor: "#F47521",
    borderColor: "#F47521",
  },
  filterText: {
    color: "#ccc",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "48%",
    marginRight: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
})
