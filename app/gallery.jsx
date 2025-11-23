import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, ToastAndroid, View, useWindowDimensions } from "react-native";
import { Button, IconButton, Menu, PaperProvider, Text } from 'react-native-paper';
import { GALLERY_STORAGE_KEY } from "./config";

const DEBUG = true;

// The different gallery modes
const MODES = {
	PREVIEW: 1, // Preview images
	SELECT: 2 // Select (multiple) images -- i.e. for deletion
}

export default function Gallery() {//({ media=[], columns, deletePhotos, onExit }) => {
	// Page router
	const router = useRouter();

	// Reference Variables
	const scrollRef = useRef(null);
	const scrollY = useRef(0);
	
	// Functional mode
	const [mode, setMode] = useState(MODES.PREVIEW);
	const [selected, setSelected] = useState([]);
	
	// Gallery Display
	const isFocused = useIsFocused(); // Detect if this screen is in focus
	const [numColumns, setNumColumns] = useState(4);
	const [rows, setRows] = useState([]);
	const [photos, setPhotos] = useState([]);
	
	// Menu Display
    const [visible, setVisible] = useState(false);
    // Menu Management
    const openMenu = () => { if (DEBUG) console.log("Opened"); setVisible(true); }
    const closeMenu = () => { if (DEBUG) console.log("Closed"); setVisible(false); }
	
	// Get window dimensions for dynamic sizing
	const { width } = useWindowDimensions();
	
	// Calculate thumbnail size dynamically based on screen width and columns
	// Account for padding/margins: 10px container padding on each side + 10px gap between items
	const containerPadding = 20; // 10px on each side
	const itemGap = 10;
	const totalGaps = (numColumns - 1) * itemGap;
	const thumbnailSize = (width - containerPadding - totalGaps) / numColumns;
	
	const loadPhotos = async () => {
		// Retreive all photos taken with the app
		const allIds = JSON.parse(await AsyncStorage.getItem(GALLERY_STORAGE_KEY));

		// There are no photos
		if (!allIds) return;
			
		console.log("Photos: ");
		console.log(photos.length);

		console.log("All-Original: ");
		console.log(allIds.length);

		// Determine which assets have already been loaded
		const ignoreAssets = photos.map(asset => asset.id);

		// Update the list of assets to load, excluding ignored assets
		const newPhotos = allIds.filter(assetId => !ignoreAssets.includes(assetId))

		console.log("New Photos:")
		console.log(newPhotos.length);

		// There is nothing to update
		if (newPhotos.length === 0) return;

		// Retreive the media asset for each photo
		for (let i = 0; i < newPhotos.length; i ++) {
			const assetId = newPhotos[i];
			const asset = await MediaLibrary.getAssetInfoAsync(assetId);
			newPhotos[i] = asset;
		}

		// Merge the new and existing photos
		const allPhotos = [...newPhotos, ...photos];

		// Update the stored photos list
		// Do this last so, if something goes wrong
		// And it isn't updated, no images are missed
		setPhotos(allPhotos);
	}

	// Generate the image-row lists
	const loadRows = () => {
		// Group media into rows
		const allRows = [];
		for (let i = 0; i < photos.length; i += numColumns) {
			// Get the row of photo Assets
			// Add the row to the display
			allRows.push(photos.slice(i, i + numColumns));
		}

		// Apply the updated rows
		setRows(allRows);
	}

	// Reload the gallery each time the screen is refocused
	useEffect(() => {
		if (isFocused) loadPhotos();
	}, [isFocused]);

	// Regenerate the rows every time 'photos' is changed
	useEffect(() => {
		loadRows();
	}, [photos]);

	// New function to handle removing a single photo
	const deletePhotos = async (...assetIds) => {
		// Do nothing if nothing to delete
		if (assetIds.length === 0) return;

		console.log("Deleting " + assetIds.length + " assets");
		
		// Filter all photos not from 'assets'
		const updatedPhotos = photos.filter(photo => !assetIds.includes(photo.id));

		// Update the photos list
		setPhotos(updatedPhotos);
		
		// Delete all passed assets from the filesystem
		await MediaLibrary.deleteAssetsAsync(assetIds);

		// Get the stored list of saved asset IDs
		let allPhotos = JSON.parse(await AsyncStorage.getItem(GALLERY_STORAGE_KEY));

		// Keep only photos whose asset ID does not match
		allPhotos = allPhotos.filter(photoId => !assetIds.includes(photoId));

		// Update the saved photo list
		await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(allPhotos));
		
		ToastAndroid.showWithGravity("Deleted " + assetIds.length + " assets.", 1000, ToastAndroid.TOP);
	};

	// Handle clearing all photos
	const clearPhotos = () => {
		// Do nothing if nothing to delete
		if (photos.length === 0) return;

		Alert.alert(
			'Clear All Photos',
			'Are you sure you want to clear all photos from this view?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Clear', 
					style: 'destructive', 
					onPress: () => {
						// Call removeItem for each photo
						deletePhotos(...photos.map(asset => asset.id));
					}
				}
			]
		);
	};

	// Update the scroll Y value
	const onScroll = (e) => {
		scrollY.current = e.nativeEvent.contentOffset.y;
	};

	return (
		<PaperProvider>
			<View style={styles.container}>
				{/* Gallery Header */}
				<View style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 10,
				}}>
					<IconButton icon="arrow-left" iconColor="white" background="#AAAAAA" onPress={router.back}/>
					<Text variant="titleMedium" style={{ fontWeight: 'bold', color: 'white' }}>
						Saved Photos ({photos.length})
					</Text>
					<Button
						mode="contained-tonal"
						onPress={() => {
							setMode(mode =>
								mode === MODES.SELECT ? MODES.PREVIEW : MODES.SELECT
							);
						}}
						>
						{mode === MODES.PREVIEW ? "Select" : "Cancel"}
					</Button>

					<Menu 
						visible={visible}
						onDismiss={visible ? closeMenu : openMenu}
						anchor={
							<IconButton
								icon={ visible ? "backburger" : "menu"}
								mode="contained"
								onPress={visible ? closeMenu : openMenu}
							/>
						}
						contentStyle={{ gap: 16}}
						// statusBarHeight={-75}
					>
						{ mode === MODES.SELECT && (
							<Menu.Item
								onPress={() => {
									try {
										// Delete the selected photos
										deletePhotos(...selected);

										// Clear the selection mode
										setMode(MODES.PREVIEW);
										setSelected([]);

										// Close the menu
										setVisible(false);
									}
									catch (e) {
										console.error(e);
									}
								}}
								leadingIcon="delete-outline"
								title="Delete Selected"
							/>
						)}

						<Menu.Item
							onPress={() => {
								clearPhotos();

								// Clear the selection mode
								setMode(MODES.PREVIEW);
								setSelected([]);

								// Close the menu
								setVisible(false);
							}}
							leadingIcon="delete-forever"
							title="Delete All"
						/>

						{/* Upload-To-Cloud (unimplemented) 
						<Menu.Item
							onPress={null}
							leadingIcon="cloud-upload-outline"
							title="Save To DB"
						/> */}
					</Menu>
				</View>

				{/* No-Media Alert */}
				{ photos.length === 0 && (
					<Text 
						variant="headlineMedium"
						style={{
							color: 'white',
							textAlign: 'center'
						}}
					>
						No media in gallery.
					</Text>
				)}

				{/* ScrollView with grid layout */}
				{photos.length > 0 && (
					<ScrollView
						ref={scrollRef}
						showsVerticalScrollIndicator={false}
						style={{ marginBottom: 8 }}
						onScroll={onScroll}
						scrollEventThrottle={16}
					>
						{rows.map((row, rowIndex) => (
							<View 
								key={`row-${rowIndex}`}
								style={{
									flexDirection: 'row',
									marginBottom: 10,
									justifyContent: 'flex-start',
								}}
							>
								{row.map((photo) => (
									<View
										key={photo.id}
										style={{
											marginRight: 10,
											width: thumbnailSize,
											height: thumbnailSize,
											borderRadius: 8,
											overflow: "hidden",
											position: "relative",
										}}
									>
										<Pressable
											onPress={() => {
												// Quit if not in selection mode
												if (mode !== MODES.SELECT) return;

												// Add the item to the selection
												setSelected((prev) => {
													// Remove the asset ID from the array
													if (prev.includes(photo.id)) {
														return prev.filter(assetId => assetId !== photo.id);
													}
													// Add the asset ID to the array
													return [...prev, photo.id];
												})
											}}
											onLongPress={() => {
												if (mode === MODES.PREVIEW) setMode(MODES.SELECT)
											}}
										>
											<Image
												source={{ uri: photo.uri }}
												style={{ width: "100%", height: "100%" }}
												resizeMode="cover"
											/>
										</Pressable>

										<IconButton
											icon={ selected.includes(photo.id) ? "circle" : "circle-outline" }
											size={13}
											iconColor={ selected.includes(photo.id) ? "black" : "#00000000" }
											style={{
												display: mode === MODES.SELECT ? 'flex' : 'none',
												position: "absolute",
												right: 0,
												width: 20,
												height: 20,
												marginTop: 3,
												marginRight: 3,
												backgroundColor: '#00000033',
												borderColor: 'black',
												borderRadius: 40,
												borderWidth: 2,
												elevation: 5,
											}}
										/>
									</View>
								))}
							</View>
						))}
					</ScrollView>
				)}
			</View>
		</PaperProvider>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#000',
		paddingHorizontal: 10,
		paddingTop: 5,
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