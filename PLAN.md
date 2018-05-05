- Tile grid lines
- Tile cursor line

- X-Axis
    - Algorithm for laying out labels
        - Labels with 1/n split
        - Custom level labels (chromosomes)
        - Currently using absolute units, could be more precise without using range until the end
        - Optimize for large floats
    - Momentum in panel zoom and pan via Animator

    - Clear event listeners when tile is removed

- Transparency pass
- add removeTrack and cleanupTrack

- Panels should display a single chromosome

- When texture slots are full we should swap out the last used
- Text elements
    - Implement transparent
- depth-based z

- state management, undo/redo

- GPUText.ts should be moved into gputext repo
    - build gputext.js
    - update example
- Publish GPUText on NPM

- Issues when dragging handles with touch events in the simulator, test and resolve


---- consider

- Animator field removal
    - Can we improve on the condition? Currently a magic number

- React is surprisingly slow, maybe it's better to update fields manually?
    - Resolve react performance issues, use production react?
- 80% of the bundle size is material-ui! Maybe we can switch to something more smaller later