
// This code is based on three.js, which comes with the following license:
//
// The MIT License
//
// Copyright © 2010-2024 three.js authors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
// import { createMeshesFromInstancedMesh } from 'three/examples/jsm/utils/SceneUtils.js';

import * as CONST from './raytracing/Constants.js';
import { SceneObject } from './raytracing/SceneObject.js';
import { RectangleShape } from './raytracing/shapes/RectangleShape.js';
import { SphereShape } from './raytracing/shapes/SphereShape.js';
import { CylinderMantleShape } from './raytracing/shapes/CylinderMantleShape.js';
import { ColourSurface } from './raytracing/surfaces/ColourSurface.js';
import { MirrorSurface } from './raytracing/surfaces/MirrorSurface.js';
import { ThinLensSurface } from './raytracing/surfaces/ThinLensSurface.js';
import { ThinCylLensSurface } from './raytracing/surfaces/ThinCylLensSurface.js';

import { RaytracingScene } from './raytracing/RaytracingScene.js';
import { RaytracingSphere } from './raytracing/RaytracingSphere.js';

// this works fine both locally and when deployed on github
const fragmentShaderCodeFile = await fetch("./fragmentShader.glsl");
const fragmentShaderCode = await fragmentShaderCodeFile.text();

const vertexShaderCodeFile = await fetch("./vertexShader.glsl");
const vertexShaderCode = await vertexShaderCodeFile.text();

let appName = 'Ideal';
let appDescription = 'the premier web-based, GPU-powered, highly scientific, raytracer that simulates ideal optical components';

let scene;
let renderer;
let backgroundTexture;
let camera;
let orbitControls;
let dragControls;

let raytracingSphere;
let raytracingScene;

let background = 0;


// enables lifting stuff to a base level (in case of VR the eye level)
let baseY = 0.0;
	
let fovScreen = 68;

let raytracingSphereRadius = 100.0;

// camera with wide aperture
let apertureRadius = 0.0;
let atanFocusDistance = Math.atan(3e8);	// 1 light second
let noOfRays = 1;
let autofocus = false;

// the status text area
let status;	// = document.createElement('div');
let statusTime;	// the time the last status was posted

// the info text area
let info;

// the menu
let gui;
let GUIParams;
let autofocusControl, focusDistanceControl, baseYControl, backgroundControl, vrControlsVisibleControl;

let GUIMesh;
// let showGUIMesh;
// let meshRotationX = -Math.PI/4, meshRotationY = 0, meshRotationZ = 0;

// true if stored photo is showing
let showingStoredPhoto = false;
let storedPhoto;
let storedPhotoDescription;
let storedPhotoInfoString;

// my Canon EOS450D
const click = new Audio('./assets/click.m4a');




init();
animate();

function init() {
	// create the info element first so that any problems can be communicated
	createStatus();

	scene = new THREE.Scene();
	// scene.background = new THREE.Color( 'skyblue' );
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera( fovScreen, windowAspectRatio, 0.1, 2*raytracingSphereRadius + 1 );
	camera.position.z = 0.4;
	screenChanged();
	
	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild( VRButton.createButton( renderer ) );	// for VR content
	document.body.appendChild( renderer.domElement );
	// document.getElementById('livePhoto').appendChild( renderer.domElement );

	loadBackgroundImage();

	// initRaytracingScene();
	raytracingSphere = new RaytracingSphere(
		raytracingSphereRadius, 
		createUniforms(),
		vertexShaderCode,
		fragmentShaderCode
	);
	scene.add( raytracingSphere );

	// addRaytracingSphere();

	// user interface

	addEventListenersEtc();

	addOrbitControls();

	// the controls menu
	// refreshGUI();
	createGUI();

	// addDragControls();

	// check if VR is supported (see https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/isSessionSupported)...
	// if (navigator.xr) {
	if ( 'xr' in navigator ) {
		// renderer.xr.enabled = false;
		// navigator.xr.isSessionSupported("immersive-vr").then((isSupported) => {
		navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
			if (supported) {
				// ... and enable the relevant features
				renderer.xr.enabled = true;
				// use renderer.xr.isPresenting to find out if we are in XR mode -- see https://threejs.org/docs/#api/en/renderers/webxr/WebXRManager 
				// (and https://threejs.org/docs/#api/en/renderers/WebGLRenderer.xr, which states that renderer.xr points to the WebXRManager)
				document.body.appendChild( VRButton.createButton( renderer ) );	// for VR content
				addXRInteractivity();
			}
		});
	}

	createInfo();
	refreshInfo();
}

function animate() {
	renderer.setAnimationLoop( render );
}

function render() {
	// requestAnimationFrame( animate );

	// stats.begin();

	if(!showingStoredPhoto) {
		// update uniforms
		updateUniforms();

		renderer.render( scene,  camera );
	}

	// stats.end();
}

