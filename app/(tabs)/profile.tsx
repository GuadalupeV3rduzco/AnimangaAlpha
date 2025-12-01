"use client"
import { useAuth } from "@/src/context/AuthContext"
import { Ionicons } from "@expo/vector-icons"
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import React, { useState } from "react"
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableOpacityProps, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

interface CustomButtonProps extends TouchableOpacityProps {
    title: string | React.ReactNode; 
    onPress: () => void;
    variant?: "primary" | "outline";
    style?: any;
    disabled?: boolean;
}

const CustomButton = ({ title, onPress, variant = 'primary', style, disabled = false }: CustomButtonProps) => {
    
    const buttonStyle = [
        customButtonStyles.base,
        variant === 'primary' ? customButtonStyles.primary : customButtonStyles.outline,
        style,
        disabled && customButtonStyles.disabled
    ];

    const textStyle = [
        customButtonStyles.textBase,
        variant === 'primary' ? customButtonStyles.textPrimary : customButtonStyles.textOutline,
        disabled && customButtonStyles.textDisabled
    ];

    return (
        <TouchableOpacity onPress={onPress} style={buttonStyle} disabled={disabled}>
            {typeof title === 'string' ? (
                <Text style={textStyle}>{title}</Text>
            ) : (
                title
            )}
        </TouchableOpacity>
    );
};

const customButtonStyles = StyleSheet.create({
    base: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: {
        backgroundColor: "#2136f4ff",
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: "#2136f4ff",
    },
    disabled: {
        opacity: 0.5,
    },
    textBase: {
        fontWeight: 'bold',
    },
    textPrimary: {
        color: '#fff',
    },
    textOutline: {
        color: "#2136f4ff",
    },
    textDisabled: {
        color: '#aaa',
    }
});


interface EditProfileModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentName: string;
    updateProfile: (displayName: string, photoURI: string | null) => Promise<void>;
    currentPhotoURL?: string | null;
}

