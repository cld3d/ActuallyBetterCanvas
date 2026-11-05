"""Skip edits for plugins that are not installed instead of crashing on them."""
import sys

_warned = set()


def installed(plugins, relative):
    """True when the target's top-level plugin directory exists.

    Prints a one-time note per missing plugin so device-specific skips
    (e.g. no lock-screen plugin) stay visible instead of silent.
    """
    plugin = str(relative).split('/')[0]
    if (plugins / plugin).is_dir():
        return True
    if plugin not in _warned:
        _warned.add(plugin)
        print('Skipping ' + plugin + ' edits: plugin not installed at ' + str(plugins / plugin))
    return False
