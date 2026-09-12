import * as Models from "@server/models/index";
import * as lsps from "vscode-languageserver/node";

export class LabelNode extends Models.Node
{
    public Menus: Models.MenuNode[] = [];

    public addMenu(menu: Models.MenuNode | Models.MenuNode[]): void
    {
        if (Array.isArray(menu))
        {
            this.Menus.push(...menu);
        }
        else
        {
            this.Menus.push(menu);
        }
    }

    public override toDocumentSymbol(): lsps.DocumentSymbol
    {
        const symbol = super.toDocumentSymbol();

        if (this.Menus.length > 0)
        {
            symbol.children = this.Menus.map((menu): lsps.DocumentSymbol => menu.toDocumentSymbol());
        }

        return symbol;
    }
}
