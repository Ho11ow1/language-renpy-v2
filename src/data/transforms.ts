import * as vscode from "vscode";
import { Declaration } from "@models/Declaration";

export const builtinTransforms: Array<Declaration> = new Array<Declaration>(
    new Declaration("topleft", vscode.CompletionItemKind.Property, "transform topleft", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("reset", vscode.CompletionItemKind.Property, "transform reset", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("top", vscode.CompletionItemKind.Property, "transform top", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("topright", vscode.CompletionItemKind.Property, "transform topright", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("truecenter", vscode.CompletionItemKind.Property, "transform truecenter", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("offscreenleft", vscode.CompletionItemKind.Property, "transform offscreenleft", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("left", vscode.CompletionItemKind.Property, "transform left", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("center", vscode.CompletionItemKind.Property, "transform center", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("default", vscode.CompletionItemKind.Property, "transform default", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("right", vscode.CompletionItemKind.Property, "transform right", "transform", "Ren'Py builtin transform", undefined, false),
    new Declaration("offscreenright", vscode.CompletionItemKind.Property, "transform offscreenright", "transform", "Ren'Py builtin transform", undefined, false),
);
