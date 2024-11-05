import * as THREE from 'three';
import * as CONST from './Constants.js';

import { SceneObject } from './SceneObject.js';
import { ShapeID } from './ShapeID.js';
import { SurfaceID } from './SurfaceID.js';

import { RectangleShape } from './shapes/RectangleShape.js';
import { SphereShape } from './shapes/SphereShape.js';
import { CylinderMantleShape } from './shapes/CylinderMantleShape.js';
import { SolidGeometryShape } from './shapes/SolidGeometryShape.js';

import { ColourSurface } from './surfaces/ColourSurface.js';
import { MirrorSurface } from './surfaces/MirrorSurface.js';
import { ThinFocussingSurface } from './surfaces/ThinFocussingSurface.js';
import { CheckerboardSurface  } from './surfaces/CheckerboardSurface.js';
import { RefractingSurface } from './surfaces/RefractingSurface.js';

class RaytracingScene {
	// the scene objects
	sceneObjects = Array(CONST.MAX_SCENE_OBJECTS).fill( SceneObject.none );	// the array of scene objects
	noOfSceneObjects = 0;	// number of scene objects

	// the shapes
	rectangleShapes = Array(CONST.MAX_RECTANGLE_SHAPES).fill( RectangleShape.zRectangleShape );	// the rectangle shapes
	noOfRectangleShapes = 0;	// number of rectangle shapes

	sphereShapes = Array(CONST.MAX_SPHERE_SHAPES).fill( SphereShape.unitSphereShape );	// the sphere shapes
	noOfSphereShapes = 0;	// number of sphere shapes

	cylinderMantleShapes = Array(CONST.MAX_CYLINDER_MANTLE_SHAPES).fill( CylinderMantleShape.xCylinderMantleShape );	// the cylinder mantle shapes
	noOfCylinderMantleShapes = 0;

	solidGeometryShapes = Array(CONST.MAX_SOLID_GEOMETRY_SHAPES).fill( new SolidGeometryShape() );
	noOfSolidGeometryShapes = 0;

	// to add a new shape type:
	// 1) create a class that holds the parameters of the shape (e.g. class SphereShape, defined in SphereShape.js)
	// 2) import this class at the top of RaytracingScene.js and main.js
	// 3) add to the RaytracingScene class
	//    * a const that specifies the max. number of instances of this shape (e.g. MAX_SPHERE_SHAPES)
	//    * a static int that uniquely identifies the shape type (e.g. SPHERE_SHAPE)
	//    * an array of the instances of the shape (e.g. sphereShapes), and initialise it to hold the max. number of objects
	//      representing the shape
	//    * an int that holds the number of instances of that shape, initialised to 0 (e.g. noOfSphereShapes)
	//    * a method that allows adding an instance of the shape (e.g. addSphereShape)
	//    * a corresponding line in the getSceneSummary class
	// 4) in main.js, in the createUniforms function, add a uniform that holds the array of the instances of the shape
	// 5) in fragmentShader.glsl,
	//    * #define a constant that specifies the max. number of instances of this shape (e.g. MAX_SPHERE_SHAPES)
	//      (which has the same value as the corresponding const in the RaytracingScene class)
	//    * #define a constant that uniquely identifies the shape type (e.g. SPHERE_SHAPE)
	//      (again, same value as the corresponding property in the RaytracingScene class)
	//    * define a struct that represents the properties of the class holding the shape parameters (e.g. SphereShape)
	//    * define a uniform array of instances of this struct, array length max. number of instances (e.g. sphereShapes)
	//    * add a findIntersectionWith<shape> method (e.g. findIntersectionWithSphereShape) and link it into the body of the
	//      findIntersectionWithSceneObject method
	//    * add a isInside<shape> method (e.g. isInsideSphereShape) and link it into the body of the
	//      isInsideSceneObject method
	//    * add a getNormalTo<shape> method (e.g. getNormalToSphereShape) and link it into the body of the
	//      getNormal method


	// the surfaces
	colourSurfaces = Array(CONST.MAX_COLOUR_SURFACES).fill( ColourSurface.white );	// the colour surfaces
	noOfColourSurfaces = 0;	// number of colour surfaces

	mirrorSurfaces = Array(CONST.MAX_MIRROR_SURFACES).fill( MirrorSurface.perfectMirrorSurface );	// the (planar) mirror surfaces
	noOfMirrorSurfaces = 0;	// number of mirror surfaces

	thinFocussingSurfaces = Array(CONST.MAX_THIN_FOCUSSING_SURFACES).fill( ThinFocussingSurface.idealThinLensSurface );	// the thin cylindrical-lens surfaces
	noOfThinFocussingSurfaces = 0;

	checkerboardSurfaces = Array(CONST.MAX_CHECKERBOARD_SURFACES).fill( CheckerboardSurface.blackWhiteCheckers );
	noOfCheckerboardSurfaces = 0;

