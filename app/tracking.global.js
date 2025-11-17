import convert from "color-convert";
import { Worklets } from "react-native-worklets-core";
import Filter from "./Filter";
import COLOR_FORMATS from './Format';

//const COLOR_LOWER = convert.hsv.rgb(6, 161, 145); // rgb(30, 60, 60);
const COLOR_TARGET = convert.hsv.rgb(11, 198, 175); // rgb(40, 157, 157);


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

export const tapPosition = Worklets.createSharedValue(null);
export const colorFormat = Worklets.createSharedValue(COLOR_FORMATS.HSV);

export const colorFilter = Worklets.createSharedValue(null);

context.runAsync(() => {
	"worklet";
})

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
 * @returns the value of tap-position
 */
export const getTapPosition = context.createRunAsync(() => {
    "worklet";

    return tapPosition.value;
});

const defaultFilter = new Filter([30, 60, 60], [50, 255, 255]);

/**
 * Needed when accessing through JS-Thread ONLY
 * @returns {Filter} The upper and lower color filter values
 */
export const getColorFilter = context.createRunAsync(() => {
    "worklet";

	if (!colorFilter.value) {
		defaultFilter.setFormat(colorFormat.value); // Apply the format on each return (since might be different)
		colorFilter.value = defaultFilter; // Assign default to colorFilter
	}

	return colorFilter.value;
});

/**
 * Update the color filter with a target color and calculate RGB boundaries
 * Only updates if the value has changed and is not throttled
 * @param {{ upper: import("color-convert").RGB, lower: import("color-convert").RGB }} value The target color filter object with upper and lower RGB boundaries
 * @returns {void}
 */
export const setColorFilter = context.createRunAsync((value) => {
    "worklet";

	// console.log("Filter: ");
	// console.log(value);
	
	// If no-change or throttled, don't update
	if (value == colorFilter.value || isThrottled("colorFilter")) return;

	// console.log("Old Color Filter: ", colorFilter.value);
    colorFilter.value = value;
	console.log("Set Color Filter: ", colorFilter.value);
});

/**
 * Needed when accessing through JS-Thread ONLY
 * @returns {Format} The upper and lower color filter values
 */
export const getColorFormat = context.createRunAsync(() => {
    "worklet";
	return colorFormat.value;
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
	if (!COLOR_FORMATS.from(type)) return;

	// console.log("Old Color Format: ", colorFormat.value);
    colorFormat.value = type;
	console.log("Set Color Format: ", colorFormat.value);
})

// Export the context if you need direct access
export default context;