export enum NotificationType
{
    UPDATE,
    DELETE
}

export interface INotification
{
    message: string;
    type: NotificationType
}