function initRaytracingScene() {
	raytracingScene = new RaytracingScene();

	// create a rectangle
	let xHat = new THREE.Vector3(1, 0, 0);
	let yHat = new THREE.Vector3(0, 1, 0);
	let zHat = new THREE.Vector3(0, 0, 1);

	let rectangleShape1Index = raytracingScene.addRectangleShape( new RectangleShape(
		new THREE.Vector3(-0.5, -0.5, -1),	// corner
		xHat,	// span vector 1
		yHat,	// span vector 2
		xHat.clone().cross(yHat).normalize()	// normalised normal, pointing "outwards"
	));
	let rectangleShape2Index = raytracingScene.addRectangleShape( new RectangleShape(
		new THREE.Vector3(-0.5, -0.5, 1),	// corner
		xHat,	// span vector 1
		yHat,	// span vector 2
		xHat.clone().cross(yHat).normalize()	// normalised normal, pointing "outwards"
	));
	let rectangleShape3Index = raytracingScene.addRectangleShape( new RectangleShape(
		new THREE.Vector3(1, -0.5, -0.5),	// corner
		zHat,	// span vector 1
		yHat,	// span vector 2
		zHat.clone().cross(yHat).normalize()	// normalised normal, pointing "outwards"
	));
	let rectangleShape4Index = raytracingScene.addRectangleShape( new RectangleShape(
		new THREE.Vector3(-0.5, -1, -0.5),	// corner
		xHat,	// span vector 1
		zHat,	// span vector 2
		xHat.clone().cross(zHat).normalize()	// normalised normal, pointing "outwards"
	));
	let sphereShape1Index = raytracingScene.addSphereShape( new SphereShape(
		new THREE.Vector3(-1, 0, 0),	// centre
		.5	// radius
	));
	let cylinderMantleIndex = raytracingScene.addCylinderMantleShape(
		new CylinderMantleShape(
			new THREE.Vector3(0, 1, 0),	// centre
			0.2,	// radius
			new THREE.Vector3(1, 0, 1).normalize(),	// direction
			1	// length
		)
	);

	let blueMirrorIndex = raytracingScene.addMirrorSurface( new MirrorSurface(
		new THREE.Vector4(0.5, 0.5, 1, 1)	// colour
	));
	let colourSurface1Index = raytracingScene.addColourSurface( new ColourSurface(
		new THREE.Vector4(1, 0, 0, 1),	// colour factor
		true	// semitransparent
	));
	let greenMirrorSurfaceIndex = raytracingScene.addMirrorSurface( new MirrorSurface( 
		new THREE.Vector4(.5, 1, .5, 1)	// colour
	));
	let redMirrorSurfaceIndex = raytracingScene.addMirrorSurface( new MirrorSurface(
		new THREE.Vector4(1, .5, .5, 1)	// colourFactor
	));
	let redThinLensSurfaceIndex = raytracingScene.addThinLensSurface( new ThinLensSurface(
		new THREE.Vector3(1, 0, 0),	// principalPoint
		-2.,	// opticalPower
		true,	// reflective
		CONST.IDEAL_SURFACE_TYPE,	// type
		new THREE.Vector4(1, .5, .5, 1)	// colourFactor
	));
	let greenThinCylLensSurfaceIndex = raytracingScene.addThinCylLensSurface( new ThinCylLensSurface(
		new THREE.Vector3(0, -1, 0),	// principalPoint
		-2.,	// opticalPower
		new THREE.Vector3(1, 0, 0),	// optical-power direction
		true,	// reflective
		CONST.IDEAL_SURFACE_TYPE,	// type
		new THREE.Vector4(.5, 1, .5, 1)	// colourFactor
	));
	let perfectMirrorSurfaceIndex = raytracingScene.addMirrorSurface( MirrorSurface.perfectMirrorSurface );
	
	// create a scene object and add it to the scene
	raytracingScene.addSceneObject(new SceneObject( 
		true,	// visible
		CONST.RECTANGLE_SHAPE,	// shapeType
		rectangleShape1Index,	// shapeIndex
		CONST.MIRROR_SURFACE,	// surfaceType
		greenMirrorSurfaceIndex	// surfaceIndex
	));
	raytracingScene.addSceneObject(new SceneObject( 
		true,	// visible
		CONST.RECTANGLE_SHAPE,	// shapeType
		rectangleShape2Index,	// shapeIndex
		CONST.COLOUR_SURFACE,	// surfaceType
		// raytracingScene.addColour( Colour.blue )	// surfaceIndex
		colourSurface1Index	// surfaceIndex
	));
	raytracingScene.addSceneObject(new SceneObject( 
		true,	// visible
		CONST.RECTANGLE_SHAPE,	// shapeType
		rectangleShape3Index,	// shapeIndex
		CONST.THIN_LENS_SURFACE,	// surfaceType
		redThinLensSurfaceIndex	// surfaceIndex
	));
	raytracingScene.addSceneObject(new SceneObject( 
		true,	// visible
		CONST.RECTANGLE_SHAPE,	// shapeType
		rectangleShape4Index,	// shapeIndex
		CONST.THIN_CYL_LENS_SURFACE,	// CONST.MIRROR_SURFACE,	// surfaceType
		greenThinCylLensSurfaceIndex	// perfectMirrorSurfaceIndex	// surfaceIndex
	));	
	raytracingScene.addSceneObject(new SceneObject( 
		true,	// visible
		CONST.SPHERE_SHAPE,	// shapeType
		sphereShape1Index,	// shapeIndex
		CONST.MIRROR_SURFACE,	// surfaceType
		perfectMirrorSurfaceIndex	// surfaceIndex
	));	
	raytracingScene.addSceneObject(new SceneObject(
		true,	// visible
		CONST.CYLINDER_MANTLE_SHAPE,	// shape type
		cylinderMantleIndex,	// shape index
		CONST.MIRROR_SURFACE,	// surface type
		blueMirrorIndex	// surface index
	));

	console.log( "noOfSceneObjects: " + raytracingScene.noOfSceneObjects );
	console.log( "noOfSpheres: "+raytracingScene.noOfSphereShapes );
	console.log( "noOfThinLensSurfaces: "+raytracingScene.noOfThinLensSurfaces );
}

