precision highp float;

#define PI 3.1415926538

// these constants must take the same values as those defined in Constants.js
#define MAX_SCENE_OBJECTS 10
#define MAX_RECTANGLE_SHAPES 10
#define MAX_SPHERE_SHAPES 10
#define MAX_CYLINDER_MANTLE_SHAPES 10
#define MAX_COLOUR_SURFACES 10
#define MAX_MIRROR_SURFACES 10
#define MAX_THIN_LENS_SURFACES 10
#define MAX_THIN_CYL_LENS_SURFACES 10

// shapes
#define RECTANGLE_SHAPE 0
#define SPHERE_SHAPE 1
#define CYLINDER_MANTLE_SHAPE 2

// surfaces
#define COLOUR_SURFACE 0
#define MIRROR_SURFACE 1
#define THIN_LENS_SURFACE 2
#define THIN_CYL_LENS_SURFACE 3

// ThinLensOrMirrorSurface types
#define IDEAL_SURFACE_TYPE 0
#define PHASE_HOLOGRAM_SURFACE_TYPE 1


varying vec3 intersectionPoint;

struct SceneObject {
	bool visible;
	int shapeType;
	int shapeIndex;
	int surfaceType;
	int surfaceIndex; 
};

uniform SceneObject sceneObjects[MAX_SCENE_OBJECTS];
uniform int noOfSceneObjects;

struct RectangleShape {
	vec3 corner;
	vec3 span1;
	vec3 span2;
	vec3 nNormal; 
};
uniform RectangleShape rectangleShapes[MAX_RECTANGLE_SHAPES];

struct SphereShape {
	vec3 centre;
	float radius;
};
uniform SphereShape sphereShapes[MAX_SPHERE_SHAPES];

struct CylinderMantleShape {
	vec3 centre;
	float radius;
	float radius2;	// radius^2
	vec3 nDirection;	// normalised direction
	float length;
};
uniform CylinderMantleShape cylinderMantleShapes[MAX_CYLINDER_MANTLE_SHAPES];

struct ColourSurface {
	vec4 colourFactor;
	bool semitransparent; 
};
uniform ColourSurface colourSurfaces[MAX_COLOUR_SURFACES];

struct MirrorSurface {
	vec4 colourFactor;
};
uniform MirrorSurface mirrorSurfaces[MAX_MIRROR_SURFACES];

struct ThinLensSurface {
	vec3 principalPoint;
	float opticalPower;
	bool reflective;
	int type;	// one of IDEAL, PHASE_HOLOGRAM
	vec4 colourFactor;
};
uniform ThinLensSurface thinLensSurfaces[MAX_THIN_LENS_SURFACES];	//  thinLensOrMirrorSurfaces[MAX_THIN_LENS_OR_MIRROR_SURFACES];

struct ThinCylLensSurface {
	vec3 principalPoint;
	float opticalPower;
	vec3 nOpticalPowerDirection;
	bool reflective;
	int type;	// one of IDEAL, PHASE_HOLOGRAM
	vec4 colourFactor;
};
uniform ThinCylLensSurface thinCylLensSurfaces[MAX_THIN_CYL_LENS_SURFACES];

uniform int maxTraceLevel;

// background
uniform sampler2D backgroundTexture;

// the camera's wide aperture
uniform float focusDistance;
uniform int noOfRays;
uniform vec3 apertureXHat;
uniform vec3 apertureYHat;
uniform vec3 viewDirection;
uniform float apertureRadius;
uniform float randomNumbersX[100];
uniform float randomNumbersY[100];


//
// findIntersectionWith<...> functions
//

