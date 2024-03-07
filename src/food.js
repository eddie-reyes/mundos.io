import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Food {

    foodBody = new CANNON.Body({shape : new CANNON.Box(new CANNON.Vec3(0.3, 0.1, 0.3)), type : CANNON.Body.STATIC, collisionFilterGroup : 2}); 

    constructor(foodMesh) {

        this.foodMesh = foodMesh;

    }

    spawn(pos) { //spawn at server location w/ random rotation      

        let randRot = Math.random() * Math.PI * 2;

        this.foodMesh.position.set(pos[0], pos[1], pos[2]);
        this.foodBody.position.copy(this.foodMesh.position);
        this.foodMesh.lookAt(this.castFromCenter());   
        this.foodMesh.rotateOnWorldAxis(this.castFromCenter(), randRot);       
        this.foodBody.quaternion.copy(this.foodMesh.quaternion);

    }    

    castFromCenter() { //unit vector from world center to food
        
        let dir = new THREE.Vector3();
        return dir.subVectors(this.foodMesh.position, new THREE.Vector3(0, 0, 0)).normalize();  

    }

}