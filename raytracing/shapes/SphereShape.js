import * as THREE from 'three';

class SphereShape {
	centre;
	radius;

	static unitSphereShape = new SphereShape( 
		new THREE.Vector3(0, 0, 0),	// centre
		1
	);
	
	constructor(
		centre,
		radius
	) {
		this.centre = centre;
		this.radius = radius;
	}
}

export { SphereShape };