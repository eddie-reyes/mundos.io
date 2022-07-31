//Copyright mundos.io-server (C) 2022, Edward Reyes
//All rights reserved.
//Unlicensed distribution and/or use of this source code without permission
//is not allowed and punishable by law.

const express = require('express');
const app = express();
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const { randomInt } = require('crypto');

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        orgin: "http://mundos.io",
    }
})

let player_data = new Map(); //player id => mass, username, inbattle, PU1
let persistant_data = new Map(); //player id => position, rotation
let food_data = new Map(); //food id => position

const worldRadius = 150;
const foodLimit = 300;
const gameLimit = 10; //10 games as of v0.1
const levelLimit = 5; //5 levels for golf, tanks, tts
const winMass = 500;

//randomly generate seeds for games on server start
let RT_seed = generateRT_seed();
let FB_seed = generateFB_seed();
let Swish_seed = generateSwish_seed();
let Ricochet_seed = generateRicochet_seed();
let IT_seed = generateIT_seed();

let games = Array(gameLimit).fill().map((value, index) => { value = index; return index });
let levels = Array(levelLimit).fill().map((value, index) => { value = index; return index });
shuffle(games);
shuffle(levels);

let gameResetting = false; //15 second buffer from game end to restart
let seed = 0;

//interal clock determines seed
setInterval(() => {

    seed++;

    if (seed == gameLimit) {seed = 0}

}, 1000);

//set intial food for game state
for (let i = 0; i < foodLimit; i++) {

    let s = Math.random()*Math.PI*2;
    let t = Math.random()*Math.PI;

    let x = worldRadius * Math.cos(s) * Math.sin(t); //calculate point on sphere surface
    let y = worldRadius * Math.sin(s) * Math.sin(t);
    let z = worldRadius * Math.cos(t);

    let coords = [x, y, z];

    food_data.set(i, coords);

}

