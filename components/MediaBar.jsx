import { useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { IconButton, Menu, Provider, Text } from 'react-native-paper';

const DEBUG = true;

const MediaBar = ({ media=[], columns, removeItems, onExit }) => {
	// Reference Variables
	const scrollRef = useRef(null);
	const scrollY = useRef(0);
	const numColumns = columns || 4;

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
	
	// Handle clearing all photos
	const clearPhotos = () => {
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
						removeItems(...media);
					}
				}
			]
		);
	};

	// Update the scroll Y value
	const onScroll = (e) => {
		scrollY.current = e.nativeEvent.contentOffset.y;
	};

	// If no media to display, then show nothing
	if (media.length == 0) {
		return null;
	}

	// Group media into rows
	const rows = [];
	for (let i = 0; i < media.length; i += numColumns) {
		rows.push(media.slice(i, i + numColumns));
	}

	return (
		<Provider style={{ paddingHorizontal: 10 }}>
			{/* Gallery Header */}
			<View style={{
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: 10,
			}}>
				<IconButton icon="arrow-left" iconColor="white" background="#AAAAAA" onPress={onExit}/>
				<Text variant="titleMedium" style={{ fontWeight: 'bold', color: 'white' }}>
					Saved Photos ({media.length})
				</Text>
				<Menu 
					visible={visible}
					onDismiss={visible ? closeMenu : openMenu}
					anchor={
						<IconButton
							icon={ visible ? "close-box-outline" : "menu"}
							mode="contained"
							onPress={visible ? closeMenu : openMenu}
						/>
					}
					// statusBarHeight={-75}
				>
					<Menu.Item
						onPress={clearPhotos}
						leadingIcon="delete-forever-outline"
						title="Clear All"
					/>

					<Menu.Item
						onPress={null}
						leadingIcon="cloud-upload-outline"
						title="Save To DB"
					/>
				</Menu>
				{/* <Button mode="contained" onPress={clearPhotos} buttonColor="#ff4444">Clear All</Button> */}
			</View>

			{/* ScrollView with grid layout */}
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
						{row.map((item) => (
							<View
								key={item.uri}
								style={{
									marginRight: 10,
									width: thumbnailSize,
									height: thumbnailSize,
									borderRadius: 8,
									overflow: "hidden",
									position: "relative",
								}}
							>
								<Image
									source={{ uri: item.uri }}
									style={{ width: "100%", height: "100%" }}
									resizeMode="cover"
								/>

								<Pressable
									onPress={() => removeItems(item)}
									style={{
										position: "absolute",
										top: 0,
										right: 0,
										backgroundColor: '#DD8888',
										borderRadius: 40,
										paddingVertical: 0,
										paddingHorizontal: 8,
										elevation: 5,
									}}
								>
									<Text variant="bodyLarge" style={{ fontWeight: "bold" }}>×</Text>
								</Pressable>
							</View>
						))}
					</View>
				))}
			</ScrollView>
		</Provider>
	);
}

export default MediaBar;