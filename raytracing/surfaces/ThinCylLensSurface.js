import * as THREE from 'three';
import * as CONST from '../Constants.js';

class ThinCylLensSurface {
	principalPoint;
	opticalPower;	// optical power
	nOpticalPowerDirection;	// normalised vector in optical-power direction
	reflective;	// true = mirror
	type;	// one of IDEAL, PHASE_HOLOGRAM
	colourFactor;

	static idealThinCylLensSurface = new ThinCylLensSurface( 
		new THREE.Vector3(0, 0, 0),	// principalPoint
		1,	// opticalPower
		new THREE.Vector3(1, 0, 0),	// optical-power direction
		false,	// reflective
		CONST.IDEAL_SURFACE_TYPE,	// type
		CONST.TWO_SURFACE_COLOUR_FACTOR
	);
	
	constructor(
		principalPoint,
		opticalPower,
		opticalPowerDirection,
		reflective,
		type,
		colourFactor
	) {
		this.principalPoint = principalPoint;
		this.opticalPower = opticalPower;
		this.nOpticalPowerDirection = opticalPowerDirection.normalize();
		this.reflective = reflective;
		this.type = type;
		this.colourFactor = colourFactor;
	}
}

export { ThinCylLensSurface };