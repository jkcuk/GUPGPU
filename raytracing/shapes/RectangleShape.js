import * as THREE from 'three';

class RectangleShape {
	corner;
	span1;
	span2;
	nNormal;	// normalised normal, pointing "outwards"

	static zRectangleShape = new RectangleShape( 
		new THREE.Vector3(-0.5, -0.5, 0),	// corner
		new THREE.Vector3(1, 0, 0),	// span1
		new THREE.Vector3(0, 1, 0),	// span2
		new THREE.Vector3(0, 0, 1)	// nnormal
	);
	
	constructor(
		corner,
		span1,	// span vector 1
		span2,	// span vector 2, needs to be perpendicular to span1
		normal	// normal, pointing "outwards"; needs to be perpendicular to span1 and span2
	) {
		this.corner = corner;
		this.span1 = span1;
		this.span2 = span2;
		this.nNormal = normal.normalize();
	}
}

export { RectangleShape };