import { PaintStyle, Skia } from "@shopify/react-native-skia";
import { useCallback, useEffect, useState } from "react";
import { Alert, Dimensions, Linking, Pressable, StyleSheet, View } from "react-native";

import {
	ColorConversionCodes,
	ContourApproximationModes,
	DataTypes,
	ObjectType,
	OpenCV,
	RetrievalModes,
} from "react-native-fast-opencv";

import { Button, PaperProvider, Text } from 'react-native-paper';
import { useSharedValue } from "react-native-reanimated";

import {
	Camera,
	useCameraDevice,
	useCameraPermission,
	useSkiaFrameProcessor,
} from "react-native-vision-camera";

import { useResizePlugin } from "vision-camera-resize-plugin";

/**
 * Checks and re-prompts for camera permissions if denied
 * @returns Boolean indicating camera permission authorization
 */
async function reRequestCamera() {
    // asks system prompt (Android/iOS)
    const status = await Camera.requestCameraPermission(); // returns 'authorized'|'denied'|'restricted'|'not-determined' etc.
    console.log(status);
	
	if (status === "granted") return true;

    // permission still denied or blocked — ask user to open Settings
    Alert.alert(
        "Camera permission required",
        "Please enable Camera in app settings.",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
    );
    return false;
}

export default function VisionCameraExample() {
	const device = useCameraDevice("back");
	const [ready, setReady] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
	// Get screen dimensions
	const screenWidth = Dimensions.get('screen').width;
  	const screenHeight = Dimensions.get('screen').height;
	// Store frame dimensions
    // Reanimated shared values (for UI thread)
    const tapPosition = useSharedValue(null);
    const pixelData = useSharedValue(null);
    const frameDimension = useSharedValue(null);
    // Optional minimum/maximum object detection size
    const [minObjectSize, setMinObjectSize] = useState(null);
    const [maxObjectSize, setMaxObjectSize] = useState(null);
	// Screen Tap Detection

    const { resize } = useResizePlugin();

    useEffect(() => {
		// Request camera permissions on-load
        requestPermission().then(() => {
			console.log("Requesting Ready = ", hasPermission);
			requestAnimationFrame(() => setReady(hasPermission));
		})
    }, [requestPermission, hasPermission]);

    const frameProcessor = useSkiaFrameProcessor(
		useCallback((frame) => {
        "worklet";

        // Copy data at top, so the state can't change mid-run
        const minSize = minObjectSize;
        const maxSize = maxObjectSize;

        const paint = Skia.Paint();
        paint.setStyle(PaintStyle.Fill);
        paint.setColor(Skia.Color("lime"));

        const height = frame.height / 4;
        const width = frame.width / 4;

        const resized = resize(frame, {
            scale: {
                width: width,
                height: height,
            },
            pixelFormat: "bgr",
            dataType: "uint8",
        });

        // Mat object to detect object in frame
        const src = OpenCV.bufferToMat(
            'uint8', // type
            height, // rows
            width, // cols
            3, // channels (3 for BGR)
            resized // input buffer
        );

        // Contains the processed image
        const dst = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

        // Color Lower and Upper bounds -- The range of acceptable values for the detected colors
        const lowerBound = OpenCV.createObject(ObjectType.Scalar, 30, 60, 60);
        const upperBound = OpenCV.createObject(ObjectType.Scalar, 50, 255, 255);
        // Change the color format, using the conversion codes
        // Convert from BGR to HSV
        OpenCV.invoke("cvtColor", src, dst, ColorConversionCodes.COLOR_BGR2HSV);
        // Detect colors between the given range
        OpenCV.invoke("inRange", dst, lowerBound, upperBound, dst);

        // Split the image into channels
        const channels = OpenCV.createObject(ObjectType.MatVector);
        OpenCV.invoke("split", dst, channels);
        // Extract the first channel
        const grayChannel = OpenCV.copyObjectFromVector(channels, 0);

        /**
         * USING CONTOURS FOR OBJECT DETECTION
         */

        const contours = OpenCV.createObject(ObjectType.MatVector);
        OpenCV.invoke(
            "findContours",
            grayChannel, // Find contours matching this channel
            contours, // Adds matching contours to the object
            RetrievalModes.RETR_TREE,
            ContourApproximationModes.CHAIN_APPROX_SIMPLE
        );

        const contoursMats = OpenCV.toJSValue(contours); // Convert found contours to array
        const rectangles = [];

        for (let i = 0; i < contoursMats.array.length; i++) {
            const contour = OpenCV.copyObjectFromVector(contours, i);
            const { value: area } = OpenCV.invoke(
                "contourArea",
                contour,
                false
            );

            // The area is within the object detection size
            // Default minimum of 3000, with no maximum
            if (area >= (minSize || 100) && (!maxSize || area <= maxSize)) {
                const rect = OpenCV.invoke("boundingRect", contour);
                rectangles.push(rect);
            }
        }

        frame.render();

        // Go through each detected item
        for (const rect of rectangles) {
            const rectangle = OpenCV.toJSValue(rect);

            // Draw a rectangle around the detected object
            frame.drawRect(
                {
                    height: rectangle.height * 4,
                    width: rectangle.width * 4,
                    x: rectangle.x * 4,
                    y: rectangle.y * 4,
                },
                paint
            );
        }

        OpenCV.clearBuffers(); // REMEMBER TO CLEAN
    }, [tapPosition, frameDimension, pixelData]));

    // Camera permissions haven't been requested
    if (hasPermission == null) {
        console.log("No Camera Permissions Defined");
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>
                    Requesting camera permission...
                </Text>
            </View>
        );
    }

    // Not granted camera permissions
    if (!hasPermission) {
		console.log("Camera Permissions Denied");
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>
                    Camera permission is required to take photos
                </Text>
                <Button
                    title="Grant Camera Permission"
                    onPress={reRequestCamera}
                />
            </View>
        );
    }

	// No camera device is available
    if (device == null) {
        return <Text>No device</Text>;
    }

	// Not ready to mount the <Camera/> yet
	// !-- TRUST --!
	if (!ready) {
		return (
			<View style={styles.container}>
                <Text style={styles.permissionText}>
                    The camera is loading...
                </Text>
            </View>
		)
	}

    return (
        <PaperProvider>
            {/* StyleSheet.absoluteFill OR { flex: 1 } works for Camera Full Display */}
            <Pressable style={StyleSheet.absoluteFill}
                onPress={(e) => {
                    console.log("Tap Event Triggered");
                    const event = e.nativeEvent;
                    tapPosition.value = { x: event.locationX, y: event.locationY };
                }}>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true}
                    frameProcessor={frameProcessor}
                />
            </Pressable>
        </PaperProvider>
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
    color: 'white',
  }
});