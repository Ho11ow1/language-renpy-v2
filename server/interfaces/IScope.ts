import * as Models from "@server/models/index";

export interface IScope
{
    Kind: Models.ScopeType;
    Depth: number;
    Node?: Models.Node;
}
