import * as Models from "@server/models/index";

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
}
