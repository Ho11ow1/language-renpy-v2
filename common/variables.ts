// Will probably remove this later but for now it's fine as a limit,
// Max i've been in contact with is 21188 on <UnDisclosed> anyways, any larger should really be a new file but whatever
export const MAX_LINE_COUNT: number = 25000;
export const NO_QUALITY_ASSURANCE: string = "# @NOQA";
export const EXCLUDE_FROM_VIEW_TARGETS: string[] = [ "**/*.rpyc", "**/*.rpymc", "**/*.bak", "**/saves", "**/cache" ];
export const RENPY_FORMAT_GLOB: string = "**/*.{rpy,rpym}";
