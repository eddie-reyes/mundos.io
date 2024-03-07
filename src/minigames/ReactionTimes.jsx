import React, { Component } from 'react';
import { player, level } from '/main.js';

const maxScore = 10;
let counter_interval;
let wait_interval;
let counter;

class RT extends Component {
    constructor() {
        super();

        this.buttonIMG = React.createRef();
        this.button = React.createRef();

        this.state = {


            waitText : "Wait",
            waitColor : { color : "white" },
            msCounter : 0,
            hasClicked : false,
            selectedLevel : level
    
        };

        this.onClick = this.onClick.bind(this);

    }

    componentDidMount() {

        wait_interval = setInterval(() => {

            this.setState({waitText : this.state.waitText + '.'});

            if (this.state.waitText.length > 6) {

                this.setState({waitText : "Wait"});

            }

        }, 1000)

        setTimeout(() => {

            clearInterval(wait_interval);

            this.button.current.style.zIndex = '2';
            this.button.current.style.left = `${window.innerWidth / 2 - this.state.selectedLevel[0]}px`
            this.button.current.style.bottom = `${window.innerHeight / 2 - this.state.selectedLevel[1]}px`        
              
            this.buttonIMG.current.src = '../client/minigames/assets/button_g1.png'

            this.setState({ waitColor : { color : "lightgreen" } });
            this.setState({ waitText : "Go!" });
                
            counter = 0;

            counter_interval = setInterval(() => {

                this.setState({ msCounter : counter + 'ms' });
                counter++;

            }, 1);

        }, this.state.selectedLevel[2]);

        setTimeout(() => {

            if (player.score == null) {

                player.score = 0;
                
            }

        }, 10000)

    }

    onClick() {

        if (!this.state.hasClicked) {

            this.buttonIMG.current.src = '../client/minigames/assets/button_g2.png'

            setTimeout(() => {this.buttonIMG.current.src = '../client/minigames/assets/button_b.png'}, 100);

            clearInterval(counter_interval);

            player.score = maxScore - ((counter - 50) / 20);

            player.score = (counter <= 50) ? 0 : player.score;

            player.score = (player.score <= 0) ? 0 : player.score;

            this.setState({ hasClicked : true });

        }

    }


    render() { 

        const {waitText, msCounter, waitColor} = this.state;

        return (      

        <div className='game_font'>
            { msCounter && <h1 className='center battle_bottom_middle'>{msCounter}</h1>}
            <button ref={this.button} className='center rt_button' onClick={this.onClick}>
                <img draggable={false} ref={this.buttonIMG} src=''></img>
            </button>
            <h1 className='center battle_top' style={waitColor}>{waitText}</h1>
        </div>);
    }
}
 
export default RT;