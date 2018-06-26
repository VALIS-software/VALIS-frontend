- instanced rendering
    - use of bindAttributeLocation isn't valid because it assumes single rows
    - use of vertexAttribPointer isn't valid either for the same reason

    => Either we drop support for specifying bindings, maybe make it optional or require more information
        - Do we have enough information from reflection to drop support?
            - yes because we get the type from the info
        - If we want to render the same object with two different shaders, each different attribute layouts then we need two different VAOs
        - What extra information do we need?
            - attribute type
        - Packing assumed to be top-down

! what about when we want to skip a mat3 say

ShaderA           ShaderB
vec2 pos          vec2 pos
mat3 model        
vec4 color        vec4 color

Layout for both Shaders AND VAOs
[
    ('pos', vec2),
    ('model', mat3),
    ('color', vec4)
]

Can we actually bind things correctly?
    "It is also permissible to bind a generic attribute index to an attribute variable name that is never used in a vertex shader."
    => Yes for shaders

We could optionally supply the shader layout check against a VAO?
    - Could we make the AttributeLayout part of specifying a vertex state?
        ? Are .size and .dataType are covered by layout .type
            => no
        => Maybe data type can be determined by the buffer. NO because we can interlace data
        => So you may want to load data as an array of colors with RGBA bytes, but have them translated to

        - Maybe we add .type and .sourceType, where .sourceType is optional and inferred
            => yes
        - What about constants? They don't discuss a type
            => add .type to constants
        - Is there value in specifying Layout type?
            - It would be nice to drop .size
            - Say you have a shader that takes vec3 pos, can you supply vec2 pos data?

How's that represented? Can we Render the same VAO with both shaders?


- Wrap up dev colors code
    - Maybe make the color dev trick into a separate dev/utils module

- Display gene direction
    - Improve a bit
- Display transcript span

- Batch annotations into instance draw groups

- Need some way to indicate incomplete / low confidence data, eg: ATAD3A-201 or ATAD3A-204
    - What about high-confidence? CCDS?

- Merge component shaders

- Display annotation text at left of viewport
    - Actually, maybe only on hover

- Display transcript name

- Need to consider ensemble biotypes
    - https://www.ensembl.org/info/genome/genebuild/biotypes.html

- Large-scale annotation rendering
    - generate gene tiles, = array of genes with transcript count

- Consider the Ensemble view where sequence is in the middle and strands are either side
    - Too much work in the short term, instead I'll have + Strand and - Strand tracks

Current experimental view: https://www.ensembl.org/Homo_sapiens/Location/View?db=core;g=ENSG00000188290;r=1:925926-925954

* Ensemble course https://www.ebi.ac.uk/training/online/course/ensembl-browser-webinar-series-2016/how-take-course

- On tall stacks: do we always want to show all the transcripts?
    - Try other browser, how do they handle things?
    - Does it make sense to show a compressed / overlapped view of RNAs by default?

- Build gene groups from overlapping genes?
    - We can fully solve overlap this way but we end up with very tall stacks!
    - ! this has issues at tile boundaries, need to resolve

- !! What if annotations have state which is lots when creating / deleting as view changes

- Understand current representations
    GFF3 Gene sets: https://www.ensembl.org/info/data/ftp/index.html
    https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
    
    Gene Annotations: https://www.ensembl.org/info/genome/genebuild/genome_annotation.html
    Regulatory Regions Annotations: https://www.ensembl.org/info/genome/funcgen/regulatory_build.html 

    To understand all the _types_ of feature
    http://www.sequenceontology.org/miso/current_svn/term/SO:0001877

- Displays
    - Genes
    - Exon
    - CDS
        - "A CDS or coding sequence is the part of a transcript that is actually translated into protein"
        - Therefore a CDS will (almost) always start with an AUG codon and stop at one of the three STOP codons (UAA,UGA,UAG).
        
    - Transcripts => possible RNA sequences from the gene
    - cDNAs ???
    - EST ???

- Variant visualization
    https://docs.google.com/document/d/1OBykSYS_NWl_BG1ZHlRYRmXa17YDplGZJYdLL-HqO-o/edit#heading=h.ydbtyrks62k1

- Continue on Chrome caching bug

- Handle overlapping gene names
    * After July 1st


# Bugs
- Right-click, move mouse, escape to dismiss = stuck dragging

# Annotations
- Micro-scale annotation loading using tile engine
- Micro-scale annotation rendering
- Instanced drawing?
- Annotation density map, with downscaled LODs
- Macro-scale annotation density rendering

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
    - 
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

- Animator field removal
    - Can we improve on the condition? Currently a magic number

- React is surprisingly slow, maybe it's better to update fields manually?
    - Resolve react performance issues, use production react?
- 80% of the bundle size is material-ui! Maybe we can switch to something more smaller later

---- notes

Prod: http://35.230.87.182/
Dev: http://35.185.230.75/