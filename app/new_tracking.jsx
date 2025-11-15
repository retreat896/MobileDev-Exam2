import { PaintStyle, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ColorConversionCodes, ContourApproximationModes, DataTypes, ObjectType, OpenCV, RetrievalModes } from 'react-native-fast-opencv';
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
	useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
 
const paint = Skia.Paint();
paint.setStyle(PaintStyle.Fill);
paint.setColor(Skia.Color('lime'));
 
export function VisionCameraExample() {
	const device = useCameraDevice('back');
	const { hasPermission, requestPermission } = useCameraPermission();
 
	const { resize } = useResizePlugin();
 
	useEffect(() => {
		requestPermission();
	}, [requestPermission]);
 
	const frameProcessor = useSkiaFrameProcessor((frame) => {
		'worklet';
 
		const height = frame.height / 4;
		const width = frame.width / 4;
 
		const resized = resize(frame, {
			scale: {
				width: width,
				height: height,
			},
			pixelFormat: 'bgr',
			dataType: 'uint8',
		});

		// Mat object to detect object in frame
		const src = OpenCV.bufferToMat(height, width, resized);
		// Contains the processed image
		const dst = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

		// Color Lower and Upper bounds -- The range of acceptable values for the detected colors
		const lowerBound = OpenCV.createObject(ObjectType.Scalar, 30, 60, 60);
		const upperBound = OpenCV.createObject(ObjectType.Scalar, 50, 255, 255);
		// Change the color format, using the conversion codes
		// Convert from BGR to HSV
		OpenCV.invoke('cvtColor', src, dst, ColorConversionCodes.COLOR_BGR2HSV);
		// Detect colors between the given range
		OpenCV.invoke('inRange', dst, lowerBound, upperBound, dst);
		

		// Split the image into channels
		const channels = OpenCV.createObject(ObjectType.MatVector);
		OpenCV.invoke('split', dst, channels);
		// Extract the first channel
		const grayChannel = OpenCV.copyObjectFromVector(channels, 0);

		/**
		 * USING CONTOURS FOR OBJECT DETECTION
		 */

		const contours = OpenCV.createObject(ObjectType.MatVector);
		OpenCV.invoke(
			'findContours',
			grayChannel, // Find contours matching this channel
			contours, // Adds matching contours to the object
			RetrievalModes.RETR_TREE,
			ContourApproximationModes.CHAIN_APPROX_SIMPLE
		);

		const contoursMats = OpenCV.toJSValue(contours); // Convert found contours to array
  		const rectangles = [];
		
		for (let i = 0; i < contoursMats.array.length; i++) {
			const contour = OpenCV.copyObjectFromVector(contours, i);
			const { value: area } = OpenCV.invoke('contourArea', contour, false);
			
			// The area is larger than the minimum
			if (area > 3000) {
				const rect = OpenCV.invoke('boundingRect', contour);
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
	}, []);
 
	if (!hasPermission) {
		return <Text>No permission</Text>;
	}
 
	if (device == null) {
		return <Text>No device</Text>;
	}
 
	return (
		<Camera
			style={StyleSheet.absoluteFill}
			device={device}
			isActive={true}
			frameProcessor={frameProcessor}
		/>
	);
}