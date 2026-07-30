export interface IStaticJsonItem
{
    kind?: string;
    detail?: string;
    pythonType?: string;
    doc?: string;
    children?: Record<string, IStaticJsonItem>;
}
