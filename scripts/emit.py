import typing
import pathlib
import os

MODELS = pathlib.Path.joinpath(pathlib.Path(__file__).absolute().parent.parent, pathlib.Path("server", "models"))
OUTPUT_FILE_PATH = pathlib.Path.joinpath(MODELS, "diagnostics")
NAMING_RULE_PATH = pathlib.Path.joinpath(MODELS, "enums", "NamingRule.ts")
ERROR_CODE_PATH = pathlib.Path.joinpath(MODELS, "enums", "ErrorCode.ts")

L_VALUE_INDEX = 0
R_VALUE_INDEX = 2
CATEGORY_VALUE_INDEX = 4
SEVERITY_VALUE_INDEX = 5
IS_ENABLED_BY_DEFAULT_VALUE_INDEX = 6
MESSAGE_VALUE_INDEX = 7

def get_parts(path: pathlib.Path) -> list[str]:
    lines = list()

    with path.open(encoding = "utf-8") as f:
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

        rValue = parts[R_VALUE_INDEX].rstrip(',') if parts[R_VALUE_INDEX].startswith('"') else f"{int(parts[R_VALUE_INDEX].rstrip(',')):04d}"
        category = parts[CATEGORY_VALUE_INDEX].rstrip(',')
        severity = parts[SEVERITY_VALUE_INDEX].rstrip(',')
        is_enabled = parts[IS_ENABLED_BY_DEFAULT_VALUE_INDEX].rstrip(',')
        message = ' '.join(parts[MESSAGE_VALUE_INDEX:]).strip('"')

        mapping[parts[L_VALUE_INDEX]] = [rValue, category, severity, message, is_enabled]

    return mapping


def generate_map(source_path: pathlib.Path, output_file_name: str, map_type_name: str, enum_type_name: str, code_formatter: typing.Callable[[str], str]) -> None:
    OUTPUT_PATH = pathlib.Path.joinpath(OUTPUT_FILE_PATH, output_file_name)
    PARTS_MAP = get_mapping(get_parts(source_path))

    data = list()
    data.append("import * as Models from \"@server/models/index\";\n\n")
    data.append(f"export const {map_type_name}: Map<Models.{enum_type_name}, Models.DiagnosticDescriptor> = new Map<Models.{enum_type_name}, Models.DiagnosticDescriptor>([\n")

    for i, (k, v) in enumerate(PARTS_MAP.items()):
        data.append(f"    [Models.{enum_type_name}.{k}, new Models.DiagnosticDescriptor({code_formatter(v[0])}, \"{v[1]}\", Models.DiagnosticSeverity.{v[2]}, \"\", \"\", \"{v[3]}\", {v[4]})],\n")

        if (i == len(PARTS_MAP) - 1):
            data.append("]);\n")

    OUTPUT_PATH.open('w', encoding = "utf-8").write(''.join(data))

    return


def generate_rules() -> None:
    generate_map(source_path = NAMING_RULE_PATH, output_file_name = "DiagnosticDescriptorRuleMap.g.ts", map_type_name = "DiagnosticDescriptorRuleMap", enum_type_name = "NamingRule", code_formatter = lambda code: code.upper())

    return


def generate_codes() -> None:
    generate_map(source_path = ERROR_CODE_PATH, output_file_name = "DiagnosticDescriptorMap.g.ts", map_type_name = "DiagnosticDescriptorMap", enum_type_name = "ErrorCode", code_formatter = lambda code: f"\"RPY{code}\"")

    return


def main() -> None:
    if (not pathlib.Path.exists(NAMING_RULE_PATH) or not pathlib.Path.exists(ERROR_CODE_PATH)):
        os._exit(1)

    generate_codes()
    generate_rules()

    return


if __name__ == "__main__":
    main()
