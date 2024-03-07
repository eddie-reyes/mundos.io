import React, { Component } from 'react';
import { attacker, player } from '/main.js';

const maxScore = 10;

class GTM extends Component {
    constructor() {
        super();

        this.state = {   
            
            opponentName : attacker.username,
            opponentMass : attacker.mass,
    
        };

        this.input = React.createRef();

        this.checkSize = this.checkSize.bind(this);
    }

    componentDidMount() {

        setTimeout(() => {

            let guessDiff = Math.abs(attacker.mass - (this.input.current.value == null ? 0 : this.input.current.value));

            player.score = (guessDiff > maxScore) ? 0 : maxScore - guessDiff;

            player.score = (this.input.current.value == '') ? 0 : player.score;

        }, 10000);

    }

    checkSize() {

        if (this.input.current.value >= 500) {

            this.input.current.value = 499;
        }

    }

    render() { 

        const {opponentName} = this.state;

        return (      

        <div>
            <p className='center battle_top '>What is the mass of <span className='battle_s'>{opponentName}</span>?</p>
            <input className="center battle_bottom_middle" type="number" min= "1" max="299" placeholder='Ans.' ref={this.input} onChange={this.checkSize}></input>
        </div>);
    }
}
 
export default GTM;