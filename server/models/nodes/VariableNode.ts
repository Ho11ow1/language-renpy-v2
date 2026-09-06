import * as Models from "@server/models/index";

export class VariableNode extends Models.Node
{
    public ReturnType: Models.ReturnType = Models.ReturnType.NONE;

    public setReturnType(type: Models.ReturnType): void
    {
        this.ReturnType = type;
    }
}
