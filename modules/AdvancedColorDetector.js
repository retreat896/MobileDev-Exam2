/**
 * Advanced Color Detection System
 * Analyzes RGB values across multiple color spaces to determine precise color classification
 * Handles edge cases including dark hues, desaturated colors, and ambiguous boundaries
 */
class AdvancedColorDetector {
    
    /**
     * Main color detection function
     * @param {Number[]} rgb - RGB values [r, g, b] in range 0-255
     * @param {String} format - Output format: 'GRAY' for grayscale only, or 'COLOR' for full spectrum
     * @returns {Object} Detailed color analysis with primary classification
     */
    static detectColor(rgb, format = 'COLOR') {
        const [r, g, b] = rgb;
        
        // Validate input
        if (!this.validateRGB(rgb)) {
            throw new Error('Invalid RGB values. Expected [r, g, b] with values 0-255');
        }

        // Validate format
        if (!['GRAY', 'COLOR'].includes(format)) {
            format = 'COLOR';
            //throw new Error('Invalid format. Use "GRAY" or "COLOR"');
        }

        // Calculate all color space representations
        const hsv = this.rgbToHSV(r, g, b);
        const hsl = this.rgbToHSL(r, g, b);
        const lab = this.rgbToLAB(r, g, b);
        const lch = this.labToLCH(lab);
        
        // Calculate perceptual metrics
        const luminance = this.calculateRelativeLuminance(r, g, b);
        const chromaticness = this.calculateChromaticness(r, g, b);
        
        // Multi-stage classification
        const classification = {
            primary: null,
            detailedColor: null, // Internal detailed classification before simplification
            confidence: 0,
            isDark: luminance < 0.15,
            isLight: luminance > 0.85,
            isDesaturated: hsv.s < 0.15,
            metrics: {
                hsv, hsl, lab, lch, luminance, chromaticness
            }
        };

        // Stage 1: Check for achromatic colors (black, white, gray)
        const achromaticResult = this.classifyAchromatic(rgb, hsv, hsl, luminance, chromaticness);
        if (achromaticResult) {
            classification.detailedColor = achromaticResult.color;
            classification.confidence = achromaticResult.confidence;
            classification.primary = this.simplifyColor(achromaticResult.color, format);
            return classification;
        }

        // For GRAY format, if not achromatic, convert to nearest gray
        if (format === 'GRAY') {
            const grayEquivalent = this.convertToGray(luminance);
            classification.detailedColor = grayEquivalent;
            classification.primary = grayEquivalent;
            classification.confidence = 0.70; // Lower confidence for color-to-gray conversion
            return classification;
        }

        // Stage 2: Classify chromatic colors (detailed)
        const chromaticResult = this.classifyChromatic(rgb, hsv, hsl, lab, lch, luminance);
        classification.detailedColor = chromaticResult.primary;
        classification.confidence = chromaticResult.confidence;

        // Stage 3: Handle dark color edge cases
        if (classification.isDark) {
            classification.detailedColor = this.refineDarkColor(
                classification.detailedColor, 
                rgb, 
                hsv, 
                luminance
            );
        }

        // Stage 4: Handle desaturated color edge cases
        if (classification.isDesaturated && !achromaticResult) {
            classification.detailedColor = this.refineDesaturatedColor(
                classification.detailedColor,
                hsv,
                luminance
            );
        }

        // Stage 5: Simplify to standard color categories
        classification.primary = this.simplifyColor(classification.detailedColor, format);

        return classification;
    }

