import json
import os

JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "renpy.json"))

def build_tree(flat_group: dict) -> dict:
    root_children = {}

    for raw_key, raw_item in flat_group.items():
        segments = [seg.strip() for seg in raw_key.split(".") if seg.strip()]
        current_container = root_children

        for i, seg in enumerate(segments):
            is_leaf = (i == len(segments) - 1)

            if is_leaf:
                existing = current_container.get(seg, {})
                current_container[seg] = {
                    **existing,
                    "kind": raw_item.get("kind") or existing.get("kind") or "Property",
                    "detail": raw_item.get("detail") or existing.get("detail") or seg,
                    "pythonType": raw_item.get("pythonType") or existing.get("pythonType") or "None",
                    "doc": raw_item.get("doc") or existing.get("doc") or ""
                }
            else:
                # Intermediate namespace node (e.g. "music" in "music.play")
                if seg not in current_container:
                    current_container[seg] = {
                        "kind": "Module",
                        "detail": f"namespace {seg}",
                        "pythonType": "None",
                        "doc": "",
                        "children": {}
                    }
                elif "children" not in current_container[seg]:
                    current_container[seg]["children"] = {}
                
                current_container = current_container[seg]["children"]

    return root_children


def main():
    if not os.path.exists(JSON_PATH):
        print(f"ERROR: Could not find renpy.json at {JSON_PATH}")
        return

    print(f"Reading {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    restructured = {}
    for top_level_namespace, group_items in raw_data.items():
        print(f"Processing top-level namespace: '{top_level_namespace}'...")
        restructured[top_level_namespace] = build_tree(group_items)

    print("Writing restructured JSON back to file...")
    with open(JSON_PATH, "w", encoding = "utf-8") as f:
        json.dump(restructured, f, indent = 4, ensure_ascii = False)

    print("SUCCESS: renpy.json has been restructured into the tree layout!")


if __name__ == "__main__":
    main()
