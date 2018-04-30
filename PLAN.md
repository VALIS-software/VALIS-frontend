- X-Axis
    - Mouse wheel on panel
    - Model for zooming/panning large linear space

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