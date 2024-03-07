import React, { Component } from 'react';

import { player, attacker, socket, level } from '../main.js';

import * as Matter from 'matter-js'

const mg_canvas = document.getElementById('mg_p');
const mg_bg = document.getElementsByClassName('mg_bg');

const width = mg_canvas.width / 2;
const height = mg_canvas.height / 2;

let frameID;
let score_interval;

const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Vector = Matter.Vector,
    Body = Matter.Body,
    World = Matter.World

class IT extends Component {
    
    constructor() {
        super();

        this.state = { 
            
            score : 0,
            platforms : [],
            platformSpeed : 1,
            currentPlatform : null,
            prevKey : '',
            moveDir : 0,
            canJump : false,
            gameOver : false,
            selectedLevel : level,
            player1 : null,
            opponent : null,
            engine : null,
            render : null,
            runner : null,

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.move = this.move.bind(this);
        this.keyReleased = this.keyReleased.bind(this);

    }

    componentWillUnmount() {

        cancelAnimationFrame(frameID);
        clearInterval(score_interval);

        Composite.clear(this.state.engine.world);
        Engine.clear(this.state.engine);
        Render.stop(this.state.render);
        Runner.stop(this.state.runner);
        World.clear(this.state.engine.world);
        mg_canvas.hidden = true;

    }

    componentDidMount() {

        mg_bg[0].focus();

        frameID = window.requestAnimationFrame(this.gameLoop);

        // create an engine
        const engine = Engine.create({gravity : { x : 0, y : 0.5}});
        this.setState({ engine : engine });

        // create a renderer
        const render = Render.create({

            engine: engine,
            canvas : mg_canvas,

            options : {

                width : mg_canvas.width,
                height : mg_canvas.height,
                wireframes : false,
                background : 'transparent',
                wireframeBackground: 'transparent',

            }
            
        });
        this.setState({ render : render });

        render.context.translate(width, height);
        mg_canvas.hidden = false;

        const player1_options = {
            collisionFilter : {group : -1},
            friction : 0,
            restitution : 0,
            density : 0.1,
            inertia : Infinity,
            render : {
                sprite : {
                    texture : "../client/minigames/assets/it_spriteR.png"
                }
            }
        }

        const opponent_options = {
            collisionFilter : { group : -1, category : 2, mask : 0},
            render : {
                opacity : 0.5,
                sprite : {
                    texture : "../client/minigames/assets/it_spriteR.png"
                }

            }
        }

        const platforms = Array(50).fill().map((platform, index) => {

            platform = Bodies.rectangle(this.state.selectedLevel[index].width, (-height + 100) - 100 * index, 200, 10, {
                isStatic : true,
                id : this.state.selectedLevel[index].id,
                collisionFilter : {group : -1},
                render : { 
                    fillStyle : "white"
                }

            });

            return platform;

        })

        this.setState({ platforms : platforms})

        Composite.add(engine.world, platforms);

        const player1 = Bodies.rectangle(platforms[0].position.x, platforms[0].position.y - 25, 20, 50, player1_options);
        this.setState({ player1 : player1 });

        const opponent = Bodies.rectangle(platforms[0].position.x, platforms[0].position.y - 25, 20, 50, opponent_options);
        this.setState({ opponent : opponent });

        Composite.add(engine.world, [player1, opponent]);

        setInterval(() => {this.setState({ platformSpeed : this.state.platformSpeed + 0.3})}, 2000);
        score_interval = setInterval(() => {this.setState({ score : this.state.score + 0.004})}, 10);
        
        // run the renderer

        Render.run(render);

        const runner = Runner.create();
        this.setState({ runner : runner });

        // run the engine
        Runner.run(runner, engine); 

        Matter.Events.on(engine, "collisionStart", () => {

            this.setState({ canJump : true });

        })

        Matter.Events.on(engine, "collisionEnd", () => {

            this.setState({ canJump : false });
            
        })

        setTimeout(() => { 
 
            player.score = this.state.score;
        
        }, 25000);
    }

    gameLoop() {

        Body.setAngle(this.state.player1, 0);
        Body.setVelocity(this.state.player1, { x : 4 * this.state.moveDir, y : this.state.player1.velocity.y});

        if (this.state.canJump) {

            Body.setVelocity(this.state.player1, { x : this.state.player1.velocity.x, y : this.state.platformSpeed});

        }

        this.state.platforms.forEach((platform) => {

            Body.setPosition(platform, {x : platform.position.x, y : platform.position.y + this.state.platformSpeed});

            if (platform.position.y > this.state.player1.position.y + 25 && platform.collisionFilter.group == -1) {

                platform.collisionFilter.group = 1;

            } else if (platform.position.y < this.state.player1.position.y + 25 && platform.collisionFilter.group == 1) {

                platform.collisionFilter.group = -1;

            }

            if (platform.id == 1 || platform.id == -1) {

                Body.setPosition(platform,  { x : platform.position.x + (platform.id * 2), y : platform.position.y});

                if (platform.position.x > width - 100) {

                    platform.id = -1;
    
                } else if (platform.position.x < -width + 100) {
    
                    platform.id = 1;
    
                }

            }

        })

        if (this.state.player1.position.y < -height + 25) {

            Body.setPosition(this.state.player1, { x : this.state.player1.position.x, y : -height + 25 })
            Body.setVelocity(this.state.player1, { x : this.state.player1.velocity.x, y : 0 })

        }
        
        if (this.state.player1.position.y > height + 25 && !this.state.gameOver) {

            Composite.remove(this.state.engine.world, this.state.player1);
            this.setState({ gameOver : true });
            clearInterval(score_interval);

        }

        if (this.state.player1.position.x  > width - 10) {

            this.setState({ moveDir: -1 });

        } else if (this.state.player1.position.x < -width + 10) {

            this.setState({ moveDir: 1 });

        }

        socket.emit("IT_send", attacker.id, this.state.player1.position, this.state.moveDir);

        socket.on("IT_retrieve", (pos, dir) => {

            Body.setPosition(this.state.opponent, pos);

            if (dir == 1) {

                this.state.opponent.render.sprite.texture = "../client/minigames/assets/it_spriteR.png";

            } else if (dir == -1) {

                this.state.opponent.render.sprite.texture = "../client/minigames/assets/it_spriteL.png";

            }

        })

        frameID = window.requestAnimationFrame(this.gameLoop);
        
    }

    move(e) {

        if (e.key == "a") {

            this.setState({ moveDir: -1 });
            this.setState({ prevKey : e.key });

            this.state.player1.render.sprite.texture = "../client/minigames/assets/it_spriteL.png"

        } else if (e.key == "d") {
            
            this.setState({ moveDir: 1 });
            this.setState({ prevKey : e.key });

            this.state.player1.render.sprite.texture = "../client/minigames/assets/it_spriteR.png"

        } else if (e.key == " " && this.state.canJump) {

            Body.applyForce(this.state.player1, this.state.player1.position, {x : 0 , y : -2});
            this.setState({ canJump : false });

        }

    }

    keyReleased(e) {

        if ((e.key == 'a' || e.key == 'd') && this.state.prevKey == e.key) {

            this.setState({ moveDir: 0 });

        }

    }

    render() { 
        return (
            <div>
                <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
                <div className="center mg_bg" tabIndex="0" onKeyDown={(e) => this.move(e)} onKeyUp={(e) => this.keyReleased(e)}></div>
            </div>);
    }
}
 
export default IT;