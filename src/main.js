//Copyright mundos.io (C) 2022, Edward Reyes
//All rights reserved.
//Unlicensed distribution and/or use of this source code without permission
//is not allowed and punishable by law.

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { randFloat } from 'three/src/math/mathutils.js';

import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';

import { Player } from './player.js';
import { Food } from './food.js';

import { GLTFLoader } from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from '/node_modules/three/examples/jsm/loaders/FontLoader.js';

import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import { io } from 'socket.io-client';

import React from 'react';
import ReactDOM from 'react-dom/client';
import UI from './components/ui.jsx';

//define scene, canvas, 3d renderer, physics timestep, gltf loader, font loader, and socket

const scene = new THREE.Scene();

const canvas = document.getElementById('bg');

const renderer = new THREE.WebGL1Renderer({ canvas: canvas, antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const timeStep = 1 / 60;

const gltfloader = new GLTFLoader();

const fontloader = new FontLoader();

const socket = io.connect("http://mundos.io");

//retrive initial server data
const foodLimit = 300;

let canPlay = true;

let awaitLoad;

let food_data = new Map();
let player_data = new Map();
let persistant_data = new Map();

socket.on("init_state", (food_entries, player_entries) => {

  awaitLoad = new Promise((resolve) => {

    for (let i = 0; i < foodLimit; i++) { //list of food positions

      food_data.set(food_entries[i][0], food_entries[i][1]);

    }

    for (let i = 0; i < player_entries.length; i++) { //gets mass, username, battle state

      if (player_entries[i][1].isPlaying || player_entries[i][0] == socket.id) { //only load player data if currently playing

        player_data.set(player_entries[i][0], player_entries[i][1]);

      }

    }

    resolve();

  })

})

socket.on("prevent_play", () => {

  canPlay = false;
  setTimeout(() => {canPlay = true;}, 15000);

})

//lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.mapSize.width = 4096; //big shadow map 
directionalLight.shadow.mapSize.height = 4096;
scene.add(directionalLight);


//initialize world + atmosphere
const worldRadius = 150;
const gravConstant = 30;
const worldComplexity = worldRadius / 2;
const worldShape = new THREE.SphereGeometry(worldRadius, worldComplexity, worldComplexity);
const worldMat = new THREE.MeshStandardMaterial({color : 0x14c400});
const worldMesh = new THREE.Mesh(worldShape, worldMat);
const worldBody = new CANNON.Body({shape : new CANNON.Sphere(worldRadius), type : CANNON.Body.STATIC});
scene.add(worldMesh);


//seperate shadow mesh, same dimensions as world
const shadowMesh = new THREE.Mesh(new THREE.SphereGeometry(worldRadius, worldComplexity, worldComplexity), new THREE.ShadowMaterial({opacity : 0.2}));
shadowMesh.receiveShadow = true;
scene.add(shadowMesh);

//atmosphere mesh during menu
const atmosphereMesh = new THREE.Mesh(

  new THREE.SphereGeometry(worldRadius * 1.2, worldComplexity, worldComplexity),
  new THREE.ShaderMaterial({vertexShader, fragmentShader, uniforms : {
    glowColor :  { type : "vec3", value : new THREE.Vector3(0.3, 0.6, 1.0)},
    c : {type : "f", value : 1.0},
  },

    blending : THREE.AdditiveBlending,
    side: THREE.BackSide,

  })

);
atmosphereMesh.renderOrder = 1;

scene.add(atmosphereMesh);

//spawn stars in random positions
for (let i = 0; i < 200; i++) {

  let star = new THREE.Mesh(new THREE.SphereGeometry(1, 2, 2), new THREE.MeshBasicMaterial({ color : 0xffffff }));
  let randDir = new THREE.Vector3().randomDirection().multiplyScalar(worldRadius * randFloat(2.1, 5));
  star.position.set(randDir.x, randDir.y, randDir.z);

  scene.add(star);

}

//skybox texture
const skybox_b = new THREE.TextureLoader().load('/client/UI/skybox_b.png');

//initialize camera
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = 15; //distance from camera to player

//initialize player model, class, opponent map, and opponent data
const colors = [0xff0000, 0xffa500, 0xffff00, 0xff00ff, 0x8000ff, 0x0000ff, 0x00ffff];

const loadPlayer = await gltfloader.loadAsync('/client/meshes/player.gltf');

//get player mesh w/ random color
let playerModel = new THREE.Object3D().copy(loadPlayer.scene.children[0]);
playerModel = SetRandMeshColor(playerModel);

const spawnPos = new THREE.Vector3().randomDirection().multiplyScalar(worldRadius + 1);
//const spawnPos = new THREE.Vector3(0, 0, worldRadius + 1);
const player = new Player(playerModel, camera, worldMesh, null);

let opponents = [];
let attacker;
let minigame;
let level;

//initialize font
const font = await fontloader.loadAsync('../client/UI/helvetiker_regular.typeface.json');

//inject reactDOM
const root = ReactDOM.createRoot(document.getElementById('ui_container'));
root.render(<UI />);

//menu camera
const menuControls = new OrbitControls(camera, renderer.domElement);
menuControls.target = worldMesh.position;
menuControls.enablePan = false;
menuControls.enableRotate = false;
menuControls.enableZoom = false;
menuControls.autoRotate = true;
menuControls.autoRotateSpeed = 0.5;
menuControls.minDistance = worldRadius * 2;
menuControls.maxDistance = menuControls.minDistance;
camera.position.set(0, 0, worldRadius * 2);

//generate food from server data
const foodMeshes = ['rock1','rock2','rock3','branch','mushroom','flower1','flower2'];                                                                                 
let food = [];  

for (let i = 0; i < foodLimit; i++) {

  let currentFood = new Food(await getRandMesh(i));
  player.localPhysics.addBody(currentFood.foodBody);
  food.push(currentFood);
  currentFood.foodBody.id = i; //id should be the same as key from server
  currentFood.spawn(food_data.get(i)); //from food class
  
}

//anti-evade powerup
const PU1Glow = new THREE.Mesh(new THREE.SphereGeometry(3));
const PU1Light = new THREE.PointLight(0xffff00, 5, 5, 2);
PU1Glow.renderOrder = 1;

let PU1PosA = food[1].castFromCenter().multiplyScalar(worldRadius);
let PU1PosB = food[1].castFromCenter().multiplyScalar(worldRadius + 1);

PU1Glow.position.set(PU1PosA.x, PU1PosA.y, PU1PosA.z);
PU1Light.position.set(PU1PosB.x, PU1PosB.y, PU1PosB.z);

scene.add(PU1Glow);
scene.add(PU1Light);

setPU1Mesh(food[1].foodMesh);
setPU1Mesh(PU1Glow);

awaitLoad //only fires once data has been fetched fom server
  .then(() => {

    player_data.forEach((value, key) => {

      if (key != socket.id) {

        generateNewOpponent(key); //spawn existing oppponents  

      }

    })

    player.id = socket.id;

    console.log("player data loaded ✅");

  });  

DesyncFix();

//hide loading screen div on load
window.UIInstance.changeVisibility("LoadingScreen");

//for minigame testing
//window.UIInstance.changeVisibility("Battle");

//event listeners
document.addEventListener('pointermove', onPointerMove, false);

document.addEventListener('keypress', onKeyPressed, false);

window.addEventListener('resize', onWindowResize, false );

window.addEventListener('blur', onForfeitBattle, false );

window.addEventListener('focus', DesyncFix, false );

player.playerBody.addEventListener("collide", function(e) {

  //food collision
  if (e.body.collisionFilterGroup == 2 && !player.isColliding) {

    //attach food to player mesh
    player.isColliding = true;
    let foodSizeFactor = (player.radius - 1) / 10;
    let foodIndex = e.body.id;
    let foodPos = food[foodIndex].foodMesh.position;
    let attachedFood = new THREE.Object3D().copy(food[foodIndex].foodMesh);

    attachedFood.traverse((o) => {

      if (o.isMesh) {
    
        o.castShadow = true;
    
      }
    
    })

    attachedFood.scale.set(1 + foodSizeFactor, 1 + foodSizeFactor, 1 + foodSizeFactor);
    player.playerMesh.attach(attachedFood); //the katamari function

    player.grow(player.playerMesh.worldToLocal(foodPos)); //from player class

    player_data.get(socket.id).mass += 1;
    window.Game.setLeaderboard();
    
    setTimeout(function() { //prevents position mixup

      let randPos = new THREE.Vector3().randomDirection().multiplyScalar(worldRadius); //set new pos and emit for state change
      food[foodIndex].spawn([randPos.x, randPos.y, randPos.z]);
      socket.emit("update_food_data", foodIndex, randPos);

      player.isColliding = false;

      if (foodIndex == 1) {

        socket.emit("send_PU1");
  
        setPU1(player);
  
        let PU1PosB = randPos.addScaledVector(food[1].castFromCenter(), 1);
  
        PU1Glow.position.set(randPos.x, randPos.y, randPos.z);
        PU1Light.position.set(PU1PosB.x, PU1PosB.y, PU1PosB.z);

        window.Game.showPU1();
        
      }
 
    }, 0);

  }

  //player collision
  else if (e.body.collisionFilterGroup == 3 && !player.inBattle) {

    let opponentId = e.body.id; //should be same at socket id
    let opponentIndex = opponents.findIndex(item => item.id === opponentId);
    attacker = opponents[opponentIndex];

    player.inBattle = true;

    player.playerBody.type = CANNON.Body.STATIC;
    player.playerBody.collisionFilterGroup = 4;
    scene.add(player.battleMesh);  
    scene.remove(attacker.label);
    scene.add(attacker.battleMesh);

    socket.emit("change_battle_state", opponentId, "init");

  }

  else if (e.body.collisionFilterGroup == 4) {

    repelFromOpponent(player.playerMesh.position, e.body.position, 10);
    player.isColliding = false;

  }
});

//change collision filter during battle
socket.on("update_collision", (id_a, id_b, isReciever, type, selectedGame, selectedLevel) => {
  
  let opponentIndexA = opponents.findIndex(item => item.id === id_a); //attacker
  let opponentIndexB = opponents.findIndex(item => item.id === id_b); //reciever

  attacker = opponents[opponentIndexA];
  let reciever = opponents[opponentIndexB];

  switch (type) {

    case "init": //battle initiated
      
      attacker.playerBody.collisionFilterGroup = 4; //4 = battle state
      scene.add(attacker.battleMesh); 

      //reciever
      if (isReciever && !player.inBattle) {

        player.inBattle = true;

        player.playerBody.type = CANNON.Body.STATIC;
        player.playerBody.collisionFilterGroup = 4;
        scene.add(player.battleMesh);
        scene.remove(attacker.label);

        minigame = selectedGame; //reciever gets game (0-9)
        level = selectedLevel; //reciever gets level (0-4)

        window.UIInstance.changeVisibility("Battle"); //show battle ui
      
      //update collision for other players  
      } else if (id_b != socket.id) {

        reciever.playerBody.collisionFilterGroup = 4;
        scene.add(reciever.battleMesh);  

      }

      break;

    case "evade":

      if (typeof attacker != "undefined") { //check if object exists

        setTimeout(function() {

            attacker.playerBody.collisionFilterGroup = 3;
            if (!attacker.PU1) {scene.remove(attacker.battleMesh)}  

        }, 3000); //keep player invincible for 3 seconds after battle end

      }
        
      if (isReciever && player.inBattle) {

        player.playerBody.type = CANNON.Body.DYNAMIC;
        player.playerBody.collisionFilterGroup = 3;

        repelFromOpponent(player.playerMesh.position, attacker.playerMesh.position, 10);

        scene.add(attacker.label);

        clearTimeout(player.battle_timer);

        window.UIInstance.changeVisibility("Battle");

        if (player.score == null) { //should only show evade text if score is null, meaning no battle was initiated

          window.Game.showEndMsg(null, "evade", attacker.username, false);

        }

        setTimeout(function() { 

          if (!player.PU1) {scene.remove(player.battleMesh)}
          player.inBattle = false;

        }, 3000);

      } else if (id_b != socket.id && typeof reciever != "undefined") { //id_b is player, should have own post-battle logic

        setTimeout(function() {

            reciever.playerBody.collisionFilterGroup = 3; 
            if (!reciever.PU1) {scene.remove(reciever.battleMesh)}  

        }, 3000);
      }
    }
})

socket.on("retrieve_game", (selectedGame, selectedLevel) => { //attacker gets game

  minigame = selectedGame; //sender gets game (0-9)
  level = selectedLevel; //sender gets level (0-4)

  window.UIInstance.changeVisibility("Battle");

})

socket.on("retrieve_mass", (mass, id_a, id_b, isLoser) => {
  
  let opponentIndexA = opponents.findIndex(item => item.id === id_a) //winner
  let opponentIndexB = opponents.findIndex(item => item.id === id_b); //loser

  if (isLoser) {
    
    window.Game.showEndMsg(mass, "lose", null, null); //show negative mass change

    removeMass(player, mass, true); //client
    generateMass(attacker, mass, false); //opponent
    
  } else {

    generateMass(opponents[opponentIndexA], mass, false); //opponent
    removeMass(opponents[opponentIndexB], mass, false); //opponent

  }

  if (window.UIInstance.state.showGame) {
    
    window.Game.setLeaderboard();
  
  }  

});

socket.on("retrieve_score", (opponentScore, forfeit) => {

  player.score = forfeit ? 10 : player.score;

  if (player.inBattle) {window.Game.showDebrief(player.score, opponentScore)};

  if (player.score > opponentScore) {

    let massChange = Math.floor((player.score * attacker.mass) / 10);
    massChange = (massChange >= attacker.mass) ? attacker.mass - 1 : massChange; //failsafe

    window.Battle.onEnd(false, false); //default end
    window.Game.showEndMsg(massChange, "win", null, null); //postive mass change

    socket.emit("update_mass", massChange, attacker.id); //only broadcast if winner

    generateMass(player, massChange, true); //client
    removeMass(attacker, massChange, false); //opponent

    if (window.UIInstance.state.showGame) {
    
      window.Game.setLeaderboard();
    
    }
  
  }

  else if (player.score == opponentScore && player.inBattle) {

    window.Battle.onEnd(false, true); //two-way end

    window.Game.showEndMsg(null, "draw", null, null);

  }
 
})

//change food pos on state change
socket.on("retrieve_food_data", (id, index, new_entry) => {

  let opponentIndex = opponents.findIndex(item => item.id === id); //opponent index who just picked up food
  let opponent = opponents[opponentIndex];

  if (opponent.mass == 10 * (opponent.radius * 2)) { //increase radius 

    opponent.radius += 1;
    opponent.playerBody.shapes[0].radius += 0.5;
    opponent.playerBody.updateBoundingRadius();
    opponent.battleMesh.scale.addScalar(1);

  }

  let attachedFood = new THREE.Object3D().copy(food[index].foodMesh); //copy food mesh

  attachedFood.traverse((o) => {

    if (o.isMesh) {

      o.castShadow = true;
  
    }
    
  });

  let foodSizeFactor = (opponent.radius - 1) / 10;
  attachedFood.scale.set(1 + foodSizeFactor, 1 + foodSizeFactor, 1 + foodSizeFactor);
  opponent.playerMesh.attach(attachedFood);

  opponent.mass += 1;
  player_data.get(id).mass += 1;

  food[index].spawn(new_entry); //spawn food at server generated position 


  if (index == 1) {

    setPU1(opponent);

    let PU1PosA = new THREE.Vector3(new_entry[0], new_entry[1], new_entry[2]);
    let PU1PosB = PU1PosA.addScaledVector(food[1].castFromCenter(), 1);

    PU1Glow.position.set(PU1PosA.x, PU1PosA.y, PU1PosA.z);
    PU1Light.position.set(PU1PosB.x, PU1PosB.y, PU1PosB.z);

  }

  if (window.UIInstance.state.showGame) {
    
    window.Game.setLeaderboard();
  
  }  

})

//set username and spawn opponent
socket.on("retrieve_username", (id, username) => {

  player_data.set(id, {mass: 1, username: username, isPlaying: true, inBattle: false, PU1 : false}); 
  generateNewOpponent(id);

  if (window.UIInstance.state.showGame) {
    
    window.Game.setLeaderboard();
  
  }

})

//win condition
socket.on("retrieve_win", (id) => {

  player.playerBody.type = CANNON.Body.STATIC;

  if (id == socket.id) { //winner

    let adjustedPos = player.castFromCenter().multiplyScalar(worldRadius + player.radius + 5);
  
    camera.up.set(player.castFromCenter().x, player.castFromCenter().y, player.castFromCenter().z);
    camera.position.set(adjustedPos.x, adjustedPos.y, adjustedPos.z);
    menuControls.target = player.playerMesh.position;
    menuControls.minDistance = player.radius*2 + cameraOffset;
    menuControls.maxDistance = menuControls.minDistance;
    scene.remove(player.battleMesh);
    window.Game.onWin(player.username);
    respawn();

  }
  
  if (window.UIInstance.state.showGame && id != socket.id) { //everyone else

    let opponentIndex = opponents.findIndex(item => item.id === id);
    let opponent = opponents[opponentIndex];
    let adjustedPos = opponent.castFromCenter().multiplyScalar(worldRadius + opponent.radius + 5);

    camera.up.set(opponent.castFromCenter().x, opponent.castFromCenter().y, opponent.castFromCenter().z);
    camera.position.set(adjustedPos.x, adjustedPos.y, adjustedPos.z);
    menuControls.target = opponent.playerMesh.position;
    menuControls.minDistance = opponent.radius*2 + cameraOffset;
    menuControls.maxDistance = menuControls.minDistance;
    scene.remove(opponent.battleMesh);
    window.Game.onWin(opponent.username);
    respawn();

  } else { //if in menu on win condition

    canPlay = false;

    setTimeout(() => {

      opponents.forEach((opponent) => {

        removeMass(opponent, opponent.mass - 1, false);
        player_data.set(opponent.id, {mass: 1, username: opponent.username, isPlaying : true, inBattle: false, PU1 : false});
  
      })

      canPlay = true
    
    }, 15000);

  }
  
});

//update game state
socket.on("on_disconnect", (id) => {

  //delete server and local data
  player_data.delete(id);
  persistant_data.delete(id);

  let opponentIndex = opponents.findIndex(item => item.id === id);
  let opponent = opponents[opponentIndex];

  if (typeof opponent != "undefined") { //only if opponent is in-game

    scene.remove(opponent.playerMesh);
    scene.remove(opponent.label);
    scene.remove(opponent.battleMesh);
    player.localPhysics.removeBody(opponent.playerBody);
    opponents.splice(opponentIndex, 1);

    if (window.UIInstance.state.showGame) {
    
      window.Game.setLeaderboard();
    
    }  
  
  }

  if (window.UIInstance.state.showBattle && attacker.id == id) { //if opponent disconnects during battle

    window.Battle.onEnd(false, false);
    scene.remove(attacker.label);

  }

})

//game loop
function animate() {

  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  //in menu
  if (!player.isPlaying) {

    menuControls.update();

    setLighting();
    parsePlayerData();

  }

  //in game
  else if (player.isPlaying) {

    updateCamera(); //must update camera before retrieving player data
    parsePlayerData();
    loopPhysics();
    setLighting();

    player.localPhysics.step(timeStep);

  }
  
}

//loop physics
function loopPhysics() {

  player.playerMesh.position.copy(player.playerBody.position);
  player.playerMesh.quaternion.copy(player.playerBody.quaternion);
  player.localPhysics.gravity.copy(player.castFromCenter().negate().multiplyScalar(gravConstant));
  player.battleMesh.position.copy(player.playerMesh.position);

  player.pulsateEffect();
  player.showDir();
  player.move(player.lastMousePos, false);

}

//update lighting every frame
function setLighting() {

  if (player.isPlaying) {

    let lightPos = player.castFromCenter().multiplyScalar(worldRadius * 1.5);
    directionalLight.position.set(lightPos.x, lightPos.y, lightPos.z);
    directionalLight.lookAt(player.playerMesh.position);

  } else {

    directionalLight.position.set(camera.position.x, camera.position.y, camera.position.z);
    directionalLight.lookAt(worldMesh.position);

  }  
}

//get mouse pos and send through raycaster
function onPointerMove(e) {

  player.move(getMousePos(e), false);

}

//boost player
function onKeyPressed(e) {

  if (e.key == ' ' && player.canBoost && player.isPlaying && !player.inBattle) {

    player.move(player.lastMousePos, true);
    setTimeout(function() {player.canBoost = true}, 5000);
    window.Game.boostBar('animate', null);

  }
  
}

//orbit camera exploit
function updateCamera() {

  const controls = new OrbitControls(camera, renderer.domElement);
  camera.up.set(player.castFromCenter().x, player.castFromCenter().y, player.castFromCenter().z);
  controls.target = player.castFromCenter().multiplyScalar(worldRadius + player.radius);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = player.radius*2 + cameraOffset;
  controls.maxDistance = controls.minDistance;
  controls.maxPolarAngle = Math.PI / 3.5;
  controls.minPolarAngle = controls.maxPolarAngle;
  controls.update();
  controls.dispose();

}

//boiler-plate resize window
function onWindowResize(){

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

}

//get x, y of mouse
function getMousePos(e) {

  let x, y;
  let pointerPos = new THREE.Vector2(x, y);

  pointerPos.x = (e.offsetX / canvas.clientWidth) * 2 - 1;
  pointerPos.y = -(e.offsetY / canvas.clientHeight) * 2 + 2;

  return pointerPos;

}

//player forfeits battle if they clicked off the window
function onForfeitBattle() {

  if (window.UIInstance.state.showBattle) {

    socket.emit("send_score", attacker.id, 0, true);
    window.Game.showDebrief(0, 10);

  }

}

function DesyncFix() {

  //re-adjust food position to fix desync issue
  opponents.forEach((opponent) => {

    opponent.playerMesh.children.forEach((child) => {

      if (child.position.distanceTo(new THREE.Vector3(0, 0, 0)) > opponent.radius * 2) {

        let adjustedPos = new THREE.Vector3().randomDirection().multiplyScalar(opponent.radius);

        child.position.set(adjustedPos.x, adjustedPos.y, adjustedPos.z);

      }

    })

  })

}

//for data that constantly needs to be updated
function parsePlayerData() {

  let pos = player.playerMesh.position;
  let rot = player.playerMesh.quaternion;

  socket.emit("persistant_client_data", [pos.x, pos.y, pos.z], [rot.x, rot.y, rot.z, rot.w]); //emit position and rotation

  socket.on("persistant_server_data", (entries) => { //retrieve opponent data

    for (let i = 0; i < entries.length; i++) {

      if (entries[i][0] != socket.id) {  

        persistant_data.set(entries[i][0], entries[i][1]); //copy server data to client

      }  
    } 
  })

  if (opponents.length > 0) {

    for (let i = 0; i < opponents.length; i++) {

        //set opponent position and rotation
        try {

          //get positions, rotations, and derive label pos
          let opponentPos = persistant_data.get(opponents[i].id).position;
          let opponentRot = persistant_data.get(opponents[i].id).rotation;
          let labelPos = new THREE.Vector3(opponentPos[0], opponentPos[1], opponentPos[2]);

          labelPos.addScaledVector(opponents[i].castFromCenter(), opponents[i].radius + 5);

          //set position and rotation of player body, player mesh, and label
          opponents[i].playerMesh.position.set(opponentPos[0], opponentPos[1], opponentPos[2]);
          opponents[i].playerBody.position.set(opponentPos[0], opponentPos[1], opponentPos[2]);

          opponents[i].playerMesh.quaternion.set(opponentRot[0], opponentRot[1], opponentRot[2], opponentRot[3]);
          opponents[i].playerBody.quaternion.set(opponentRot[0], opponentRot[1], opponentRot[2], opponentRot[3]);
          
          opponents[i].label.position.set(labelPos.x, labelPos.y, labelPos.z);

          //set proper rotation of label
          opponents[i].label.setRotationFromQuaternion(camera.quaternion);

          //set battle mesh position
          opponents[i].battleMesh.position.copy(opponents[i].playerMesh.position);
          opponents[i].pulsateEffect();

        }    
        catch (e) {
          //if player data cannot be loaded
          console.log("fetching player data...");
        }
    }
  }
}

//get random mesh color for player and opponents
function SetRandMeshColor(playerModel) {

  let randColorIndex = Math.floor(Math.random() * 7);
  let playerMat = new THREE.MeshStandardMaterial({color : colors[randColorIndex]});

  playerModel.traverse((o) => {

    if (o.name == 'Icosphere') {  //name of player mesh
      
      o.material = playerMat;

    }

    if (o.isMesh) {

      o.castShadow = true;
  
    }
    
  });

  return playerModel;

}

function generateNewOpponent(id) {

  let opponentModel = new THREE.Object3D().copy(loadPlayer.scene.children[0]);
  opponentModel = SetRandMeshColor(opponentModel);   

  let opponent = new Player(opponentModel, null, worldMesh, id); //new opponent w/ socket id

  opponent.username = player_data.get(opponent.id).username; 

  if (player_data.get(opponent.id).inBattle) { //fetch boolean from local map

    opponent.playerBody.collisionFilterGroup = 4;
    scene.add(opponent.battleMesh);

  }

  if (player_data.get(opponent.id).PU1) {

    setPU1(opponent);

  }

  generateMass(opponent, player_data.get(opponent.id).mass - 1, false); 

  player_data.get(opponent.id).mass = opponent.mass;

  scene.add(opponent.playerMesh);
  player.localPhysics.addBody(opponent.playerBody);
  opponent.playerBody.id = opponent.id; 
  opponents.push(opponent); //add to opponent list

  setOpponentLabel(opponent, opponent.username);

}

//set label for an opponent
function setOpponentLabel(opponent, username) {

  let labelGeo = new TextGeometry(username, {

    font: font,
		size: 80,
		height: 5,
		curveSegments: 12,

  })

  //set proper size, rotation, and local position
  opponent.label.geometry = labelGeo; 
  opponent.label.geometry.center();
  opponent.label.material = new THREE.MeshBasicMaterial({color : 0xffffff});
  opponent.label.rotateX(Math.PI / 2);
  opponent.label.scale.set(0.02, 0.02, 0.001);
  
  scene.add(opponent.label);

}

function repelFromOpponent(playerPos, opponentPos, repelForce) {

  let repelDir = new THREE.Vector3().subVectors(playerPos, opponentPos).normalize();
  repelDir.multiplyScalar(repelForce);
  player.playerBody.applyForce(repelDir, player.playerBody.position);

}

function removeMass(target, mass, isPlayer) {

  let attachedfood = Array.from(target.playerMesh.children).reverse(); //must create new array; DONT MUTATE ORIGINAL!!
  let foodBodies = Array.from(target.playerBody.shapes).reverse(); //must create new array; DONT MUTATE ORIGINAL!!

  for (let i = 0; i < mass; i++) {

    if (isPlayer) {
      
      player.shrink(foodBodies[i]); //from player class
  
    } else {

      target.mass -= 1;

      if (target.mass == 10 * ((target.radius - 1) * 2)) {

        target.radius -= 1;
        target.playerBody.shapes[0].radius -= 0.5;
        target.playerBody.updateBoundingRadius();
        target.battleMesh.scale.subScalar(1);
  
      }

    } 

    target.playerMesh.remove(attachedfood[i]); //remove function must designate parent object (target)

  }
  
  player_data.get(target.id).mass -= mass;

  if (window.UIInstance.state.showGame) {
    
    window.Game.setLeaderboard();
  
  } 

}

function respawn() {

  player.isPlaying = false;

  setTimeout(() => {

    let newPos = new THREE.Vector3().randomDirection().multiplyScalar(worldRadius + 1);
    player.playerBody.position.set(newPos.x, newPos.y, newPos.z);
    player.isPlaying = true;
    player.playerBody.type = CANNON.Body.DYNAMIC;
    removeMass(player, player.mass - 1, true);

    opponents.forEach((opponent) => {

      removeMass(opponent, opponent.mass - 1, false);
      player_data.set(opponent.id, {mass: 1, username: opponent.username, isPlaying : true, inBattle: false, PU1 : false});

    })

  }, 15000);

}

function setPU1(target) {

  target.PU1 = true;
  target.battleMesh.material.color.setHex(0xffff00);
  scene.add(target.battleMesh);

  setTimeout(() => {

    target.PU1 = false;
    target.battleMesh.material.color.setHex(0xff0000);
    scene.remove(target.battleMesh);

  }, 60000)

}

function setPU1Mesh(mesh) {

  mesh.traverse((o) => {

    if (o.isMesh) {
  
      o.material = new THREE.ShaderMaterial({vertexShader, fragmentShader, uniforms : {
        glowColor :  { type : "vec3", value : new THREE.Vector3(1.0, 1.0, 0.0)},
        c : {type : "f", value : 0.2}

      },

        blending : THREE.AdditiveBlending,
        side: THREE.BackSide,
    
      })
    
    }

  })

  return mesh;

}

//needed for init state, and battle end
async function generateMass(target, mass, isPlayer) {

  for (let i = 0; i < mass; i++) { //attach random meshes to generate target mass

    //random position, rotation, and mesh
    let randPos = new THREE.Vector3().randomDirection().multiplyScalar(target.radius * 0.6);
    let randMesh = await getRandMesh();

    randMesh.traverse((o) => {

      if (o.isMesh) {
    
        o.castShadow = true;
    
      }
    
    })

    let foodSizeFactor = (target.radius - 1) / 10;

    //attach mesh
    scene.add(randMesh);
    target.playerMesh.localToWorld(randPos);
    randMesh.position.set(randPos.x, randPos.y, randPos.z);
    randMesh.lookAt(player.playerMesh.position);
    randMesh.quaternion.rotateTowards(new THREE.Quaternion().random(), 3 * Math.PI / 2);
    randMesh.scale.set(1 + foodSizeFactor, 1 + foodSizeFactor, 1 + foodSizeFactor);
    target.playerMesh.attach(randMesh);

    if (isPlayer) {

      let bodyPos = player.playerMesh.worldToLocal(randPos).addScalar(0.8); //adjust physics body 

      player.grow(bodyPos);

    } else {

      target.mass += 1;
          
      if (target.mass == 10 * (target.radius * 2)) {

        target.radius += 1;
        target.playerBody.shapes[0].radius += 0.5;
        target.playerBody.updateBoundingRadius();
        target.battleMesh.scale.addScalar(1);

      }
    }  
  }

  player_data.get(target.id).mass += mass; //problem area

  if (window.UIInstance.state.showGame) {
    
    window.Game.setLeaderboard();
  
  } 

}

//get random food mesh
async function getRandMesh() {

  let randIndex = Math.floor(Math.random() * 7);
  let result = await gltfloader.loadAsync(`../client/meshes/${foodMeshes[randIndex]}.gltf`);

  scene.add(result.scene);

  return result.scene.children[0];
  
}



animate();

export { player_data, player, attacker, socket, scene, repelFromOpponent, worldBody, camera, menuControls, skybox_b, atmosphereMesh, spawnPos, minigame, level, getMousePos, generateMass, canPlay};
