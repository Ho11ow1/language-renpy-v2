import pathlib
import os

MODELS = pathlib.Path.joinpath(pathlib.Path(__file__).absolute().parent.parent, pathlib.Path("server", "models"))
OUTPUT_FILE_PATH = pathlib.Path.joinpath(MODELS, "diagnostics")
NAMING_RULE_PATH = pathlib.Path.joinpath(MODELS, "enums", "NamingRule.ts")
ERROR_CODE_PATH = pathlib.Path.joinpath(MODELS, "enums", "ErrorCode.ts")

def get_parts(path: pathlib.Path) -> list[str]:
    lines = list()

    with open(path, "r") as f:
        inRange = False

        for line in f:
            line = line.strip()

            if line == '':
                continue

            if line == '{':
                inRange = True
                continue

            if line == '}':
                break

            if inRange:
                lines.append(line)

    return lines


def get_mapping(items: list[str]) -> dict[str, str]:
    mapping = dict()

    for line in items:
        parts = str(line).split(' ')
        mapping[parts[0]] = parts[2].rstrip(',') if parts[2].startswith('"') else f"{int(parts[2].rstrip(',')):04d}"

    return mapping


def generate_rules() -> None:
    NAMING_RULE_OUTPUT_PATH = pathlib.Path.joinpath(OUTPUT_FILE_PATH, "DiagnosticDescriptorRuleMap.g.ts")

    partsMap = get_mapping(get_parts(NAMING_RULE_PATH))

    data = list()
    data.append("import * as Models from \"@server/models/index\";\n\n")
    data.append("export const DiagnosticDescriptorRuleMap: Map<Models.NamingRule, Models.DiagnosticDescriptor> = new Map<Models.NamingRule, Models.DiagnosticDescriptor>([\n")

    for i, (k, v) in enumerate(partsMap.items()):        
        data.append(f"    [Models.NamingRule.{k}, new Models.DiagnosticDescriptor({v}, \"Design\", Models.DiagnosticSeverity.ERROR, \"\", \"\", \"\", true)],\n")

        if (i + 1== len(partsMap)):
            data.append("]);\n")

    for line in data:
        print(''.join(line))

    NAMING_RULE_OUTPUT_PATH.open("w", encoding = "utf-8").write(''.join(data))

    return


def generate_codes() -> None:
    ERROR_CODE_OUTPUT_PATH = pathlib.Path.joinpath(OUTPUT_FILE_PATH, "DiagnosticDescriptorMap.g.ts")

    partsMap = get_mapping(get_parts(ERROR_CODE_PATH))
    data = list()
    data.append("import * as Models from \"@server/models/index\";\n\n")
    data.append("export const DiagnosticDescriptorMap: Map<Models.ErrorCode, Models.DiagnosticDescriptor> = new Map<Models.ErrorCode, Models.DiagnosticDescriptor>([\n")

    for i, (k, v) in enumerate(partsMap.items()):        
        data.append(f"    [Models.ErrorCode.{k}, new Models.DiagnosticDescriptor(\"RPY{v}\", \"Design\", Models.DiagnosticSeverity.ERROR, \"\", \"\", \"\", true)],\n")

        if (i + 1== len(partsMap)):
            data.append("]);\n")

    for line in data:
        print(''.join(line))

    ERROR_CODE_OUTPUT_PATH.open("w", encoding = "utf-8").write(''.join(data))

    return


def main() -> None:
    if (not pathlib.Path.exists(NAMING_RULE_PATH) or not pathlib.Path.exists(ERROR_CODE_PATH)):
        os._exit(1)

    generate_codes()
    print('\n')
    generate_rules()


if __name__ == "__main__":
    main()

#
#   Optimize & Normalize all of this
#
