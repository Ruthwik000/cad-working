// Computer Vision Control Demo
// This is a simple model to test hand gesture controls
// Try using different gestures to interact with this model!

// Parameters for customization
cube_size = 30;      // Size of the cube
sphere_radius = 15;  // Radius of the sphere
cylinder_height = 40; // Height of the cylinder
cylinder_radius = 10; // Radius of the cylinder

// Create a colorful composite object
color("red")
translate([-40, 0, 0])
cube(cube_size, center=true);

color("green")
translate([0, 0, 0])
sphere(r=sphere_radius);

color("blue")
translate([40, 0, 0])
cylinder(h=cylinder_height, r=cylinder_radius, center=true);

// Add a base platform
color("gray", 0.5)
translate([0, 0, -25])
cube([120, 60, 5], center=true);

// Instructions as text (comment)
/*
CV CONTROL GESTURES TO TRY:

1. 👆 POINT - Index finger up
   Hover over different colored objects

2. 🤏 GRAB - Pinch with index + thumb
   Grab the model

3. 🤏➡️ DRAG - Hold pinch and move
   Rotate the model by moving your hand

4. ✋ DROP - Open hand
   Release the model

5. ✊ ORBIT - Closed fist + move
   Rotate camera around the model

6. ✋ PAN - Open palm + move
   Slide the camera view

7. 🤲 ZOOM - Two hands pinching
   Move hands apart to zoom in
   Move hands together to zoom out

Remember: Keep your hands in the center 70% of the screen (active zone)!
*/
