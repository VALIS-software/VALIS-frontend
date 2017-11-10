
class Region {
	constructor(startBp, endBp, parent=null) {
		this.parent = parent;
		this.startBp = startBp;
		this.endBp = endBp;
	}

	minHeight(depth=0) {
		// returns the minimum height needed for the track to be visible 
		// along with all children up to `depth`
	}

	setBounds(startBp, endBp, width, height) {
		// determine how many child tracks can be rendered:

		// send request to fetch data needed for display
	}

	render(depth=0) {
		// renders the track contents and children
	}
}

export default Track