import React, {Component} from 'react';

import { player, attacker, level, socket } from '../main.js';

import * as Matter from 'matter-js'

const mg_canvas = document.getElementById('mg_p');
const c = mg_canvas.getContext('2d');

const golfIMG = new Image(30, 30);
golfIMG.src = "../client/minigames/assets/golf_ball.png";

const width = mg_canvas.width / 2;
const height = mg_canvas.height / 2;

let frameID;
let shrink_interval;
let door_interval;

const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Vector = Matter.Vector,
    Constraint = Matter.Constraint,
    Body = Matter.Body,
    World = Matter.World

class Golf extends Component {
    constructor() {
        super();

        this.state = { 
            
            score : 11,
            golf_ball : null,
            forceDir : Vector.create(0, 0),
            distance_indicator : null,
            selectedlevel : level,
            obstacles : [],
            rotDir : 0.01,
            opponent : null,
            gameOver : false,
            engine : null,
            render : null,
            runner : null,

        };

        this.gameLoop = this.gameLoop.bind(this);
        this.hit = this.hit.bind(this);
        this.update = this.update.bind(this);
    }
    
    componentWillUnmount() {

        cancelAnimationFrame(frameID);
        clearInterval(door_interval);

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
        const engine = Engine.create({gravity : {x : 0, y : 0}});
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

            isStatic : true,
            render : { visible : false },
            id : 100

        }

        const borderLEFT = Bodies.rectangle(-width, 0, 20, height * 2, border_options);
        const borderRIGHT = Bodies.rectangle(width, 0, -20, height * 2, border_options);
        const borderUP = Bodies.rectangle(0, -height, width * 2, 20, border_options);
        const borderDOWN = Bodies.rectangle(0, height, width * 2, -20, border_options);

        // create two boxes and a ground
        const golf_ball = Bodies.circle(-width + 100, height - 100, 15, {
            frictionAir : 0.03,
            restitution : 0.5,
            render : {
                sprite : {
                    texture : "../client/minigames/assets/golf_ball.png"
                }
            }
        });
        this.setState({ golf_ball : golf_ball });

        const opponent = Bodies.circle(-width + 100, height - 100, 15, {
            collisionFilter : { group : -1, category : 2, mask : 0},
            render : {
                opacity : 0.5,
                sprite : {
                    texture : "../client/minigames/assets/golf_ball.png"
                }

            }
        });
        this.setState({ opponent : opponent });

        

        const distance_indicator = Constraint.create( {

            pointA : {x : -width + 100, y : height - 100},
            bodyB : golf_ball,
            stiffness : 0.0000001,
            render : {

                lineWidth: 15,
                type : "line",
                anchors : false,
                strokeStyle : "rgba(255, 255, 255, 0.3)"
                
            },

        });
        
        this.setState({ distance_indicator : distance_indicator });

        // add all of the bodies to the world
        Composite.add(engine.world, [distance_indicator, opponent, golf_ball, borderLEFT, borderRIGHT, borderUP, borderDOWN]);

        this.setState({ obstacles : loadLevel(this.state.selectedlevel, engine)});
        
        // run the renderer
        Render.run(render);

        const runner = Runner.create();
        this.setState({ runner : runner });

        // run the engine
        Runner.run(runner, engine); 

        door_interval = setInterval(() => {this.setState({ rotDir : -this.state.rotDir })}, 3600);

        
        Matter.Events.on(engine, "collisionStart", (e) => {

            e.pairs.forEach((collision) => {

                if (collision.bodyA.id == 4) {

                    Body.setPosition(golf_ball, { x : -width + 100, y : height - 100} );
                    Body.setVelocity(golf_ball,  { x : 0, y : 0});

                }

            });

        })

