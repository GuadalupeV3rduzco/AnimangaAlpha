import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from "react-native"

interface ButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "secondary" | "outline"
  style?: ViewStyle
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return "#ccc"
    switch (variant) {
      case "primary":
        return "#F47521" // Crunchyroll orange-ish
      case "secondary":
        return "#00AEEF" // Blue
      case "outline":
        return "transparent"
      default:
        return "#F47521"
    }
  }

  const getTextColor = () => {
    if (variant === "outline") return "#F47521"
    return "#fff"
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "outline" && styles.outlineButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    // Removed minWidth constraint that might cause layout issues
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#F47521",
  },
  text: {
    fontWeight: "600",
    fontSize: 16,
  },
})
