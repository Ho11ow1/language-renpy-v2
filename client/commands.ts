import * as vscode from "vscode";
import * as Interfaces from "@client/interfaces/index";
import * as Utils from "@client/utils/index";
import * as Common from "@common/index";
import * as Config from "@client/config/index";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export class ContextMenu
{
    public static getDisposables(): vscode.Disposable[]
    {
        return [
            vscode.commands.registerCommand("renpy.toUpper", ContextMenu.toUpper.bind(ContextMenu)),
            vscode.commands.registerCommand("renpy.toLower", ContextMenu.toLower.bind(ContextMenu)),
            vscode.commands.registerCommand("renpy.addItalic", ContextMenu.addItalic.bind(ContextMenu)),
            vscode.commands.registerCommand("renpy.addBold", ContextMenu.addBold.bind(ContextMenu)),
            vscode.commands.registerCommand("renpy.addColor", ContextMenu.addColor.bind(ContextMenu)),
            vscode.commands.registerCommand("renpy.addCPS", ContextMenu.addCPS.bind(ContextMenu))
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

    private static getSelectionContext(): Interfaces.ISelectionContext | undefined
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

export class Utility
{
    public static getDisposables(): vscode.Disposable[]
    {
        return [
            vscode.commands.registerCommand("renpy.clearRpyc", Utility.clearRpyc.bind(Utility)),
            vscode.commands.registerCommand("renpy.deletePersistent", Utility.deletePersistent.bind(Utility)),
        ];
    }

    private static async clearRpyc(): Promise<void>
    {
        Utils.Logger.logMessage(`Starting rpyc removal`);

        if (!(await this.confirm(["NO", "YES"])))
        {
            Utils.Logger.logMessage(`Abandoned remove rpyc removal`);

            return;
        }

        const docs = await vscode.workspace.findFiles(Common.RENPY_COMPILED_FORMAT_GLOB, null);
        await Promise.all(
            docs.map(async (doc): Promise<void> => {
                await vscode.workspace.fs.delete(doc, {
                    recursive: false,
                    useTrash: true
                });
            })
        );

        Utils.Logger.logMessage(`Removed: (${docs.length}) rpyc files`);
    }

    private static async deletePersistent(): Promise<void>
    {
        const cwd = vscode.workspace.workspaceFolders?.[0];
        if (!cwd)
        {
            return;
        }

        Utils.Logger.logMessage(`starting persistent removal`);
        
        if (!(await this.confirm(["NO", "YES"])))
        {
            Utils.Logger.logMessage(`Abandoned persistent removal`);

            return;
        }

        const entries: string[] = [];

        entries.push(path.join(cwd.uri.fsPath, "game", "saves", "persistent"))
        if (Config.WorkspaceConfig.fsSaveDirectory !== "")
        {
            const platfrom = process.platform;
            let base: string = "";

            base = platfrom === "win32" ? path.join(os.homedir(), "AppData", "Roaming", "RenPy") :
                platfrom === "darwin" ? path.join(os.homedir(), "Library", "RenPy") :
                path.join(os.homedir(), ".renpy");

            const candidate = path.join(base, Config.WorkspaceConfig.fsSaveDirectory, "persistent");
            //
            //  Kind of a weird way i guess but we don't allow for config.save_directory which start with a weird path like [ "." | "../" | "../jr" ] so that's fine
            //  I doubt anyone will ever even touch their save_directory config but just in case i guess since i am kind of resposible for the os and their files here
            //
            if (path.resolve(candidate).startsWith(path.resolve(base) + path.sep))
            {
                entries.push(candidate);
            }
            else
            {
                Utils.Logger.logDebug(`refused bad save directory: ${Config.WorkspaceConfig.fsSaveDirectory}`);
            }
        }

        await Promise.all(
            entries.map(async (entry): Promise<void> => {
                await fs.promises.rm(entry, {
                    recursive: false,
                    force: true
                });
            })
        );

        Utils.Logger.logMessage(`Removed:\n${entries.map((entry, idx): string => `${idx}: ${entry}`).join('\n')}`);
    }

    private static async confirm(options: string[], multipleChoice: boolean = false)
    {
        return ((await vscode.window.showQuickPick(options, { canPickMany: multipleChoice })) === options[1]);
    }
}