bool findIntersectionWithRectangleShape(
	vec3 s, // ray start point, origin 
	vec3 nD, // normalised ray direction 
	RectangleShape rectangleShape,
	out vec3 intersectionPosition,
	out float intersectionDistance
) {
	// if the ray is parallel to the rectangle; there is no intersection 
	if (dot(nD, rectangleShape.nNormal) == 0.) {
		return false;
	}
	
	// calculate delta to check for intersections 
	float delta = dot(rectangleShape.corner - s, rectangleShape.nNormal) / dot(nD, rectangleShape.nNormal);
	if (delta<0.) {
		// intersection with rectangle is in backward direction
		return false;
	}

	// calculate the intersection position
	intersectionPosition = s + delta*nD;

	// does the intersection position lie within the rectangle 
	// (or elsewhere on the plane of the rectangle)?
	vec3 v = intersectionPosition - rectangleShape.corner;

	float x1 = dot(v, rectangleShape.span1);
	if( (x1 < 0.) || (x1 > dot(rectangleShape.span1, rectangleShape.span1)) ) { return false; }
	float x2 = dot(v, rectangleShape.span2);
	if(x2 < 0. || x2 > dot(rectangleShape.span2, rectangleShape.span2)) { return false; }

	// the intersection position lies within the rectangle
	intersectionDistance = delta;	// if nD is not normalised: delta*length(nD);
	return true;
}

// find the smallest positive solution for delta of the equation
//  a delta^2 + b delta + c = 0,
// or
//  delta^2 + (b/a) delta + (c/a) = 0
bool calculateDelta(
	float bOverA,
	float cOverA,
	out float delta
) {
	// calculate the discriminant
	float discriminant = bOverA*bOverA - 4.*cOverA;

	if(discriminant < 0.) {
		// the discriminant is negative -- all solutions are imaginary, so there is no intersection
		return false;
	}

	// there is at least one intersection, but is at least one in the forward direction?

	// calculate the square root of the discriminant
	float sqrtDiscriminant = sqrt(discriminant);

	// try the "-" solution first, as this will be closer, provided it is positive (i.e. in the forward direction)
	delta = (-bOverA - sqrtDiscriminant)/2.;
	if(delta < 0.) {
		// the delta for the "-" solution is negative, so that is a "backwards" solution; try the "+" solution
		delta = (-bOverA + sqrtDiscriminant)/2.;

		if(delta < 0.)
			// the "+" solution is also in the backwards direction
			return false;
	}
	return true;
}

bool findIntersectionWithSphereShape(
	vec3 s, 	// ray start point
	vec3 nD, 	// ray direction
	SphereShape sphereShape,
	out vec3 intersectionPosition,
	out float intersectionDistance
) {
	// for maths see geometry.pdf
	vec3 v = s - sphereShape.centre;
	// float a = dot(nD, nD);
	float b = 2.*dot(nD, v);
	float c = dot(v, v) - sphereShape.radius*sphereShape.radius;

	float delta;
	if(calculateDelta(
		b,	// if nD is not normalised: b/a,	// bOverA
		c,	// if nD is not normalised: c/a,	// cOverA
		delta
	)) {
		// there is an intersection in the forward direction, at
		intersectionPosition = s + delta*nD;
		intersectionDistance = delta;	// if nD is not normalised: delta*length(nD);
		return true;
	}
	return false;
}

bool isWithinFiniteBitOfCylinderMantleShape(
	vec3 position,
	CylinderMantleShape cylinderMantleShape
) {
	float a = dot( position - cylinderMantleShape.centre, cylinderMantleShape.nDirection );
	return ( abs(a) <= 0.5*cylinderMantleShape.length );
}