    /**
     * Simplify detailed color names to standard categories
     * @param {String} detailedColor - Detailed color classification
     * @param {String} format - Output format ('GRAY' or 'COLOR')
     * @returns {String} Simplified color name
     */
    static simplifyColor(detailedColor, format) {
        // GRAY format mappings
        if (format === 'GRAY') {
            const grayMap = {
                'BLACK': 'BLACK',
                'VERY_DARK_GRAY': 'DARK_GRAY',
                'DARK_GRAY': 'DARK_GRAY',
                'MEDIUM_DARK_GRAY': 'MEDIUM_GRAY',
                'MEDIUM_GRAY': 'MEDIUM_GRAY',
                'LIGHT_GRAY': 'LIGHT_GRAY',
                'VERY_LIGHT_GRAY': 'LIGHT_GRAY',
                'WHITE': 'WHITE'
            };
            return grayMap[detailedColor] || 'MEDIUM_GRAY';
        }

        // COLOR format mappings
        const colorMap = {
            // Reds
            'PURE_RED': 'RED',
            'RED': 'RED',
            'DARK_RED': 'RED',
            'PINK_RED': 'RED',
            
            // Oranges
            'RED_ORANGE': 'ORANGE',
            'ORANGE': 'ORANGE',
            'DARK_ORANGE': 'ORANGE',
            'BRIGHT_ORANGE': 'ORANGE',
            'BROWN': 'ORANGE', // Brown is dark orange
            
            // Yellows
            'YELLOW_ORANGE': 'YELLOW',
            'YELLOW': 'YELLOW',
            'DARK_YELLOW': 'YELLOW',
            'OLIVE': 'YELLOW', // Olive is dark desaturated yellow
            
            // Greens
            'YELLOW_GREEN': 'GREEN',
            'PURE_GREEN': 'GREEN',
            'GREEN': 'GREEN',
            'DARK_GREEN': 'GREEN',
            'CYAN_GREEN': 'GREEN',
            
            // Cyans
            'CYAN': 'CYAN',
            'DARK_CYAN': 'CYAN',
            'CYAN_BLUE': 'CYAN',
            'TEAL': 'CYAN',
            
            // Blues
            'BLUE': 'BLUE',
            'PURE_BLUE': 'BLUE',
            'DARK_BLUE': 'BLUE',
            'NAVY': 'BLUE',
            'BLUE_PURPLE': 'BLUE',
            
            // Purples/Magentas/Pinks
            'PURPLE': 'PURPLE',
            'DARK_PURPLE': 'PURPLE',
            'VIOLET': 'PURPLE',
            'RED_PURPLE': 'PURPLE',
            'MAGENTA': 'PURPLE',
            'DARK_MAGENTA': 'PURPLE',
            'PINK': 'PURPLE',
            'LIGHT_PINK': 'PURPLE',
            'HOT_PINK': 'PURPLE',
            
            // Grays (when in COLOR mode)
            'BLACK': 'BLACK',
            'VERY_DARK_GRAY': 'GRAY',
            'DARK_GRAY': 'GRAY',
            'MEDIUM_DARK_GRAY': 'GRAY',
            'MEDIUM_GRAY': 'GRAY',
            'LIGHT_GRAY': 'GRAY',
            'VERY_LIGHT_GRAY': 'GRAY',
            'WHITE': 'WHITE',
            
            // Muted colors
            'MUTED_RED': 'GRAY',
            'MUTED_ORANGE': 'GRAY',
            'MUTED_YELLOW': 'GRAY',
            'MUTED_GREEN': 'GRAY',
            'MUTED_CYAN': 'GRAY',
            'MUTED_BLUE': 'GRAY',
            'MUTED_PURPLE': 'GRAY'
        };

        return colorMap[detailedColor] || 'GRAY';
    }

    /**
     * Convert luminance to gray category
     */
    static convertToGray(luminance) {
        if (luminance < 0.02) return 'BLACK';
        if (luminance < 0.20) return 'DARK_GRAY';
        if (luminance < 0.50) return 'MEDIUM_GRAY';
        if (luminance < 0.80) return 'LIGHT_GRAY';
        if (luminance > 0.95) return 'WHITE';
        return 'LIGHT_GRAY';
    }

    /**
     * Validate RGB input
     */
    static validateRGB(rgb) {
        if (!Array.isArray(rgb) || rgb.length !== 3) return false;
        return rgb.every(val => typeof val === 'number' && val >= 0 && val <= 255);
    }

