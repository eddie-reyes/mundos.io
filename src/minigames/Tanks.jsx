import React, { Component } from 'react';
import { player, level, socket, attacker } from '/main.js';

import * as Matter from 'matter-js'

const mg_canvas = document.getElementById('mg_p');
const mg_bg = document.getElementsByClassName('mg_bg');

const width = mg_canvas.width / 2;
const height = mg_canvas.height / 2;

let frameID;

const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Vector = Matter.Vector,
    Body = Matter.Body,
    World = Matter.World

class Tanks extends Component {
    constructor() {
        super();

        this.state = { 
            
            score : 5,
            selectedLevel : level,
            engine : null,
            render : null,
            runner : null,
            tank : null,
            tank2 : null,
            shootDir : null,
            canShoot : true,

        };

       this.gameLoop = this.gameLoop.bind(this);
       this.update = this.update.bind(this);
       this.move = this.move.bind(this);
       this.shoot = this.shoot.bind(this);

    }

    componentWillUnmount() {

        cancelAnimationFrame(frameID);

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
        const engine = Engine.create({gravity : { x : 0, y : 0}});
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

        const border_options = {

            id : 100,
            collisionFilter : { group : 2 },
            isStatic : true,
            render : { visible : false },

        }

        const borderLEFT = Bodies.rectangle(-width, 0, 20, height * 2, border_options);
        const borderRIGHT = Bodies.rectangle(width, 0, -20, height * 2, border_options);
        const borderUP = Bodies.rectangle(0, -height, width * 2, 20, border_options);
        const borderDOWN = Bodies.rectangle(0, height, width * 2, -20, border_options);

        Composite.add(engine.world, [borderLEFT, borderRIGHT, borderUP, borderDOWN]);

        const tank_base = Bodies.rectangle(-width + 50, 0, 40, 40, {
            collisionFilter : {group : -1},
            id : 1,
            density : 1,
            render: {
                sprite : {
                    texture : "../client/minigames/assets/tank_b.png"
                }
            }
        });


        const tank_gun = Bodies.rectangle(-width + 50, 0, 20, 20, {
            collisionFilter : { group : -1},
            render: {
                sprite : {
                    texture : "../client/minigames/assets/tank_t.png"
                }
            }
        });

        const tank_base2 = Bodies.rectangle(width - 50, 0, 40, 40, {
            collisionFilter : {group : -1},
            id : 2,
            render: {
                sprite : {
                    texture : "../client/minigames/assets/tank2_b.png"
                }
            }
        });


        const tank_gun2 = Bodies.rectangle(width - 50, 0, 20, 20, {
            collisionFilter : { group : -1},
            render: {
                sprite : {
                    texture : "../client/minigames/assets/tank2_t.png"
                }
            }
        });

        const tank = Composite.create();

        Composite.add(tank, [tank_base, tank_gun]);
        this.setState({ tank : tank })

        const tank2 = Composite.create();

        Composite.add(tank2, [tank_base2, tank_gun2]);
        this.setState({ tank2 : tank2 })

        Composite.add(engine.world, [tank, tank2]);

        loadLevel(this.state.selectedLevel, engine);


        // run the renderer
        Render.run(render);

        const runner = Runner.create();
        this.setState({ runner : runner });

        // run the engine
        Runner.run(runner, engine);    

        socket.on("TANKS_shoot_retrieve", (dir, pos) => {

            let adjustedDir = Vector.create(-dir.x, dir.y)

            const bullet = Bodies.circle(-pos.x, pos.y, 10, {

                id : 3,
                frictionAir : 0,
                inertia : Infinity,
                friction : 0,
                restitution : 1,
    
            });

            Body.setVelocity(bullet, Vector.mult(adjustedDir, 4));

            Composite.add(engine.world, [bullet]);

            setTimeout(() => {Composite.remove(engine.world, bullet)}, 4000);

        })

        Matter.Events.on(engine, "collisionStart", (e) => {

            e.pairs.forEach((collision) => {

                if (collision.bodyA.id == 1 && collision.bodyB.id == 3) {


                    this.setState({ score : this.state.score - 1 });
                    Body.setPosition(tank.bodies[0], Vector.create(-width + 50, 0))
                    Composite.remove(engine.world, collision.bodyB)
                    tank.bodies[0].id = 4;
                    setTimeout(() => {tank.bodies[0].id = 1}, 3000);

                } else if (collision.bodyA.id == 2 && collision.bodyB.id == 3) {

                    this.setState({ score : this.state.score + 1 });
                    Body.setPosition(tank2.bodies[0], Vector.create(width - 50, 0));
                    Composite.remove(engine.world, collision.bodyB)
                    tank2.bodies[0].id = 4;
                    setTimeout(() => {tank2.bodies[0].id = 2}, 3000);

                }

            });

        })

        setTimeout(() => { 

            player.score = this.state.score;

        }, 30000);
    }

    gameLoop() {

        Body.setPosition(this.state.tank.bodies[1], this.state.tank.bodies[0].position);

        socket.emit("TANKS_send", attacker.id, this.state.tank.bodies[0].position, this.state.tank.bodies[1].angle, this.state.tank.bodies[0].angle);

        socket.on("TANKS_retrieve", (position, angle, dir) => {

            Body.setPosition(this.state.tank2.bodies[0], Vector.create(-position.x, position.y));
            Body.setPosition(this.state.tank2.bodies[1], Vector.create(-position.x, position.y));
            Body.setAngle(this.state.tank2.bodies[1], -angle + Math.PI);
            Body.setAngle(this.state.tank2.bodies[0], dir);

        })

        frameID = window.requestAnimationFrame(this.gameLoop);

    }
    
