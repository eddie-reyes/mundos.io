import React, { Component } from 'react';
import { randInt } from 'three/src/math/mathutils';
import { player, attacker, socket, scene, repelFromOpponent, minigame} from '../main.js';

import GTM from '../minigames/GTM.jsx';
import RT from '../minigames/ReactionTimes.jsx';
import TTS from '../minigames/TTS.jsx';
import FB from '../minigames/FlappyBird.jsx';
import KIU from '../minigames/KIU.jsx';
import Golf from '../minigames/Golf.jsx';
import Swish from '../minigames/Swish.jsx'
import Tanks from '../minigames/Tanks.jsx';
import Ricochet from '../minigames/Ricochet.jsx';
import IT from '../minigames/IT.jsx';

import * as CANNON from 'cannon-es';

const games = ['Guess Their Mass', 'Reaction Times', 'Trace The Shape', 'Flappy Bird', 'Keep It Up', 'Golf', 'Swish', 'Tanks', 'Ricochet', 'Icy Tower'];

let mg = document.getElementById("mg");
let mg_p = document.getElementById("mg_p");

//test params => InEvadePhase = false, comment out playerName, opponentName, and getEvadeChance call. change battle screen visibility in main.

class Battle extends Component {
    constructor() {
        super();

        window.Battle = this;
        this.gif = React.createRef();

        this.state = { 
            playerName : player.username,
            opponentName : attacker.username,
            evadeChance : 0,
            evadeColor : { color : 'white' },
            canEvade : true,
            inEvadePhase : true,
            selectedGame : minigame,
            timer_bar_width : "700px",
            timer_bar_h : 5,
            battle_length : 10000,
            failedText : "Failed!",
            showGTM : false,
            showRT : false,
            showTTS : false,
            showFB : false,
            showKIU : false,
            showGolf : false,
            showSwish : false,
            showTanks : false,
            showRicochet : false,
            showIT : false
        };

        this.onEnd = this.onEnd.bind(this);

        this.animateTimer = this.animateTimer.bind(this);
    }

    componentWillUnmount() {

        setTimeout(() => {player.score = null}, 1000);

        mg.style.zIndex = "-1";
        mg_p.style.zIndex = "-1";

        if (this.state.inEvadePhase) {this.gif.current.src = "../client/UI/battle_timer.gif"} //resets timer gif if evaded

    }

    componentDidMount() {

        this.getEvadeChance(player.mass, attacker.mass);

        this.setTimer(this.state.selectedGame);

        (window.adsbygoogle = window.adsbygoogle || []).push({});

        //for testing
        //document.getElementById("mg_p").style.zIndex = "1";

        player.battle_timer = setTimeout(() => {

            mg.style.zIndex = "1";
            mg_p.style.zIndex = "1";
        
            this.setState({inEvadePhase : false});

            this.animateTimer();

            this.gif.current.src = "../client/UI/battle_timer.gif"; //resets timer gif on battle end
            
            switch (this.state.selectedGame) {

                case 0 :

                    this.setState({showGTM : true});
                    break;

                case 1 :

                    this.setState({showRT : true});
                    break;

                case 2 :

                    this.setState({showTTS : true});
                    break;

                case 3 :

                    this.setState({showFB : true});
                    break;

                case 4 :

                    this.setState({showKIU : true});
                    break;

                case 5 :

                    this.setState({showGolf : true});
                    break;

                case 6 :

                    this.setState({showSwish: true});
                    break;

                case 7 :

                    this.setState({showTanks: true});
                    break;

                case 8 :

                    this.setState({showRicochet: true});
                    break;

                case 9:

                    this.setState({showIT: true});
                    break;

            }

            setTimeout(() => {

                if (typeof player.score != "number") {

                    socket.emit("send_score", attacker.id, 0);
                    
                }

                socket.emit("send_score", attacker.id, player.score);
            
            }, this.state.battle_length + 100); //ensure event fires after score calculation
            
        }, 5000);

    }

    onEnd(isEvading, isDraw) {

        let evaded = (randInt(1, 100) <= this.state.evadeChance) ? true : false;


        if (evaded || !isEvading) {

            window.Game.showEndMsg(null, "evade", this.state.opponentName, true)

            socket.emit("change_battle_state", attacker.id, "end");

            clearTimeout(player.battle_timer);

            player.playerBody.type = CANNON.Body.DYNAMIC;
            player.playerBody.collisionFilterGroup = 3;
            
            scene.add(attacker.label);

            repelFromOpponent(player.playerMesh.position, attacker.playerMesh.position, 10);

            setTimeout(function() {

                attacker.playerBody.collisionFilterGroup = 3;
                if (!attacker.PU1) {scene.remove(attacker.battleMesh)}
                if (!player.PU1) {scene.remove(player.battleMesh)}
                player.inBattle = false;

            }, 3000)

            if (!isDraw) {

                window.UIInstance.changeVisibility("Battle");

            }

        } else {

            this.setState({ canEvade : false });
            
        }

    }