    /**
     * Classify achromatic (grayscale) colors
     */
    static classifyAchromatic(rgb, hsv, hsl, luminance, chromaticness) {
        const [r, g, b] = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const range = max - min;
        
        // Calculate multiple metrics for gray detection
        const avgDeviation = (Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)) / 3;
        const maxDeviation = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
        
        // Adaptive threshold based on brightness
        const brightness = (r + g + b) / 3;
        const threshold = brightness < 50 ? 8 : brightness > 200 ? 12 : 10;
        
        // Strong achromatic indicators
        const isAchromatic = (
            (hsv.s < 0.08 && chromaticness < 0.12) ||
            (avgDeviation < threshold && maxDeviation < threshold * 1.5) ||
            (range < 15 && hsv.s < 0.15)
        );

        if (!isAchromatic) return null;

        // Classify specific gray level
        let color, confidence;
        
        if (luminance < 0.02 || brightness < 15) {
            color = 'BLACK';
            confidence = 0.98;
        } else if (luminance > 0.95 || brightness > 245) {
            color = 'WHITE';
            confidence = 0.98;
        } else if (luminance < 0.15) {
            color = 'VERY_DARK_GRAY';
            confidence = 0.90;
        } else if (luminance < 0.30) {
            color = 'DARK_GRAY';
            confidence = 0.92;
        } else if (luminance < 0.50) {
            color = 'MEDIUM_DARK_GRAY';
            confidence = 0.90;
        } else if (luminance < 0.65) {
            color = 'MEDIUM_GRAY';
            confidence = 0.90;
        } else if (luminance < 0.80) {
            color = 'LIGHT_GRAY';
            confidence = 0.92;
        } else {
            color = 'VERY_LIGHT_GRAY';
            confidence = 0.90;
        }