        setTimeout(() => { 

            if (this.state.gameOver) {

                player.score = this.state.score;

            } else {

                player.score = 0;

            }    
        
        }, 20000);

    }

    gameLoop() {

        this.state.golf_ball.angle = 0;

        this.state.obstacles.forEach((obstacle) => {

            obstacle.isStatic = true;
            obstacle.render.fillStyle = "white";

            if (obstacle.id == 1) {

                Body.rotate(obstacle, 0.04);
                Body.setAngularVelocity(obstacle, 0.04);

            }

            else if (obstacle.id == 2) {

                Body.rotate(obstacle, -0.04);
                Body.setAngularVelocity(obstacle, -0.04);
            
            }
            
            else if (obstacle.id == 3) {

                Body.rotate(obstacle, this.state.rotDir);
                Body.setAngularVelocity(obstacle, 0.01);

            }

            else if (obstacle.id == 5) {

                Body.rotate(obstacle, Math.abs(this.state.rotDir * 3));
                Body.setAngularVelocity(obstacle, 0.03);

            }


        })

        if (Vector.magnitude(Vector.sub(this.state.golf_ball.position, Vector.create(width - 100, height - 300))) < 10 && !this.state.gameOver) {

            this.setState({ gameOver : true })

            let size = 1;

            shrink_interval = setInterval(() =>{

                if (size <= 0) {

                    clearInterval(shrink_interval);

                } else {

                    size -= 0.01;
                    this.state.golf_ball.render.sprite.xScale = size;
                    this.state.golf_ball.render.sprite.yScale = size;
                    

                }

            }, 1);    
        }

        if (Vector.magnitude(Vector.sub(this.state.opponent.position, Vector.create(width - 100, height - 300))) < 10) {

            Composite.remove(this.state.engine.world, this.state.opponent);

        }

        socket.emit("GOLF_send", attacker.id, this.state.golf_ball.position);

        socket.on("GOLF_retrieve", (position) => {

            Body.setPosition(this.state.opponent, Vector.create(position.x, position.y))

        })

        frameID = window.requestAnimationFrame(this.gameLoop);

    }

    hit() {

        if (Vector.magnitude(this.state.forceDir) < 300 && Vector.magnitude(this.state.golf_ball.velocity) < 0.1 && !this.state.gameOver) {

            let force = Vector.mult(this.state.forceDir, 0.0001);
        
            Body.applyForce(this.state.golf_ball, this.state.golf_ball.position, force);

            this.setState({ score : this.state.score - 1 });

            this.state.distance_indicator.render.visible = false;

        } else {

            this.state.distance_indicator.render.visible = false;

        }

    }

    update(e) {
            
        let mousePos = Vector.create(e.clientX - window.innerWidth/2, e.clientY - window.innerHeight/2 + 30);

        this.setState({ forceDir : Vector.sub( this.state.golf_ball.position, mousePos) });

        if (Vector.magnitude(this.state.forceDir) < 300 && Vector.magnitude(this.state.golf_ball.velocity) < 0.1 && !this.state.gameOver) {

            this.state.distance_indicator.pointA = Vector.rotateAbout(mousePos, Math.PI, this.state.golf_ball.position);
            this.state.distance_indicator.render.visible = true;

        } else {

            this.state.distance_indicator.render.visible = false;

        }

    }

    render() { 
        return (
            <div>
                <img className="center mg_frame" src="../client/minigames/assets/golf_bg.png" alt="Golf BG" ></img>
                <img className="center mg_frame" src="../client/minigames/assets/mg_frame.png" alt="Battle Frame" ></img>
                <div className="center mg_bg" onClick={this.hit} onMouseMove={(e) => this.update(e)}></div>
            </div>);
    }
}