bool findIntersectionWithCylinderMantleShape(
	vec3 s, 	// ray start point
	vec3 nD, 	// normalised ray direction
	CylinderMantleShape cylinderMantleShape,
	out vec3 intersectionPosition,
	out float intersectionDistance
) {
	// first a quick check if the ray intersects the (infinitely long) cylinder mantle
	// see https://en.wikipedia.org/wiki/Skew_lines#Distance

	vec3 n = normalize(cross(cylinderMantleShape.nDirection, nD));	// a normalised vector perpendicular to both line and cylinder direction
	float distance = dot(s-cylinderMantleShape.centre, n);

	if(distance > cylinderMantleShape.radius) return false;

	// there is an intersection with the *infinite* cylinder mantle; calculate delta such that intersection position = s + delta * d

	// for maths see J's lab book 19/10/24
	vec3 v = cross( cylinderMantleShape.nDirection, s-cylinderMantleShape.centre );
	vec3 w = cross( cylinderMantleShape.nDirection, nD );
	// coefficients of quadratic equation a delta^2 + b delta + c = 0
	float a = dot(w, w);
	float b = 2.*dot(v, w);
	float c = dot(v, v) - cylinderMantleShape.radius2;
	float bOverA = b/a;
	float cOverA = c/a;

	// calculate the discriminant
	float discriminant = bOverA*bOverA - 4.*cOverA;

	if(discriminant < 0.) {
		// the discriminant is negative -- all solutions are imaginary, so there is no intersection
		return false;
	}

	// there is at least one intersection, but is at least one in the forward direction?

	// calculate the square root of the discriminant
	float sqrtDiscriminant = sqrt(discriminant);

	// try the "-" solution first, as this will be closer, provided it is positive (i.e. in the forward direction)
	float delta = (-bOverA - sqrtDiscriminant)/2.;
	intersectionPosition = s + delta*nD;
	if( (delta < 0.) || !isWithinFiniteBitOfCylinderMantleShape( intersectionPosition, cylinderMantleShape ) ) {
		// the "-" solution lies in the "backwards" direction or doesn't lie on the finite bit of the cylinder mantle; try the "+" solution
		delta = (-bOverA + sqrtDiscriminant)/2.;

		intersectionPosition = s + delta*nD;
		if( (delta < 0.) || !isWithinFiniteBitOfCylinderMantleShape( intersectionPosition, cylinderMantleShape ) )
			// the "-" solution lies in the "backwards" direction or doesn't lie on the finite bit of the cylinder mantle
			return false;
	}
	
	intersectionDistance = delta;	// if light-ray direction is not normalised: delta*length(nD);
	return true;
}

bool findIntersectionWithSceneObject(
	in vec3 s, // ray start point, origin 
	in vec3 nD, // normalized ray direction 
	in int sceneObjectIndex,
	out vec3 intersectionPosition,
	out float intersectionDistance
) {
	if(sceneObjects[sceneObjectIndex].shapeType == RECTANGLE_SHAPE) {
		return findIntersectionWithRectangleShape(
			s, // ray start point, origin 
			nD, // normalised ray direction 
			rectangleShapes[sceneObjects[sceneObjectIndex].shapeIndex],	// rectangle shape
			intersectionPosition,
			intersectionDistance
		);
	} else if(sceneObjects[sceneObjectIndex].shapeType == SPHERE_SHAPE ) {
		return findIntersectionWithSphereShape(
			s, // ray start point, origin 
			nD, // normalised ray direction 
			sphereShapes[sceneObjects[sceneObjectIndex].shapeIndex],
			intersectionPosition,
			intersectionDistance
		);
	} else if(sceneObjects[sceneObjectIndex].shapeType == CYLINDER_MANTLE_SHAPE ) {
		return findIntersectionWithCylinderMantleShape(
			s, // ray start point, origin 
			nD, // normalised ray direction 
			cylinderMantleShapes[sceneObjects[sceneObjectIndex].shapeIndex],
			intersectionPosition,
			intersectionDistance
		);
	}
	return false;
}

const float TOO_FAR = 1e20;

