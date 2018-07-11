/**
 * http://www.sequenceontology.org/browser/current_svn
 * 
 * - On genes vs transcripts https://www.biostars.org/p/244850/
 * - On strands http://www.sci.sdsu.edu/~smaloy/MicrobialGenetics/topics/chroms-genes-prots/temp-strand.html
 * 
 * - Gene
 *  `A gene is a locus that produces a set of similar and functionally-related transcripts`
 *  `Includes all of the sequence elements necessary to encode a functional transcript. A gene may include regulatory regions, transcribed regions and/or other functional sequence regions.`
 * 
 *     - Transcript
 *       `a given possible RNA transcript associated with a GeneRegion`
 * 
 * Assumptions
 *  - A 'gene' by default is a protein-coding gene
 */

import * as fs from 'fs';
import AnnotationTileset from "sirius/AnnotationTileset";
import Gff3Parser from "gff3/Gff3Parser";
import { Terminal } from "./Terminal";
import { Feature } from "gff3/Feature";

// settings
const outputDirectory = '../../data/chromosome1/annotation';
const inputPath = 'data/Homo_sapiens.GRCh38.92.chromosome.1.gff3';

const featureTypeBlacklist = ['pseudogene', 'biological_region', 'chromosome'];

// initialize
let unknownFeatureTypes: { [key: string]: number }  = {};
let skippedFeatureTypes: { [key: string]: number }  = {};

let onUnknownFeature = (f: Feature) => { unknownFeatureTypes[f.type] = (unknownFeatureTypes[f.type] || 0) + 1 }

let lodLevel0TileSize = 1 << 20;

let tileset = new AnnotationTileset(
	lodLevel0TileSize, // ~1 million,
	false,
	onUnknownFeature,
	Terminal.error,
);

let macroLodLevel = 5;
let macroTileset = new AnnotationTileset(
	lodLevel0TileSize * (1 << macroLodLevel),
	true,
	onUnknownFeature,
	Terminal.error,
);

let inputFileStat = fs.statSync(inputPath);

let stream = fs.createReadStream(inputPath, {
	encoding: 'utf8',
	autoClose: true,
});

const progressUpdatePeriod_ms = 1000/60;
let _lastProgressTime_ms = -Infinity;
let parser = new Gff3Parser({

	onFeatureComplete: (feature) => {
		if (featureTypeBlacklist.indexOf(feature.type) === -1) {
			tileset.addTopLevelFeature(feature);
			macroTileset.addTopLevelFeature(feature);
		} else {
			skippedFeatureTypes[feature.type] = (skippedFeatureTypes[feature.type] || 0) + 1;
		}
		
		// log progress
		let hrtime = process.hrtime();
		let t_ms = hrtime[0] * 1000 + hrtime[1]/1000000;

		if ((t_ms - _lastProgressTime_ms) > progressUpdatePeriod_ms) {
			Terminal.clearLine();
			Terminal.log(`Processing <b>${Math.round(100 * stream.bytesRead / inputFileStat.size)}%</b>`);
			Terminal.cursorUp();
			_lastProgressTime_ms = t_ms;
		}
	},

	// print errors and comments
	onError: Terminal.error,
	onComment: (c) => Terminal.log(`<dim><i>${c}<//>`),

	onComplete: (gff3) => {
		Terminal.clearLine();
		
		// post-convert info
		if (Object.keys(unknownFeatureTypes).length > 0) {
			Terminal.warn('Unknown features:', unknownFeatureTypes);
		}
		if (Object.keys(skippedFeatureTypes).length > 0) {
			Terminal.log('Skipped features:<b>', skippedFeatureTypes);
		}

		saveTileset(tileset, outputDirectory);
		saveTileset(macroTileset, outputDirectory + '-' + 'macro');
	}

});

function saveTileset(tileset: AnnotationTileset, directory: string) {
	// delete output directory
	if (fs.existsSync(directory)) {
		for (let filename of fs.readdirSync(directory)) {
			fs.unlinkSync(directory + '/' + filename);
		}
		fs.rmdirSync(directory);
	}
	// create output directory
	fs.mkdirSync(directory);

	// write tile files to output directory
	let nSavedFiles = 0;
	for (let tile of tileset.tiles) {
		let filename = `${tile.startIndex.toFixed(0)},${tile.span.toFixed(0)}`;
		let filePath = `${directory}/${filename}.json`;
		fs.writeFileSync(filePath, JSON.stringify(tile.content));
		nSavedFiles++;
	}

	Terminal.success(`Saved <b>${nSavedFiles}</b> files into <b>${directory}</b>`);
}

stream.on('data', parser.parseChunk);
stream.on('close', parser.end);

Terminal.log(`Reading <b>${inputPath}</b>`);