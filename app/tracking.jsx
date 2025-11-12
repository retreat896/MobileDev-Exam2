import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function TrackingScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [tracking, setTracking] = useState(false);
  
  // NEW: State to hold the dynamic position and dimensions of the bounding box
  const [detectionBox, setDetectionBox] = useState({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    detected: false 
  });

  const [detectionInfo, setDetectionInfo] = useState('Not tracking');
  const [targetColor, setTargetColor] = useState('#00ff00'); // Green
  const [facing, setFacing] = useState('back');
  const [sensitivity, setSensitivity] = useState(30);
  const [showSettings, setShowSettings] = useState(false);
  
  const cameraRef = useRef(null);
  const trackingInterval = useRef(null);

  // Color detection simulation (in real app, use frame processor)
  useEffect(() => {
    if (tracking) {
      trackingInterval.current = setInterval(() => {
        // In a real app, you would use results from an image analysis pipeline.
        
        const detected = Math.random() > 0.6; // Simulated detection
        
        if (detected) {
          // Simulate dynamic bounding box properties 
          // (These values must be scaled coordinates matching the PreviewView size)
          const newX = Math.floor(Math.random() * 300) + 50; 
          const newY = Math.floor(Math.random() * 500) + 100;
          const newWidth = Math.floor(Math.random() * 100) + 50;
          const newHeight = Math.floor(Math.random() * 100) + 50;
          
          setDetectionBox({ 
            x: newX, 
            y: newY, 
            width: newWidth, 
            height: newHeight, 
            detected: true 
          });

          setDetectionInfo(
            `✓ Object Detected\nColor: ${targetColor}\nPosition: (${newX}, ${newY})`
          );
        } else {
          setDetectionBox({ x: 0, y: 0, width: 0, height: 0, detected: false });
          setDetectionInfo('Scanning for target color...');
        }
      }, 500);
    } else {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
      setDetectionInfo('Not tracking');
      setDetectionBox({ x: 0, y: 0, width: 0, height: 0, detected: false }); // Reset box on stop
    }

    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, [tracking, targetColor]);

  const toggleTracking = () => {
    setTracking(!tracking);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const colorPresets = [
    { name: 'Green', color: '#00ff00' },
    { name: 'Red', color: '#ff0000' },
    { name: 'Blue', color: '#0000ff' },
    { name: 'Yellow', color: '#ffff00' },
  ];

  if (!cameraPermission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required for tracking
        </Text>
        <Button title="Grant Camera Permission" onPress={requestCameraPermission} />
      </View>
    );
  }
  
  // Create a dynamic style object for the bounding box
  const dynamicBoundingBoxStyle = {
    position: 'absolute',
    left: detectionBox.x,
    top: detectionBox.y,
    width: detectionBox.width,
    height: detectionBox.height,
    borderColor: targetColor,
    borderWidth: detectionBox.detected ? 3 : 0, // Only show border if detected
    borderRadius: 4,
    backgroundColor: 'transparent',
    zIndex: 5,
  };
  
  // Conditional style for the info box border
  const infoBoxStyle = {
    ...styles.detectionInfoBox,
    borderLeftColor: detectionBox.detected ? targetColor : '#444',
  };

  return (
    <View style={styles.container}>
      {/* FIX: Use a parent View (cameraWrapper) to stack CameraView and Overlays */}
      <View style={styles.cameraWrapper}> 
        
        {/* Camera Preview (Base Layer) */}
        <CameraView style={styles.camera} ref={cameraRef} facing={facing} />

        {/* 1. Dynamic Bounding Box (Absolute position, stacks on top of Camera) */}
        {tracking && detectionBox.detected && (
          <View style={dynamicBoundingBoxStyle} />
        )}

        {/* 2. Detection Info Text Overlay (Fixed position, stacks on top) */}
        <View style={styles.detectionOverlay}>
            <View style={infoBoxStyle}>
                <Text style={styles.detectionText}>{detectionInfo}</Text>
            </View>
        </View>

        {/* 3. Camera Controls Overlay (Fixed position, stacks on top) */}
        <View style={styles.cameraOverlay}>
          <TouchableOpacity 
            style={styles.flipButton} 
            onPress={toggleCameraFacing}
          >
            <MaterialCommunityIcons name="camera-flip" size={28} color="white" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsButton} 
            onPress={() => setShowSettings(!showSettings)}
          >
            <MaterialCommunityIcons name="cog" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {/* Start/Stop Button */}
        <TouchableOpacity 
          style={[styles.trackingButton, tracking && styles.trackingButtonActive]}
          onPress={toggleTracking}
        >
          <MaterialCommunityIcons 
            name={tracking ? "eye-off" : "eye"} 
            size={24} 
            color="white" 
          />
          <Text style={styles.trackingButtonText}>
            {tracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        {/* Settings Panel */}
        {showSettings && (
          <ScrollView style={styles.settingsPanel}>
            {/* Color Picker */}
            <Text style={styles.settingLabel}>Target Color</Text>
            <View style={styles.colorPickerContainer}>
              <View 
                style={[styles.colorPreview, { backgroundColor: targetColor }]} 
              />
              <TextInput
                style={styles.colorInput}
                value={targetColor}
                onChangeText={setTargetColor}
                placeholder="#00ff00"
                placeholderTextColor="#999"
              />
            </View>

            {/* Color Presets */}
            <Text style={styles.settingLabel}>Quick Presets</Text>
            <View style={styles.colorPresets}>
              {colorPresets.map(preset => (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.presetButton, { backgroundColor: preset.color }]}
                  onPress={() => setTargetColor(preset.color)}
                >
                  <Text style={styles.presetButtonText}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sensitivity */}
            <Text style={styles.settingLabel}>
              Sensitivity: {sensitivity}
            </Text>
            <View style={styles.sensitivityContainer}>
              <Text style={styles.sensitivityLabel}>Precise</Text>
              <View style={styles.sliderContainer}>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.sliderDot,
                      sensitivity >= val && styles.sliderDotActive
                    ]}
                    onPress={() => setSensitivity(val)}
                  />
                ))}
              </View>
              <Text style={styles.sensitivityLabel}>Loose</Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: 'black',
  },
  // ADDED: Wrapper view to contain and stack the camera and overlays
  cameraWrapper: {
    flex: 1,
    position: 'relative', // IMPORTANT: Establishes context for absolute positioning
  },
  camera: { 
    flex: 1,
  },
  // The cameraOverlay is now correctly positioned absolutely within the cameraWrapper
  cameraOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 50,
  },
  settingsButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 50,
  },
  // The detectionOverlay holds the Info Box (not the bounding box itself)
  detectionOverlay: { 
    position: 'absolute', 
    top: 80, 
    left: 20, 
    right: 20,
    zIndex: 10,
  },
  // RENAMED/MODIFIED: This style is now used for the *info* box, not the dynamic bounding box
  detectionInfoBox: { 
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  detectionText: { 
    color: 'white', 
    fontSize: 14,
    lineHeight: 20,
  },
  controlPanel: {
    backgroundColor: '#1a1a1a',
    padding: 15,
  },
  trackingButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  trackingButtonActive: {
    backgroundColor: '#dc2626',
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsPanel: {
    marginTop: 15,
    maxHeight: 300,
  },
  settingLabel: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
  },
  colorInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  colorPresets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sensitivityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sensitivityLabel: {
    color: '#999',
    fontSize: 12,
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sliderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#444',
  },
  sliderDotActive: {
    backgroundColor: '#2563eb',
  },
});