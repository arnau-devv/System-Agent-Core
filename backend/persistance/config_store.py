import json
from pathlib import Path

# Mirror of src/configStore.js — same pattern, same criteria.
class ConfigStore:
    def __init__(self, config_path: Path):
        self.path = config_path
        self.data = self._read()

    def _defaults(self) -> dict:
        # Fallback structure when no config file exists yet:
        # { "user": {}, "agent_identity": {} }
        return { "user": {}, "agent_identity": {} }

    def _read(self) -> dict:
        if not self.path.exists():
            return self._defaults()
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            print(f"[ConfigStore] Error reading config: {e}")
            return self._defaults()

    def write(self, key: str, value: dict) -> None:
        self.data[key] = value
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8")

    def get(self, key: str):
        return self.data.get(key)

# Singleton — same pattern as module.exports = new ConfigStore() in JS
config_store = ConfigStore(Path.home() / "AppData/Local/SystemAgentCore/config/config.json")