import * as Models from "@server/models/index";

export class ClassNode extends Models.Node
{
    public Methods: Models.FunctionNode[] = [];
    public Properties: Models.VariableNode[] = [];
    public Variables: Models.VariableNode[] = [];

    public addMethod(method: Models.FunctionNode): void
    {
        this.Methods.push(method);
    }

    public addVariable(variable: Models.VariableNode, isProp: boolean): void
    {
        if (isProp)
        {
            this.Properties.push(variable);
        }
        else
        {
            this.Variables.push(variable);
        }
    }
}
