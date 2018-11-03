- Variants:
    - Improve colors and rendering

- Integrate latest UI
    --- PR
    - Fill out viewModel.js and appModel.ts functionality
        - Connect up TrackViewSettings
    - Migrate constants to src/Constants.ts
    - Reorganise directories:
        - models shouldn't be in /ui
        - helpers shouldn't be in /ui
    - EventCreator -> node.js events

- Tracks should never have pan-y
    - Should adaptively display

- Search box should be like code editor command, can also do things like [goto] or @ to go to specific regions
    - Needs to be super fast

- Slow down at large zoom-out because there's no limit on tiles
    - Track request boundaries

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
- Prevent tracks from being dragged off, clamp to edges
- Track grid lines to match the x-axis
- Momentum in panel zoom and pan via Animator

# Tiling
- Chrome bug, why cache return 0 for 10.bin?
    - Produce repo example for bug report
- Improve performance by pooling tile textures system
    - Allocate a pool of textures to use to avoid creating new textures frequently
- Fix out of bounds sequence
    - .minmax file should report sequence length?
- Global cache pruning
- Cache most important tiles in local storage
- Pre-emptive loading when zooming out

# Engine
- Implement 'depth' as an analog to width to create bounded z-volumes
    - Improve tile z positioning maaybe
    - Fix track cursor
    - search for @! depth-box tag
- Samples and examples
- Open source

- State management, undo/redo

- Publish GPUText on NPM

- Support touch events (or use pointer events polyfill)
- Support pinch + drag gestures when multiple pointers are down on a panel
    - Pointer down on any track should contribute to the gesture (not just two touches within the same track)

---- consider

- Material ui is > 50% of bundle, can we do anything about this?

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