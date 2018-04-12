import Object2D from "./Object2D";
import React = require("react");

export class ReactObject extends Object2D {

    reactUid: number;
    content: React.ReactNode;

    constructor(content: React.ReactNode, w: number, h: number) {
        super();
        this.render = false;
        this.content = content;
        this.reactUid = ReactObject.uidCounter++;
        this.w = w;
        this.h = h;
    }

    onWorldTransformUpdated(listener: (worldTransform: Float32Array, computedWidth: number, computedHeight: number) => void) {
        this.eventEmitter.addListener('worldTransformUpdated', listener);
    }

    removeWorldTransformUpdated(listener: (...args: Array<any>) => void) {
        this.eventEmitter.removeListener('worldTransformUpdated', listener);
    }

    applyWorldTransform(transform: Float32Array | null) {
        super.applyWorldTransform(transform);
        this.eventEmitter.emit('worldTransformUpdated', this.worldTransformMat4, this.computedWidth, this.computedHeight);
    }

    static uidCounter = 0;

}

export class ReactObjectContainer extends React.Component<{
    reactObject: ReactObject,
    scene: Object2D
}, {
        worldTransform: Float32Array,
        computedWidth: number,
        computedHeight: number
    }> {

    constructor(props: {
        reactObject: ReactObject,
        scene: Object2D
    }) {
        super(props);

        this.state = {
            worldTransform: new Float32Array(16),
            computedWidth: 0,
            computedHeight: 0
        }

        props.reactObject.onWorldTransformUpdated((worldTransform, computedWidth, computedHeight) => {
            this.setState({
                worldTransform: worldTransform,
                computedWidth: computedWidth,
                computedHeight: computedHeight
            });
        });
    }

    render() {
        let scene = this.props.scene;
        let w = this.state.worldTransform;

        // apply inverse scene transform to convert clips-space world coordinates to DOM pixels
        let x = (w[12] - scene.x) / scene.sx;
        let y = (w[13] - scene.y) / scene.sy;
        let z = (w[14] - scene.z) / scene.sz;
        let sx = w[0] / scene.sx;
        let sy = w[5] / scene.sy;
        let sz = w[10] / scene.sz;

        return <div
            style={{
                position: 'absolute',
                transform: `matrix3d(
                    ${sx} , 0     , 0     , 0 ,
                    0     , ${sy} , 0     , 0 ,
                    0     , 0     , ${sz} , 0 ,
                    ${x}  , ${y}  , ${z}  , 1
                )`,
                width: this.state.computedWidth,
                height: this.state.computedHeight,
                willChange: 'transform, width, height',
            }}
        >
            {this.props.reactObject.content}
        </div>
    }

}

export default ReactObject;