import React, {Component} from 'react';

import { player, level } from '../main.js';

import * as Matter from 'matter-js'
import { randInt } from 'three/src/math/mathutils.js';

const mg_canvas = document.getElementById('mg_p');

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

class Swish extends Component {
    
    constructor() {
        super();

        this.state = { 
            
            score : 0,
            paddle : null,
            balls : [],
            engine : null,
            render : null,
            runner : null,
            selectedLevel : level

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.update = this.update.bind(this);
        this.bounce = this.bounce.bind(this);
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

        const bucket_options = {

            isStatic : true,
            collisionFilter : { group : 1 },
            render : {
                
                fillStyle : "lightblue"

            }

        }

        const bucket1 = Bodies.rectangle(0, -height + 150, 50, 10, bucket_options);
        const bucket2 = Bodies.rectangle(-34, -height + 130, 50, 10, bucket_options);
        const bucket3 = Bodies.rectangle(34, -height + 130, 50, 10, bucket_options);

        Body.rotate(bucket2, Math.PI / 3);
        Body.rotate(bucket3, -Math.PI / 3);

        const paddle = Bodies.rectangle(0, height - 50, 100, 10, {
            isStatic : true,
            id : 1,
            collisionFilter : { mask : 1 },
            render: {
                sprite : {
                    texture : "../client/minigames/assets/swish_t.png"
                }
            }
        
        });

        this.setState({ paddle : paddle });
        
        const balls = Array(10).fill().map((ball, index) => {

            ball = Bodies.circle(this.state.selectedLevel[index], -height * 5 * (index + 1), 20, {

                restitution: 1,
                id : 2, 
                collisionFilter : {group : -1, mask : 1}
            
            });

            return ball;

        })

        this.setState({ balls : balls });

        Composite.add(engine.world, [paddle, bucket1, bucket2, bucket3]);
        Composite.add(engine.world, balls);

        // run the renderer

        Render.run(render);

        const runner = Runner.create();
        this.setState({ runner : runner });

        // run the engine
        Runner.run(runner, engine); 

        Matter.Events.on(engine, "collisionStart", (e) => {

            e.pairs.forEach((collision) => {

                if (collision.bodyA.id == 1) {

                    this.bounce(collision.bodyB, collision.collision.normal);

                }

            });

        })

        setTimeout(() => { 
 
            player.score = this.state.score;
        
        }, 20000);
    }

    gameLoop() {

        this.state.balls.forEach((ball) => {

            if (Vector.magnitude(Vector.sub(ball.position, Vector.create(0, -height + 120))) < 10 && ball.id == 2) {

                ball.id = 3;
                ball.restitution = 0;
                Body.setAngularVelocity(ball, 0);
                Body.setVelocity(ball, {x : 0, y : 0});
                setTimeout(() => {Body.setStatic(ball, true)}, 500);

                this.setState({ score : this.state.score + 1 });

            }

        })


        frameID = window.requestAnimationFrame(this.gameLoop);

    }

    update(e) {

        let mousePos = Vector.create(e.clientX - window.innerWidth/2, height - 50);
        
        if (Math.abs(mousePos.x) < width - 50) {

            Body.setPosition(this.state.paddle, mousePos);

            Body.setAngle(this.state.paddle, mousePos.x * -0.0015);

        }

    }

    bounce(body, normal) {

        normal = Vector.mult(normal, 12);

        Body.setVelocity(body, normal);

    }

    render() { 
        return (
            <div>
                <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
                <div className="center mg_bg" onMouseMove={(e) => this.update(e)}></div>
            </div>);
    }
}
 
export default Swish;