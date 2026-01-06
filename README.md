
# Better Dynamic Workspaces

A modernized, Plasma‑6‑native fork of the original **dynamic_workspaces** KWin script.  
This version focuses on predictable desktop ordering, GNOME‑like dynamic workspace behavior, and a simplified, Plasma‑6‑only codebase.
In pursuit of this vision, this fork has dropped Plasma 5 support

---

## Why This Fork Exists ⚙️

The original project by **maurges** introduced a clever and lightweight approach to dynamic workspaces on KDE. It worked well for its time and inspired this fork.  
However, because it was designed during the Plasma 5 era, and even now continues support for Plasma 5,  it carries several limitations under Plasma 6:

- A mixed Plasma 5/6 compatibility layer made the logic harder to maintain.  
- Desktop numbering becomes inconsistent after multiple add/remove cycles.  
- All desktops from the previous session were restored on startup, compounding the above problem
- The user could start on an arbitrary desktop rather than a predictable one.  

These issues were natural consequences of evolving APIs rather than flaws in the original design.  
This fork builds on the original idea while modernizing the implementation for Plasma 6.

---

## Key Improvements ✨

### Plasma 6 Only Codebase  
By removing Plasma 5 support, the script now uses Plasma 6’s native virtual desktop API directly.  
This eliminates legacy workarounds and results in:

- Cleaner, more maintainable logic  
- More reliable multi‑desktop window handling  
- Better integration with Plasma 6’s desktop model  

---

### Proper Desktop Renumbering 🔢  
Desktops are always sequential (`Desktop 1, Desktop 2, Desktop 3…`) with no gaps or stale IDs.  
This keeps the pager and internal ordering consistent — something the original script couldn’t guarantee due to Plasma 5 limitations.

---

## GNOME‑Style Behavior 🖥️

This fork maintains all dynamic workspace features from the original script but fixes the startup behavior to match GNOME more closely:

- Always start with **two** desktops  
- Always begin on **Desktop 1**  

The original script restored every desktop from the previous session and placed the user on whichever desktop they last used. Under Plasma 6, this could lead to cluttered or inconsistent startup states.

This fork ensures a clean, minimal workspace layout that grows only as needed.

---

### Modernized Logic and Structure 🧹  
The codebase has been streamlined by removing:

- Deprecated APIs  
- Plasma 5 emulation layers  
- Complex shifting logic required by older KWin behavior  

Replaced with:

- Direct Plasma 6 desktop objects  
- Clear add/remove rules  
- More reliable animation handling  

---

## Comparison 📊

| Feature | Original | This Fork |
|--------|----------|-----------|
| Plasma 5 support | Yes | No |
| Plasma 6 support | Partial | Full |
| Startup desktops | Restores all | Always 2 |
| Startup focus | Last used | Desktop 1 |
| Desktop renumbering | No | Yes |
| Dynamic behavior | Basic | GNOME‑like |
| Code complexity | Higher | Reduced |

---

## License (MIT) 📄

This fork switches from BSD‑3‑Clause to the MIT License.  
MIT is simpler, widely used in the Linux/KDE ecosystem, and more approachable for contributors while remaining fully permissive.

---

## Credits 🙏

This project is based on the original work by **maurges**, whose script established the foundation for dynamic workspaces on KDE.  
This fork updates that vision for Plasma 6 while keeping the spirit of the original project intact.

