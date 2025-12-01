"use client"

import ContentCard from "@/src/components/ContentCard";
import Input from "@/src/components/Input";
import { MangaDexService } from "@/src/services/manga/MangaDexService";
import type { Manga } from "@/src/types/manga";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SearchItem {
    id: string;
    title: string;
    type: "manga" | "anime";
    coverUrl: string;
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};


export default function Search() {
    const [query, setQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<"all" | "anime" | "manga">("all")
    const [results, setResults] = useState<SearchItem[]>([])
    const [loading, setLoading] = useState(false)
    const debouncedQuery = useDebounce(query, 500);
    const fetchResults = useCallback(async (searchQuery: string) => {
        if (!searchQuery) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const mangas: Manga[] = await MangaDexService.searchMangas(searchQuery);
            const transformedResults: SearchItem[] = mangas.map(manga => ({
                id: manga.id,
                title: manga.title,
                type: "manga",
                coverUrl: manga.coverUrl || manga.thumbnailUrl || "",
            }));

            setResults(transformedResults);

        } catch (error) {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchResults(debouncedQuery);
    }, [debouncedQuery, fetchResults]);

    const filteredData = results.filter((item) => {
        const matchesType =
            activeFilter === "all" ? true : activeFilter === "anime" ? item.type === "anime" : item.type === "manga"
        return matchesType;
    });

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Text style={styles.title}>Search</Text>

                <Input
                    placeholder="Search manga..."
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                />

                <View style={styles.filters}>
                    {["Manga"].map((filter) => (
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

            {loading && (
                <ActivityIndicator size="large" color="#2136f4ff" style={{ marginTop: 20 }} />
            )}

            {!loading && (
                <FlatList
                    data={filteredData}
                    renderItem={({ item }) => <ContentCard item={{ ...item, thumbnailUrl: item.coverUrl }} type={item.type as any} style={styles.card} />}
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
            )}
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
        backgroundColor: "#2136f4ff",
        borderColor: "#2136f4ff",
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