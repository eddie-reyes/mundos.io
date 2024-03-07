import React, { Component } from 'react';
import { Vector2 } from 'three';
import { player } from '../main';

const canvas = document.getElementById('mg');
const c = canvas.getContext('2d');

const circle = new Path2D();

const width = canvas.width/2;
const height = canvas.height/2 + 30;

const points = Array(8).fill().map((coord, index) =>{

    coord = new Vector2();

    coord.setX((Math.sin(index * Math.PI / 4) * 180) + (width));
    coord.setY((Math.cos(index * Math.PI / 4) * 180) + (height));

    return {point : coord, passed : false};

});


class TTS extends Component {
    constructor() {
        super();

        this.state = {

            mouseDown : false,
            heldCounter : 0,
            score: 0
            
        };

        this.draw = this.draw.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
        this.releaseMouse = this.releaseMouse.bind(this);

    }

    componentWillUnmount() {

        setTimeout(() => {c.clearRect(0, 0, window.innerWidth, window.innerHeight)}, 100);

    }

    componentDidMount() {


        c.beginPath();
        c.arc(width, height - 30, 180, 0, Math.PI * 2, false); //background circle
        c.strokeStyle = "rgba(255, 255, 255, 0.3)";
        c.lineWidth = 20;
        c.stroke();

        circle.arc(width, height - 30, 180, 0, Math.PI * 2, false); //testable circle
        c.strokeStyle = "rgba(255, 255, 255, 0)";
        c.lineWidth = 8;
        c.stroke(circle);

        setTimeout(() => {

            let total_passed = 0

            points.forEach((coord) => {

                if (coord.passed) {

                    total_passed++;
                    coord.passed = false;

                }

            })

            if (total_passed >= 7) {

                player.score = this.state.score;

            } else {

                player.score = 0;

            }

        }, 10000);

    }

    draw(e) {

        if (this.state.mouseDown && this.state.heldCounter < 10) {

            let mousePos = new Vector2(e.clientX - window.innerWidth/2 + width, e.clientY - window.innerHeight/2 + height);

            c.beginPath();
            c.arc(mousePos.x, mousePos.y, 10, 0, Math.PI * 2, false);
            c.fillStyle = "lightblue";
            c.fill();

            if (c.isPointInStroke(circle, mousePos.x, mousePos.y)) {

                this.setState({ score : this.state.score + 0.017 });

            }

            points.forEach((coord) => {

                if (mousePos.distanceTo(coord.point) < 50 && coord.passed == false) {

                    coord.passed = true;

                }

            })
            
        } 
        
        this.setState({ heldCounter : this.state.heldCounter + 0.008 });
    }

    releaseMouse() {

        this.setState({ mouseDown : false });

    }

    mouseDown() {

        this.setState({ mouseDown : true });

    }

    render() { 
        return (
            
            <div className='center mg_bg' onMouseDown={this.mouseDown} onMouseMove={this.draw} onMouseUp={this.releaseMouse} onMouseLeave={this.releaseMouse}></div>

        );
    }
}
 
export default TTS;