// find the (closest) intersection in the ray's forward direction with any of the
// objects that make up the scene
// s: ray start point (will not be altered)
// d: ray direction
// intersectionPosition: initial value ignored; becomes the position of the intersection
// intersectionDistance: initial value ignored; becomes the distance to the closest intersection point
// objectSetIndex: 0/1/2 if the intersection is with the x/y/z planes, 3 if it is with coloured spheres
// objectIndex: initial value ignored; becomes the index of the object within the object set being intersected
// returns true if an intersection has been found
bool findIntersectionWithScene(
	in vec3 s, // ray start point, origin 
	in vec3 nD, // normalized ray direction 
	in int originSceneObjectIndex,
	out int closestIntersectedSceneObjectIndex,
	out vec3 closestIntersectionPosition,
	out float closestIntersectionDistance
) {
	closestIntersectionDistance = TOO_FAR;	// this means there is no intersection, so far

	// create space for info on the current intersection
	vec3 intersectionPosition;
	float intersectionDistance;

	// go through all the scene objects
	for(int sceneObjectIndex = 0; sceneObjectIndex < noOfSceneObjects; sceneObjectIndex++) {
		// check if the ray did not originate on sceneObject
		if( originSceneObjectIndex != sceneObjectIndex ) {
			// the ray did not originate on sceneObject

			// SceneObject sceneObject = sceneObjects[sceneObjectIndex];

			// check for intersections only if the scene object is visible
			if(sceneObjects[sceneObjectIndex].visible) {
				// the scene object is visible

				if( 
					findIntersectionWithSceneObject(
						s, // ray start point, origin 
						nD, // ray direction 
						sceneObjectIndex,
						intersectionPosition,
						intersectionDistance
					)
				) {
					// the ray intersects the shape

					// is this the new closest intersection?
					if( intersectionDistance < closestIntersectionDistance ) {
						// this is the new closest intersection
						// take note of the parameters that describe it
						closestIntersectedSceneObjectIndex = sceneObjectIndex;
						closestIntersectionDistance = intersectionDistance;
						closestIntersectionPosition = intersectionPosition;
					}
				}
			}
		}
	}
	return (closestIntersectionDistance < TOO_FAR);
}

//
// isInside<shape> functions
//

// the outside of a rectangle is interpreted here as the side of the rectangle plane
// to which the vector nNormal points (i.e. nNormal is a (normalised) *outwards-facing* normal)
bool isInsideRectangleShape(
	vec3 position,
	int rectangleShapeIndex
) {
	RectangleShape rectangleShape = rectangleShapes[ rectangleShapeIndex ];
	// nNormal is, by definition, facing outwards
	return ( dot( position - rectangleShapes[ rectangleShapeIndex ].corner, rectangleShapes[ rectangleShapeIndex ].nNormal ) <= 0. );
}

bool isInsideSphereShape(
	vec3 position,
	int sphereShapeIndex
) {
	vec3 r = position - sphereShapes[sphereShapeIndex].centre;
	return ( dot(r, r) <= sphereShapes[sphereShapeIndex].radius*sphereShapes[sphereShapeIndex].radius);
}

// the inside of a cylinder mantle (no end caps) is interpreted here as 
// the inside of the cylinder formed by the cylinder mantle with end caps
bool isInsideCylinderMantleShape(
	vec3 position,
	int cylinderMantleShapeIndex
) {
	vec3 v = cross( position - cylinderMantleShapes[cylinderMantleShapeIndex].centre, cylinderMantleShapes[cylinderMantleShapeIndex].nDirection );
	if( dot(v, v) <= cylinderMantleShapes[cylinderMantleShapeIndex].radius2 ) {
		// position is inside the infinitely extended cylinder mantle

		// check if it lies within the (actually finite) cylinder mantle
		float a = dot( 
			position - cylinderMantleShapes[cylinderMantleShapeIndex].centre, 
			cylinderMantleShapes[cylinderMantleShapeIndex].nDirection 
		) / ( 0.5*cylinderMantleShapes[cylinderMantleShapeIndex].length );
		return ( (-1.0 <= a) && (a <= 1.0) );
	}
}