	refractingSurfaces = Array(CONST.MAX_REFRACTING_SURFACES).fill( RefractingSurface.glassSurface );
	noOfRefractingSurfaces = 0;

	// to add a new surface type:
	// 1) create a class that holds the parameters of the surface (e.g. class ColourSurface, defined in ColourSurface.js)
	// 2) import this class at the top of RaytracingScene.js and main.js
	// 3) add to the RaytracingScene class
	//    * a const that specifies the max. number of instances of this surface (e.g. MAX_COLOUR_SURFACES)
	//    * a static int that uniquely identifies the surface type (e.g. COLOUR_SURFACE)
	//    * an array of the instances of the surface (e.g. colourSurfaces), and initialise it to hold the max. number of objects
	//      representing the surface
	//    * an int that holds the number of instances of that surface, initialised to 0 (e.g. noOfColourSurfaces)
	//    * a method that allows adding an instance of the surface (e.g. addColourSurface)
	//    * a corresponding line in the getSceneSummary class
	// 4) in main.js, in the createUniforms function, add a uniform that holds the array of the instances of the surface
	// 5) in fragmentShader.glsl,
	//    * #define a constant that specifies the max. number of instances of this surface (e.g. MAX_COLOUR_SURFACES)
	//      (which has the same value as the corresponding const in the RaytracingScene class)
	//    * #define a constant that uniquely identifies the surface type (e.g. COLOUR_SURFACE)
	//      (again, same value as the corresponding property in the RaytracingScene class)
	//    * define a struct that represents the properties of the class holding the surface parameters (e.g. ColourSurface)
	//    * define a uniform array of instances of this struct, array length max. number of instances (e.g. colourSurfaces)
	//    * create a case in the interactWithSurface function that handles the surface

	
	// add a new scene object and return its index
	addSceneObject( sceneObject ) {
		if(this.noOfSceneObjects >= CONST.MAX_SCENE_OBJECTS) {
			throw new Error( "Number of scene objects ("+this.noOfSceneObjects+") exceeds CONST.MAX_SCENE_OBJECTS ("+CONST.MAX_SCENE_OBJECTS+").");
		}

		// add the new scene object
		this.sceneObjects[this.noOfSceneObjects] = sceneObject;
		
		// return its array index
		return this.noOfSceneObjects++;
	}

	//
	// add shapes
	//

	// add a new rectangle shape and return its index
	addRectangleShape( rectangleShape ) {
		if(this.noOfRectangleShapes >= CONST.MAX_RECTANGLE_SHAPES) {
			throw new Error( "Number of rectangle shapes ("+this.noOfRectangleShapes+") exceeds CONST.MAX_RECTANGLE_SHAPES ("+CONST.MAX_RECTANGLE_SHAPES+").");
		}

		// add the new rectangle shape
		this.rectangleShapes[this.noOfRectangleShapes] = rectangleShape;
		
		// return its array index
		return this.noOfRectangleShapes++;
	}

	// add a new sphere shape and return its index
	addSphereShape( sphereShape ) {
		if(this.noOfSphereShapes >= CONST.MAX_SPHERE_SHAPES) {
			throw new Error( "Number of sphere shapes ("+this.noOfSphereShapes+") exceeds CONST.MAX_SPHERE_SHAPES ("+CONST.MAX_SPHERE_SHAPES+").");
		}

		// add the new sphere shape
		this.sphereShapes[this.noOfSphereShapes] = sphereShape;
		
		// return its array index
		return this.noOfSphereShapes++;
	}

	createSphereShapeID( centre, radius ) {
		return new ShapeID(
			CONST.SPHERE_SHAPE,
			this.addSphereShape( SphereShape.getSphereShape( centre, radius ) )
		);
	}

	// add a new cylinder mantle shape and return its index
	addCylinderMantleShape( cylinderMantleShape ) {
		if(this.noOfCylinderMantleShapes >= CONST.MAX_CYLINDER_MANTLE_SHAPES) {
			throw new Error( "Number of cylinder-mantle shapes ("+this.noOfCylinderMantleShapes+") exceeds CONST.MAX_CYLINDER_MANTLE_SHAPES ("+CONST.MAX_CYLINDER_MANTLE_SHAPES+").");
		}

		// add the new cylinder mantle shape
		this.cylinderMantleShapes[this.noOfCylinderMantleShapes] = cylinderMantleShape;
		
		// return its array index
		return this.noOfCylinderMantleShapes++;
	}

	createCylinderMantleShapeID( centre, radius, length, axis ) {
		return new ShapeID(
			CONST.CYLINDER_MANTLE_SHAPE,
			this.addCylinderMantleShape( CylinderMantleShape.getCylinderMantleShape( centre, radius, length, axis ) )
		);
	}