        return { color, confidence };
    }

    /**
     * Classify chromatic (colored) colors using multiple heuristics
     */
    static classifyChromatic(rgb, hsv, hsl, lab, lch, luminance) {
        const [r, g, b] = rgb;
        const hue = hsv.h;
        const sat = hsv.s;
        const val = hsv.v;
        
        let primary = null;
        let confidence = 0.5;

        // Calculate component relationships
        const dominance = this.calculateColorDominance(r, g, b);
        const ratios = this.calculateColorRatios(r, g, b);
        
        // Hue-based primary classification with refinements
        if (hue >= 0 && hue < 15) {
            // Red to Red-Orange boundary
            primary = this.classifyRedRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 15 && hue < 40) {
            // Orange to Red-Orange
            primary = this.classifyOrangeRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 40 && hue < 70) {
            // Yellow to Yellow-Orange
            primary = this.classifyYellowRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 70 && hue < 150) {
            // Green spectrum
            primary = this.classifyGreenRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 150 && hue < 200) {
            // Cyan to Teal
            primary = this.classifyCyanRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 200 && hue < 260) {
            // Blue spectrum
            primary = this.classifyBlueRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 260 && hue < 310) {
            // Purple to Violet
            primary = this.classifyPurpleRegion(rgb, hsv, ratios, dominance, luminance);
        } else if (hue >= 310 && hue < 330) {
            // Magenta to Pink
            primary = this.classifyMagentaRegion(rgb, hsv, ratios, dominance, luminance);
        } else {
            // Pink to Red (330-360)
            primary = this.classifyPinkRedRegion(rgb, hsv, ratios, dominance, luminance);
        }

        // Calculate confidence based on color purity and position
        confidence = this.calculateConfidence(rgb, hsv, hsl, dominance);

        return { primary, confidence };
    }

    /**
     * Red region classification (hue 0-15)
     */
    static classifyRedRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.05 && hsv.s < 0.6) {
            return 'BLACK';
        }
        
        if (luminance < 0.18 && hsv.s > 0.5) {
            return 'DARK_RED';
        }
        
        if (ratios.rg > 1.8 && ratios.rb > 1.5 && g < 80 && r > 200) {
            return 'PURE_RED';
        }
        
        if (b > g * 1.3 && dominance.maxComponent === 'r') {
            return 'PINK_RED';
        }
        
        return 'RED';
    }

    /**
     * Orange region classification (hue 15-40)
     */
    static classifyOrangeRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.10) {
            if (ratios.rg < 1.4 && g > 30) {
                return 'BROWN';
            }
            return 'DARK_RED';
        }
        
        if (luminance < 0.25 && hsv.s > 0.5 && g > 50) {
            if (ratios.rg < 1.6 && ratios.rg > 1.2) {
                return 'BROWN';
            }
            return 'DARK_ORANGE';
        }
        
        if (ratios.rg > 1.3 && ratios.rg < 1.8 && g > 60) {
            if (hsv.h < 25) {
                return 'RED_ORANGE';
            }
            return 'ORANGE';
        }
        
        if (b < 50 && g > 100 && r > 180) {
            return 'BRIGHT_ORANGE';
        }
        
        return 'ORANGE';
    }

    /**
     * Yellow region classification (hue 40-70)
     */
    static classifyYellowRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.20) {
            if (hsv.s > 0.7 && hsv.h < 50) {
                return 'DARK_ORANGE';
            }
            if (b < r * 0.25 && b < g * 0.25 && hsv.s > 0.6 && r > g * 1.15) {
                return 'BROWN';
            }
            return 'OLIVE';
        }
        
        if (luminance < 0.40 && hsv.s > 0.5) {
            return 'DARK_YELLOW';
        }
        
        if (ratios.rg > 0.85 && ratios.rg < 1.15 && b < Math.min(r, g) * 0.5) {
            if (hsv.h < 55) {
                return 'YELLOW_ORANGE';
            }
            return 'YELLOW';
        }
        
        if (b > g * 0.5) {
            return 'YELLOW_GREEN';
        }
        
        return 'YELLOW';
    }

    /**
     * Green region classification (hue 70-150)
     */
    static classifyGreenRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.05) {
            return 'BLACK';
        }
        
        if (luminance < 0.18 && hsv.s > 0.4) {
            return 'DARK_GREEN';
        }
        
        if (hsv.h < 90 && r > g * 0.7) {
            if (luminance < 0.30) {
                return 'OLIVE';
            }
            return 'YELLOW_GREEN';
        }
        
        if (hsv.h > 140 && b > g * 0.7) {
            return 'CYAN_GREEN';
        }
        
        if (dominance.maxComponent === 'g' && ratios.gr > 1.5 && ratios.gb > 1.5) {
            return 'PURE_GREEN';
        }
        
        return 'GREEN';
    }

    /**
     * Cyan region classification (hue 150-200)
     */
    static classifyCyanRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.15) {
            return 'DARK_BLUE';
        }
        
        if (luminance < 0.30 && hsv.s > 0.5) {
            return 'DARK_CYAN';
        }
        
        if (hsv.h < 175 && g > b * 0.9) {
            return 'CYAN_GREEN';
        }
        
        if (hsv.h > 185 && b > g * 0.9) {
            return 'TEAL';
        }
        
        if (ratios.gb > 0.9 && ratios.gb < 1.1 && r < g * 0.6) {
            return 'CYAN';
        }
        
        return 'CYAN';
    }

    /**
     * Blue region classification (hue 200-260)
     */
    static classifyBlueRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.05) {
            return 'BLACK';
        }
        
        if (luminance < 0.15 && hsv.s > 0.5) {
            return 'NAVY';
        }
        
        if (hsv.h < 220 && g > b * 0.7) {
            return 'CYAN_BLUE';
        }
        
        if (hsv.h > 245 && r > b * 0.5) {
            return 'BLUE_PURPLE';
        }
        
        if (dominance.maxComponent === 'b' && ratios.br > 1.8 && ratios.bg > 1.5 && b > 200) {
            return 'PURE_BLUE';
        }
        
        return 'BLUE';
    }

    /**
     * Purple region classification (hue 260-310)
     */
    static classifyPurpleRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.05) {
            return 'BLACK';
        }
        
        if (luminance < 0.18 && hsv.s > 0.5) {
            return 'DARK_PURPLE';
        }
        
        if (hsv.h < 280 && b > r * 0.9) {
            return 'VIOLET';
        }
        
        if (hsv.h > 295 && r > b * 0.9) {
            return 'RED_PURPLE';
        }
        
        if (ratios.rb > 0.85 && ratios.rb < 1.15 && g < r * 0.6) {
            return 'PURPLE';
        }
        
        return 'PURPLE';
    }

    /**
     * Magenta region classification (hue 310-330)
     */
    static classifyMagentaRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance < 0.15 && hsv.s > 0.5) {
            return 'DARK_MAGENTA';
        }
        
        if (luminance > 0.70 && hsv.s < 0.6) {
            return 'PINK';
        }
        
        if (b > r * 0.8 && g < r * 0.5) {
            return 'MAGENTA';
        }
        
        return 'MAGENTA';
    }

    /**
     * Pink-Red region classification (hue 330-360)
     */
    static classifyPinkRedRegion(rgb, hsv, ratios, dominance, luminance) {
        const [r, g, b] = rgb;
        
        if (luminance > 0.65 && hsv.s < 0.5) {
            return 'LIGHT_PINK';
        }
        
        if (luminance > 0.50 && hsv.s < 0.7) {
            return 'PINK';
        }
        
        if (b > g * 1.2 && hsv.s > 0.5) {
            return 'HOT_PINK';
        }
        
        if (luminance < 0.30) {
            return 'DARK_RED';
        }
        
        return 'RED';
    }

    /**
     * Refine dark colors that might be misclassified
     */
    static refineDarkColor(primary, rgb, hsv, luminance) {
        const [r, g, b] = rgb;
        const max = Math.max(r, g, b);
        
        if (luminance < 0.03 || max < 15) {
            return 'BLACK';
        }
        
        if (hsv.s < 0.25 && luminance < 0.15) {
            return 'VERY_DARK_GRAY';
        }
        
        if (primary === 'YELLOW' || primary === 'DARK_YELLOW') {
            if (luminance < 0.20) {
                return hsv.s > 0.6 ? 'BROWN' : 'OLIVE';
            }
        }
        
        if (primary === 'ORANGE' && luminance < 0.15) {
            return 'BROWN';
        }
        
        return primary;
    }

    /**
     * Refine desaturated colors
     */
    static refineDesaturatedColor(primary, hsv, luminance) {
        if (hsv.s < 0.10) {
            if (luminance < 0.20) return 'DARK_GRAY';
            if (luminance < 0.45) return 'MEDIUM_GRAY';
            if (luminance < 0.75) return 'LIGHT_GRAY';
            return 'VERY_LIGHT_GRAY';
        }
        
        if (hsv.s < 0.15) {
            return `MUTED_${primary}`;
        }
        
        return primary;
    }

    /**
     * Calculate color component dominance
     */
    static calculateColorDominance(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const mid = r + g + b - max - min;
        
        let maxComponent = r === max ? 'r' : (g === max ? 'g' : 'b');
        let minComponent = r === min ? 'r' : (g === min ? 'g' : 'b');
        
        return {
            maxComponent,
            minComponent,
            max,
            min,
            mid,
            range: max - min,
            dominanceRatio: max / (min + 1)
        };
    }

    /**
     * Calculate ratios between color components
     */
    static calculateColorRatios(r, g, b) {
        return {
            rg: r / (g + 1),
            rb: r / (b + 1),
            gr: g / (r + 1),
            gb: g / (b + 1),
            br: b / (r + 1),
            bg: b / (g + 1)
        };
    }

    /**
     * Calculate confidence score
     */
    static calculateConfidence(rgb, hsv, hsl, dominance) {
        let confidence = 0.5;
        
        confidence += hsv.s * 0.3;
        
        if (dominance.dominanceRatio > 2.0) {
            confidence += 0.15;
        }
        
        const hueMod = hsv.h % 60;
        if (hueMod > 15 && hueMod < 45) {
            confidence += 0.1;
        }
        
        return Math.min(0.99, confidence);
    }

    /**
     * Calculate chromaticness (color purity)
     */
    static calculateChromaticness(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max === 0) return 0;
        
        return (max - min) / max;
    }

    /**
     * RGB to HSV conversion
     */
    static rgbToHSV(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
            } else if (max === g) {
                h = ((b - r) / delta + 2) / 6;
            } else {
                h = ((r - g) / delta + 4) / 6;
            }
        }
        
        return { h: h * 360, s, v };
    }

    /**
     * RGB to HSL conversion
     */
    static rgbToHSL(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const delta = max - min;
        
        let h = 0;
        let s = 0;
        
        if (delta !== 0) {
            s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
            
            if (max === r) {
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
            } else if (max === g) {
                h = ((b - r) / delta + 2) / 6;
            } else {
                h = ((r - g) / delta + 4) / 6;
            }
        }
        
        return { h: h * 360, s, l };
    }

    /**
     * RGB to LAB conversion (via XYZ)
     */
    static rgbToLAB(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
        
        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    /**
     * LAB to LCH conversion
     */
    static labToLCH(lab) {
        const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
        let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
        if (h < 0) h += 360;
        
        return { l: lab.l, c, h };
    }

    /**
     * Calculate relative luminance (WCAG standard)
     */
    static calculateRelativeLuminance(r, g, b) {
        const rsRGB = r / 255;
        const gsRGB = g / 255;
        const bsRGB = b / 255;
        
        const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
        const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
        const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
        
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    }
}