bool isInsideSceneObject(
	vec3 position,
	int sceneObjectIndex
) {
	if(sceneObjects[sceneObjectIndex].shapeType == RECTANGLE_SHAPE) {
		return isInsideRectangleShape(
			position,
			sceneObjects[sceneObjectIndex].shapeIndex
		);
	} else if(sceneObjects[sceneObjectIndex].shapeType == SPHERE_SHAPE ) {
		return isInsideSphereShape(
			position,
			sceneObjects[sceneObjectIndex].shapeIndex
		);
	} else if(sceneObjects[sceneObjectIndex].shapeType == CYLINDER_MANTLE_SHAPE ) {
		return isInsideCylinderMantleShape(
			position,
			sceneObjects[sceneObjectIndex].shapeIndex
		);
	}
}

//
// getNormal2<...> functions
//

vec3 getNormal2RectangleShape(
	vec3 position,
	int rectangleShapeIndex
) {
	return rectangleShapes[rectangleShapeIndex].nNormal;
}

vec3 getNormal2SphereShape(
	vec3 position,
	int sphereShapeIndex
) {
	return normalize(position - sphereShapes[sphereShapeIndex].centre);
}

vec3 getNormal2CylinderMantleShape(
	vec3 position,
	int cylinderMantleShapeIndex
) {
	vec3 v = position - cylinderMantleShapes[cylinderMantleShapeIndex].centre;
	return normalize( v - dot(v, cylinderMantleShapes[cylinderMantleShapeIndex].nDirection)*cylinderMantleShapes[cylinderMantleShapeIndex].nDirection );
}

// returns the normalised normal at the position
vec3 getNormal2SceneObject(
	vec3 position,
	int sceneObjectIndex
) {
	int shapeType = sceneObjects[sceneObjectIndex].shapeType;
	int shapeIndex = sceneObjects[sceneObjectIndex].shapeIndex;
	if( shapeType == RECTANGLE_SHAPE ) return getNormal2RectangleShape(position, shapeIndex);
	else if( shapeType == SPHERE_SHAPE ) return getNormal2SphereShape(position, shapeIndex);
	else if( shapeType == CYLINDER_MANTLE_SHAPE ) return getNormal2CylinderMantleShape(position, shapeIndex);
	return vec3(0, 1, 0);
}

//
// interactWith<...> functions
//

void interactWithThinLensOrMirrorSurface(
 	vec3 pi,	// I-P, i.e. the vector from the principal point P to the intersection point I
	inout vec3 nD,	// normalised ray direction 
	inout vec4 c,	// colour/brightness
	vec3 nN,	// normalised (outwards-facing) normal
	int type,
	float opticalPower,
	float reflectionFactor
) {
	if(type == IDEAL_SURFACE_TYPE) {
		// ideal thin lens/mirror

		// "normalise" the direction such that the magnitude of the "nD component" is 1
		vec3 d1 = nD/abs(dot(nD, nN));

		// calculate the "nN component" of d1, which is of magnitude 1 but the sign can be either + or -
		float d1N = dot(d1, nN);

		vec3 d1T = d1 - nN*d1N;	// the transverse (perpendicular to nN) part of d1

		// the 3D deflected direction comprises the transverse components and a n component of magnitude 1
		// and the same sign as d1N = dot(d, nHat)
		nD = normalize(d1T - pi*opticalPower + nN*reflectionFactor*d1N);	// replace d1N with sign(d1N) if d1 is differently normalised
	} else if(type == PHASE_HOLOGRAM_SURFACE_TYPE) {
		// phase hologram
		// nD is already normalised as required
		float nDN = dot(nD, nN);	// the nN component of nD
		
		// the transverse (perpendicular to nN) part of the outgoing light-ray direction
		vec3 dT = nD - nN*nDN - pi*opticalPower;

		// from the transverse direction, construct a 3D vector by setting the n component such that the length
		// of the vector is 1
		nD = normalize(dT + nN*reflectionFactor*sign(nDN)*sqrt(1.0 - dot(dT, dT)));
	}
}