function createUniforms() {
	// create arrays of random numbers (as GLSL is rubbish at doing random numbers)
	let randomNumbersX = [];
	let randomNumbersY = [];
	// make the first random number 0 in both arrays, meaning the 0th ray starts from the centre of the aperture
	randomNumbersX.push(0);
	randomNumbersY.push(0);
	// fill in the rest of the array with random numbers
	let i=1;
	do {
		// create a new pairs or random numbers (x, y) such that x^2 + y^2 <= 1
		let x = 2*Math.random()-1;	// random number between -1 and 1
		let y = 2*Math.random()-1;	// random number between -1 and 1
		if(x*x + y*y <= 1) {
			// (x,y) lies within a circle of radius 1
			//  add a new point to the array of points on the aperture
			randomNumbersX.push(x);
			randomNumbersY.push(y);
			i++;
		}
	} while (i < 100);
	
	initRaytracingScene();

	return {
		maxTraceLevel: { value: 10 },
		backgroundTexture: { value: backgroundTexture },
		focusDistance: { value: 10.0 },
		apertureXHat: { value: new THREE.Vector3(1, 0, 0) },
		apertureYHat: { value: new THREE.Vector3(0, 1, 0) },
		apertureRadius: { value: apertureRadius },
		randomNumbersX: { value: randomNumbersX },
		randomNumbersY: { value: randomNumbersY },
		noOfRays: { value: 1 },
		viewDirection: { value: new THREE.Vector3(0, 0, -1) },
		keepVideoFeedForward: { value: true },
		sceneObjects: { value: raytracingScene.sceneObjects },
		noOfSceneObjects: { value: raytracingScene.noOfSceneObjects },
		rectangleShapes: { value: raytracingScene.rectangleShapes },
		sphereShapes: { value: raytracingScene.sphereShapes },
		cylinderMantleShapes: { value: raytracingScene.cylinderMantleShapes },
		colourSurfaces: { value: raytracingScene.colourSurfaces },
		mirrorSurfaces: { value: raytracingScene.mirrorSurfaces },
		thinLensSurfaces: { value: raytracingScene.thinLensSurfaces },
		thinCylLensSurfaces: { value: raytracingScene.thinCylLensSurfaces },
	};	
}

function updateUniforms() {

	// // are we in VR mode?
	let deltaY;
	// if(renderer.xr.enabled && renderer.xr.isPresenting) {
		deltaY = baseY;
	// } else {
	// 	deltaY = 0;
	// }

	GUIMesh.position.y = deltaY - 1;

	let t = 1e-3*Date.now();
	raytracingSphere.uniforms.cylinderMantleShapes.value[0].nDirection = new THREE.Vector3( Math.cos(t), 0, Math.sin(t) );
	raytracingSphere.uniforms.backgroundTexture.value = backgroundTexture;

	// create the points on the aperture

	// create basis vectors for the camera's clear aperture
	let viewDirection = new THREE.Vector3();
	let apertureBasisVector1 = new THREE.Vector3();
	let apertureBasisVector2 = new THREE.Vector3();
	camera.getWorldDirection(viewDirection);
	viewDirection.normalize();
	// postStatus(`viewDirection.lengthSq() = ${viewDirection.lengthSq()}`);
	// if(counter < 10) console.log(`viewDirection = (${viewDirection.x.toPrecision(2)}, ${viewDirection.y.toPrecision(2)}, ${viewDirection.z.toPrecision(2)})`);

	if((viewDirection.x == 0.0) && (viewDirection.y == 0.0)) {
		// viewDirection is along z direction
		apertureBasisVector1.crossVectors(viewDirection, new THREE.Vector3(1, 0, 0)).normalize();
	} else {
		// viewDirection is not along z direction
		apertureBasisVector1.crossVectors(viewDirection, new THREE.Vector3(0, 0, 1)).normalize();
	}
	apertureBasisVector1.crossVectors(THREE.Object3D.DEFAULT_UP, viewDirection).normalize();
	// viewDirection = new THREE.Vector3(0, 0, -1);
	// apertureBasisVector1 = new THREE.Vector3(1, 0, 0);
	apertureBasisVector2.crossVectors(viewDirection, apertureBasisVector1).normalize();

	raytracingSphere.uniforms.noOfRays.value = noOfRays;
	raytracingSphere.uniforms.apertureXHat.value.copy(apertureBasisVector1);
	raytracingSphere.uniforms.apertureYHat.value.copy(apertureBasisVector2);
	raytracingSphere.uniforms.viewDirection.value.copy(viewDirection);
	raytracingSphere.uniforms.apertureRadius.value = apertureRadius;

	let focusDistance = Math.tan(atanFocusDistance);
	
	if(raytracingSphere.uniforms.focusDistance.value != focusDistance) {
		raytracingSphere.uniforms.focusDistance.value = focusDistance;
		// GUIParams.'tan<sup>-1</sup>(focus. dist.)'.value = atanFocusDistance;
		focusDistanceControl.setValue(atanFocusDistance);
	}

	// (re)create random numbers
	// let i=0;
	// let randomNumbersX = [];
	// let randomNumbersY = [];
	// do {
	// 	// create a new pairs or random numbers (x, y) such that x^2 + y^2 <= 1
	// 	let x = 2*Math.random()-1;	// random number between -1 and 1
	// 	let y = 2*Math.random()-1;	// random number between -1 and 1
	// 	if(x*x + y*y <= 1) {
	// 		// (x,y) lies within a circle of radius 1
	// 		//  add a new point to the array of points on the aperture
	// 		randomNumbersX.push(apertureRadius*x);
	// 		randomNumbersY.push(apertureRadius*y);
	// 		i++;
	// 	}
	// } while (i < 100);
	// raytracingSphere.uniforms.randomNumbersX.value = randomNumbersX;
	// raytracingSphere.uniforms.randomNumbersY.value = randomNumbersY;
}

