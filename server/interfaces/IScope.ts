import * as Models from "@server/models/index";

export interface IScope
{
    kind: Models.ScopeType;
    depth: number;
    node: Models.Node;
}
