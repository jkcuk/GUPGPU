import * as THREE from 'three';
import * as CONST from '../Constants.js';

class ThinLensSurface {
	// thin-lens/mirror types
	// static IDEAL_THIN_LENS_OR_MIRROR_SURFACE_TYPE = 0;
	// static PHASE_HOLOGRAM_THIN_LENS_OR_MIRROR_SURFACE_TYPE = 1;

	principalPoint;
	opticalPower;	// optical power
	reflective;	// true = mirror
	type;	// one of IDEAL, PHASE_HOLOGRAM
	colourFactor;

	static idealThinLensSurface = new ThinLensSurface( 
		new THREE.Vector3(0, 0, 0),	// principalPoint
		1,	// opticalPower
		false,	// reflective
		CONST.IDEAL_SURFACE_TYPE,	// type
		CONST.TWO_SURFACE_COLOUR_FACTOR
	);
	
	constructor(
		principalPoint,
		opticalPower,
		reflective,
		type,
		colourFactor
	) {
		this.principalPoint = principalPoint;
		this.opticalPower = opticalPower;
		this.reflective = reflective;
		this.type = type;
		this.colourFactor = colourFactor;
	}
}

export { ThinLensSurface };