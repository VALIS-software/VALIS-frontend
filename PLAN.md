# Annotations
- Generalize TileEngine to be an instance with a custom request promise
    - Lod filter behavior needs to be customizable
- Micro-scale annotation loading using tile engine
- Micro-scale annotation rendering
- Annotation density map, with downscaled LODs
- Macro-scale annotation density rendering

# Tracks
- Prevent tracks from being dragged off, clamp to edges
- Track grid lines to match the x-axis
- Momentum in panel zoom and pan via Animator
- Add removeTrack and cleanupTrack

# PR
- Merge in latest UI

# Tiling
- Chrome bug, why cache return 0 for 10.bin?
    - Produce repo example for bug report
- Fix out of bounds sequence
    - .minmax file should report sequence length?
- Remove hard coding in sirius test API
- Switch to real sirius
- Tile request ordering
    - If we have a big list of unset requests we want to cancel and ensure the most recent request is executed first
    - Should this be API level or TileEngine level?
- Preload low-resolution version of sequence
- Cache most important tiles in local storage
- Pre-emptive loading when zooming out

# Engine
- Implement 'depth' as an analog to width to create bounded z-volumes
    - Improve tile z positioning maaybe
    - Fix track cursor

- State management, undo/redo

- GPUText.ts should be moved into gputext repo
    - build gputext.js
    - update example
- Publish GPUText on NPM

- Support touch events (or use pointer events polyfill)
- Support pinch + drag gestures when multiple pointers are down on a panel
    - Pointer down on any track should contribute to the gesture (not just two touches within the same track)

---- consider

- Animator field removal
    - Can we improve on the condition? Currently a magic number

- React is surprisingly slow, maybe it's better to update fields manually?
    - Resolve react performance issues, use production react?
- 80% of the bundle size is material-ui! Maybe we can switch to something more smaller later

---- notes

Prod: http://35.230.87.182/
Dev: http://35.185.230.75/