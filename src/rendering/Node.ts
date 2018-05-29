/**
 * Scene tree node
 * - Type parameter is used to constrain the type of the node's children
 * - Scene information flows from the roots to the leaves – by design, nodes only have knowledge about their children, not their parents
 */
export class Node<T extends Node<any>> {

	children: Iterable<T> = new Set<T>();

	add(child: T) {
		(this.children as Set<T>).add(child);
	}

	remove(child: T) {
		return (this.children as Set<T>).delete(child);
	}

	applyTreeTransforms(root: boolean = true) {
		for (let child of this.children) {
			child.applyTreeTransforms(true);
		}
	}

	/**
	 * Enable for(of) iteration, iterates each node in the tree, depth-first, starting at this node
	 */
	*[Symbol.iterator]() {
		yield this;

		for (let child of this.children) {
			for (let n of (child as any)) {
				yield n;
			}
		}
	}

}

export default Node;