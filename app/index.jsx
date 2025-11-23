import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
	Image,
	StyleSheet,
	ToastAndroid,
	TouchableOpacity,
	View
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GALLERY_STORAGE_KEY } from './config';
 
// AsyncStorage.setItem(GALLERY_STORAGE_KEY, '').then(() => console.log("RESET"));

export default function CaptureScreen() {
	const isFocused = useIsFocused(); // Detect if this screen is in focus
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
	const [lastCaptureUri, setLastCapture] = useState(null);
	const [facing, setFacing] = useState('back');
	const cameraRef = useRef(null);
	const router = useRouter();

	const takePhoto = async () => {
		if (cameraRef.current) {
			try {
				const photo = await cameraRef.current.takePictureAsync();
				
				// Request media library permission if not granted
				if (!mediaPermission?.granted) {
					await requestMediaPermission();
				}
				
				// Save to media library
				const asset = await MediaLibrary.createAssetAsync(photo.uri);

				// Stringified list of all previous captures
				const oldPhotos = await AsyncStorage.getItem(GALLERY_STORAGE_KEY);
				// Array to hold all total captures
				let allPhotos = [];
				
				// Photos have been previously saved
				if (oldPhotos) {
					// Convert from AsyncStorage string to an array
					allPhotos = JSON.parse(oldPhotos);
				}

				// Add the asset ID at the top of the list
				// So newer items appear on top
				allPhotos.unshift(asset.id);

				// Add the photo-list to storage
				await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(allPhotos));

				// Update the gallery thumbnail
				setLastCapture(asset.uri);
				
				ToastAndroid.showWithGravity("Photo saved to gallery!", 1000, ToastAndroid.TOP);
			} catch (error) {
				ToastAndroid.showWithGravity("Failed to take photo: " + error.message, 1000, ToastAndroid.TOP);
			}
		}
	};

	// Return the last captured URI
	const updateLastCapture = async () => {
		// Get the captured photos
		let allPhotos = await AsyncStorage.getItem(GALLERY_STORAGE_KEY);

		console.log(allPhotos);
		console.log("WTF")

		// Do nothing if no previous photos
		if (!allPhotos || allPhotos === '') {
			setLastCapture(null);
			return;
		};

		allPhotos = JSON.parse(allPhotos);

		if (allPhotos.length == 0) {
			setLastCapture(null);
			return;
		}

		const lastAsset = await MediaLibrary.getAssetInfoAsync(allPhotos[0]);

		// Return the top image
		setLastCapture(lastAsset.uri);
	}

	// Reload the gallery each time the screen is refocused
	useEffect(() => {
		if (isFocused) updateLastCapture();
	}, [isFocused]);

	const toggleCameraFacing = () => {
		setFacing(current => (current === 'back' ? 'front' : 'back'));
	};

	if (!cameraPermission) {
		return (
			<View style={styles.container}>
				<Text variant="bodyMedium">Requesting camera permission...</Text>
			</View>
		);
	}

	if (!cameraPermission.granted) {
		return (
			<View style={styles.permissionContainer}>
				<Text variant="bodyMedium" style={styles.permissionText}>
					Camera permission is required to take photos
				</Text>
				<Button onPress={requestCameraPermission}>Grant Camera Permission</Button>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Camera Preview */}
			<CameraView style={styles.camera} ref={cameraRef} facing={facing}>
				<View style={styles.cameraOverlay}>
					<TouchableOpacity 
						style={styles.flipButton} 
						onPress={toggleCameraFacing}
					>
						<MaterialCommunityIcons name="camera-flip" size={32} color="white" />
					</TouchableOpacity>
				</View>
			</CameraView>

			<View style={styles.row}>
				{/* Photo Gallery Button */}
				{ lastCaptureUri && (
					<TouchableOpacity
						style={styles.galleryPreview}
						onPress={() => router.push("./gallery")}
					>
						<Image source={{ uri: lastCaptureUri }} style={styles.galleryPreviewImage} />
					</TouchableOpacity>
				)}

				{/* Controls */}
				<View style={styles.controls}>
					<TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
						<View style={styles.captureButtonInner} />
					</TouchableOpacity>
				</View>
			</View>
			
		</View>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#000' 
	},
	permissionContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	permissionText: {
		textAlign: 'center',
		marginBottom: 20,
		fontSize: 16,
	},
	row: {
		flexDirection: "row",
        marginVertical: 10,
        alignItems: "center",
        gap: 8,
	},
	galleryPreview: {
		position: 'absolute',
		bottom: 0,
		left: 10,
		zIndex: 1,
		width: 100,
		height: 100,
		margin: 8
	},
	galleryPreviewImage: {
		borderRadius: 8, 
		width: '100%', 
		height: '100%'
	},
	camera: { 
		flex: 1 
	},
	cameraOverlay: {
		flex: 1,
		backgroundColor: 'transparent',
		padding: 20,
	},
	flipButton: {
		alignSelf: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.5)',
		padding: 10,
		borderRadius: 50,
	},
	controls: { 
		flex: 1,
		padding: 20,
		alignItems: 'center',
		backgroundColor: '#000',
	},
	captureButton: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: 'white',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 4,
		borderColor: '#ddd',
	},
	captureButtonInner: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: 'white',
	},
	galleryContainer: {
		backgroundColor: '#1a1a1a',
		paddingVertical: 8,
		height: '100%',
	},
});