io.on("connection", (socket) => {

    //set initial data
    persistant_data.set(socket.id, {position: null, rotation: null});
    player_data.set(socket.id, {mass: 1, username: 'Mundos Player', isPlaying : false, inBattle: false, PU1 : false});

    //set initial state for connecting socket
    io.to(socket.id).emit("init_state", Array.from(food_data.entries()), Array.from(player_data.entries()));
    
    console.log(`connected players: ${io.sockets.sockets.size}`);
    
    if (gameResetting) {

        io.to(socket.id).emit("prevent_play");

    }

    //listen for data request and then send array from persistant data
    socket.on("persistant_client_data", (position, rotation) => {

        persistant_data.get(socket.id).position = position;
        persistant_data.get(socket.id).rotation = rotation;
        
        socket.emit("persistant_server_data", Array.from(persistant_data.entries()));

    }) 

    //update and emit food data on state change
    socket.on("update_food_data", (index, pos) => {

        let new_entry = [pos.x, pos.y, pos.z];

        food_data.set(index, new_entry);

        player_data.get(socket.id).mass += 1;
        
        socket.broadcast.emit("retrieve_food_data", socket.id, index, new_entry);

        if (player_data.get(socket.id).mass >= winMass) {

            io.emit("retrieve_win", socket.id);
            resetGame();

        } 

    })

    socket.on("update_mass", (mass, opponentId) => {

        player_data.get(socket.id).mass += mass;
        player_data.get(opponentId).mass -= mass;

        socket.broadcast.except(opponentId).emit("retrieve_mass", mass, socket.id, opponentId, false);
        socket.to(opponentId).emit("retrieve_mass", mass, socket.id, opponentId, true);

        if (player_data.get(socket.id).mass >= winMass) {

            io.emit("retrieve_win", socket.id);
            resetGame();

        }

    })

    //get username from socket
    socket.on("update_username", (username) => {

        player_data.get(socket.id).username = username;
        player_data.get(socket.id).isPlaying = true;
        socket.broadcast.emit("retrieve_username", socket.id, username);

    })

    //set battle state
    socket.on("change_battle_state", (opponentId, type) => { 
        
        switch (type) {

            case "init":

                player_data.get(socket.id).inBattle = true;
                player_data.get(opponentId).inBattle = true;

                let game = games[seed];
                let level = levels[Math.floor(seed / 2)];

                switch (game) {

                    case 1: //RT seed

                        level = RT_seed;
                        break;

                    case 3: //FB seed

                        level = FB_seed;
                        break;
                    
                    case 6: //Swish seed

                        level = Swish_seed;
                        break;

                    case 8: //Riochet seed

                        level = Ricochet_seed;
                        break;

                    case 9: //IT seed

                        level = IT_seed;
                        break;
                }

                socket.broadcast.except(opponentId).emit("update_collision", socket.id, opponentId, false, "init");
                io.to(opponentId).emit("update_collision", socket.id, opponentId, true , "init", game, level);
                io.to(socket.id).emit("retrieve_game", game, level);
                
                break;

            case "end":

                player_data.get(socket.id).inBattle = false;

                if (typeof player_data.get(opponentId) != 'undefined') { //make sure key retrieval only occurs if opponent is still connected
                
                    player_data.get(opponentId).inBattle = false;

                    io.to(opponentId).emit("update_collision", socket.id, opponentId, true, "evade");
                    socket.broadcast.except(opponentId).emit("update_collision", socket.id, opponentId, false, "evade");

                } else { //if opponent disconnected during battle

                    socket.broadcast.emit("update_collision", socket.id, opponentId, false, "evade");

                }
                
                //get new seeds and shuffle games and levels after battle end
                shuffle(games);
                shuffle(levels);
                RT_seed = generateRT_seed();
                FB_seed = generateFB_seed();
                Swish_seed = generateSwish_seed();
                Ricochet_seed = generateRicochet_seed();
                IT_seed = generateIT_seed();

                break;

        } 
        
    })

    //get score from winning client
    socket.on("send_score", (opponentId, score, forfeit) => {

        if (!forfeit) {
        
            io.to(opponentId).emit("retrieve_score", score, false); //send to loser

        } else {

            io.to(opponentId).emit("retrieve_score", score, true); //send to loser

        }    

    });

    socket.on("send_PU1", () => {

        player_data.get(socket.id).PU1 = true; //set PU1 for player for 60 seconds

        setTimeout(() => {if (typeof player_data.get(socket.id) != "undefined") {player_data.get(socket.id).PU1 = false}}, 60000);

    })

    //////////////////FLAPPY BIRD/////////////////////////

    socket.on("FB_send", (opponentId, height) => {

        io.to(opponentId).emit("FB_retrieve", height);

    })

    /////////////////////TANKS////////////////////////////

    socket.on("TANKS_send", (opponentId, position, angle, dir) => {

        io.to(opponentId).emit("TANKS_retrieve", position, angle, dir);
        
    })

    socket.on("TANKS_shoot_send", (opponentId, dir, pos) => {

        io.to(opponentId).emit("TANKS_shoot_retrieve", dir, pos);

    })

    /////////////////////GOLF////////////////////////////

    socket.on("GOLF_send", (opponentId, position) => {

        io.to(opponentId).emit("GOLF_retrieve", position);
        
    })

    //////////////////RICOCHET///////////////////////////

    socket.on("RICOCHET_send", (opponentId, angle) => {

        io.to(opponentId).emit("RICOCHET_retrieve", angle);
        
    })

    socket.on("RICOCHET_shoot_send", (opponentId, dir) => {

        io.to(opponentId).emit("RICOCHET_shoot_retrieve", dir);

    })

    //////////////////ICY TOWER///////////////////////////

    socket.on("IT_send", (opponentId, position, direction) => {

        io.to(opponentId).emit("IT_retrieve", position, direction);
        
    })

    //update state for other sockets on disconnect
    socket.on("disconnect", (reason) => {

        persistant_data.delete(socket.id);
        player_data.delete(socket.id);
        socket.broadcast.emit("on_disconnect", socket.id);

        console.log(`connected players: ${io.sockets.sockets.size}`)
        console.log(`Player Disconnected - Reason: ${reason.toUpperCase()}`);

    })
})

server.listen(3000, () => {

    console.log('server is running');
    
})

function shuffle(array) {

    let currentIndex = array.length, randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
}


function generateRT_seed() {

    return [randomInt(-100, 100) * 3, randomInt(-100, 100) * 2, Math.floor((Math.random() + 0.3) * 5000)];

}

function generateFB_seed() {

    let FB_seed = Array(10).fill().map((height) => {

        height = Math.floor((Math.random() * 240) + 20);

        return height;

    })

    return FB_seed;

}

function generateSwish_seed () {

    let Swish_seed = Array(10).fill().map((width) => {

        width = Math.random() < 0.5 ? randomInt(-250, -150) : randomInt(150, 250);

        return width;

    })

    return Swish_seed;

}

function generateRicochet_seed () {

    let Ricochet_seed = Array(20).fill().map((crate) => {

        crate = { width : randomInt(-100, 100), speed : (Math.random() * 0.01) + 0.03 }

        return crate;

    })

    return Ricochet_seed;

}

function generateIT_seed () {

    let Ricochet_seed = Array(50).fill().map((platform) => {

        platform = { width : randomInt(-200, 200), id : Math.random() < 0.2 ? 1 : 2}

        return platform;

    })

    return Ricochet_seed;

}

function resetGame() {

    gameResetting = true;

    player_data.forEach((value, key) => {

        let username = player_data.get(key).username;

        let isPlaying = player_data.get(key).isPlaying;

        player_data.set(key, {mass: 1, username: username, isPlaying : isPlaying, inBattle: false, PU1 : false});

    })

    setTimeout(() => {gameResetting = false}, 15000);

}