/** create raytracing sphere */
function addRaytracingSphere() {

	// create arrays of random numbers (as GLSL is rubbish at doing random numbers)
	let randomNumbersX = [];
	let randomNumbersY = [];
	// make the first random number 0 in both arrays, meaning the 0th ray starts from the centre of the aperture
	randomNumbersX.push(0);
	randomNumbersY.push(0);
	// fill in the rest of the array with random numbers
	let i=1;
	do {
		// create a new pairs or random numbers (x, y) such that x^2 + y^2 <= 1
		let x = 2*Math.random()-1;	// random number between -1 and 1
		let y = 2*Math.random()-1;	// random number between -1 and 1
		if(x*x + y*y <= 1) {
			// (x,y) lies within a circle of radius 1
			//  add a new point to the array of points on the aperture
			randomNumbersX.push(x);
			randomNumbersY.push(y);
			i++;
		}
	} while (i < 100);

	raytracingSphere = new RaytracingSphere(
		raytracingSphereRadius, 
		{
			maxTraceLevel: { value: 10 },
			backgroundTexture: { value: backgroundTexture },
			focusDistance: { value: 10.0 },
			apertureXHat: { value: new THREE.Vector3(1, 0, 0) },
			apertureYHat: { value: new THREE.Vector3(0, 1, 0) },
			apertureRadius: { value: apertureRadius },
			randomNumbersX: { value: randomNumbersX },
			randomNumbersY: { value: randomNumbersY },
			noOfRays: { value: 1 },
			viewDirection: { value: new THREE.Vector3(0, 0, -1) },
			keepVideoFeedForward: { value: true },
			sceneObjects: { value: raytracingScene.sceneObjects },
			noOfSceneObjects: { value: raytracingScene.noOfSceneObjects },
			rectangles: { value: raytracingScene.rectangles },
			colours: { value: raytracingScene.colours },
			mirrors: { value: raytracingScene.mirrors },
		},
		vertexShaderCode,
		fragmentShaderCode
	);
	scene.add( raytracingSphere );
}


// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
function createGUI() {
	// const 
	gui = new GUI();
	// gui.hide();
	// GUIMesh = new HTMLMesh( gui.domElement );	// placeholder

	GUIParams = {
		maxTraceLevel: raytracingSphere.uniforms.maxTraceLevel.value,
		'Horiz. FOV (&deg;)': fovScreen,
		'Aperture radius': apertureRadius,
		'tan<sup>-1</sup>(focus. dist.)': atanFocusDistance,
		'No of rays': noOfRays,
		autofocus: function() { 
			autofocus = !autofocus;
			autofocusControl.name( 'Autofocus: ' + (autofocus?'On':'Off') );
			focusDistanceControl.disable(autofocus);
		},	// (autofocus?'On':'Off'),
		// 'Autofocus': autofocus,
		'Point forward (in -<b>z</b> direction)': pointForward,
		'Show/hide info': toggleInfoVisibility,
		vrControlsVisible: function() {
			GUIMesh.visible = !GUIMesh.visible;
			vrControlsVisibleControl.name( guiMeshVisible2String() );
		},
		background: function() {
			background = (background + 1) % 5;
			loadBackgroundImage();
			backgroundControl.name( background2String() );	
		},
		baseY: baseY,
		makeEyeLevel: function() { baseY = camera.position.y; baseYControl.setValue(baseY); },
	}

	gui.add( GUIParams, 'maxTraceLevel', 0, 20, 1 ).name( 'Max. trace level' ).onChange( (r) => {raytracingSphere.uniforms.maxTraceLevel.value = r; } );

	baseYControl = gui.add( GUIParams, 'baseY',  0, 3, 0.001).name( "<i>y</i><sub>base</sub>" ).onChange( (y) => { baseY = y; } );
	gui.add( GUIParams, 'makeEyeLevel' ).name( 'Eye level -> <i>y</i><sub>base</sub>' );

	// const folderVirtualCamera = gui.addFolder( 'Virtual camera' );
	gui.add( GUIParams, 'Horiz. FOV (&deg;)', 1, 170, 1).onChange( setScreenFOV );
	gui.add( GUIParams, 'Aperture radius', 0.0, 1.0, 0.01).onChange( (r) => { apertureRadius = r; } );
	// autofocusControl = gui.add( GUIParams, 'autofocus' ).name( 'Autofocus: ' + (autofocus?'On':'Off') );
	// gui.add( GUIParams, 'Autofocus' ).onChange( (b) => { autofocus = b; focusDistanceControl.disable(autofocus); } );
	focusDistanceControl = gui.add( GUIParams, 'tan<sup>-1</sup>(focus. dist.)', 
		//Math.atan(0.1), 
		0.01,	// -0.5*Math.PI,	// allow only positive focussing distances
		0.5*Math.PI,
		0.0001
	).onChange( (a) => { atanFocusDistance = a; } );
	focusDistanceControl.disable(autofocus);
	// focusDistanceControl = gui.add( GUIParams, 'tan<sup>-1</sup>(focus. dist.)', 
	// 	//Math.atan(0.1), 
	// 	-0.5*Math.PI,
	// 	0.5*Math.PI,
	// 	0.001
	// ).onChange( (a) => { atanFocusDistance = a; } );
	// folderVirtualCamera.add( atanFocusDistance, 'atan focus dist', -0.5*Math.PI, +0.5*Math.PI ).listen();
	gui.add( GUIParams, 'No of rays', 1, 100, 1).onChange( (n) => { noOfRays = n; } );
	gui.add( GUIParams, 'Point forward (in -<b>z</b> direction)' );
	backgroundControl = gui.add( GUIParams, 'background' ).name( background2String() );

	if(renderer.xr.enabled) {
		vrControlsVisibleControl = gui.add( GUIParams, 'vrControlsVisible' );
	}

	// create the GUI mesh at the end to make sure that it includes all controls
	GUIMesh = new HTMLMesh( gui.domElement );
	GUIMesh.visible = false;
	vrControlsVisibleControl.name( guiMeshVisible2String() );	// this can be called only after GUIMesh has been created

	enableDisableResonatorControls();
}

function enableDisableResonatorControls() {
}

function background2String() {
	switch (background) { 
	case 0: return 'Glasgow University, West Quadrangle';	// '360-180 Glasgow University - Western Square.jpg'	// https://www.flickr.com/photos/pano_philou/1041580126
	case 1: return 'Glasgow University, East Quadrangle';	// '360-180 Glasgow University - Eastern Square.jpg'	// https://www.flickr.com/photos/pano_philou/1141564032
	case 2: return 'Mugdock';	// 'Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/3485817556
	case 3: return 'Mugdock bluebells';	// 'Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889830418
	case 4: return 'Glencoe';	// '360-180 The Glencoe Pass And The Three Sisters.jpg'	// https://www.flickr.com/photos/pano_philou/1140758031
	default: return 'Undefined';		
		// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
		// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
	}
}

function getBackgroundInfo() {
	switch (background) { 
		case 0: return '<a href="https://www.flickr.com/photos/pano_philou/1041580126"><i>360-180 Glasgow University - Western Square</i></a> by pano_philou';	// https://www.flickr.com/photos/pano_philou/1041580126
		case 1: return '<a href="https://www.flickr.com/photos/pano_philou/1141564032"><i>360-180 Glasgow University - Eastern Square</i></a> by pano_philou';	// 
		case 2: return '<a href="https://www.flickr.com/photos/gawthrop/3485817556"><i>Mugdock Woods 6 Milngavie Scotland Equirectangular</i></a> by Peter Gawthrop';	// https://www.flickr.com/photos/gawthrop/3485817556
		case 3: return '<a href="https://www.flickr.com/photos/gawthrop/49889830418"><i>Bluebells_13_Mugdock_Woods_Scotland-Equirectangular</i></a> by Peter Gawthrop';	// 
		case 4: return '<a href="https://www.flickr.com/photos/pano_philou/1140758031"><i>360-180 The Glencoe Pass And The Three Sisters</i></a> by pano_philou';	// https://www.flickr.com/photos/pano_philou/1140758031
		default: return 'Undefined';		
			// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
			// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
		}
	
}

function guiMeshVisible2String() {
	return 'VR controls '+(GUIMesh.visible?'visible':'hidden');
}

