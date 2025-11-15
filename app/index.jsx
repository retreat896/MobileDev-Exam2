import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function CaptureScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [photos, setPhotos] = useState([]);
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
        
        // Add to state for display
        setPhotos(prev => [asset, ...prev]);
        
        Alert.alert('Success', 'Photo saved to gallery!');
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo: ' + error.message);
      }
    }
  };

  const clearPhotos = () => {
    Alert.alert(
      'Clear All Photos',
      'Are you sure you want to clear all photos from this view?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setPhotos([]) }
      ]
    );
  };

  const deletePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to take photos
        </Text>
        <Button title="Grant Camera Permission" onPress={requestCameraPermission} />
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
      
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <View style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>
              Saved Photos ({photos.length})
            </Text>
            <Button title="Clear All" onPress={clearPhotos} color="#ff4444" />
          </View>
          
          <FlatList
            data={photos}
            horizontal
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.thumbnailContainer}
                onPress={()=> router.navigate(`/tracking?assetId=${item.id}`)}
                onLongPress={() => deletePhoto(index)}
              >
                <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              </TouchableOpacity>
            )}
            keyExtractor={(item)=>item.id}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
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
    padding: 10,
    maxHeight: 150,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  galleryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    marginRight: 10,
  },
  thumbnail: { 
    width: 100, 
    height: 100, 
    borderRadius: 8,
  },
});
