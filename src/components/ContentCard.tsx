import type { Manga, Video } from "@/src/types"
import { Image } from "expo-image"
import { Link } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native"

interface ContentCardProps {
  item: Video | Manga
  type: "video" | "manga"
  style?: ViewStyle
}

export default function ContentCard({ item, type, style }: ContentCardProps) {
  const getHref = () => {
    if (type === "video") {
      const videoItem = item as Video;
      return `/player/${videoItem.id}` as any;
    } else {
      return `/manga/${item.id}` as any;
    }
  }

  const href = getHref();
  const imageUrl = type === "video" ? (item as Video).thumbnailUrl : (item as Manga).coverUrl;


  const getSubtitleText = () => {
    if (type === "video") {
      const videoItem = item as Video;
      return `${videoItem.episodes || 0} Episodios`;
    } else {
      const mangaItem = item as Manga;
      return `${mangaItem.chapters || 0} Capítulos`;
    }
  };

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
            {getSubtitleText()}
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
    backgroundColor: "rgba(64, 141, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mangaBadge: {
    backgroundColor: "rgba(36, 0, 239, 0.9)",
  },
  typeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  localBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(34, 197, 94, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  localBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
})