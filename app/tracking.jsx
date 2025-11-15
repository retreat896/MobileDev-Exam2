import * as MediaLibrary from 'expo-media-library';
import { Button, StyleSheet, Text, ToastAndroid, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import RNFS from 'react-native-fs';
import { BASE_URL } from './config';

export default function Uplaod() {
    const { assetId } = useLocalSearchParams();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
    const router = useRouter();
    console.log(assetId);

    const showToast = (message) => {
        ToastAndroid.show(`${message}`, ToastAndroid.SHORT);
    };

    const convertImageToBase64 = async (assetId) => {
      try {
        const imageUri = (await MediaLibrary.getAssetInfoAsync(assetId)).uri;
        const base64 = await RNFS.readFile(imageUri, 'base64');
        return base64;
      } catch (error) {
        console.error('Error converting image to Base64:', error);
        return null;
      }
    };

    const uploadImage = async () => {
        try {
            //convert image to base65
            let imageBase64 = await convertImageToBase64(assetId);
            console.log(imageBase64)
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageBase64,
                }),
            };
            // Call add from the API
            const res = await fetch(`${BASE_URL}/images`, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            showToast('Successfully Uploaded Image.');
            router.replace(`/`);
        } catch (e) {
            showToast('Error Uploading Image.');
            console.log(e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text>{assetId}</Text>
            </View>
            <Button
                title="Uplaod"
                onPress={() => {
                    uploadImage();
                }}></Button>
        </View>
    );
}

const styles = new StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {},
    title: {},
    addBtn: {},
});