function addXRInteractivity() {
	// see https://github.com/mrdoob/three.js/blob/master/examples/webxr_vr_sandbox.html

	// the two hand controllers

	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 5 ) ] );

	const controller1 = renderer.xr.getController( 0 );
	controller1.add( new THREE.Line( geometry ) );
	scene.add( controller1 );

	const controller2 = renderer.xr.getController( 1 );
	controller2.add( new THREE.Line( geometry ) );
	scene.add( controller2 );

	//

	const controllerModelFactory = new XRControllerModelFactory();

	const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
	controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
	scene.add( controllerGrip1 );

	const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
	controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
	scene.add( controllerGrip2 );

	//

	const group = new InteractiveGroup( renderer, camera );
	group.listenToPointerEvents( renderer, camera );
	group.listenToXRControllerEvents( controller1 );
	group.listenToXRControllerEvents( controller2 );
	scene.add( group );

	// place this below the resonator
	// GUIMesh = new HTMLMesh( gui.domElement );
	GUIMesh.position.x = 0;
	GUIMesh.position.y = baseY - 1.5;
	GUIMesh.position.z = -0.4;
	GUIMesh.rotation.x = -Math.PI/4;
	GUIMesh.scale.setScalar( 2 );
	group.add( GUIMesh );	
}

function createVideoFeeds() {
	// create the video stream for the user-facing camera first, as some devices (such as my iPad), which have both cameras,
	// but can (for whatever reason) only have a video feed from one at a time, seem to go with the video stream that was
	// created last, and as the standard view is looking "forward" it is preferable to see the environment-facing camera.
	videoFeedU = document.getElementById( 'videoFeedU' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// user-facing camera
		const constraintsU = { video: { 
			// 'deviceId': cameraId,	// this could be the device ID selected 
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'user'}
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsU ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoFeedU.srcObject = stream;
			videoFeedU.play();

			videoFeedU.addEventListener("playing", () => {
				aspectRatioVideoFeedU = videoFeedU.videoWidth / videoFeedU.videoHeight;
				updateUniforms();
				postStatus(`User-facing(?) camera resolution ${videoFeedU.videoWidth} &times; ${videoFeedU.videoHeight}`);
			});
		} ).catch( function ( error ) {
			postStatus(`Unable to access user-facing camera/webcam (Error: ${error})`);
		} );
	} else {
		postStatus( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
	}

	videoFeedE = document.getElementById( 'videoFeedE' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// environment-facing camera
		const constraintsE = { video: { 
			// 'deviceId': cameraId,	// this could be the device ID selected 
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'environment'}
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsE ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoFeedE.srcObject = stream;
			videoFeedE.play();

			videoFeedE.addEventListener("playing", () => {
				aspectRatioVideoFeedE = videoFeedE.videoWidth / videoFeedE.videoHeight;
				updateUniforms();
				postStatus(`Environment-facing(?) camera resolution ${videoFeedE.videoWidth} &times; ${videoFeedE.videoHeight}`);
			});
		} ).catch( function ( error ) {
			postStatus(`Unable to access environment-facing camera/webcam (Error: ${error})`);
		} );
	} else {
		postStatus( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
	}
}

function loadBackgroundImage() {
	const textureLoader = new THREE.TextureLoader();
	// textureLoader.crossOrigin = "Anonymous";

	let filename;
	switch (background) { 
		case 1: 
			filename = './raytracing/backgrounds/360-180 Glasgow University - Eastern Square.jpg';	// https://www.flickr.com/photos/pano_philou/1141564032
			break;
		case 2: 
			filename = './raytracing/backgrounds/Mugdock Woods 6 Milngavie Scotland Equirectangular.jpg';	// https://www.flickr.com/photos/gawthrop/3485817556
			break;
		case 3: 
			filename = './raytracing/backgrounds/Bluebells_13_Mugdock_Woods_Scotland-Equirectangular.jpg';	// https://www.flickr.com/photos/gawthrop/49889830418
			break;
		case 4: 
			filename = './raytracing/backgrounds/360-180 The Glencoe Pass And The Three Sisters.jpg';	// https://www.flickr.com/photos/pano_philou/1140758031
			break;
		case 0: 
		default:
			filename = './raytracing/backgrounds/360-180 Glasgow University - Western Square.jpg';	// https://www.flickr.com/photos/pano_philou/1041580126
			// 'Tower_University_Glasgow_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49890100126
			// 'Saddle_05_Arran_Scotland-Equirectangular.jpg'	// https://www.flickr.com/photos/gawthrop/49889356918
		}

	backgroundTexture = textureLoader.load(filename);
}