bool interactWithThinLensSurface(
 	inout vec3 s,	// intersection position; out value becomes new ray start point
	inout vec3 nD,	// normalised ray direction 
	inout vec4 c,	// colour/brightness
	vec3 nN,	// normalised (outwards-facing) normal
	int thinLensSurfaceIndex
) {
	interactWithThinLensOrMirrorSurface(
 		s - thinLensSurfaces[thinLensSurfaceIndex].principalPoint,	// I-P, i.e. the vector from the principal point P to the intersection point I
		nD,	// normalised ray direction 
		c,	// colour/brightness
		nN,	// normalised (outwards-facing) normal
		thinLensSurfaces[thinLensSurfaceIndex].type,	// type
		thinLensSurfaces[thinLensSurfaceIndex].opticalPower,	// opticalPower
		(thinLensSurfaces[thinLensSurfaceIndex].reflective)?-1.0:1.0	// reflectionFactor; +1 = transmissive
	);
	c *= thinLensSurfaces[thinLensSurfaceIndex].colourFactor;
	return true;	// keep raytracing
}

bool interactWithThinCylLensSurface(
 	inout vec3 s,	// intersection position; out value becomes new ray start point
	inout vec3 nD,	// normalised ray direction 
	inout vec4 c,	// colour/brightness
	vec3 nN,	// normalised (outwards-facing) normal
	int thinCylLensSurfaceIndex
) {
	vec3 pi = s - thinCylLensSurfaces[thinCylLensSurfaceIndex].principalPoint;
	interactWithThinLensOrMirrorSurface(
 		dot(pi, thinCylLensSurfaces[thinCylLensSurfaceIndex].nOpticalPowerDirection)*thinCylLensSurfaces[thinCylLensSurfaceIndex].nOpticalPowerDirection,	// I-P, i.e. the vector from the principal point P to the intersection point I
		nD,	// normalised ray direction 
		c,	// colour/brightness
		nN,	// normalised (outwards-facing) normal
		thinCylLensSurfaces[thinCylLensSurfaceIndex].type,	// type
		thinCylLensSurfaces[thinCylLensSurfaceIndex].opticalPower,	// opticalPower
		(thinCylLensSurfaces[thinCylLensSurfaceIndex].reflective)?-1.0:1.0	// reflectionFactor; +1 = transmissive
	);
	c *= thinCylLensSurfaces[thinCylLensSurfaceIndex].colourFactor;
	return true;	// keep raytracing
}

// returns true if no further raytracing is required
bool interactWithSurface(
	inout vec3 s,	// intersection position; out value becomes new ray start point
	inout vec3 nD,	// normalised ray direction 
	inout vec4 c,	// colour/brightness
	int sceneObjectIndex
) {
	if( sceneObjects[sceneObjectIndex].surfaceType == COLOUR_SURFACE ) {
		c *= colourSurfaces[ sceneObjects[sceneObjectIndex].surfaceIndex ].colourFactor;	// multiply colour by the colour multiplier
		return colourSurfaces[ sceneObjects[sceneObjectIndex].surfaceIndex ].semitransparent;	// keep raytracing if semitransparent, otherwise not
	} 
	else if( sceneObjects[sceneObjectIndex].surfaceType == MIRROR_SURFACE ) {
		c *= mirrorSurfaces[ sceneObjects[sceneObjectIndex].surfaceIndex ].colourFactor;	// multiply colour by the colour multiplier
		vec3 n = normalize(getNormal2SceneObject( s, sceneObjectIndex ));
		nD -= 2.0*dot(nD, n)*n; // should already be normalized; alternative: reflect( normalize(d), vec3(1,0,1));
		return true;	// keep raytracing
	}
	else if( sceneObjects[sceneObjectIndex].surfaceType == THIN_LENS_SURFACE ) {
		return interactWithThinLensSurface(
			s,	// intersection position; out value becomes new ray start point
			nD,	// normalised ray direction 
			c,	// colour/brightness
			normalize(getNormal2SceneObject( s, sceneObjectIndex )),	// normalised (outwards-facing) normal
			sceneObjects[sceneObjectIndex].surfaceIndex	// thinLensSurfaceIndex
		);
	}
	else if( sceneObjects[sceneObjectIndex].surfaceType == THIN_CYL_LENS_SURFACE ) {
		return interactWithThinCylLensSurface(
			s,	// intersection position; out value becomes new ray start point
			nD,	// normalised ray direction 
			c,	// colour/brightness
			normalize(getNormal2SceneObject( s, sceneObjectIndex )),	// normalised (outwards-facing) normal
			sceneObjects[sceneObjectIndex].surfaceIndex	// thinCylLensSurfaceIndex
		);
	}
	
	// all surface types should be dealt with by now
	// if this code is reached, then that isn't the case
	c *= vec4(1, .4, 0, 1);	// return red
	return false;
}

