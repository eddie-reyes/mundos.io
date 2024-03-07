import React, { Component } from 'react';

import { player, level, socket, attacker } from '../main.js';

import * as Matter from 'matter-js'
import { randFloat, randInt } from 'three/src/math/mathutils.js';

const mg_canvas = document.getElementById('mg_p');

const width = mg_canvas.width / 2;
const height = mg_canvas.height / 2;

let frameID;
let crate_interval;

const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Vector = Matter.Vector,
    Body = Matter.Body,
    World = Matter.World

class Ricochet extends Component {
    
    constructor() {
        super();

        this.state = { 

            player1 : null,
            opponent : null,
            shootDir : null,
            canShoot : true,
            selectedLevel : level,
            crates : [],
            engine : null,
            render : null,
            runner : null,

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.update = this.update.bind(this);
        this.shoot = this.shoot.bind(this);

    }

    componentWillUnmount() {

        cancelAnimationFrame(frameID);
        clearInterval(crate_interval);

        Composite.clear(this.state.engine.world);
        Engine.clear(this.state.engine);
        Render.stop(this.state.render);
        Runner.stop(this.state.runner);
        World.clear(this.state.engine.world);
        mg_canvas.hidden = true;

    }

    componentDidMount() {

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
        
        // run the renderer

        const player1_options = {
            isStatic : true,
            collisionFilter : { group : -1, category : 2, mask : 0},
            render : {
                sprite : {
                    texture : "../client/minigames/assets/tank_t.png",
                    xScale : 1.5,
                    yScale : 1.5
                }
            }
        }

        const opponent_options = {
            isStatic : true,
            collisionFilter : { group : -1, category : 2, mask : 0},
            render : {
                sprite : {
                    texture : "../client/minigames/assets/tank2_t.png",
                    xScale : 1.5,
                    yScale : 1.5
                }
            }
        }

        const crate_options = {
            density : 0.0005,
            render : {
                sprite : {
                    texture : "../client/minigames/assets/crate.png",

                }
            }

        }

        const platform1_options = {
            isStatic : true,
            render : {
                fillStyle : "green"
            }
            

        }

        const platform2_options = {
            isStatic : true,
            render : {
                fillStyle : "red"
            }
            

        }

        const player1 = Bodies.rectangle(-width + 27, -50, 40, 40, player1_options);
        this.setState({ player1 : player1 });

        const opponent = Bodies.rectangle(width - 27, -50, 40, 40, opponent_options);
        this.setState({ opponent : opponent });

        const player1_platform1 = Bodies.rectangle(width - 85, height - 20, 150, 20, platform1_options);
        const player1_platform2 = Bodies.rectangle(width - 20, height - 85, 20, 150, platform1_options);
        const opponent_platform1 = Bodies.rectangle(-width + 85, height - 20, 150, 20, platform2_options);
        const opponent_platform2 = Bodies.rectangle(-width + 20, height - 85, 20, 150, platform2_options);

        Composite.add(engine.world, [player1, opponent, player1_platform1, player1_platform2, opponent_platform1, opponent_platform2]);

        let index = 0;

        crate_interval = setInterval(() => {

            const crate1 = Bodies.rectangle(this.state.selectedLevel[index].width, height + 50, 40, 40, crate_options);
            Body.applyForce(crate1, crate1.position, Vector.create(0, -this.state.selectedLevel[index].speed));
            this.state.crates.push(crate1)

            const crate2 = Bodies.rectangle(-this.state.selectedLevel[index].width, height + 50, 40, 40, crate_options);
            Body.applyForce(crate2, crate2.position, Vector.create(0, -this.state.selectedLevel[index].speed));
            this.state.crates.push(crate2)

            Composite.add(engine.world, [crate1, crate2]);

            index++;

        }, 2000);

        Render.run(render);

        const runner = Runner.create();
        this.setState({ runner : runner });

        // run the engine
        Runner.run(runner, engine); 

        socket.on("RICOCHET_shoot_retrieve", (dir) => {

            let opponentDir = Vector.create(-dir.x, dir.y)
            let adjustedPos = Vector.add(this.state.opponent.position, Vector.mult(opponentDir, 60));

            const bullet = Bodies.circle(adjustedPos.x, adjustedPos.y, 10, {

                frictionAir : 0,
                inertia : Infinity,
                restitution : 1
    
            });

            Body.setVelocity(bullet, Vector.mult(opponentDir, 15));

            Composite.add(engine.world, [bullet]);

            setTimeout(() => {Composite.remove(this.state.engine.world, bullet)}, 1000);

        })

        
        setTimeout(() => { 

            let score = 0;

            this.state.crates.forEach((crate) => {

                if (crate.position.x > width - 150 && crate.position.y < height) {

                    score++;

                }

            })
 
            player.score = score;
        
        }, 20000);
    }

    gameLoop() {

        socket.emit("RICOCHET_send", attacker.id, this.state.player1.angle);

        socket.on("RICOCHET_retrieve", (angle) => {

            Body.setAngle(this.state.opponent, -angle + Math.PI);


        })

        frameID = window.requestAnimationFrame(this.gameLoop);

    }

    update(e) {

        let mousePos = Vector.create(e.clientX - window.innerWidth/2, e.clientY - window.innerHeight/2 + 30);

        if (Math.abs(Vector.angle(this.state.player1.position, mousePos)) < Math.PI / 4) {

            Body.setAngle(this.state.player1, Vector.angle(this.state.player1.position, mousePos));

            this.setState({ shootDir : Vector.normalise(Vector.sub(mousePos, this.state.player1.position)) });

        }
    }

    shoot() {

        if (this.state.canShoot) {

            let adjustedPos = Vector.add(this.state.player1.position, Vector.mult(this.state.shootDir, 60));

            const bullet = Bodies.circle(adjustedPos.x, adjustedPos.y, 10, {

                frictionAir : 0,
                inertia : Infinity,
                restitution : 1,
    
            });

            Body.setVelocity(bullet, Vector.mult(this.state.shootDir, 15));

            Composite.add(this.state.engine.world, [bullet]);

            this.setState({ canShoot : false })

            setTimeout(() => {this.setState({ canShoot : true})}, 1000);

            setTimeout(() => {Composite.remove(this.state.engine.world, bullet)}, 1000);

            socket.emit("RICOCHET_shoot_send", attacker.id, this.state.shootDir);

        } 

    }

    render() { 
        return (
            <div>
                <img className="center mg_frame" src="../client/minigames/assets/ricochet_bg.png" alt="Ricochet BG" ></img>
                <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
                <div className="center mg_bg" onMouseMove={(e) => this.update(e)} onMouseDown={this.shoot}></div>
            </div>);
    }
}
 
export default Ricochet;