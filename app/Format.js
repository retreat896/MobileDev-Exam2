// Just use a simple frozen object with string values
const COLOR_FORMATS = Object.freeze({
    BGR: "BGR",
    GRAY: "GRAY",
    HLS: "HLS",
    HSV: "HSV",
    Lab: "Lab",
    XYZ: "XYZ",
    
    /**
     * Check if a value is a valid format
     * @param {String} value 
     * @returns {String|null} The format string if valid, otherwise null
     */
    from(value) {
        return this[value] || null;
    }
});

export default COLOR_FORMATS;