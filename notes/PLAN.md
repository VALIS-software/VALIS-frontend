- Integrate latest UI
    - Use remote data
    --- PR
    - Anything missing from App.tsx
    - Fill out viewModel.js and appModel.ts functionality
        - Connect up TrackViewSettings
    - api.js
    - Migrate constants to src/Constants.ts
    - Clear out as much as possible from Constants
    - There's not a clear distinction of responsibilities between view and app models
        - should viewModel exist? What's its purpose Should it's behaviour be mingrated to some navigation controller?
    - Solve all @! refactor
    - Remove as much as possible from util.js
    - Reorganise directories:
        - models shouldn't be in /ui
        - helpers shouldn't be in /ui
    - EventCreator -> node.js events
    - Rebuild TrackTooltip

- Slow down are large zoom-out because there's no limit on tiles
    - Track request boundaries

- Wrap up dev colors code
    - Maybe make the color dev trick into a separate dev/utils module

- Large-scale annotation rendering
    - generate gene tiles, = array of genes with transcript count

- Variant visualization
    https://docs.google.com/document/d/1OBykSYS_NWl_BG1ZHlRYRmXa17YDplGZJYdLL-HqO-o/edit#heading=h.ydbtyrks62k1

- Continue on Chrome caching bug

# Bugs
- Right-click, move mouse, escape to dismiss = stuck dragging

# Annotations
- Instance buffers should be local to tile payloads
- ! Tile boundary issues, a gene spanning two tiles will be drawn twice !
- Instanced micro-scale
    - Text batching
- Display annotation text at left of viewport
    - Actually, maybe only on hover
- Display transcript name on hover
- Handle overlapping gene names * After July 1st

# Tracks
- Track Resizing, should move tracks below rather than resizing
- Prevent tracks from being dragged off, clamp to edges
- Track grid lines to match the x-axis
- Momentum in panel zoom and pan via Animator
- Add removeTrack and cleanupTrack

# PR
- Merge in latest UI

# App
- TrackViewer serializeState() / getState()

# Tiling
- Chrome bug, why cache return 0 for 10.bin?
    - Produce repo example for bug report
- Move tile texture management out of Sequence track
- Improve performance by pooling tile textures system
    - Allocate a pool of textures to use to avoid creating new textures frequently
- Fix out of bounds sequence
    - .minmax file should report sequence length?
- Remove hard coding in sirius test API
- Switch to real sirius
- Tile request ordering
    - If we have a big list of unset requests we want to cancel and ensure the most recent request is executed first
    - Should this be API level or TileEngine level?
- Preload low-resolution version of sequence
- Global cache pruning
- Cache most important tiles in local storage
- Pre-emptive loading when zooming out

# Engine
- Implement 'depth' as an analog to width to create bounded z-volumes
    - Improve tile z positioning maaybe
    - Fix track cursor
    - search for @! depth-box tag

- "Device" -> "GPUDevice"

- State management, undo/redo

- GPUText.ts should be moved into gputext repo
    - build gputext.js
    - update example
- Publish GPUText on NPM

- Support touch events (or use pointer events polyfill)
- Support pinch + drag gestures when multiple pointers are down on a panel
    - Pointer down on any track should contribute to the gesture (not just two touches within the same track)

---- consider

- We only use a teeeny bit of fontawesome, can we save bytes here?

- Represent ensemble biotypes
    - https://www.ensembl.org/info/genome/genebuild/biotypes.html

- Need some way to indicate incomplete / low confidence data, eg: ATAD3A-201 or ATAD3A-204
    - What about high-confidence? CCDS?

- Animator field removal
    - Can we improve on the condition? Currently a magic number

- React is surprisingly slow, maybe it's better to update fields manually?
    - Resolve react performance issues, use production react?
- 80% of the bundle size is material-ui! Maybe we can switch to something more smaller later

---- notes

Prod: http://35.230.87.182/
Dev: http://35.185.230.75/

Ontology of feature types http://www.sequenceontology.org/miso/current_svn/term/SO:0001877

Ensemble course https://www.ebi.ac.uk/training/online/course/ensembl-browser-webinar-series-2016/how-take-course
Example Ensmble Browser View https://www.ensembl.org/Homo_sapiens/Location/View?db=core;g=ENSG00000188290;r=1:925926-925954