    update(e) {

        let mousePos = Vector.create(e.clientX - window.innerWidth/2, e.clientY - window.innerHeight/2 + 30);

        Body.setAngle(this.state.tank.bodies[1], Vector.angle(this.state.tank.bodies[1].position, mousePos));

        this.setState({ shootDir : Vector.normalise(Vector.sub(mousePos, this.state.tank.bodies[1].position)) });

    }

    move(e) { 

        if (e.key == 'd' || e.key == 'ArrowRight') {

            Composite.translate(this.state.tank, Vector.create(3, 0));
            Body.setAngle(this.state.tank.bodies[0], 0);

        } else if (e.key == 'a' || e.key == 'ArrowLeft') {

            Composite.translate(this.state.tank, Vector.create(-3, 0));
            Body.setAngle(this.state.tank.bodies[0], Math.PI);

        } else if (e.key == 's' || e.key == 'ArrowDown') {

            Composite.translate(this.state.tank, Vector.create(0, 3));
            Body.setAngle(this.state.tank.bodies[0], Math.PI / 2);

        } else if (e.key == 'w' || e.key == 'ArrowUp') {

            Composite.translate(this.state.tank, Vector.create(0, -3));
            Body.setAngle(this.state.tank.bodies[0], -Math.PI / 2);
            
        } else if (e.key == ' ') {

            this.shoot();

        }

    }

    shoot() {

        if (this.state.canShoot) {

            let adjustedPos = Vector.add(this.state.tank.bodies[0].position, Vector.mult(this.state.shootDir, 40));

            const bullet = Bodies.circle(adjustedPos.x, adjustedPos.y, 10, {

                id : 3,
                frictionAir : 0,
                inertia : Infinity,
                friction : 0,
                restitution : 1,
    
            });

            Body.setVelocity(bullet, Vector.mult(this.state.shootDir, 4));

            Composite.add(this.state.engine.world, [bullet]);

            this.setState({ canShoot : false })

            setTimeout(() => {this.setState({ canShoot : true})}, 1000);

            setTimeout(() => {Composite.remove(this.state.engine.world, bullet)}, 4000);

            socket.emit("TANKS_shoot_send", attacker.id, this.state.shootDir, adjustedPos);

        } 

    }

    render() { 
        return (

        <div>
            <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
            <div className="center mg_bg" tabIndex="0" onMouseMove={(e) => this.update(e)} onKeyDown={(e) => this.move(e)} onMouseDown={this.shoot}></div>
        </div>);

    }
}

function loadLevel(level, engine) {

    const BG1_options = {
        id : 100,
        isStatic : true,
        render : {
            sprite : {
                texture : "../client/minigames/assets/tanks_ob1.png"
            }
        }
    }

    const BG2_options = {
        id: 100,
        isStatic : true,
        render : {
            sprite : {
                texture : "../client/minigames/assets/tanks_ob2.png"
            }
        }
    }

    const BG3_options = {
        id : 100,
        isStatic : true,
        render : {
            sprite : {
                texture : "../client/minigames/assets/tanks_ob3.png"
            }
        }
    }

    switch (level) {

        case 0 : 

            const big_square = Bodies.rectangle(0, 0, 200, 200, BG1_options);

            Composite.add(engine.world, [big_square]);
            break;

        case 1 : 

            const small_square1 = Bodies.rectangle(-130, 0, 120, 120, BG3_options);
            const small_square2 = Bodies.rectangle(130, 0, 120, 120, BG3_options);

            Composite.add(engine.world, [small_square1, small_square2]);
            break;

        case 2 : 

            const medium_square1 = Bodies.rectangle(-150, -60, 40, 120, BG2_options);
            const medium_square2 = Bodies.rectangle(-150, 60, 40, 120, BG2_options);
            const medium_square3 = Bodies.rectangle(0, -130, 40, 120, BG2_options);
            const medium_square4 = Bodies.rectangle(0, 130, 40, 120, BG2_options);
            const medium_square5 = Bodies.rectangle(150, -60, 40, 120, BG2_options);
            const medium_square6= Bodies.rectangle(150, 60, 40, 120, BG2_options);

            Composite.add(engine.world, [medium_square1, medium_square2, medium_square3, medium_square4, medium_square5, medium_square6]);
            break;

        case 3 : 

            const small_square3 = Bodies.rectangle(0, 0, 120, 120, BG3_options);
            const medium_square7 = Bodies.rectangle(-80, -160, 40, 120, BG2_options);
            const medium_square8 = Bodies.rectangle(80, -160, 40, 120, BG2_options);
            const medium_square9 = Bodies.rectangle(-80, 160, 40, 120, BG2_options);
            const medium_square10 = Bodies.rectangle(80, 160, 40, 120, BG2_options);
            Body.rotate(small_square3, Math.PI / 4);
            Body.rotate(medium_square7, Math.PI / 4);
            Body.rotate(medium_square8, -Math.PI / 4);
            Body.rotate(medium_square9, -Math.PI / 4);
            Body.rotate(medium_square10, Math.PI / 4);

            Composite.add(engine.world, [small_square3, medium_square7, medium_square8, medium_square9, medium_square10]);
            break;

        case 4 : 

            const small_square4 = Bodies.rectangle(-130, 0, 120, 120, BG3_options);
            const small_square5 = Bodies.rectangle(130, 0, 120, 120, BG3_options);
            const medium_square11 = Bodies.rectangle(0, 180, 40, 120, BG2_options);
            const medium_square12 = Bodies.rectangle(0, -180, 40, 120, BG2_options);
            Body.rotate(small_square4, Math.PI / 4);
            Body.rotate(small_square5, Math.PI / 4);

            Composite.add(engine.world, [small_square4, small_square5, medium_square11, medium_square12]);
            break;

    }

}

 
export default Tanks;