function addEventListenersEtc() {
	// handle device orientation
	// window.addEventListener("deviceorientation", handleOrientation, true);
	
	// handle window resize
	window.addEventListener("resize", onWindowResize, false);

	// handle screen-orientation (landscape/portrait) change
	screen.orientation.addEventListener( "change", recreateVideoFeeds );

	// share button functionality
	document.getElementById('takePhotoButton').addEventListener('click', takePhoto);

	// toggle fullscreen button functionality
	document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);

	// info button functionality
	document.getElementById('infoButton').addEventListener('click', toggleInfoVisibility);

	// back button functionality
	document.getElementById('backButton').addEventListener('click', showLivePhoto);
	document.getElementById('backButton').style.visibility = "hidden";

	// share button
	document.getElementById('shareButton').addEventListener('click', share);
	document.getElementById('shareButton').style.visibility = "hidden";
	if(!(navigator.share)) document.getElementById('shareButton').src="./shareButtonUnavailable.png";
	// if(!(navigator.share)) document.getElementById('shareButton').style.opacity = 0.3;

	// delete button
	document.getElementById('deleteButton').addEventListener('click', deleteStoredPhoto);
	document.getElementById('deleteButton').style.visibility = "hidden";

	// hide the thumbnail for the moment
	document.getElementById('storedPhotoThumbnail').addEventListener('click', showStoredPhoto);
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('storedPhoto').addEventListener('click', showLivePhoto);
	document.getElementById('storedPhoto').style.visibility = "hidden";
	// showingStoredPhoto = false;
}

/**
 * @param {*} fov	The larger of the camera's horizontal and vertical FOV, in degrees
 * 
 * Set the larger FOV of the screen/window to fov.
 * 
 * Depending on the screen/window's FOV, fov is either the horizontal fov (if screen width > screen height)
 * or the vertical fov (if screen width < screen height).
 */
function setScreenFOV(fov) {
	fovScreen = fov;

	screenChanged();
}

/** 
 * Reset the aspect ratio and FOV of the virtual cameras.
 * 
 * Call if the window size has changed (which also happens when the screen orientation changes)
 * or if camera's FOV has changed
 */
function screenChanged() {
	// alert(`new window size ${window.innerWidth} x ${window.innerHeight}`);

	// in case the screen size has changed
	if(renderer) renderer.setSize(window.innerWidth, window.innerHeight);

	// if the screen orientation changes, width and height swap places, so the aspect ratio changes
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	camera.aspect = windowAspectRatio;

	// fovS is the screen's horizontal or vertical FOV, whichever is greater;
	// re-calculate the camera FOV, which is the *vertical* fov
	let verticalFOV;
	if(windowAspectRatio > 1.0) {
		// fovS is horizontal FOV; convert to get correct vertical FOV
		verticalFOV = 2.0*Math.atan(Math.tan(0.5*fovScreen*Math.PI/180.0)/windowAspectRatio)*180.0/Math.PI;
	} else {
		// fovS is already vertical FOV
		verticalFOV = fovScreen;
	}
	camera.fov = verticalFOV;

	// make sure the camera changes take effect
	camera.updateProjectionMatrix();
}

function  pointForward() {
	let r = camera.position.length();
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = r;
	orbitControls.update();
	postStatus('Pointing camera forwards (in -<b>z</b> direction)');
}

function onWindowResize() {
	screenChanged();
	postStatus(`window size ${window.innerWidth} &times; ${window.innerHeight}`);	// debug
}

// // see https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/change_event
function recreateVideoFeeds() {
	// stop current video streams...
	videoFeedE.srcObject.getTracks().forEach(function(track) { track.stop(); });
	videoFeedU.srcObject.getTracks().forEach(function(track) { track.stop(); });

	// ... and re-create new ones, hopefully of the appropriate size
	createVideoFeeds();
}

function addOrbitControls() {
	// controls

	orbitControls = new OrbitControls( camera, renderer.domElement );
	// controls = new OrbitControls( cameraOutside, renderer.domElement );
	orbitControls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
	orbitControls.addEventListener( 'change', cameraPositionChanged );

	orbitControls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	orbitControls.dampingFactor = 0.05;

	orbitControls.enablePan = true;
	orbitControls.enableZoom = true;

	orbitControls.maxPolarAngle = Math.PI;
}

function addDragControls() {
	let objects = [];
	objects.push(GUIMesh);

	dragControls = new DragControls( objects, camera, renderer.domElement );

	// add event listener to highlight dragged objects
	dragControls.addEventListener( 'dragstart', function ( event ) {
		event.object.material.emissive.set( 0xaaaaaa );
	} );

	dragControls.addEventListener( 'dragend', function ( event ) {
		event.object.material.emissive.set( 0x000000 );
	} );
}

function cameraPositionChanged() {
	// postStatus(`Camera position (${camera.position.x.toPrecision(2)}, ${camera.position.y.toPrecision(2)}, ${camera.position.z.toPrecision(2)})`);
	// counter = 0;
	// keep the raytracing sphere centred on the camera position
	// raytracingSphere.position.copy(camera.position.clone());	// TODO this doesn't seem to work as intended!?
}

