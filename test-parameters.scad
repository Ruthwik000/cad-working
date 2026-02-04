/* [Basic Parameters] */
// Radius of the cylinder
radius = 10; // [5:50]
// Height of the cylinder
height = 20; // [10:100]
// Number of sides
sides = 6; // [3:12]

/* [Advanced] */
// Enable rotation
rotate_model = false;
// Rotation angle
angle = 45; // [0:360]

// Create the model
if (rotate_model) {
    rotate([0, 0, angle])
        cylinder(r=radius, h=height, $fn=sides);
} else {
    cylinder(r=radius, h=height, $fn=sides);
}
