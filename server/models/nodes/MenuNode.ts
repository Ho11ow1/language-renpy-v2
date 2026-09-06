import * as Models from "@server/models/index";
import * as lsps from "vscode-languageserver/node";

export class MenuNode extends Models.Node
{
    public Options: {label: string, range: lsps.Range}[] = [];

    public addOption(option: { label: string, range: lsps.Range } | { label: string, range: lsps.Range }[]): void
    {
        if (Array.isArray(option))
        {
            this.Options.push(...option);
        }
        else
        {
            this.Options.push(option);
        }
    }
}
