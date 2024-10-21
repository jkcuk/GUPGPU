import * as THREE from 'three';

class CylinderMantleShape {
	centre;
	radius;
	radius2;	// radius^2
	nDirection;
	length;

	static xCylinderMantleShape = new CylinderMantleShape( 
		new THREE.Vector3(0, 0, 0),	// centre
		1,	// radius
		new THREE.Vector3(1, 0, 0),	// direction
		1	// length
	);
	
	constructor(
		centre,
		radius,
		direction,
		length
	) {
		this.centre = centre;
		this.radius = radius;
		this.radius2 = radius*radius;
		this.nDirection = direction.normalize();
		this.length = length;
	}
}

export { CylinderMantleShape };