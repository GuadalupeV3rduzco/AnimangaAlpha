import type { Manga } from "@/src/types"
import { FlatList, StyleSheet, Text, View } from "react-native"
import ContentCard from "./ContentCard"

interface SectionProps {
  title: string
  data: Manga[]
  type: "manga"
}

export default function Section({ title, data, type }: SectionProps) {
  if (!data || !data.length) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        renderItem={({ item }) => <ContentCard item={item} type={type} />}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
  },
})