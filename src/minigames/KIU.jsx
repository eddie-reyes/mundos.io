import React, { Component } from 'react';
import { Vector2 } from 'three';
import { randInt } from 'three/src/math/mathutils';
import { player } from '../main.js';

const canvas = document.getElementById('mg');
const c = canvas.getContext('2d');

const width = canvas.width/2;
const height = canvas.height/2 + 30;

const playerIMG = new Image(40, 40);
playerIMG.src = "../client/minigames/assets/player.png";

let frameID;
let score_interval;

class KIU extends Component {
    constructor() {
        super();

        this.state = {

            playerPos : width - 25,
            playerDir : 0,
            ballPos : new Vector2(width, height - 50),
            ballDir : new Vector2(randInt(0, 1) ? 1 : -1, 1),
            ballSpeed : 2,
            rotDir : 0,
            rotation : 0,
            obstaclePos : randInt(width - 100, width),
            obstacleDir : randInt(0, 1) ? 1 : -1,
            canPlay : false,
            gameOver : false,
            score : 0

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.draw = this.draw.bind(this);
        this.update = this.update.bind(this);
        this.checkCollision = this.checkCollision.bind(this);
    }

    componentWillUnmount() {

        cancelAnimationFrame(frameID);
        c.clearRect(0, 0, window.innerWidth, window.innerHeight);

    }

    componentDidMount() { 

        frameID = window.requestAnimationFrame(this.gameLoop);

        this.setState({ rotDir : this.state.ballDir.x / 50 })

        setTimeout(() => { this.setState({ canPlay : true })}, 1000);

        setTimeout(() => { 

            player.score = this.state.score;
        
        }, 20000);

        score_interval = setInterval(() => {

            this.setState({ score : this.state.score + 0.5 });

        }, 1000)

    }

    gameLoop() {

        this.update(); 

        this.checkCollision();
        
        this.draw();

        frameID = window.requestAnimationFrame(this.gameLoop);

    }

    draw() {

        c.clearRect(0, 0, window.innerWidth, window.innerHeight);

        c.fillStyle = `hsl(${this.state.playerPos},100%,50%)`;
        c.fillRect(this.state.playerPos, height + 140, 50, 10);

        if (!this.state.gameOver) {

            c.setTransform(1, 0, 0, 1, this.state.ballPos.x, this.state.ballPos.y);
            c.rotate(this.state.rotation * Math.PI / 2);
            c.drawImage(playerIMG, -20, -20, 40, 40);
            c.setTransform(1, 0, 0, 1, 0, 0);

        }

        c.fillStyle = "white";
        c.fillRect(this.state.obstaclePos, height - 100, 200, 10);

    }
    
    update() {


        if (this.state.canPlay) {

            this.setState({ ballPos : new Vector2(this.state.ballPos.x + (this.state.ballDir.x * this.state.ballSpeed), this.state.ballPos.y + (this.state.ballDir.y * this.state.ballSpeed)), rotation : this.state.rotation + this.state.rotDir});

        }

        if (this.state.ballPos.y > height + 150) {

            this.setState({ gameOver : true });
            clearInterval(score_interval);

        }

        this.setState({ obstaclePos : this.state.obstaclePos + (this.state.obstacleDir * 2)});

        if (this.state.obstaclePos >= width + 90) {

            this.setState({ obstacleDir : -1 });

        } else if (this.state.obstaclePos <= width - 290) {

            this.setState({ obstacleDir : 1 });

        }


    }

    checkCollision() {

        if (this.state.ballPos.y >= height + 120.5 && !this.state.gameOver) {

            if (this.state.ballPos.x > this.state.playerPos + 30 && this.state.ballPos.x < this.state.playerPos + 70) {

                this.setState({ ballDir : new Vector2(1, -1), rotDir : 0.05});

            } else if (this.state.ballPos.x > this.state.playerPos - 20 && this.state.ballPos.x < this.state.playerPos + 20) {

                this.setState({ ballDir : new Vector2(-1, -1), rotDir : -0.05});

            } else if (this.state.ballPos.x > this.state.playerPos + 20 && this.state.ballPos.x < this.state.playerPos + 30) {

                this.setState({ ballDir : new Vector2(this.state.ballDir.x, -1)});

            }

            this.setState({ ballSpeed : this.state.ballSpeed + 0.5});

            } else if (this.state.ballPos.y <= height - 200) {

                this.setState({ ballDir : new Vector2(this.state.ballDir.x, 1)});

            } else if (this.state.ballPos.x <= width - 270) {

                this.setState({ ballDir : new Vector2(1, this.state.ballDir.y), rotDir : 0.05});

            } else if (this.state.ballPos.x >= width + 270) {

                this.setState({ ballDir : new Vector2(-1, this.state.ballDir.y), rotDir : -0.05});

        }

        if (this.state.ballPos.y <= height - 70 && this.state.ballPos.y >= height - 85 && this.state.ballPos.x > this.state.obstaclePos && this.state.ballPos.x < this.state.obstaclePos + 200) {

            this.setState({ ballDir : new Vector2(this.state.ballDir.x, 1)});

        } else if (this.state.ballPos.y <= height - 105 && this.state.ballPos.y >= height - 120 && this.state.ballPos.x > this.state.obstaclePos && this.state.ballPos.x < this.state.obstaclePos + 200) {

            this.setState({ ballDir : new Vector2(this.state.ballDir.x, -1)});

        }

    }

    move(e) {

        let adjustedPos = e.clientX - window.innerWidth/2 + width - 25;

        if (adjustedPos > 0 && adjustedPos < 550 ) {

            this.setState({ playerPos : adjustedPos });

        }

    }

    render() { 
        return (
        
        <div>
            <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
            <div className="center mg_bg" onMouseMove={(e) => this.move(e)}></div>
        </div>);
    }
}
 
export default KIU;