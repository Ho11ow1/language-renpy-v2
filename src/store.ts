import { Declaration } from "@models/declaration";
import renpyJson from "@data/renpy.json";
import { Logger } from "@utils/logger";

export class Store
{
    // Static
    private static renpyMap: Map<string, Declaration> = new Map<string, Declaration>;       //
    private static preferencesMap: Map<string, Declaration> = new Map<string, Declaration>; //
    private static configMap: Map<string, Declaration> = new Map<string, Declaration>;      //
    private static buildMap: Map<string, Declaration> = new Map<string, Declaration>;       //
    private static guiMap: Map<string, Declaration> = new Map<string, Declaration>;         //

    // Needs to be parsed
    private static persistentMap: Map<string, Declaration> = new Map<string, Declaration>;  //
    private static variableMap: Map<string, Declaration> = new Map<string, Declaration>;    //
    private static labelMap: Map<string, Declaration> = new Map<string, Declaration>;       //
    private static screenMap: Map<string, Declaration> = new Map<string, Declaration>;      //
    private static bubbleMap: Map<string, Declaration> = new Map<string, Declaration>;      //

    // Workspace patterns
    private static filePatterns: Array<string> = ["**/*.rpy", "**/*_ren.py"];

    public static Initialize(): void
    {
        // Get static from renpy.json
        // Update everything via parser
    }

    public static RemoveDeclarationsFromFile(filePath: string): void
    {
        const staticMaps = [
            this.renpyMap,
            this.preferencesMap,
            this.configMap,
            this.buildMap,
            this.guiMap
        ];

        for (const map of staticMaps)
        {
            for (const [key, decl] of map.entries())
            {
                if (decl.locationInfo?.filePath === filePath)
                {
                    decl.Reset();
                }
            }
        }

        const userMaps = [
            this.persistentMap,
            this.variableMap,
            this.labelMap,
            this.screenMap,
            this.bubbleMap
        ];

        for (const map of userMaps)
        {
            for (const [key, decl] of map.entries())
            {
                if (decl.locationInfo?.filePath === filePath)
                {
                    map.delete(key);
                }
            }
        }
    }
}
