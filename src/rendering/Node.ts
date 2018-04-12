/**
 * Scene tree node
 * - Type parameter is used to constrain the type of the node's children
 * - Scene information flows from the roots to the leaves – by design nodes only have knowledge about their children, not their parents
 */
export class Node<T extends Node<any>> {

	get children(): Iterable<T> { return this._children; }
	protected _children = new Array<T>();

	add(child: T) {
		this._children.push(child);
	}

	remove(child: T) {
		let i = this._children.indexOf(child);
		if (i === -1) return false;
		this._children.splice(i, 1);
	}

	applyTreeTransforms(root: boolean = true) {
		for (let child of this._children) {
			child.applyTreeTransforms(true);
		}
	}

	/**
	 * Enable for(of) iteration, iterates each node in the tree, depth-first, starting at this node
	 */
	*[Symbol.iterator]() {
		yield this;

		for (let child of this._children) {
			for (let n of (child as any)) {
				yield n;
			}
		}
	}

}

export default Node;