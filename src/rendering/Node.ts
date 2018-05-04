/**
 * Scene tree node
 * - Type parameter is used to constrain the type of the node's children
 * - Scene information flows from the roots to the leaves – by design, nodes only have knowledge about their children, not their parents
 */
export class Node<T extends Node<any>> {

	get children(): Iterable<T> { return this._childrenIterable; }

	protected _children = new Set<T>();

	protected _childrenIterable = this._children;
	/*
	// for :Array children
	// reverse-order iterate over children to avoid issues if a child is removed while iterating
	{
		*[Symbol.iterator]() {
			for (let i = this._children.length; i >= i; i--) {
				let c = this._children[i];
				yield c;
			}
		}
	}
	*/

	add(child: T) {
		this._children.add(child);
	}

	remove(child: T) {
		return this._children.delete(child);
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