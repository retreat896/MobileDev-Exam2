import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import {
	Image,
	StyleSheet,
	ToastAndroid,
	TouchableOpacity,
	View
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import MediaBar from '../components/MediaBar';

export default function CaptureScreen() {
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
	const [photos, setPhotos] = useState([]);
	const [facing, setFacing] = useState('back');
	const [galleryDisplay, setGalleryDisplay] = useState(false);
	const cameraRef = useRef(null);

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
				
				// Add to state for display
				setPhotos(prev => [asset, ...prev]);
				
				ToastAndroid.showWithGravity("Photo saved to gallery!", 1000, ToastAndroid.TOP);
			} catch (error) {
				ToastAndroid.showWithGravity("Failed to take photo: " + error.message, 1000, ToastAndroid.TOP);
			}
		}
	};

	// New function to handle removing a single photo
	const removePhoto = async (...assets) => {
		console.log("Deleting " + assets.length + " assets");
		
		// Filter all photos not from 'assets'
		const updatedPhotos = photos.filter(photo => !assets.includes(photo));

		// Update the photos list
		setPhotos(updatedPhotos);
		
		// Delete all passed assets from the filesystem
		await MediaLibrary.deleteAssetsAsync(assets);
		
		ToastAndroid.showWithGravity("Deleted " + assets.length + " assets.", ToastAndroid.LONG, ToastAndroid.TOP);

		if (galleryDisplay && updatedPhotos.length == 0) {
			setGalleryDisplay(false);
		}
	};

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

	if (galleryDisplay && photos.length > 0) {
		return (
			/* Photo Gallery - Replace with MediaBar */
			<View style={styles.galleryContainer}>
				<MediaBar 
					media={photos}
					columns={4}
					thumbnailSize={100}
					removeItems={removePhoto}
					onExit={() => setGalleryDisplay(false)}
				/>
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
				{ !galleryDisplay && photos.length > 0 && (
					<TouchableOpacity
						style={styles.galleryPreview}	

						onPress={() => setGalleryDisplay(true)}
					>
						<Image source={{ uri: photos[0].uri }} style={styles.galleryPreviewImage} />
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