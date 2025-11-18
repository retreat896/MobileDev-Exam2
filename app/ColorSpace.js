export default class ColorSpace {
    // Just use a simple frozen object with string values
    static FORMAT = Object.freeze({
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


    /**
     * 
     * @param {Number[]} lower 
     * @param {Number[]} upper 
     * @returns {String} value of 64bit integer.
     */
    static rgbBoundsToString(lower, upper) {
        // Convert components to BigInt before shifting
        const uR = upper[0] << 16;
        const uG = upper[1] << 8;
        const uB = upper[2] << 0;

        const lR = lower[0] << 16;
        const lG = lower[1] << 8;
        const lB = lower[2] << 0;
        
        // Combine using BigInt bitwise OR
        return `${uR | uG | uB}|${lR | lG | lB}`;
    }

    static stringBoundsToRGB(bounds) {
        const [upper, lower] = bounds.split("|", 2);

        const uR = upper >> 16 & 0xFF;
        const uG = upper >>  8 & 0xFF;
        const uB = upper >>  0 & 0xFF;
        const lR = lower >> 16 & 0xFF;
        const lG = lower >>  8 & 0xFF;
        const lB = lower >>  0 & 0xFF;
        
        return { 
            lower: [lR, lG, lB],
            upper: [uR, uG, uB]
        }
    }

    /**
     * Determines the closest color name and returns format-specific bounds
     * @param {Number[]} rgb RGB color [r, g, b] with values 0-255
     * @param {String} format Target color space format ('BGR', 'HSV', 'HLS', 'LAB', 'XYZ', 'GRAY')
     * @returns {Object[]} Array of bound objects with {lower: [], upper: []} properties
     */
    static ColorClosestToRGB(rgb, format) {
        const [r, g, b] = rgb;

        // Validate format
        if (!ColorSpace[format]) {
            console.error(`Invalid format: ${format}`);
            return [];
        }

        // Calculate color characteristics
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const avg = (r + g + b) / 3;

        let colorKey;

        // Handle neutral colors (low saturation)
        if (diff < 30) {
            if (avg < 50) {
                colorKey = 'BLACK';
            } else if (avg > 220) {
                colorKey = 'WHITE';
            } else {
                colorKey = 'GRAY';
            }
        }
        // Handle saturated colors
        else {
            if (max === r) {
                // Red is dominant
                if (g > b && g > r * 0.6) {
                    // Yellow-ish (high green)
                    colorKey = (g > r * 0.85) ? 'YELLOW' : 'ORANGE';
                } else if (b > g && b > r * 0.5) {
                    // Purple-ish (high blue)
                    colorKey = 'PURPLE';
                } else {
                    // Pure red
                    colorKey = 'RED';
                }
            } else if (max === g) {
                // Green is dominant
                if (r > b && r > g * 0.7) {
                    // Yellow (high red with green)
                    colorKey = 'YELLOW';
                } else if (b > r && b > g * 0.7) {
                    // Cyan (high blue with green)
                    colorKey = 'CYAN';
                } else {
                    // Pure green
                    colorKey = 'GREEN';
                }
            } else {
                // Blue is dominant
                if (r > g && r > b * 0.5) {
                    // Purple (high red with blue)
                    colorKey = 'PURPLE';
                } else if (g > r && g > b * 0.7) {
                    // Cyan (high green with blue)
                    colorKey = 'CYAN';
                } else {
                    // Pure blue
                    colorKey = 'BLUE';
                }
            }
        }

        // Special handling for GRAY format
        if (format === 'GRAY') {
            if (avg > 220) colorKey = 'WHITE';
            else if (avg > 170) colorKey = 'LIGHT_GRAY';
            else if (avg > 100) colorKey = 'MEDIUM_GRAY';
            else if (avg > 50) colorKey = 'DARK_GRAY';
            else colorKey = 'BLACK';
        }

        console.log(colorKey);

        // Retrieve bounds from the color space map
        const bounds = ColorSpace[format][colorKey];
        
        if (!bounds) {
            console.warn(`Color key ${colorKey} not found in format ${format}`);
            return [];
        }

        // Convert string bounds to objects
        if (Array.isArray(bounds)) {
            return bounds.map(boundStr => ColorSpace.stringBoundsToRGB(boundStr));
        }
        
    }

    /**
     * 
     * @param {Number} color RGB integer value 
     */
    static IntegerToRGB(color) {
        return [color >> 16 & 0xFF, color >> 8 & 0xFF, color & 0xFF]
    }

    // Ordered in order of frequency of use

    // HSV Color Space (Hue: 0-179, Saturation: 0-255, Value: 0-255)
    static HSV = Object.freeze({
        RED: Object.freeze([
            ColorSpace.rgbBoundsToString([0, 100, 100], [10, 255, 255]),
            ColorSpace.rgbBoundsToString([170, 100, 100], [179, 255, 255])
        ]),
        ORANGE: Object.freeze([ColorSpace.rgbBoundsToString([11, 100, 100], [23, 255, 255])]),
        YELLOW: Object.freeze([ColorSpace.rgbBoundsToString([24, 120, 70], [35, 255, 255])]),
        GREEN: Object.freeze([ColorSpace.rgbBoundsToString([36, 50, 50], [85, 255, 255])]),
        CYAN: Object.freeze([ColorSpace.rgbBoundsToString([86, 50, 50], [100, 255, 255])]),
        BLUE: Object.freeze([ColorSpace.rgbBoundsToString([101, 50, 50], [130, 255, 255])]),
        PURPLE: Object.freeze([ColorSpace.rgbBoundsToString([131, 50, 50], [169, 255, 255])]),
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [179, 255, 50])]),
        GRAY: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 51], [179, 50, 200])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 201], [179, 50, 255])]),
    });

    // HLS Color Space (Hue: 0-179, Lightness: 0-255, Saturation: 0-255)
    static HLS = Object.freeze({
        RED: Object.freeze([
            ColorSpace.rgbBoundsToString([0, 50, 100], [10, 255, 255]),
            ColorSpace.rgbBoundsToString([170, 50, 100], [179, 255, 255])
        ]),
        ORANGE: Object.freeze([ColorSpace.rgbBoundsToString([11, 50, 100], [25, 255, 255])]),
        YELLOW: Object.freeze([ColorSpace.rgbBoundsToString([26, 50, 100], [35, 255, 255])]),
        GREEN: Object.freeze([ColorSpace.rgbBoundsToString([36, 50, 50], [85, 255, 255])]),
        CYAN: Object.freeze([ColorSpace.rgbBoundsToString([86, 50, 50], [100, 255, 255])]),
        BLUE: Object.freeze([ColorSpace.rgbBoundsToString([101, 50, 50], [130, 255, 255])]),
        PURPLE: Object.freeze([ColorSpace.rgbBoundsToString([131, 50, 50], [169, 255, 255])]),
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [179, 50, 255])]),
        GRAY: Object.freeze([ColorSpace.rgbBoundsToString([0, 51, 0], [179, 200, 50])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([0, 201, 0], [179, 255, 50])]),
    });

    // BGR Color Space (Blue: 0-255, Green: 0-255, Red: 0-255) - Same as RGB but reversed
    static BGR = Object.freeze({
        RED: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 100], [80, 80, 255])]),
        ORANGE: Object.freeze([ColorSpace.rgbBoundsToString([0, 80, 150], [100, 180, 255])]),
        YELLOW: Object.freeze([ColorSpace.rgbBoundsToString([0, 150, 150], [100, 255, 255])]),
        GREEN: Object.freeze([ColorSpace.rgbBoundsToString([0, 100, 0], [80, 255, 80])]),
        CYAN: Object.freeze([ColorSpace.rgbBoundsToString([100, 150, 0], [255, 255, 100])]),
        BLUE: Object.freeze([ColorSpace.rgbBoundsToString([100, 0, 0], [255, 80, 80])]),
        PURPLE: Object.freeze([ColorSpace.rgbBoundsToString([100, 0, 100], [255, 80, 255])]),
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [50, 50, 50])]),
        GRAY: Object.freeze([ColorSpace.rgbBoundsToString([51, 51, 51], [200, 200, 200])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([201, 201, 201], [255, 255, 255])]),
    });

    // LAB Color Space (L: 0-255, A: 0-255, B: 0-255)
    // Note: OpenCV uses L:[0,255], a:[0,255], b:[0,255] where 128 is neutral
    static LAB = Object.freeze({
        RED: Object.freeze([ColorSpace.rgbBoundsToString([20, 150, 150], [255, 255, 255])]),
        ORANGE: Object.freeze([ColorSpace.rgbBoundsToString([50, 128, 150], [230, 200, 220])]),
        YELLOW: Object.freeze([ColorSpace.rgbBoundsToString([80, 100, 150], [255, 127, 255])]),
        GREEN: Object.freeze([ColorSpace.rgbBoundsToString([20, 0, 100], [200, 120, 140])]),
        CYAN: Object.freeze([ColorSpace.rgbBoundsToString([50, 0, 100], [200, 128, 127])]),
        BLUE: Object.freeze([ColorSpace.rgbBoundsToString([20, 128, 0], [200, 255, 127])]),
        PURPLE: Object.freeze([ColorSpace.rgbBoundsToString([20, 140, 0], [200, 255, 140])]),
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [50, 255, 255])]),
        GRAY: Object.freeze([ColorSpace.rgbBoundsToString([51, 118, 118], [200, 138, 138])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([201, 118, 118], [255, 138, 138])]),
    });

    // XYZ Color Space (X: 0-255, Y: 0-255, Z: 0-255) - Normalized to OpenCV range
    static XYZ = Object.freeze({
        RED: Object.freeze([ColorSpace.rgbBoundsToString([20, 10, 0], [180, 100, 50])]),
        ORANGE: Object.freeze([ColorSpace.rgbBoundsToString([80, 50, 10], [200, 140, 80])]),
        YELLOW: Object.freeze([ColorSpace.rgbBoundsToString([120, 120, 20], [255, 255, 150])]),
        GREEN: Object.freeze([ColorSpace.rgbBoundsToString([10, 20, 10], [100, 150, 80])]),
        CYAN: Object.freeze([ColorSpace.rgbBoundsToString([80, 120, 120], [200, 255, 255])]),
        BLUE: Object.freeze([ColorSpace.rgbBoundsToString([10, 10, 50], [100, 100, 200])]),
        PURPLE: Object.freeze([ColorSpace.rgbBoundsToString([40, 20, 80], [150, 100, 220])]),
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [25, 25, 25])]),
        GRAY: Object.freeze([ColorSpace.rgbBoundsToString([26, 26, 26], [150, 150, 150])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([151, 151, 151], [255, 255, 255])]),
    });

    // Grayscale (Single channel: 0-255)
    static GRAY = Object.freeze({
        BLACK: Object.freeze([ColorSpace.rgbBoundsToString([0, 0, 0], [50, 0, 0])]),
        DARK_GRAY: Object.freeze([ColorSpace.rgbBoundsToString([51, 0, 0], [100, 0, 0])]),
        MEDIUM_GRAY: Object.freeze([ColorSpace.rgbBoundsToString([101, 0, 0], [170, 0, 0])]),
        LIGHT_GRAY: Object.freeze([ColorSpace.rgbBoundsToString([171, 0, 0], [220, 0, 0])]),
        WHITE: Object.freeze([ColorSpace.rgbBoundsToString([221, 0, 0], [255, 0, 0])]),
    });

    constructor(upper, lower) {
        this.upper = upper;
        this.lower = lower;
    }

    valueOf() {
        return `${this.upper}|${this.lower}`;
    }

    toJSON() {
        return {
            upper: this.upper,
            lower: this.lower,
        }
    }

    toString() {
        return `Lower(${this.lower.join(', ')}, Upper(${this.upper.join(', ')})`;
    }
}