    animateTimer() {

        let width = 30;
        this.setState({ timer_bar_width : "30%"});

        let bar_interval = setInterval(() => {

            if (width <= 0) {
      
                clearInterval(bar_interval);
                this.setState({ timer_bar_width : "0%"});
        
            } else {
        
                width -= 0.03 / (this.state.battle_length * 0.0001);
                this.setState({ timer_bar_width : width + '%'});
        
            }

        }, 10);

        let time = this.state.battle_length * 0.001;

        let h_interval = setInterval(() => {
            
            if (time <= 0) {

                clearInterval(h_interval);

            } else {

                time -= 1;
                this.setState({ timer_bar_h : time });

            }

        }, 1000) ;

    }

    getEvadeChance(a, b) {


        let chance = Math.log10((a / b) + 1.0) * 100; 

        chance = (chance > 100) ? 100 : Math.floor(chance);

        if (attacker.PU1) {

            this.setState({ canEvade : false });
            this.setState({ failedText : "Can't Evade"});

        }
        
        this.setState({evadeChance : chance});
        this.setState({evadeColor : { color : `hsl(${chance}, 100%, 50%)` }});

    }

    setTimer(minigame) {

        switch(minigame) {

            case 0 :

                this.setState({ battle_length : 10000, timer_bar_h : 10});
                break;

            case 1 :

                this.setState({ battle_length : 10000, timer_bar_h : 10});
                break;    

            case 2 :

                this.setState({ battle_length : 10000, timer_bar_h : 10});
                break;   
                
            case 3 :

                this.setState({ battle_length : 15000, timer_bar_h : 15});
                break;    

            case 4 :

                this.setState({ battle_length : 20000, timer_bar_h : 20});
                break;

            case 5 :

                this.setState({ battle_length : 20000, timer_bar_h : 20});
                break;

            case 6 :

                this.setState({ battle_length : 20000, timer_bar_h : 20});
                break;

            case 7 :

                this.setState({ battle_length : 30000, timer_bar_h : 30});
                break;
            
            case 8 :

                this.setState({ battle_length : 20000, timer_bar_h : 20});
                break;

            case 9 :

                this.setState({ battle_length : 25000, timer_bar_h : 25});
                break;

        }

    }

    render() {
        
        const {playerName, opponentName, evadeChance, evadeColor, canEvade, inEvadePhase, selectedGame, timer_bar_width, timer_bar_h, failedText, showGTM, showRT, showTTS, showFB, showKIU, showGolf, showSwish, showTanks, showRicochet, showIT} = this.state;

        return (
        <div className='game_font'>
            
            <div className='center bg b_bg'></div>
            {inEvadePhase && <p className='center battle_top '><span className='battle_s'>{playerName}</span> vs. <span className='battle_s'>{opponentName}</span></p>}
            {inEvadePhase && <img className='center' src="../client/UI/battle_frame.png" alt="Battle Frame"></img>}
            {inEvadePhase && <h1 className='center battle_g'>{games[selectedGame]}</h1>}
            {inEvadePhase && !canEvade && <h1 className='center e_failed'>{failedText}</h1>}
            {inEvadePhase && canEvade && <button className="center button battle_e" type="button" onClick={this.onEnd}>
                <img src="../client/UI/evade_button_overlay.png" alt="Evade Button"></img>
            </button>}
            {inEvadePhase && canEvade && <p className='center e_chance' style={evadeColor} >{evadeChance}%</p>}
            {inEvadePhase && <img ref={this.gif} className="center battle_timer_top" src="../client/UI/battle_timer.gif" alt="Battle Timer"></img>}  
            {!inEvadePhase && <h1 className="center battle_timer_h">{timer_bar_h}</h1>}
            {!inEvadePhase && <div className="center battle_timer_b" style={{ width : timer_bar_width }}></div>}

            {showGTM && <GTM />}
            {showRT && <RT />}
            {showTTS && <TTS />}
            {showFB && <FB />}
            {showKIU && <KIU />}
            {showGolf && <Golf />}
            {showSwish && <Swish />}
            {showTanks && <Tanks />}
            {showRicochet && <Ricochet />}
            {showIT && <IT />}

            <ins className="adsbygoogle menu"
                style={{ display : "block", bottom : "0px"}}
                data-ad-client="ca-pub-5871103362092998"
                data-ad-slot="4451345661"
                data-ad-format="horizontal"
                data-full-width-responsive="true">
            </ins>

        </div>);
    }
}

export default Battle;