import * as THREE from 'three';

// THESE CONSTANTS MUST TAKE THE SAME VALUES AS THE CONSTANTS IN fragmentShader.glsl
export const MAX_SCENE_OBJECTS = 10;	// max number of scene objects
export const MAX_RECTANGLE_SHAPES = 10;
export const MAX_SPHERE_SHAPES = 10;
export const MAX_CYLINDER_MANTLE_SHAPES = 10;
export const MAX_COLOUR_SURFACES = 10;
export const MAX_MIRROR_SURFACES = 10;
export const MAX_THIN_LENS_SURFACES = 10;
export const MAX_THIN_CYL_LENS_SURFACES = 10;

// the shapeTypes of the supported shapes
export const RECTANGLE_SHAPE = 0;	// must be the same as RECTANGLE_SHAPE in fragmentShader.glsl
export const SPHERE_SHAPE = 1;	// must be the same as SPHERE_SHAPE in fragmentShader.glsl
export const CYLINDER_MANTLE_SHAPE = 2;	// must be the same as CYLINDER_MANTLE_SHAPE in fragmentShader.glsl
// export const DISC = 3;	//
// TODO: add triangle etc.

// the surfaceTypes of the supported surfaces
export const COLOUR_SURFACE = 0;	// must be the same as COLOUR_SURFACE in fragmentShader.glsl
export const MIRROR_SURFACE = 1;	// must be the same as MIRROR_SURFACE in fragmentShader.glsl
export const THIN_LENS_SURFACE = 2;	// must be the same as THIN_LENS_SURFACE in fragmentShader.glsl
export const THIN_CYL_LENS_SURFACE = 3;	// must be the same as THIN_CYL_LENS_SURFACE in fragmentShader.glsl

// thin-lens/mirror types
export const IDEAL_SURFACE_TYPE = 0;
export const PHASE_HOLOGRAM_SURFACE_TYPE = 1;


export const ONE_SURFACE_TRANSMISSION_COEFFICIENT = 0.96;	// approx. transmission coefficient of a typical air-glass interface
export const TWO_SURFACE_TRANSMISSION_COEFFICIENT = 0.9216;	// approx. transmission coefficient of two typical air-glass interfaces
export const TWO_SURFACE_COLOUR_FACTOR = new THREE.Vector4(
	TWO_SURFACE_TRANSMISSION_COEFFICIENT,
	TWO_SURFACE_TRANSMISSION_COEFFICIENT,
	TWO_SURFACE_TRANSMISSION_COEFFICIENT,
	1
);