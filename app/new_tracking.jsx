import { PaintStyle, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
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