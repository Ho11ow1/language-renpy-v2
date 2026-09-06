import * as Models from "@server/models/index";

export class FunctionNode extends Models.Node
{
    public Decorator: Models.FunctionDecorator = Models.FunctionDecorator.NONE;
    public ReturnType: Models.ReturnType = Models.ReturnType.NONE;

    public setDecorator(decorator: Models.FunctionDecorator): void
    {
        this.Decorator = decorator;
    }

    public setReturnType(type: Models.ReturnType): void
    {
        this.ReturnType = type;
    }
}
