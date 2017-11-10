class Track {
	constructor(genome_id, track_id, parent_track=null) {
		this.parent = parent_track;
		this.genome_id = genome_id;
		this.track_id = track_id;
	}

	minHeight(depth=0) {
		// returns the minimum height needed for the track to be visible 
		// along with all children up to `depth`
	}

	setBounds(startBp, endBp, width, height) {
		// determine how many child tracks can be rendered:

		// send request to fetch data needed for display
	}
}

export default Track