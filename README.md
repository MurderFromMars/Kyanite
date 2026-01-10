# Kyanite | Smart Dynamic Workspace Management for Plasma 6

A Plasma 6 native KWin script that delivers intelligent, self maintaining virtual desktops. Kyanite creates new desktops when you need them, removes empty ones when you don’t, and keeps your workspace numbering stable and predictable.

## Overview

Kyanite transforms KDE Plasma’s virtual desktops into a fluid, adaptive workspace. Instead of manually adding or removing desktops, you simply work and Kyanite handles the rest.

It ensures:

- A new empty desktop always exists at the end
- Empty desktops are automatically removed
- Windows shift downward to fill gaps
- Your current desktop index is preserved during cleanup
- The system never drops below one desktop

The result is a clean, infinite feeling workspace that expands and contracts based on your actual usage.

## Features

### Automatic Desktop Creation
Whenever a window lands on the last desktop, Kyanite instantly creates a new one after it. You always have room to keep working.

### Automatic Desktop Compaction
Kyanite continuously monitors for empty desktops and removes them, but only from the end of the list. This prevents gaps and keeps the desktop list tidy.

### Intelligent Window Shifting
When a desktop is removed, windows on higher indexed desktops shift down one position to maintain a clean sequence.

### Index Preserving Behavior
If compaction occurs while you are working, Kyanite keeps you on the same numbered desktop whenever possible.

### Plasma 6 Compatibility Layer
A dedicated compatibility wrapper normalizes Plasma 6 API differences, ensuring:

- Consistent desktop creation and removal
- Reliable window list access
- Stable signal handling
- Safe client desktop reassignment

### Animation Safe Execution
An internal animationGuard prevents recursive calls and avoids KWin animation glitches or event storms.

## How It Works

### Desktop Monitoring
Kyanite listens to:

- windowAdded
- windowRemoved
- desktopsChanged
- currentDesktopChanged
- Per client desktopsChanged

### Window Tracking
For each window, Kyanite checks:

- Which desktop it belongs to
- Whether it sits on the last desktop
- Whether its movement should trigger desktop creation

### Empty Desktop Detection
A desktop is considered empty if:

- No windows are assigned to it
- Windows on it are not skipPager
- Windows are not onAllDesktops

### Compaction Logic
When cleaning up:

1. Iterate backward through desktops
2. Identify empty desktops
3. Shift windows down to fill gaps
4. Remove the last desktop
5. Ensure at least one desktop remains
6. Ensure the last desktop is always empty

### Index Preservation
Before compaction, Kyanite records your current desktop index.  
After compaction, it restores you to the same index whenever possible.

# Known Limitations

## Manual Desktop Manipulation

Kyanite is designed to manage virtual desktops automatically. When desktops are created or removed manually, Plasma behaves in ways that Kyanite cannot safely track or correct.

### Manual Desktop Removal
Removing a desktop manually through the Overview, Pager, shortcuts, or System Settings causes Plasma to renumber desktops before Kyanite receives any signals. This can result in:

- Incorrect desktop numbering
- Unexpected compaction behavior

Kyanite will continue running, but the workspace layout may become temporarily inconsistent.

### Manual Desktop Addition
Adding desktops manually is even more disruptive. Plasma may insert new desktops at unpredictable positions, and when Kyanite later compacts or when you switch desktops:

- KWin can crash due to mismatched internal indices
- The desktop list may become unstable until Plasma restarts

Manual addition is strongly discouraged.

### No Interception Possible
KWin scripting cannot block or override manual desktop creation or removal. If users manipulate desktops themselves, Kyanite cannot guarantee correct behavior.

### No Workarounds
Any workaround for these issues would be hack like in nature and would come at a high cost to stability and functionality. After extensive investigation, there is simply no way to fix manual desktop manipulation without making the script objectively worse. For this reason, any issues opened about problems caused by manual desktop manipulation will be ignored and closed.

### Additional Note

Multi‑monitor setups should work without issues. I only have a single‑display system to test on, but Plasma manages virtual desktops globally and this script doesn’t alter that behavior. In theory, it should function the same across multiple monitors since all screens share the same desktop list.

---

## Credit and Inspiration

Kyanite began life as a fork of dynamic_workspaces by Maurges, a project that explored similar ideas around adaptive virtual desktops. Seeking to improve the experience, the codebase has evolved so much  that remaining a fork no longer makes sense. The logic, structure, and behavior have changed to the point where Kyanite has become its own distinct project. with virutally none of the origiinal code remaining, and so this brings me to this project being relicensed,

## License

Kyanite is now distributed under the GNU General Public License v3.0.