function loadLevel(level, engine) {

    const ob1_options = {

        isStatic : true,
        render : {
            sprite : {
                texture : "../client/minigames/assets/golf_ob1.png"
            }
        }


    }

    const hazard_options = {

        isStatic : true,
        id : 4,
        render : {
            fillStyle : "red"
        }

    }

    switch (level) {

        case 0 : 

            const spinner1 = Bodies.rectangle(100, 0, 200, 10, {id : 1});
            const spinner2 = Bodies.rectangle(100, 0, 10, 200, {id : 1});
            const spinner3 = Bodies.rectangle(-100, 0, 200, 10, {id : 2});
            const spinner4 = Bodies.rectangle(-100, 0, 10, 200, {id : 2});
            Composite.add(engine.world, [spinner1, spinner2, spinner3, spinner4]);

            return [spinner1, spinner2, spinner3, spinner4];

        case 1 : 

            const spinner5 = Bodies.rectangle(-30, 70, 200, 10, {id : 2});
            const spinner6 = Bodies.rectangle(-30, 70, 10, 200, {id : 2});
            const spinner7 = Bodies.rectangle(-170, -70, 200, 10, {id : 1});
            const spinner8 = Bodies.rectangle(-170, -70, 10, 200, {id : 1});
            const door1 = Bodies.rectangle(100, -40, 10, 120, {id : 3})
            const hazard1 = Bodies.rectangle(195, 145, 190, 90, hazard_options);
            const obstacle1 = Bodies.rectangle(100, 140, 20, 100, ob1_options);
            const obstacle2 = Bodies.rectangle(100, 70, 20, 100, ob1_options);
            const obstacle3 = Bodies.rectangle(100, -140, 20, 100, ob1_options);
            const obstacle4 = Bodies.rectangle(100, 140, 20, 100, ob1_options);
            Body.rotate(obstacle2, Math.PI);
            Body.setCentre(door1, { x : 0, y : -60 }, true);
            Body.rotate(door1, -Math.PI / 3);
            Composite.add(engine.world, [spinner5, spinner6, spinner7, spinner8, door1, hazard1, obstacle1, obstacle2, obstacle3, obstacle4]);

            return [spinner5, spinner6, spinner7, spinner8, door1];

        case 2 :

            const hazard2 = Bodies.rectangle(-140, 20, 300, 120, hazard_options);
            const hazard3 = Bodies.rectangle(-50, 155, 200, 70, hazard_options);
            const hazard4 = Bodies.rectangle(85, 75, 70, 230, hazard_options);
            const obstacle5 = Bodies.rectangle(50, 110, 20, 100, ob1_options);
            const door2 = Bodies.rectangle(-80, 60, 10, 120, {id : 3})
            const spinner9 = Bodies.rectangle(25, -115, 10, 150, {id : 1});
            Body.rotate(obstacle5, Math.PI / 5);
            Body.setCentre(door2, { x : 0, y : -60 }, true);
            Body.rotate(door2, -Math.PI / 3);
            
            Composite.add(engine.world, [hazard2, hazard3, hazard4, obstacle5, door2, spinner9]);

            return [door2, spinner9];

        case 3 :

            const obstacle6 = Bodies.rectangle(-100, 140, 20, 100, ob1_options);
            const obstacle7 = Bodies.rectangle(-100, 70, 20, 100, ob1_options);
            const obstacle8 = Bodies.rectangle(-100, 0, 20, 100, ob1_options);
            const obstacle9 = Bodies.rectangle(100, -140, 20, 100, ob1_options);
            const obstacle10 = Bodies.rectangle(100, -70, 20, 100, ob1_options);
            const obstacle11 = Bodies.rectangle(100, 0, 20, 100, ob1_options);
            const door3 = Bodies.rectangle(-100, 20, 10, 100, {id : 5})
            const hazard5 = Bodies.rectangle(-100, -165, 70, 50, hazard_options);
            const spinner10 = Bodies.rectangle(100, 120, 10, 140, {id : 1});
            const spinner11 = Bodies.rectangle(100, 120, 10, 140, {id : 2});
            Body.setCentre(door3, { x : 0, y : -50 }, true);

            Composite.add(engine.world, [door3, obstacle6, obstacle7, obstacle8, obstacle9, obstacle10, obstacle11, hazard5, spinner10, spinner11]);

            return [door3, spinner10, spinner11];

        case 4: 

            const hazard6 = Bodies.rectangle(253, 0, 75, 180, hazard_options);
            const hazard7 = Bodies.rectangle(145, 0, 75, 180, hazard_options);
            const spinner12 = Bodies.rectangle(-180, -100, 180, 10, {id : 1});
            const spinner13 = Bodies.rectangle(-180, -100, 10, 180, {id : 1});
            const obstacle12 = Bodies.rectangle(-240, 0, 20, 100, ob1_options);
            const obstacle13 = Bodies.rectangle(-170, 0, 20, 100, ob1_options);
            const obstacle14 = Bodies.rectangle(-100, 0, 20, 100, ob1_options);
            const obstacle15 = Bodies.rectangle(-30, 0, 20, 100, ob1_options);
            const obstacle16 = Bodies.rectangle(65, -100, 20, 100, ob1_options);
            const obstacle17 = Bodies.rectangle(-5, -100, 20, 100, ob1_options);
            const obstacle18 = Bodies.rectangle(-75, -100, 20, 100, ob1_options);
            const obstacle19 = Bodies.rectangle(-145, -100, 20, 100, ob1_options);
            Body.rotate(obstacle12, Math.PI / 2);
            Body.rotate(obstacle13, -Math.PI / 2);
            Body.rotate(obstacle14, Math.PI / 2);
            Body.rotate(obstacle15, -Math.PI / 2);
            Body.rotate(obstacle16, Math.PI / 2);
            Body.rotate(obstacle17, -Math.PI / 2);
            Body.rotate(obstacle18, Math.PI / 2);
            Body.rotate(obstacle19, -Math.PI / 2);


            Composite.add(engine.world, [spinner12, spinner13, hazard6, hazard7, obstacle12, obstacle13, obstacle14, obstacle15, obstacle16, obstacle17, obstacle18, obstacle19]);

            return [spinner12, spinner13]

    }


}

 
export default Golf;