//
// other functions
//

vec4 getColorOfBackground(
	vec3 nD	// normalized light-ray direction
) {
	// float l = length(nD);
	float phi = atan(nD.z, nD.x) + PI;
	float theta = acos(nD.y);	// if light-ray direction is not normalised then nD.y/l
	return texture2D(backgroundTexture, vec2(mod(phi/(2.*PI), 1.0), 1.-theta/PI));
}

void main() {
	// first calculate the focusPosition, i.e. the point this pixel is focussed on
	vec3 pv = intersectionPoint - cameraPosition;	// the "pixel view direction", i.e. a vector from the centre of the camera aperture to the point on the object the shader is currently "shading"
	vec3 focusPosition = cameraPosition + focusDistance/abs(dot(pv, viewDirection))*pv;	// see Johannes's lab book 30/4/24 p.174

	// trace <noOfRays> rays
	gl_FragColor = vec4(0, 0, 0, 0);
	vec4 color;
	for(int i=0; i<noOfRays; i++) {
		// the current ray start position, a random point on the camera's circular aperture
		vec3 s = cameraPosition + apertureRadius*randomNumbersX[i]*apertureXHat + apertureRadius*randomNumbersY[i]*apertureYHat;

		// first calculate the current light-ray direction:
		// the ray first passes through focusPosition and then p,
		// so the "backwards" ray direction from the camera to the intersection point is
		vec3 nD = normalize( focusPosition - s );

		// current colour/brightness; will be multiplied by each surface's colour/brightness factor
		vec4 c = vec4(1.0, 1.0, 1.0, 1.0);

		vec3 intersectionPosition;
		float intersectionDistance;
		int intersectingSceneObjectIndex;
		int originSceneObjectIndex = -1;
		int tl = maxTraceLevel;	// max trace level
		bool continueRaytracing = true;
		while(
			continueRaytracing &&
			(tl-- > 0) &&
			findIntersectionWithScene(
				s, // ray start point, origin 
				nD, // ray direction 
				originSceneObjectIndex,	// originSceneObjectIndex
				intersectingSceneObjectIndex,	// closestIntersectedSceneObjectIndex
				intersectionPosition,	// closestIntersectionPosition
				intersectionDistance	// closestIntersectionDistance
			) 
		) {
			s = intersectionPosition;
			continueRaytracing = interactWithSurface(
				s,	// ray start point, origin 
				nD,	// ray direction 
				c,	// brightness multiplier
				intersectingSceneObjectIndex
			);
			originSceneObjectIndex = intersectingSceneObjectIndex;
		}

		if( continueRaytracing ) c *= getColorOfBackground(nD);

		// finally, multiply by the brightness factor and add to gl_FragColor
		gl_FragColor += c;
	}
		
	gl_FragColor /= float(noOfRays);
}