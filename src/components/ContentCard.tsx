import type { Manga, Video } from "@/src/types"
import { Image } from "expo-image"
import { Link } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"

interface ContentCardProps {
  item: Video | Manga
  type: "video" | "manga"
  style?: ViewStyle
}

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * A component that displays a content item (video or manga) with a cover image,
 * title, and number of episodes or chapters.
 * 
 * @param {Video | Manga} item - The content item to display.
 * @param {"video" | "manga"} type - The type of the content item.
 * @param {ViewStyle} [style] - The style of the component.
 * 
 * @returns {JSX.Element} A JSX element representing the content item.
 */
/*******  460fae5e-9e7a-40dd-90dc-35c18a20a999  *******/
export default function ContentCard({ item, type, style }: ContentCardProps) {
  const href = (type === "video" ? `/player/${item.id}` : `/manga/${item.id}`) as any
  const imageUrl = type === "video" ? (item as Video).thumbnailUrl : (item as Manga).coverUrl

  return (
    <Link href={href} asChild>
      <TouchableOpacity style={StyleSheet.flatten([styles.container, style])} activeOpacity={0.7}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          {type === "video" && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>ANIME</Text>
            </View>
          )}
          {type === "manga" && (
            <View style={StyleSheet.flatten([styles.typeBadge, styles.mangaBadge])}>
              <Text style={styles.typeText}>MANGA</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {type === "video"
              ? `${(item as Video).episodes?.length || 0} Episodes`
              : `${(item as Manga).chapters || 0} Chapters`} {/* ✅ CORREGIDO */}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    marginRight: 12,
  },
  imageContainer: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
    marginBottom: 8,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  info: {
    width: "100%",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    color: "#aaa",
    fontSize: 12,
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(244, 117, 33, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mangaBadge: {
    backgroundColor: "rgba(0, 174, 239, 0.9)",
  },
  typeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
})