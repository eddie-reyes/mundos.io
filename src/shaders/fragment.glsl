varying vec3 vertexNormal;
uniform vec3 glowColor;
uniform float c;

void main() {
    float intensity = pow(0.8 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(glowColor, c) * intensity;
}