const EditProfileModal = ({ isVisible, onClose, currentName, updateProfile, currentPhotoURL }: EditProfileModalProps) => {
    const [newName, setNewName] = useState(currentName);
    const [newPhotoURI, setNewPhotoURI] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isMobile = Platform.OS !== 'web';

    const handleClose = () => {
        setNewName(currentName);
        setNewPhotoURI(null);
        onClose();
    };

    const pickImage = async () => {
        if (!isMobile) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Permission is required to access the gallery for changing the profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewPhotoURI(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!newName || newName.trim() === "") {
            Alert.alert("Error", "Username cannot be empty");
            return;
        }
        
        const nameChanged = newName !== currentName;
        const photoChanged = newPhotoURI !== null;

        if (!nameChanged && !photoChanged) {
            handleClose();
            return;
        }

        setLoading(true);
        try {
            await updateProfile(newName, newPhotoURI);
            Alert.alert("Success", "Profile updated successfully.");
            handleClose();
        } catch (error) {
            Alert.alert("Error", "Could not update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const imageSource = newPhotoURI ? { uri: newPhotoURI } : 
                       (currentPhotoURL ? { uri: currentPhotoURL } : undefined);
                       
    const isSaveDisabled = loading || (!newName.trim()) || 
                           (newName === currentName && newPhotoURI === null);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
        >
            <View style={modalStyles.centeredView}>
                <View style={modalStyles.modalView}>
                    <Text style={modalStyles.modalTitle}>Edit Profile</Text>

                    {isMobile ? (
                        <TouchableOpacity onPress={pickImage} style={modalStyles.photoPicker}>
                            {imageSource ? (
                                <Image source={imageSource} style={modalStyles.avatarImage} contentFit="cover" />
                            ) : (
                                <View style={modalStyles.avatarPlaceholder}>
                                    <Ionicons name="camera-outline" size={30} color="#fff" />
                                </View>
                            )}
                            <Ionicons name="create" size={20} color="#fff" style={modalStyles.editIcon} />
                        </TouchableOpacity>
                    ) : (
                        <View style={modalStyles.photoPicker}>
                            {imageSource ? (
                                <Image source={imageSource} style={modalStyles.avatarImage} contentFit="cover" />
                            ) : (
                                <View style={modalStyles.avatarPlaceholder}>
                                    <Ionicons name="person" size={30} color="#fff" />
                                </View>
                            )}
                            <Text style={modalStyles.webNote}>
                                (Photo editing is not available on the Web.)
                            </Text>
                        </View>
                    )}
                    {/* -------------------------------------------------- */}


                    <TextInput
                        style={modalStyles.input}
                        placeholder="Username"
                        placeholderTextColor="#aaa"
                        value={newName}
                        onChangeText={setNewName}
                        maxLength={30}
                    />

                    <View style={modalStyles.buttonContainer}>
                        <CustomButton 
                            title="Cancel" 
                            onPress={handleClose} 
                            variant="outline" 
                            style={{ flex: 1, marginRight: 8 }} 
                            disabled={loading}
                        />
                        <CustomButton 
                            title={loading ? <ActivityIndicator color="#fff" /> : "Save"} 
                            onPress={handleSave} 
                            style={{ flex: 1, marginLeft: 8 }} 
                            disabled={isSaveDisabled}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
};


export default function Profile() {
    const { user, signOut, updateProfileInfo } = useAuth(); 
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const photoURL = user?.photoURL;
    
    const avatarContent = (Platform.OS !== 'web' && photoURL) ? (
        <Image source={{ uri: photoURL }} style={styles.avatarImage} contentFit="cover" />
    ) : (
        <Text style={styles.avatarText}>{user?.displayName?.[0] || user?.email?.[0] || "?"}</Text>
    );
    
    const defaultUserName = user?.displayName || (user?.email?.split('@')[0] || "User");


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Account</Text>

                <View style={styles.profileCard}>
                    <TouchableOpacity onPress={() => setIsModalVisible(true)} style={styles.avatarContainer}>
                        <View style={styles.avatarPlaceholder}>
                            {avatarContent}
                        </View>
                        <Ionicons name="create" size={20} color="#fff" style={styles.editIconOverlay} />
                    </TouchableOpacity>
                    
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.displayName || "User"}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        onPress={() => setIsModalVisible(true)}
                        style={styles.editButton}
                    >
                        <Ionicons name="pencil-outline" size={24} color="#2136f4ff" />
                    </TouchableOpacity>
                </View>

                <CustomButton 
                    title="Edit Profile" 
                    onPress={() => setIsModalVisible(true)} 
                    variant="primary" 
                    style={{ marginBottom: 16 }} 
                />

                <CustomButton 
                    title="Sign Out" 
                    onPress={signOut} 
                    variant="outline" 
                    style={styles.signOutButton} 
                />
            </View>

            <EditProfileModal
                isVisible={isModalVisible}
                onClose={() => setIsModalVisible(false)}
                currentName={defaultUserName}
                updateProfile={updateProfileInfo} 
                currentPhotoURL={photoURL}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#121212",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 24,
    },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#2136f4ff",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarText: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
    },
    editIconOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2a2a2a',
        borderRadius: 10,
        padding: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
    },
    userEmail: {
        color: "#aaa",
        fontSize: 14,
    },
    editButton: {
        padding: 8,
    },
    signOutButton: {
        marginTop: "auto",
    },
})

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "#1a1a1a",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    photoPicker: {
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center', 
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#2136f4ff",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#121212',
        borderRadius: 15,
        padding: 4,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#1a1a1a',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        paddingHorizontal: 15,
        color: '#fff',
        marginBottom: 15,
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 10,
    },
    webNote: {
        color: '#aaa',
        fontSize: 12,
        marginTop: 10,
        textAlign: 'center'
    },
});