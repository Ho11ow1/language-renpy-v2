export interface IStaticJsonItem
{
    kind?: string;
    detail?: string;
    pythonType?: string;
    doc?: string;
    alias?: string;
    children?: Record<string, IStaticJsonItem>;
}