// Example usage and testing
console.log("=== Color Detection Examples ===\n");

const testColors = [
    { rgb: [255, 0, 0], name: "Pure Red" },              // rgb(255, 0, 0)
    { rgb: [139, 0, 0], name: "Dark Red" },              // rgb(139, 0, 0)
    { rgb: [255, 165, 0], name: "Orange" },              // rgb(255, 165, 0)
    { rgb: [139, 69, 19], name: "Brown" },               // rgb(139, 69, 19)
    { rgb: [255, 255, 0], name: "Yellow" },              // rgb(255, 255, 0)
    { rgb: [100, 100, 0], name: "Dark Yellow (Olive?)" },// rgb(100, 100, 0)
    { rgb: [0, 128, 0], name: "Green" },                 // rgb(0, 128, 0)
    { rgb: [0, 255, 255], name: "Cyan" },                // rgb(0, 255, 255)
    { rgb: [0, 0, 255], name: "Blue" },                  // rgb(0, 0, 255)
    { rgb: [0, 0, 139], name: "Dark Blue" },             // rgb(0, 0, 139)
    { rgb: [128, 0, 128], name: "Purple" },              // rgb(128, 0, 128)
    { rgb: [255, 0, 255], name: "Magenta" },             // rgb(255, 0, 255)
    { rgb: [255, 192, 203], name: "Pink" },              // rgb(255, 192, 203)
    { rgb: [0, 0, 0], name: "Black" },                   // rgb(0, 0, 0)
    { rgb: [255, 255, 255], name: "White" },             // rgb(255, 255, 255)
    { rgb: [128, 128, 128], name: "Gray" },              // rgb(128, 128, 128)
    { rgb: [25, 25, 30], name: "Very Dark (Almost Black)" },// rgb(25, 25, 30)
    { rgb: [40, 20, 10], name: "Very Dark Brown" },      // rgb(40, 20, 10)
];

testColors.forEach(test => {
    const result = AdvancedColorDetector.detectColor(test.rgb);
    console.log(`${test.name} [${test.rgb}]:`);
    console.log(`  → Detected: ${result.primary}${result.secondary ? ` (${result.secondary})` : ''}`);
    console.log(`  → Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  → Dark: ${result.isDark}, Light: ${result.isLight}, Desaturated: ${result.isDesaturated}`);
    console.log();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedColorDetector;
}