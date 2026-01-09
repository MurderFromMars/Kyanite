

# Kyanite - Dynamic Workspaces for Plasma 6

Kyanite is a dynamic workspace script for KDE Plasma 6 designed to provide a cohesive, predictable, and genuinely tiling window manager–style experience. It was created specifically to complement Krohnkite and to make Plasma behave more like a true dynamic TWM rather than a traditional desktop environment with added automation.

The goal of Kyanite is simple: workspaces should appear only when they are needed, disappear when they are no longer useful, and never disrupt the user’s spatial or mental model while doing so.

---

## Why Kyanite Exists

The upstream dynamic workspace script by Maruges does a good job of keeping an empty desktop available, but their behavior is often at odds with tiling workflows. Desktops may shift unexpectedly, cleanup can move the user to a different workspace, and the system frequently starts with more desktops than are actually needed, particularly since there is no system in place to manage startup behavior or manage the indecies 

Kyanite was written to address these issues directly. It rethinks dynamic workspaces from a tiling-first perspective, prioritizing index stability, minimalism, and continuous automatic cleanup. The result is a workflow that feels intentional, calm, and predictable, especially when used alongside Krohnkite.

---

## Design Philosophy

Kyanite follows a few core principles.

Workspaces should be created only in response to real usage, not preemptively.

There should be exactly one empty workspace available when expansion is needed, and none when it is not.

Workspace indices should be preserved whenever possible so muscle memory and layout awareness are never broken.

Automatic behavior should be invisible. The system should feel stable, not reactive.

These principles align closely with how dedicated tiling window managers behave and are the foundation of Kyanite’s design.

---

## Key Improvements Over Upstream

### Plasma 6 Only Architecture

Kyanite targets Plasma 6 exclusively. By dropping Plasma 5 compatibility and legacy abstractions, the codebase is significantly simpler and more reliable. This reduces edge cases and ensures behavior matches modern Plasma internals.

### True Dynamic Workspace Behavior

Workspaces are created only when a window actually occupies the last available desktop. Empty workspaces are removed automatically when no longer needed. At most, one empty workspace is maintained at the end, and only when it serves a purpose. 

This makes for a much more dynamic growth and cull management system 


### Index Preserving Compaction

One of the most important changes in Kyanite is index preserving compaction. When empty desktops are removed, the current workspace position is preserved whenever possible. Users are never unexpectedly moved to a different desktop as a side effect of cleanup.

This is critical for tiling workflows where spatial consistency matters.

### Minimal Startup State

Kyanite allows Plasma to start with exactly one desktop. No additional desktops are created at startup unless they are actually needed. The second workspace appears only when the first window layout requires expansion. this fixes the issue of plasma's messy startup workspace behavior that the original script left alone (at the great cost of your index!)
.

### Continuous Automatic Maintenance

Workspace compaction and correction happen continuously and automatically. Cleanup is triggered on window creation, window removal, desktop switches, and client desktop changes. The workspace layout remains accurate at all times without requiring manual intervention.

### Animation Safe Desktop Removal

Kyanite includes explicit safeguards to work around Plasma 6 animation quirks when removing desktops. This ensures workspace transitions remain smooth and visually consistent, avoiding broken or skipped animations.

### Designed for Krohnkite

Kyanite is built with Krohnkite in mind. Stable workspace indices integrate naturally with tiled layouts. Automatic expansion supports workspace per context workflows. Cleanup logic avoids disrupting tiling state. Together, Kyanite and Krohnkite deliver a workflow that feels much closer to a real dynamic tiling window manager than Plasma’s default behavior.

---

## Summary

Kyanite is not a cosmetic fork or a minor adjustment. It is a behavioral rewrite focused on delivering a cohesive dynamic workspace model for Plasma 6.

It provides stable, index preserving behavior, minimal startup state, continuous automatic cleanup, and seamless integration with Krohnkite. For users who treat Plasma as a tiling environment rather than a traditional desktop, Kyanite offers a cleaner, more intentional way to manage workspaces.

---

## Credits

Kyanite is based on the original dynamic workspace script by Maurges  for KDE Plasma. Credit goes to them for the foundational logic and ideas that made dynamic workspaces possible in Plasma. This fork builds on that work while reworking the behavior to better suit Plasma 6 and tiling window manager–oriented workflows.

## License (BSD3)

Kyanite is distributed under the BSD 3-Clause License, consistent with the licensing of the original project.
