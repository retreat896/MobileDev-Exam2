import { useIsFocused } from '@react-navigation/native';
import { PaintStyle, Skia } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import {
    ColorConversionCodes,
    ContourApproximationModes,
    DataTypes,
    ObjectType,
    OpenCV,
    RetrievalModes
} from "react-native-fast-opencv";
import { Button, PaperProvider, Text } from 'react-native-paper';
import ColorSpace from './ColorSpace';

import {
    Camera,
    runAtTargetFps,
    useCameraDevice,
    useCameraPermission,
    useSkiaFrameProcessor
} from "react-native-vision-camera";
import { useSharedValue } from 'react-native-worklets-core';
import { useResizePlugin } from "vision-camera-resize-plugin";
import AdvancedColorDetector from './AdvancedColorDetector';
import { colorFilter, colorFormat, getColorFormat, getSelectedColor, resetToDefaults, setSelectedColor, setTapPosition, tapPosition } from './tracking.global';

const COLOR_THRESHOLD = 50;

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
    // Optional minimum/maximum object detection size
    const [minObjectSize, setMinObjectSize] = useState(50);
    const [maxObjectSize, setMaxObjectSize] = useState(500);
    const [maxObjectCount, setMaxObjectCount] = useState(50);
    // Optional color sampling radius
    const [pixelSelectRadius, setPixelSelectRadius] = useState(10);

	const device = useCameraDevice("back");
	const [permissionsReady, setPermissionsReady] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    
    const selectedColor_JS = useSharedValue(null);

    const { resize } = useResizePlugin();
    const intervalId = useRef(null);
    const isFocused = useIsFocused(); // Detect if this screen is in focus
    const [cameraActive, setCameraActive] = useState(true); // Control camera based on focus

    useEffect(() => {
		// Request camera permissions on-load
        requestPermission().then(() => {
			console.log("Requesting Ready = ", hasPermission);
			requestAnimationFrame(() => setPermissionsReady(hasPermission));
		})
    }, [requestPermission, hasPermission]);

    // Pause/resume camera and cleanup when screen focus changes
    useEffect(() => {
        if (isFocused) {
            // Set global defaults
            resetToDefaults();
            
            // Screen came into focus - activate camera
            if (device) {
                setCameraActive(true);
                console.log("Screen focused - camera active");
            }
        } else {
            // Screen went out of focus - deactivate camera and clean up
            setCameraActive(false);
            
            if (device) {
                device.close?.();
            }
            
            console.log("Screen unfocused - camera paused");
        }
    }, [isFocused, device]);

    // Setup the periodic color format/filter update interval
    // Only run when screen is in focus
    useEffect(() => {
        // Screen isn't displayed, so exit
        if (!isFocused) return;

        console.log("Creating Update Interval");

        // Screen is in focus - start the interval
        let id = setInterval(async () => {
            /**
             * UPDATE Color Format
             */
            const newFormat = await getColorFormat();

            // Update the shared value, since a new format was applied
            // Use absolute comparison, since format is a string
            if (colorFormat.value != newFormat.value) {
                console.log("Updating FORMAT from " + colorFormat.value + " to " + newFormat.value);
                colorFormat.value = newFormat.value;

                // Now re-apply the selected color using the new format
                colorFilter.value = ColorSpace[colorFormat.value][AdvancedColorDetector.detectColor(selectedColor_JS.value, colorFormat.value).primary].map(boundStr => ColorSpace.stringBoundsToRGB(boundStr));
            }

            console.log("Using Filter: ", JSON.stringify(colorFilter.value));
            console.log("Using Format: ", JSON.stringify(colorFormat.value));
            console.log("Using Color: ", JSON.stringify(selectedColor_JS.value));
            if (selectedColor_JS.value) console.log("Targeted Color: ", JSON.stringify(AdvancedColorDetector.detectColor(selectedColor_JS.value, colorFormat.value).primary));

            /**
             * UPDATE Selected Color
             */
            const newColor = await getSelectedColor();

            // The JS-thread color selection is not up-to-date
            if (selectedColor_JS.value != JSON.stringify(newColor.value)) {
                console.log(`Updating COLOR from ${selectedColor_JS.value} to ${newColor.value}`);
                selectedColor_JS.value = JSON.parse(newColor.value); // RGB

                // Create new color filter
                colorFilter.value = ColorSpace[colorFormat.value][AdvancedColorDetector.detectColor(selectedColor_JS.value, colorFormat.value).primary].map(boundStr => ColorSpace.stringBoundsToRGB(boundStr));
            }
        }, 2000);
    
        intervalId.current = id;

        console.log("Created Update Interval: ", intervalId);
        
        return () => {
            console.log("Clearing Update Interval 4: ", intervalId);
            clearInterval(intervalId.current);
            intervalId.current = null;
        };
    }, [isFocused, intervalId]);

    const frameProcessor = useSkiaFrameProcessor((frame) => {
        "worklet";
        runAtTargetFps(60, () => {
            if (!frame) return;

            // Clear all previous buffers
            OpenCV.clearBuffers();

            // Copy data at top, so the state can't change mid-run
            const MinSize = minObjectSize;
            const MaxSize = maxObjectSize;
            const maxCount = maxObjectCount;
            const PixelRadius = pixelSelectRadius;
            const scale = 4;

            const paint = Skia.Paint();
            paint.setStyle(PaintStyle.Fill);
            paint.setColor(Skia.Color("lime"));

            const height = frame.height / scale;
            const width = frame.width / scale;

            const resized = resize(frame, {
                scale: {
                    width: width,
                    height: height,
                },
                pixelFormat: "rgb",
                dataType: "uint8",
            });

            const resized_src = OpenCV.bufferToMat(
                'uint8',
                height,
                width,
                3,
                resized
            )

            // Contains the processed image
            const dst = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

            // Change the color format, using the conversion codes
            // Convert from RGB to HSV
            OpenCV.invoke("cvtColor", resized_src, dst, ColorConversionCodes[`COLOR_RGB2${colorFormat.value || 'HSV'}`]);

            // *** DELETE 'src' Mat ***
            OpenCV.clearBuffers([dst.id]); // , src.id]);

            // Courtesy of Gemini

            // 1. Initialize an empty mask to hold the combined result (the union of all ranges).
            let accumulatedMask = null;
            for (let range of colorFilter.value) {
                // 2. Define the lower and upper bounds for the current range (e.g., Red Part 1 or Part 2).
                const lower = OpenCV.createObject(ObjectType.Scalar, ...(range.lower ? range.lower : [30, 60, 60]));
                const upper = OpenCV.createObject(ObjectType.Scalar, ...(range.upper ? range.upper : [50, 157, 157]));
                // console.log("Created Bounds");

                // 3. Create a temporary mask for the current range.
                const tempMask = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
                // console.log("Created Mask");

                // 4. Apply the current range to the source image (dst) and store result in tempMask.
                OpenCV.invoke('inRange', dst, lower, upper, tempMask);
                // console.log("Applied Range");

                // 5. Combine the masks.
                if (accumulatedMask == null) {
                    // If this is the first range, initialize the accumulatedMask with the tempMask.
                    accumulatedMask = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
                    OpenCV.invoke("copyTo", tempMask, accumulatedMask, tempMask);
                    // console.log("Copied First Mask");
                } 
                else {
                    // Allocate a new output mask by cloning the existing accumulated mask
                    const combined = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);
                    OpenCV.invoke('copyTo', accumulatedMask, combined, accumulatedMask);
                    // console.log("Copied Second Mask");

                    // If this is a subsequent range (e.g., Red Part 2), combine it using bitwise OR.
                    OpenCV.invoke("bitwise_or", combined, tempMask, combined);
                    
                    accumulatedMask = combined;
                    // console.log("Combined Masks");
                }
            }

            if (accumulatedMask) {
                // Copy the final combined mask data into the original 'dst' variable
                OpenCV.invoke('copyTo', accumulatedMask, dst, accumulatedMask);
                // console.log("Applied Final Color Mask");
                
                // *** DELETE ALL UNNEEDED SCALARS IMMEDIATELY ***
                OpenCV.clearBuffers([dst.id]); // , src.id]);
            }

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
                if (area >= (MinSize || 5) && (!MaxSize || area <= MaxSize)) {
                    const rect = OpenCV.invoke("boundingRect", contour);
                    rectangles.push(OpenCV.toJSValue(rect));
                }
            }

            // console.log(OpenCV.toJSValue(src, 'png').base64);

            // Clear all buffers
            OpenCV.clearBuffers([]);

            // Find Largest
            rectangles.sort((a, b) => { return a.area - b.area })
            // Limit Number of Rectangles
            rectangles = rectangles.slice(0, maxCount);

            frame.render();

            // Go through each detected item
            for (let i=0; i<rectangles.length; i++) {
                const rectangle = rectangles[i];

                // Draw a rectangle around the detected object
                frame.drawRect(
                    {
                        height: rectangle.height * scale,
                        width: rectangle.width * scale,
                        x: rectangle.x * scale,
                        y: rectangle.y * scale,
                    },
                    paint
                );
            }

            const tap = tapPosition.value;

            if (tap == null) return;

            const fullsized = resize(frame, {
                scale: {
                    width: frame.width,
                    height: frame.height
                },
                pixelFormat: 'rgb',
                dataType: 'uint8'
            })

            // if (scaledX >= 0 && scaledX < width && scaledY >= 0 && scaledY < height) {
            if (tap.x >= 0 && tap.x < frame.width && tap.y >= 0 && tap.y < frame.height) {
                let totalR = 0;
                let totalG = 0;
                let totalB = 0;
                let sampleCount = 0;

                // Iterate over a square area encompassing the circle
                for (let dy = -PixelRadius; dy <= PixelRadius; dy++) {
                    for (let dx = -PixelRadius; dx <= PixelRadius; dx++) {
                        // Check if the current (dx, dy) is within the circle (r^2 = x^2 + y^2)
                        if (dx * dx + dy * dy <= PixelRadius * PixelRadius) {
                            const x = tap.x + dx;
                            const y = tap.y + dy;

                            // Ensure coordinates are within the frame boundaries
                            if (x >= 0 && x < frame.width && y >= 0 && y < frame.height) {
                                // Calculate the starting index of the pixel's color components (R, G, B)
                                // i = (y * frame.width + x) * 3
                                const i = (y * frame.width + x) * 3;

                                // Extract the R, G, B values from the fullsized array
                                const r = Number(fullsized[i]);
                                const g = Number(fullsized[i + 1]);
                                const b = Number(fullsized[i + 2]);

                                // Accumulate the color totals
                                totalR += r;
                                totalG += g;
                                totalB += b;
                                sampleCount++;
                            }
                        }
                    }
                }

                let color;
                if (sampleCount > 0) {
                    // Calculate the average color components
                    const avgR = Math.round(totalR / sampleCount);
                    const avgG = Math.round(totalG / sampleCount);
                    const avgB = Math.round(totalB / sampleCount);

                    color = [avgR, avgG, avgB];
                    console.log("Average Color: ", color);
                } else {
                    // Fallback if somehow no samples were counted (e.g., tap was out of bounds)
                    color = [0, 0, 0];
                    console.log("Failsafe Color: ", color);
                }

                setSelectedColor(color);
            }

            // Used for logging purposes
            // Should be changed to "tapPosition.value = null;"
            tapPosition.value = null;
            console.log("Set Tap Position: ", null);
        })
    }, [minObjectSize, maxObjectSize, resize, maxObjectCount]);

    // useEffect(() => {
    //     if (!cameraActive) OpenCV.clearBuffers();
    // }, [cameraActive])

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
	if (!permissionsReady || !cameraActive) {
		return (
			<View style={styles.container}>
                <Text style={styles.permissionText}>
                    The camera is loading...
                </Text>
            </View>
		)
	}

    console.log("Camera Active: ", cameraActive);

    // Camera ready - render the camera view
    return (
        <PaperProvider>
            {/* StyleSheet.absoluteFill OR { flex: 1 } works for Camera Full Display */}
            <Pressable style={StyleSheet.absoluteFill}
                onPress={(e) => {
                    console.log("Tap Event Triggered");
                    const event = e.nativeEvent;
					setTapPosition({ x: Math.round(event.locationX), y: Math.round(event.locationY) });
                }}>
                <Camera
                    style={StyleSheet.absoluteFill}
                    pixelFormat="yuv"
                    device={device}
                    isActive={cameraActive}
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