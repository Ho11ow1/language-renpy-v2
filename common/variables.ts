// Will probably remove this later but for now it's fine as a limit,
// Max i've been in contact with is 21188 on <UnDisclosed> anyways, any larger should really be a new file but whatever
export const MAX_LINE_COUNT: number = 25000;
export const NO_QUALITY_ASSURANCE: string = "# @NOQA";
export const EXCLUDE_FROM_VIEW_SEARCH_TARGETS: string[] = [ "**/*.rpyc", "**/*.rpymc", "**/*.bak", "**/saves", "**/cache" ];
export const RENPY_FORMAT_GLOB: string = "**/*.{rpy,rpym}";
export const RENPY_COMPILED_FORMAT_GLOB: string = "**/*.rpyc";

export const LSP_EDITORCONFIG_UPDATE_PATH = "renpyv2/config/editorconfig";
export const LSP_SAVE_UPDATE_PATH = "renpyv2/config/savedir";
export const LSP_NORMALIZED_DEBOUNCE_MS = 200;
