- On the reverse strand, the genes seem to be off-by-some
    - See HES4: https://www.ensembl.org/Homo_sapiens/Location/View?db=core;g=ENSG00000188290;r=1:999960-999981
        Phase is 0?
    - Is this the same for forward strands?

Current experimental view: https://www.ensembl.org/Homo_sapiens/Location/View?db=core;g=ENSG00000188290;r=1:925926-925954

- How to handle phase?
    - Do we care about visualizing phase? Is this just
    
- How to handle transcript quality (transcript_support_level)
    https://www.ensembl.org/Help/Glossary?id=492
- Should we make clear merged and indicate source?
    'Golden Transcript's
- What about CCDS?

* Ensemble course https://www.ebi.ac.uk/training/online/course/ensembl-browser-webinar-series-2016/how-take-course

- Split y position for Strand + and Strand - ?
    - This improves overlap quite well but not completely
    - Is this a clear display?
    - Separate tracks?

- Should we split the sequence into forward and reverse like the ensemble browser?

- On tall stacks: do we always want to show all the transcripts?
    - Try other browser, how do they handle things?
    - Does it make sense to show a compressed / overlapped view of RNAs by default?

- Determine how best to show transcript components
- Show transcript direction

- Build gene groups from overlapping genes
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

- Chrome caching bug

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