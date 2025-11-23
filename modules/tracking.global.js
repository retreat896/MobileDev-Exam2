import { Worklets } from "react-native-worklets-core";
import ColorSpace from '../modules/ColorSpace';


//const COLOR_UPPER = convert.hsv.rgb(15, 235, 204);// rgb(50, 255, 255);

// Create a shared context that exists across all threads
const context = Worklets.createContext("TrackingStore");

/**
 * Shared Values
 * 		Worklets:
 * 			Changing Value:  sharedVar.value = newVal
 * 				- Visible to all Worklet threads
 * 				- Visible to context
 * 				- NOT Visible to JS thread
 * 			Reading Value:
 * 				- Auto updates
 * 		JS:
 * 			Changing Value:  await setSharedVar(newVal)
 * 				- Use async set() call
 * 					- Visible to all Worklet threads
 * 					- Visible to context
 *	 				- NOT Visible to JS thread
 * 			Reading Value:  await getSharedVar()
 * 				- Use async get() call
 * 				- 
 */

export const tapPosition = Worklets.createSharedValue(new Object());
export const colorFormat = Worklets.createSharedValue(null);
export const selectedColor = Worklets.createSharedValue(new Array()); // 92, 108, 53
export const colorFilter = Worklets.createSharedValue(new Object());

const rgba = (r, g, b) => {
	return [r, g, b];
}

export function resetToDefaults() {
	// Convert to null because of initialization (allows IDE to display *.value as type)
	if (typeof colorFormat.value == 'object') colorFormat.value = null;
	if (typeof selectedColor.value == 'object') selectedColor.value = null;
	if (typeof colorFilter.value == 'object') colorFilter.value = null;

	
	tapPosition.value = null; // Always null
	console.log("Reset Tap Position: ", JSON.stringify(tapPosition.value));
	colorFormat.value = !colorFormat.value ? ColorSpace.FORMAT.HSV : colorFormat.value; // Default: HSV
	console.log("Reset Color-Format: ", colorFormat.value);
	selectedColor.value = !selectedColor.value ? rgba(224, 138, 9, 1) : selectedColor.value; // Default: Green
	console.log("Reset Selected Color: ", JSON.stringify(selectedColor.value));
	colorFilter.value = ColorSpace.ColorClosestToRGB(selectedColor.value, colorFormat.value); // Re-apply filter
	console.log("Reset Color-Filter: ", JSON.stringify(colorFilter.value));
}

resetToDefaults();

const THROTTLED = 50; // Milliseconds between calls to throttle
const timeLastSent = {}; // Record context interactions

/**
 * Check if a property is being throttled with calls
 * @param {String} property The context value to access
 * @returns T/F for whether the property call is throttled
 */
function isThrottled(property) {
    "worklet";

    const previous = timeLastSent[property]; 

    // Compare the current time to the most
    //  recent time-last-sent interaction
    const now = Date.now();
    if (previous && now - previous < THROTTLED) return true;

    // Update the time-last-sent
    timeLastSent[property] = now;
    return false;
}

/**
 * (JS-Thread ONLY) -- Update the tap-position
 * @param {} value The value to set tap-position
 */
export const setTapPosition = context.createRunAsync((value) => {
    "worklet";

    // If no-change OR throttled, don't update
    if (value == tapPosition.value || isThrottled("tapPosition")) return;

	// console.log("Old Tap Position: ", tapPosition.value);
    tapPosition.value = value;
	console.log("Set Tap Position: ", tapPosition.value);
});

/**
 * Needed when accessing through JS-Thread ONLY 
 * @returns {Array} the value of selected-color
 */
export const getSelectedColor = context.createRunAsync(() => {
	"worklet";

	return selectedColor;
})

/**
 * Update the selected color with the provided value
 * @param {import("color-convert").RGB} value An RGB color
 * @returns {void}
 */
export const setSelectedColor = context.createRunAsync((value) => {
	"worklet";

	// If no-chance or throttled, don't update
	if (value == selectedColor.value || isThrottled("selectedColor")) return;

	
	selectedColor.value = value;
	console.log("Set Selected Color: ", String(selectedColor.value));
})

/**
 * Needed when accessing through JS-Thread ONLY
 * @returns {Format} The upper and lower color filter values
 */
export const getColorFormat = context.createRunAsync(() => {
    "worklet";
	return colorFormat;
});

/**
 * Update the color filter with a target color and calculate RGB boundaries
 * Only updates if the value has changed and is not throttled
 * @param {String} type The color format to use in the filter
 * @returns {void}
 */
export const setColorFormat = context.createRunAsync((type) => {
	"worklet";

	// If no-change or throttled, don't update
	if (type == colorFormat.value || isThrottled("colorFormat")) return;

	// The given type is not valid
	if (!ColorSpace.FORMAT.from(type)) return;

	// console.log("Old Color Format: ", colorFormat.value);
    colorFormat.value = type;
	console.log("Set Color Format: ", colorFormat.value);
})

// Export the context if you need direct access
export default context;