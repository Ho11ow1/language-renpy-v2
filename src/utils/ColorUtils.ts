import * as vscode from "vscode";

export class ColorUtils
{
    public static hexToColor(hex: string): vscode.Color
    {
        hex = hex.substring(1);
        if (hex.length === 3 || hex.length === 4)
        {
            hex = hex.split("").map((c): string => `${c}${c}`).join("");
        }

        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

        return new vscode.Color(r, g, b, a);
    }

    public static rgbToColor(rgb: string, alpha?: string): vscode.Color
    {
        const [rStr, gStr, bStr] = rgb.trim().split(",");

        const r = parseFloat(rStr);
        const g = parseFloat(gStr);
        const b = parseFloat(bStr);
        const a = alpha !== undefined ? parseFloat(alpha) : 1;

        return new vscode.Color(r, g, b, a);
    }

    private static hueToRgb(p: number, q: number, t: number): number
    {
        if (t < 0)
        {
            t += 1;
        }
        if (t > 1)
        {
            t -= 1;
        }
        if (t < (1 / 6))
        {
            return p + (q - p) * 6 * t;
        }
        if (t < (1 / 2))
        {
            return q;
        }
        if (t < (2 / 3))
        {
            return p + (q - p) * ((2 / 3) - t) * 6;
        }

        return p;
    };

    public static hlsToColor(hls: string, alpha?: string): vscode.Color
    {
        const [hStr, lStr, sStr] = hls.trim().split(",");

        const h = parseFloat(hStr);
        const l = parseFloat(lStr);
        const s = parseFloat(sStr);
        const a = alpha !== undefined ? parseFloat(alpha) : 1;

        if (s === 0)
        {
            return new vscode.Color(l, l, l, 1);
        }

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const r = this.hueToRgb(p, q, h + (1 / 3));
        const g = this.hueToRgb(p, q, h);
        const b = this.hueToRgb(p, q, h - (1 / 3));

        return new vscode.Color(r, g, b, a);
    }

    public static hsvToColor(hsv: string, alpha?: string): vscode.Color
    {
        const [hStr, sStr, vStr] = hsv.trim().split(",");

        const h = parseFloat(hStr);
        const s = parseFloat(sStr);
        const v = parseFloat(vStr);
        const a = alpha !== undefined ? parseFloat(alpha) : 1;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;

        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r = 0;
        let g = 0;
        let b = 0;

        switch (i % 6)
        {
            case 0:
                r = v;
                g = t;
                b = p;
                break;

            case 1:
                r = q;
                g = v;
                b = p;
                break;

            case 2:
                r = p;
                g = v;
                b = t;
                break;

            case 3:
                r = p;
                g = q;
                b = v;
                break;

            case 4:
                r = t;
                g = p;
                b = v;
                break;

            default:
                r = v;
                g = p;
                b = q;
                break;
        }

        return new vscode.Color(r, g, b, a);
    }

    public static tupleToColor(tuple: string, alpha?: string): vscode.Color
    {
        const parts = tuple.split(",");

        const rStr = parts[0];
        const gStr = parts[1];
        const bStr = parts[2];
        // (r, g, b, a)?
        // True && alpha => a / 255 => byte * alpha byte => byte
        // True && !alpha => a / 255 => byte
        // False && alpha => alpha byte
        // False && !alpha => 1
        const a = parts.length === 4 ? 
        ((alpha !== undefined) ? ((parseInt(parts[3]) / 255) * parseFloat(alpha)) : parseInt(parts[3]) / 255) : 
        (alpha !== undefined) ? parseFloat(alpha) : 1;

        const r = parseInt(rStr) / 255;
        const g = parseInt(gStr) / 255;
        const b = parseInt(bStr) / 255;

        return new vscode.Color(r, g, b, a);
    }

    public static colorToHEX(color: vscode.Color): string
    {
        const r = Math.round(color.red * 255).toString(16).padStart(2, "0");
        const g = Math.round(color.green * 255).toString(16).padStart(2, "0");
        const b = Math.round(color.blue * 255).toString(16).padStart(2, "0");
        const a = Math.round(color.alpha * 255).toString(16).padStart(2, "0");

        return color.alpha < 1 ? `#${r}${g}${b}${a}` : `#${r}${g}${b}`;
    }

    public static colorToHLS(color: vscode.Color): string
    {
        const r = color.red;
        const g = color.green;
        const b = color.blue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        const l = (max + min) / 2;

        let h = 0;
        let s = 0;

        if (max !== min)
        {
            const delta = max - min;

            s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

            if (max === r)
            {
                h = (g - b) / delta + (g < b ? 6 : 0);
            }
            else if (max === g)
            {
                h = (b - r) / delta + 2;
            }
            else
            {
                h = (r - g) / delta + 4;
            }

            h /= 6;
        }

        return `Color(hls=(${h.toFixed(2)}, ${l.toFixed(2)}, ${s.toFixed(2)})${this.getAlphaSuffix(color)})`;
    }

    public static colorToHSV(color: vscode.Color): string
    {
        const r = color.red;
        const g = color.green;
        const b = color.blue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        const delta = max - min;

        let h = 0;
        let s = 0;

        const v = max;

        if (max !== 0)
        {
            s = delta / max;
        }

        if (delta !== 0)
        {
            if (max === r)
            {
                h = (g - b) / delta;

                if (h < 0)
                {
                    h += 6;
                }
            }
            else if (max === g)
            {
                h = (b - r) / delta + 2;
            }
            else
            {
                h = (r - g) / delta + 4;
            }

            h /= 6;
        }

        return `Color(hsv=(${h.toFixed(2)}, ${s.toFixed(2)}, ${v.toFixed(2)})${this.getAlphaSuffix(color)})`;
    }

    public static colorToRGB(color: vscode.Color): string
    {
        return `Color(rgb=(${color.red.toFixed(2)}, ${color.green.toFixed(2)}, ${color.blue.toFixed(2)})${this.getAlphaSuffix(color)})`;
    }

    public static colorToTuple(color: vscode.Color): string
    {
        const r = Math.round(color.red * 255);
        const g = Math.round(color.green * 255);
        const b = Math.round(color.blue * 255);
        const a = color.alpha < 1 ? `, ${Math.round(color.alpha * 255)}` : "";

        return `Color((${r}, ${g}, ${b}${a}))`;
    }

    private static getAlphaSuffix(color: vscode.Color): string
    {
        return color.alpha < 1 ? `, alpha=${color.alpha.toFixed(2)}` : "";
    }
}
