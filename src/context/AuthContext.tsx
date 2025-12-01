import { auth } from "@/src/services/firebase"
import {
    documentDirectory,
    getInfoAsync,
    makeDirectoryAsync,
    moveAsync
} from 'expo-file-system/legacy'
import { useRouter, useSegments } from "expo-router"
import {
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
    type User
} from "firebase/auth"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Alert, Platform } from 'react-native'

const PROFILE_PIC_DIR = documentDirectory + 'profile_pics/';
const saveImageLocally = async (tempUri: string, uid: string): Promise<string> => {
    const dirInfo = await getInfoAsync(PROFILE_PIC_DIR);
    if (!dirInfo.isDirectory) {
        await makeDirectoryAsync(PROFILE_PIC_DIR, { intermediates: true });
    }
    const newUri = PROFILE_PIC_DIR + `${uid}_profile.jpg`;
    await moveAsync({
        from: tempUri,
        to: newUri,
    });

    return newUri;
};

interface AuthContextType {
    user: User | null
    isLoading: boolean
    signOut: () => void
    updateProfileInfo: (displayName: string, photoURI: string | null) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}

// SOLUCIÓN: Convertir en un hook personalizado válido
function useProtectedRoute(user: User | null, isLoading: boolean) {
    const segments = useSegments()
    const router = useRouter()

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === "(auth)"

        if (!user && !inAuthGroup) {
            router.replace("/(auth)/login")
        }
        else if (user && inAuthGroup) {
            router.replace("/(tabs)")
        }
    }, [user, segments, isLoading, router])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Llamar a useProtectedRoute directamente aquí (no dentro de useEffect)
    useProtectedRoute(user, isLoading)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setIsLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const actualSignOutCore = useCallback(async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error: any) {
            console.error("ERROR AL CERRAR SESIÓN:", error);
            Alert.alert("C", error.message || "No se pudo cerrar la sesión. Intenta de nuevo.");
        }
    }, []);

    const signOut = useCallback(() => {
        Alert.alert(
            "Sign Out",
            "¿Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Exit", onPress: actualSignOutCore }
            ],
            { cancelable: true }
        );
    }, [actualSignOutCore]);

    const updateProfileInfo = useCallback(async (displayName: string, photoURI: string | null) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("User not signed in.");
        }

        let newPhotoURL = currentUser.photoURL;

        if (photoURI && Platform.OS !== 'web') {
            try {
                newPhotoURL = await saveImageLocally(photoURI, currentUser.uid);
            } catch (error) {
                Alert.alert("Error de Archivo", "No se pudo guardar la foto localmente.");
                console.error("Fallo al guardar imagen en el sistema de archivos nativo:", error);
            }
        } else if (photoURI && Platform.OS === 'web') {
            Alert.alert("Web", "La foto de perfil solo se puede guardar en iOS/Android. El nombre se actualizará.");
        }

        await updateProfile(currentUser, {
            displayName: displayName,
            photoURL: newPhotoURL
        });

        setUser({
            ...currentUser,
            displayName: displayName,
            photoURL: newPhotoURL
        });
    }, []);

    const contextValue = useMemo(() => ({
        user,
        isLoading,
        signOut,
        updateProfileInfo
    }), [user, isLoading, signOut, updateProfileInfo]);

    return <AuthContext.Provider value={contextValue}>
        {children}
    </AuthContext.Provider>
}