import * as vscode from "vscode";
import { Logger } from "@utils/Logger";
import { ISelectionContext } from "@interfaces/ISelectionContext";

export class ContextMenuCommands
{
    public static getDisposables(): vscode.Disposable[]
    {
        return [
            vscode.commands.registerCommand("renpy.toUpper", ContextMenuCommands.toUpper.bind(ContextMenuCommands)),
            vscode.commands.registerCommand("renpy.toLower", ContextMenuCommands.toLower.bind(ContextMenuCommands)),
            vscode.commands.registerCommand("renpy.addItalic", ContextMenuCommands.addItalic.bind(ContextMenuCommands)),
            vscode.commands.registerCommand("renpy.addBold", ContextMenuCommands.addBold.bind(ContextMenuCommands)),
            vscode.commands.registerCommand("renpy.addColor", ContextMenuCommands.addColor.bind(ContextMenuCommands)),
            vscode.commands.registerCommand("renpy.addCPS", ContextMenuCommands.addCPS.bind(ContextMenuCommands))
        ];
    }

    private static toUpper(): void
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, ctx.text.toUpperCase());
    }

    private static toLower(): void
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, ctx.text.toLowerCase());
    }

    private static addItalic(): void
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, `{i}${ctx.text}{/i}`);
    }

    private static addBold(): void
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, `{b}${ctx.text}{/b}`);
    }

    private static async addColor(): Promise<void>
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        const color = await vscode.window.showInputBox({
            prompt: "Enter a color hex code or variable name",
            placeHolder: "gui.text_color or red",
            value: "#FFFFFF",
            validateInput: (value): string | null => value.trim() === "" ? "color can not be empty" : null
        });
        if (!color)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, `{color=${color}}${ctx.text}{/color}`);
    }

    private static async addCPS(): Promise<void>
    {
        const ctx = this.getSelectionContext();
        if (!ctx)
        {
            return;
        }

        const cps = await vscode.window.showInputBox({
            prompt: "Enter characters per second rate",
            placeHolder: "0",
            value: "0",
            validateInput: (value): string | null => isNaN(Number(value)) ? "Please enter a valid number" : null
        });
        if (!cps)
        {
            return;
        }

        this.replaceSelection(ctx.editor, ctx.selection, `{cps=${cps}}${ctx.text}{/cps}`);
    }

    private static getSelectionContext(): ISelectionContext | undefined
    {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
        {
            return undefined;
        }

        const selection = editor.selection;
        if (selection.isEmpty)
        {
            return undefined;
        }

        return { editor, selection, text: editor.document.getText(selection) };
    }

    private static replaceSelection(editor: vscode.TextEditor, selection: vscode.Selection, newText: string): Thenable<Boolean>
    {
        return editor.edit((editorBuilder): void => editorBuilder.replace(selection, newText));
    }
}
