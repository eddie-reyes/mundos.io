import React, { Component } from 'react';
import { Vector2 } from 'three';
import { randInt } from 'three/src/math/mathutils';
import { player, attacker, socket, level } from '../main';

const canvas = document.getElementById('mg');
const c = canvas.getContext('2d');
const mg_bg = document.getElementsByClassName('mg_bg');

const width = canvas.width/2;
const height = canvas.height/2 + 30;

const playerIMG = new Image(40, 40);
playerIMG.src = "../client/minigames/assets/player.png";

let pipes;
let frameID;

class FB extends Component {
    constructor() {
        super();

        this.state = {

            playerHeight : height - 50,
            velocity : 0,
            acceleration : 0.3,
            rotation : 0,
            rotationSpeed : 0.01,
            pipeSpeed : 2.5,
            opponentHeight : height - 50,
            canPlay : false,
            gameOver : false,
            showOpponent : true,
            score: 0,
            selectedLevel : level  

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.draw = this.draw.bind(this);
        this.update = this.update.bind(this);
        this.fly = this.fly.bind(this);
        this.keyPressed = this.keyPressed.bind(this);

    }

    componentWillUnmount() {

        cancelAnimationFrame(frameID);
        c.clearRect(0, 0, window.innerWidth, window.innerHeight);

    }

    componentDidMount() { 

        mg_bg[0].focus();

        frameID = window.requestAnimationFrame(this.gameLoop);

        generatePipes(this.state.selectedLevel);

        setTimeout(() => { this.setState({ canPlay : true })}, 1000);

        setTimeout(() => { 

            player.score = this.state.score;
        
        }, 15000);

    }

    gameLoop() {
            
        this.update(); 
        
        this.draw();

        frameID = window.requestAnimationFrame(this.gameLoop);

        socket.emit("FB_send", attacker.id, this.state.playerHeight);

        socket.on("FB_retrieve", (value) => {

            this.setState({ opponentHeight : value });

        })
        
    }

    update() {

        this.setState({ playerHeight : this.state.playerHeight + this.state.velocity});
        this.setState({ velocity : this.state.velocity + this.state.acceleration});

        if (this.state.playerHeight > height + 140) {

            this.setState({ gameOver : true });

        } else if (this.state.playerHeight < height - 220) {

            this.setState({ velocity : 0 });
            this.setState({ playerHeight : height - 220 })

        }

        if (!this.state.canPlay) {

            this.setState({ velocity : 0 });
            
        }

        pipes.forEach((pipe) => {

            pipe.position.setX(pipe.position.x - this.state.pipeSpeed);

            if ((pipe.position.x < -175 && pipe.position.x > -225) && (this.state.playerHeight < height - 220 + (280 - pipe.height) || this.state.playerHeight > height + 160 - pipe.height)) {

                this.setState({ gameOver : true });

            }
            
        })
        
    }

    draw() {


        c.clearRect(0, 0, window.innerWidth, window.innerHeight);

        if (!this.state.gameOver) {

            c.setTransform(1, 0, 0, 1, width - 200, this.state.playerHeight);

            if (this.state.canPlay) {

               c.rotate(this.state.rotation * Math.PI);
               this.setState({ rotation : this.state.rotation + this.state.rotationSpeed }) 
               
            }
            
            c.drawImage(playerIMG, -20, -20, 40, 40);

        }  
        
        if (this.state.opponentHeight < height + 140 && this.state.showOpponent) {

            c.save();
            c.setTransform(1, 0, 0, 1, width - 200, this.state.opponentHeight);
            c.globalAlpha = 0.5;
            c.drawImage(playerIMG, -20, -20, 40, 40);
            c.restore();

        } else {

            this.setState({ showOpponent : false });

        }

        c.setTransform(1, 0, 0, 1, 0, 0);

        pipes.forEach((pipe) => {

            if (pipe.position.x < 250 && pipe.position.x > - 300) {

                let bottom = pipe.position.y + 160
                let top = pipe.position.y - 220

                c.fillStyle = `hsl(${pipe.position.x},100%,50%)`;

                c.fillRect(width + pipe.position.x, bottom, 50, pipe.height);
                c.fillRect(width + pipe.position.x, top + pipe.height, 50, 280 - pipe.height);

                if (pipe.position.x == -225 && !this.state.gameOver) {

                    this.setState({ score : this.state.score + 1});

                }

            }

        })

    }

    fly() {

        if (this.state.canPlay) {


            this.setState({ velocity : this.state.velocity - 8 });
            this.setState({ rotationSpeed : randInt(-3, 3) * 0.01  })

        }

    }

    keyPressed(e) {

        if (e.keyCode == 32) {

            this.fly();

        }

    }

    render() { 
        return (
            <div>
                <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame"></img>
                <div className="center mg_bg" tabIndex="0" onClick={this.fly} onKeyDown={(e) => this.keyPressed(e)}></div>
            </div>
        );
    }
}

function generatePipes(level) {

    pipes = Array(10).fill().map((pipe, index) =>{

        pipe = {position : new Vector2(), height : level[index] };
    
        pipe.position.setX(200 + index * 200);
        pipe.position.setY(height - pipe.height);
    
        return pipe;
    
    });

}

 
export default FB;