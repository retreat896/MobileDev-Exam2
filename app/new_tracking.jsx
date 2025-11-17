import { useIsFocused } from '@react-navigation/native';
import { PaintStyle, Skia } from "@shopify/react-native-skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Linking, Pressable, StyleSheet, View } from "react-native";

import {
    ColorConversionCodes,
    ContourApproximationModes,
    DataTypes,
    ObjectType,
    OpenCV,
    RetrievalModes
} from "react-native-fast-opencv";

import { Button, PaperProvider, Text } from 'react-native-paper';

import convert from "color-convert";
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useSkiaFrameProcessor
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import Filter from './Filter';
import { colorFilter, colorFormat, getColorFilter, getColorFormat, setColorFilter, setTapPosition, tapPosition } from './tracking.global';

const COLOR_THRESHOLD = 80;

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
    const [minObjectSize, setMinObjectSize] = useState(null);
    const [maxObjectSize, setMaxObjectSize] = useState(null);
	const device = useCameraDevice("back", {
        // Add a key that changes when focus changes to force recreation
        physicalDevices: isFocused ? ['back'] : []
    });;
	const [permissionsReady, setPermissionsReady] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
	// Get screen dimensions
	const screenWidth = Dimensions.get('screen').width;
  	const screenHeight = Dimensions.get('screen').height;

    const { resize } = useResizePlugin();
    const intervalId = useRef(null);
    const isFocused = useIsFocused(); // Detect if this screen is in focus
    const [cameraActive, setCameraActive] = useState(true); // Control camera based on focus

    // Function to convert color format
    /**
     * 
     * @param {Filter} bounds 
     * @param {Format} format 
     * @returns 
     */
    function applyFormat(bounds, format) {
        const boundaries = ['lower', 'upper'];

        // Verify the color format is valid
        if ("BGR" === format) {
            for (let key in boundaries) {
                const [r, g, b] = bounds[key];
                bounds[key] = [b, g, r];
            }
        }
        else if ("HLS" === format) {
            for (let key of boundaries) {
                const [h, s, l] = convert.rgb.hsl(bounds[key]);
                bounds[key] = [h, l, s];
            }
        }
        else {
            for (let key of boundaries) {
                bounds[key] = convert.rgb[format.toLowerCase()](bounds[key]);
            }
        }

        // console.log(bounds);

        // Record the format
        bounds.format = format;

        return bounds;
    }

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
            
            requestAnimationFrame(() => {
                if (intervalId.current) {
                    console.log("Cleared Update Interval 1: ", intervalId);
                    clearInterval(intervalId.current);
                    intervalId.current = null;
                }
            });
            
            // Clear OpenCV buffers when losing focus to free memory
            OpenCV.clearBuffers();
            
            // Reset tap position
            setTapPosition(null);
            // Reset color filter
            setColorFilter(null);
        }
    }, [isFocused, device]);

    // Setup the periodic color format/filter update interval
    // Only run when screen is in focus
    useEffect(() => {

        if (!isFocused && intervalId.current) {
            console.log("Clearing Update Interval 3: ", intervalId);
            clearInterval(intervalId.current);
            intervalId.current = undefined;
            return;
        }
        else if (!isFocused) return;

        console.log("Creating Update Interval");

        // Screen is in focus - start the interval
        let id = setInterval(async () => {
            /**
             * UPDATE Color Format
             */
            const newFormat = await getColorFormat();

            // Update the shared value, since a new format was applied
            // Use absolute comparison, since format is a string
            if (colorFormat.value !== newFormat) {
                console.log("Updating FORMAT from " + colorFormat.value + " to " + newFormat);
                colorFormat.value = newFormat;
            }

            /**
             * UPDATE Color Filter
             */

            // Get the accurate filter value
            const newFilter = await getColorFilter(); //new Filter([40, 40, 40], [70, 70, 70]); //

            // A new filter was applied
            if (newFilter.format == null) {
                console.log("Original Filter: ", colorFilter.value)
                console.log("Updating FILTER with format " + colorFormat.value);
                let format = applyFormat(newFilter, colorFormat.value);
                    console.log(format);
                    setColorFilter(format);
            }
            // The new filter has been formatted, but its value has yet
            //  to be assigned to the JS-thread 'colorFilter' variable
            else if (Filter(colorFilter.value) != newFilter) { 
                console.log("Updating FILTER directly");
                colorFilter.value = newFilter;
                console.log("Current Filter: ", colorFilter.value);
            }
        }, 2000);
    
        intervalId.current = id;

        console.log("Created Update Interval: ", intervalId);
        
        return () => {
            console.log("Clearing Update Interval 4: ", intervalId);
            clearInterval(id);
            intervalId.current = null;
        };
    }, [isFocused, intervalId]);
    
    function getPixelRGB(buf, x, y, width) {
    "worklet";
        // Ensure buf is a Uint8Array
        const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        
        // Calculate index
        const i = (y * width + x) * 3;
        
        // Bounds check
        if (i < 0 || i + 2 >= data.length) {
            console.log(`Pixel out of bounds: x=${x}, y=${y}, width=${width}, index=${i}, bufferLength=${data.length}`);
            return [ 0, 0, 0 ];
        }
        
        return [ 
            data[i],
            data[i + 1],
            data[i + 2]
        ];
    }

    /**
     * Converts the target color to a range with upper and lower RGB limits based on COLOR_THRESHOLD
     * @param {import("color-convert").RGB} targetColor - The target RGB color array to filter by
     * @param {*} min The lowest possible RGB value
     * @param {*} max The largest possible RGB value
     * @returns {Object} The lower and upper range boundaries
     */
    function makeRange(color, min=0, max=255) {
        "worklet";
        
        const lower = color.map(v => Math.max(min, v - COLOR_THRESHOLD));
        const upper = color.map(v => Math.min(max, v + COLOR_THRESHOLD));

        return { lower: lower, upper: upper };
    }

    const frameProcessor = useSkiaFrameProcessor(
		useCallback((frame) => {
        "worklet";

        // Copy data at top, so the state can't change mid-run
        const minSize = minObjectSize;
        const maxSize = maxObjectSize;
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

        // Change the color format, using the conversion codes
        // Convert from RGB to HSV
        OpenCV.invoke("cvtColor", src, dst, ColorConversionCodes.COLOR_RGB2HSV);

        // Color Lower and Upper bounds -- The range of acceptable values for the detected colors
        // Color Format: HSV
        const lowerBound = OpenCV.createObject(ObjectType.Scalar, ...(colorFilter.value?.format ? colorFilter.value.lower : [30, 60, 60] )); // 6, 0.63*255, 0.57*255); // 30 60 60 | 6, 0.63*255, 0.57*255
        const upperBound = OpenCV.createObject(ObjectType.Scalar, ...(colorFilter.value?.format ? colorFilter.value.lower : [50, 255, 255] )); // 15, 0.92*255, 0.8*255); // 50 255 255 | 15, 0.92*255, 0.8*255
        
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
            if (area >= (minSize || 5) && (!maxSize || area <= maxSize)) {
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

        const tap = tapPosition.value;

        if (tap == null) return;

        const scaledX = Math.floor(tap.x / scale);
        const scaledY = Math.floor(tap.y / scale);

        if (scaledX >= 0 && scaledX < width && scaledY >= 0 && scaledY < height) {
            // Get the pixel color
            const color = getPixelRGB(resized, scaledX, scaledY, width);
            // Calculate the upper and lower range (RGB)
            const colorRange = makeRange(color);
            // rgb(118, 108, 97) rgb(178, 168, 157)
            // Used for logging purposes
            const obj = new Filter(colorRange.upper, colorRange.lower);
            // Should be changed to "colorFilter.value = { x: scaledX, y: scaledY, rgb: color};"
            setColorFilter(obj);
        }

        // Used for logging purposes
        // Should be changed to "tapPosition.value = null;"
        tapPosition.value = null;
        console.log("Set Tap Position: ", null);
    }, [minObjectSize, maxObjectSize, resize]));

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
					setTapPosition({ x: event.locationX, y: event.locationY });
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