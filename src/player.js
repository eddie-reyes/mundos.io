import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import devtools from './node_modules/devtools-detect/index.js';

export class Player {
    
    radius = 1;
    mass = 1;

    localPhysics = new CANNON.World({});

    playerBody = new CANNON.Body({shape : new CANNON.Sphere(this.radius), mass : this.mass, collisionFilterGroup : 3}); 

    castToSurface = new THREE.Raycaster();
    lastMousePos = new THREE.Vector2();

    moveDir = new THREE.Vector3();
    forceM = 0.15;
    angularD = 0.9;

    canBoost = true;
    boostForce = 50;

    username = 'Mundos Player';

    label = new THREE.Mesh();

    battleMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 1.5), new THREE.MeshBasicMaterial({color : 0xff0000, transparent : true, opacity : 0.5}));
    dirIndicator = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 4), new THREE.MeshBasicMaterial({color : 0xffffff, transparent : true, opacity : 0.2}));
    lowerBound = true;
    
    PU1 = false;

    inBattle = false;
    isPlaying = false;
    isColliding = false;
    canPlay = true;

    score = null;
    battle_timer;

    constructor(playerMesh, camera, world, id) { 

        this.playerMesh = playerMesh;
        this.camera = camera;
        this.world = world;
        this.id = id;

        this.playerBody.angularDamping = this.angularD;

    }

    move(pointerPos, isBoost) {

        try {

            this.lastMousePos = pointerPos;

            this.castToSurface.setFromCamera(pointerPos, this.camera); //raycast from player to pointer
            let intersects = this.castToSurface.intersectObject(this.world);
            this.moveDir.subVectors(intersects.at(0).point, this.playerMesh.position).normalize().multiplyScalar(this.forceM);
            this.playerBody.applyForce(this.moveDir, this.playerBody.position);

            if (this.canBoost && isBoost) { //boost

                this.playerBody.applyForce(this.moveDir.multiplyScalar(this.boostForce), this.playerBody.position);
                this.canBoost = false;

            }

        } catch(e) { //apply force towards raycast dir

            this.playerBody.applyForce(this.castToSurface.ray.direction.normalize().multiplyScalar(this.forceM), this.playerBody.position);
            this.moveDir = this.castToSurface.ray.direction;

        }

        if (devtools.isOpen || this.playerBody.velocity.length() > 50) { //prevents weird vector bug while console is open, still need better fix

            this.playerBody.velocity.copy(new THREE.Vector3());
            this.playerBody.angularVelocity.copy(new THREE.Vector3());
        
        }

    }    
        
    castFromCenter() { //unit vector from world center to player

        let dir = new THREE.Vector3();
        return dir.subVectors(this.playerMesh.position, new THREE.Vector3(0, 0, 0)).normalize();  

    }

    grow(foodPos) { 

        let midpoint = new THREE.Vector3(0, 0, 0).distanceTo(foodPos) / 2; //midpoint from player to food
        let foodDir = new THREE.Vector3().subVectors(foodPos, new THREE.Vector3(0, 0, 0)).normalize(); //unit vector from player to food
        this.playerBody.addShape(new CANNON.Sphere(midpoint), foodDir.multiplyScalar(midpoint)); //add physics body at midpoint

        this.mass += 1;

        if (this.mass == 10 * (this.radius * 2)) {

            let adjustAD = this.angularD.toString() + '5'; //angular damping hack
            this.angularD = parseFloat(adjustAD);
            this.playerBody.angularDamping = this.angularD;
            this.radius += 1;
            this.forceM += 0.15;
            this.boostForce += 5;
            this.playerBody.shapes[0].radius += 0.5;
            this.playerBody.updateBoundingRadius(); //REMEMBER TO CALL THESE!!!
            this.playerBody.mass += 0.05;
            this.playerBody.updateMassProperties(); //REMEMBER TO CALL THESE!!!
            this.battleMesh.scale.addScalar(1);
            this.dirIndicator.scale.addScalar(0.3);
            window.Game.boostBar('adjust', 10);
        
        }

    }

    shrink(foodBody) {
        
        this.playerBody.removeShape(foodBody);

        if (this.mass == 10 * ((this.radius - 1) * 2)) {

            let adjustAD = this.angularD.toString().slice(0, -1); //angular damping hack
            this.angularD = parseFloat(adjustAD);
            this.playerBody.angularDamping = this.angularD;
            this.radius -= 1;
            this.forceM -= 0.15;
            this.boostForce -= 5;
            this.playerBody.shapes[0].radius -= 0.5;
            this.playerBody.updateBoundingRadius(); //REMEMBER TO CALL THESE!!!
            this.playerBody.mass -= 0.05;
            this.playerBody.updateMassProperties(); //REMEMBER TO CALL THESE!!!
            this.battleMesh.scale.subScalar(1);
            this.dirIndicator.scale.subScalar(0.3);
            window.Game.boostBar('adjust', -10);
        
        }

        this.mass -= 1;

    }

    pulsateEffect() {

        if (this.lowerBound) {

            this.battleMesh.material.opacity += 0.02;
            this.battleMesh.scale.subScalar(0.01);

            if (this.battleMesh.material.opacity > 0.6) {

                this.lowerBound = false;
                
            }
            
        } else {

            this.battleMesh.material.opacity -= 0.02;
            this.battleMesh.scale.addScalar(0.01);

            if (this.battleMesh.material.opacity < 0){

                this.lowerBound = true;

            }
        }

    }

    showDir() {

        if (!window.UIInstance.state.showBattle) {

            this.dirIndicator.up.set(this.castFromCenter().x, this.castFromCenter().y, this.castFromCenter().z);
            this.dirIndicator.lookAt(this.moveDir);
            this.dirIndicator.rotateZ(-Math.PI);
            this.dirIndicator.position.copy(this.playerMesh.position);
            this.dirIndicator.position.addScaledVector(this.moveDir.normalize(), this.radius * 2 + 4);
          
        }

    }

}



