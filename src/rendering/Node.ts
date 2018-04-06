/**
 * Scene tree node, type parameter is used to constrain the type of the node's children
 */
export class Node<T> {

	get children(): Iterable<Node<T>> { return this._children; }
	protected _children = new Array<Node<T>>();

	add(child: Node<T>) {
		this._children.push(child);
	}

	remove(child: Node<T>) {
		let i = this._children.indexOf(child);
		if (i === -1) return false;
		this._children.splice(i, 1);
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

/*
export class NodeList<T> extends Array<T> {

	constructor() {
		super();
		console.log('wtf', this.add);
	}

	add(child: T) {
		this.push(child);
	}

	remove(child: T) {
		let i = this.indexOf(child);
		if (i === -1) return false;
		this.splice(i, 1);
	}

}
*/

export default Node;

/**
 * Doubly linked list of nodes (this may enable faster scene graph changes)
 */
 /*
export class Node<T> {

	children: NodeList<T>;

	// doubly-linked list internals
	private _next: Node<T>;
	private _previous: Node<T>;

	constructor() {}

}

export class NodeList<T> {

	get length() { return this._length; }
	get first() { return this._first; }
	get last() { return this._last; }

	private _length: number;
	private _first: Node<T> = null;
	private _last: Node<T> = null;

	constructor() {}

	clear() {
		this._first = null;
		this._last = null;
	}

	add(node: Node<T>) {
		if (this._first == null) {
			// list is empty and needs starting
			this._first = node;
			this._last = node;
		} else {
			// we can assume _last != null when the the list has been started (i.e. _first != null)
			(this._last as any)._next = node;
			(node as any)._previous = this._last;
			this._last = node;
		}

		this._length++;
	}

	remove(node: Node<T>) {
		if (node == this._first) {
			if (node == this._last) {
				// node is the only node
				this._first = null;
				this._last == null;
			} else {
				(node as any)._next._previous = null;
				this._first = (node as any)._next;
			}
		} else if (node == this._last) {
			(node as any)._previous._next = null;
			this._last = (node as any)._previous;
		} else {
			(node as any)._previous._next = (node as any)._next;
			(node as any)._next._previous = (node as any)._previous;
		}

		// by nulling _next and _previous, a double remove will trigger an exception rather than silently misbehave
		(node as any)._next = null;
		(node as any)._previous = null;

		this._length--;
	}

	// support for(of) syntax
	*[Symbol.iterator] () {
		let node = this._first;
		while (node != null) {
			yield node;
			node = (node as any)._next;
		}
	}

}
*/