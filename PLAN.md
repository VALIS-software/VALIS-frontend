- TileCache


- Sequence track tile
    - How should API files be structured?
        - remote/ folder?
        - sirius/
        - remote/sirius
        - lib/sirius?
    - Fake API
        - Ideal:
            get sequence ( range, samplingDensity )
                =>
                {json header}
                \0
                <gatc proportions> arraybuffer(
                    [%g, %a, %t, %c]
                )
                <modifiations> arraybuffer(
                    [index, modification-bits]
                )

        ! maybe the whole thing could be done via video files?
        ! what about a simple file server with content-range support?
        ! Could have many LODs of the genome
    - Review how current API requests are handled
    - Display custom track tile as red
    - POC Download genome direct
    - then all the other stuff

- Track grid lines to match the x-axis

- X-Axis
    - Algorithm for laying out labels
        - Labels with 1/n split
        - Custom level labels (chromosomes)
        - Currently using absolute units, could be more precise without using range until the end
        - Optimize for large floats
    - Momentum in panel zoom and pan via Animator

    - Clear event listeners when tile is removed

- depth-based z
- Transparency pass
- add removeTrack and cleanupTrack

- Panels should display a single chromosome

- When texture slots are full we should swap out the last used
- Text elements
    - Implement transparent

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

---- notes

Prod: http://35.230.87.182/
Dev: http://35.185.230.75/