async function toggleFullscreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch((err) => {
			postStatus(
				`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
			);
		});
		// allow screen orientation changes
		// screen.orientation.unlock();
	} else {
		document.exitFullscreen();
	}
}

function showStoredPhoto() {
	gui.hide();
	renderer.domElement.style.visibility = "hidden";
	document.getElementById('takePhotoButton').style.visibility = "hidden";
	// document.getElementById('changePositionButton').style.visibility = "hidden";
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('backButton').style.visibility = "visible";
	document.getElementById('shareButton').style.visibility = "visible";
	document.getElementById('deleteButton').style.visibility = "visible";
	document.getElementById('storedPhoto').style.visibility = "visible";
	showingStoredPhoto = true;

	postStatus('Showing stored photo, '+storedPhotoDescription);
}

function showLivePhoto() {
	gui.show();
	renderer.domElement.style.visibility = "visible";
	document.getElementById('takePhotoButton').style.visibility = "visible";
	// document.getElementById('changePositionButton').style.visibility = "visible";
	if(storedPhoto) document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	document.getElementById('backButton').style.visibility = "hidden";
	document.getElementById('shareButton').style.visibility = "hidden";
	document.getElementById('deleteButton').style.visibility = "hidden";
	document.getElementById('storedPhoto').style.visibility = "hidden";
	showingStoredPhoto = false;

	postStatus('Showing live image');
}

function deleteStoredPhoto() {
	storedPhoto = null;

	showLivePhoto();

	postStatus('Stored photo deleted; showing live image');
}

function takePhoto() {
	try {
		click.play();

		storedPhoto = renderer.domElement.toDataURL('image/png');
		storedPhotoInfoString = getInfoString();

		storedPhotoDescription = `${appName}`;
		// 
		document.getElementById('storedPhoto').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	
		postStatus('Photo taken; click thumbnail to view and share');
	} catch (error) {
		console.error('Error:' + error.toString());
	}	
}

async function share() {
	try {
		fetch(storedPhoto)
		.then(response => response.blob())
		.then(blob => {
			const file = new File([blob], storedPhotoDescription+'.png', { type: blob.type });

			// Use the Web Share API to share the screenshot
			if (navigator.share) {
				navigator.share({
					title: storedPhotoDescription,
					text: storedPhotoInfoString,
					files: [file],
				});
			} else {
				postStatus('Sharing is not supported by this browser.');
			}	
		})
		.catch(error => {
			console.error('Error:' + error.toString());
			postStatus(`Error: ${error.toString()}`);
		});
	} catch (error) {
		console.error('Error:' + error.toString());
	}
}

/** 
 * Add a text field to the bottom left corner of the screen
 */
function createStatus() {
	status = document.getElementById('status');
	postStatus(`${appName} welcomes you!`);
}

function postStatus(text) {
	status.innerHTML = '&nbsp;'+text;
	console.log('status: '+text);

	// show the text only for 3 seconds
	statusTime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - statusTime > 2999) status.innerHTML = '&nbsp;'+appName+', University of Glasgow, <a href="https://github.com/jkcuk/'+appName+'">https://github.com/jkcuk/'+appName+'</a>' }, 3000);
}

function getInfoString() {
	return `<div class="tooltip">Max. number of reflections<span class="tooltiptext">Maximum number of<br>simulated reflections<br>before the pixel is<br>coloured black</span></div> = ${raytracingSphere.uniforms.maxTraceLevel.value - 2}<br>\n` +
		`<h4>Virtual camera</h4>\n` +
		`Position = (${camera.position.x.toPrecision(4)}, ${camera.position.y.toPrecision(4)}, ${camera.position.z.toPrecision(4)})<br>\n` +
		`Horiz. FOV = ${fovScreen.toPrecision(4)}<br>\n` +
		`Aperture radius = ${apertureRadius.toPrecision(4)}<br>\n` +
		`Focussing distance = ${Math.tan(atanFocusDistance).toPrecision(4)}<br>\n` +
		`Number of rays = ${noOfRays}\n` +
		`<h4>Stored photo</h4>\n` +
		`Description/name = ${storedPhotoDescription}\n` +
		'<h4>Background image information</h4>\n' +
		getBackgroundInfo() + '<br>\n' +
		// '<a href="https://www.flickr.com/photos/pano_philou/1041580126">"360-180 Glasgow University - Western Square"</a> by pano_philou<br>\n' +
		'License: <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/">CC BY-NC-SA 2.0 DEED</a><br>\n' +
		// `<h4>${appName}</h4>\n` +
		`<br>${appName} (University of Glasgow, <a href="https://github.com/jkcuk/${appName}">https://github.com/jkcuk/${appName}</a>) is ${appDescription}.`
		;
}

function refreshInfo() {
	if(showingStoredPhoto) setInfo( storedPhotoInfoString );
	else setInfo( getInfoString() );

	if(info.style.visibility == "visible") setTimeout( refreshInfo , 100);	// refresh again a while
}

/** 
 * Add a text field to the top left corner of the screen
 */
function createInfo() {
	info = document.getElementById('info');
	info.innerHTML = "-- nothing to show (yet) --";
}

function setInfo(text) {
	info.innerHTML = text;
	// console.log('info: '+text);
}

function toggleInfoVisibility() {
	switch(info.style.visibility) {
		case "visible":
			info.style.visibility = "hidden";
			break;
		case "hidden":
		default:
			info.style.visibility = "visible";
			refreshInfo();
	}
}