	// add a new solid-geometry shape and return its index
	addSolidGeometryShape( solidGeometryShape ) {
		if(this.noOfSolidGeometryShapes >= CONST.MAX_SOLID_GEOMETRY_SHAPES) {
			throw new Error( "Number of solid-geometry shapes ("+this.noOfSolidGeometryShapes+") exceeds CONST.MAX_SOLID_GEOMETRY_SHAPES ("+CONST.MAX_SOLID_GEOMETRY_SHAPES+").");
		}

		// add the new solid-geometry shape
		this.solidGeometryShapes[this.noOfSolidGeometryShapes] = solidGeometryShape;
		
		// return its array index
		return this.noOfSolidGeometryShapes++;
	}

	//
	// add surfaces
	//

	// add a new colour surface and return its index
	addColourSurface( colourSurface ) {
		if(this.noOfColourSurfaces >= CONST.MAX_COLOUR_SURFACES) {
			throw new Error( "Number of colour surfaces ("+this.noOfColourSurfaces+") exceeds CONST.MAX_COLOUR_SURFACES ("+CONST.MAX_COLOUR_SURFACES+").");
		}

		// add the new colour surface
		this.colourSurfaces[this.noOfColourSurfaces] = colourSurface;
		
		// return its array index
		return this.noOfColourSurfaces++;
	}
	
	// add a new mirror surface and return its index
	addMirrorSurface( mirrorSurface ) {
		if(this.noOfMirrorSurfaces >= CONST.MAX_MIRROR_SURFACES) {
			throw new Error( "Number of mirror surfaces ("+this.noOfMirrorSurfaces+") exceeds CONST.MAX_MIRROR_SURFACES ("+CONST.MAX_MIRROR_SURFACES+").");
		}


		// add the new mirror surface
		this.mirrorSurfaces[this.noOfMirrorSurfaces] = mirrorSurface;
		
		// return its array index
		return this.noOfMirrorSurfaces++;
	}

	// add a new thin focussing surface and return its index
	addThinFocussingSurface( thinFocussingSurface ) {
		if(this.noOfThinFocussingSurfaces >= CONST.MAX_THIN_FOCUSSING_SURFACES) {
			throw new Error( "Number of thin focussing surfaces ("+this.noOfThinFocussingSurfaces+") exceeds CONST.MAX_THIN_FOCUSSING_SURFACES ("+CONST.MAX_THIN_FOCUSSING_SURFACES+").");
		}

		// add the new thin focussing surface
		this.thinFocussingSurfaces[this.noOfThinFocussingSurfaces] = thinFocussingSurface;
		
		// return its array index
		return this.noOfThinFocussingSurfaces++;
	}

	// add a new thin checkerboard surface and return its index
	addCheckerboardSurface( checkerboardSurface ) {
		if(this.noOfCheckerboardSurfaces >= CONST.MAX_CHECKERBOARD_SURFACES) {
			throw new Error( "Number of checkerboard surfaces ("+this.noOfCheckerboardSurfaces+") exceeds CONST.MAX_CHECKERBOARD_SURFACES ("+CONST.MAX_CHECKERBOARD_SURFACES+").");
		}

		// add the new checkerboard surface
		this.checkerboardSurfaces[this.noOfCheckerboardSurfaces] = checkerboardSurface;
		
		// return its array index
		return this.noOfCheckerboardSurfaces++;
	}

	// add a new thin refracting surface and return its index
	addRefractingSurface( refractingSurface ) {
		if(this.noOfRefractingSurfaces >= CONST.MAX_REFRACTING_SURFACES) {
			throw new Error( "Number of refracting surfaces ("+this.noOfRefractingSurfaces+") exceeds CONST.MAX_REFRACTING_SURFACES ("+CONST.MAX_REFRACTING_SURFACES+").");
		}

		// add the new refracting surface
		this.refractingSurfaces[this.noOfRefractingSurfaces] = refractingSurface;
		
		// return its array index
		return this.noOfRefractingSurfaces++;
	}

	getSceneSummary() {
		return  this.noOfSceneObjects + " scene object(s),\n" +
		 this.noOfRectangleShapes + " rectangle(s),\n" +
		 this.noOfSphereShapes + " sphere(s),\n" +
		 this.noOfCylinderMantleShapes + " cylinder(s),\n" +
		 this.noOfSolidGeometryShapes + " solid-geometry shape(s),\n" +
		 this.noOfColourSurfaces + " colour surface(s),\n" +
		 this.noOfThinFocussingSurfaces + " thin focussing surface(s),\n" +
		 this.noOfCheckerboardSurfaces + " checkerboard surface(s),\n" +
		 this.noOfRefractingSurfaces + " refracting surface(s)";
	}
}

export { RaytracingScene };