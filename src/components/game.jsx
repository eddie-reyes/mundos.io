import React, { Component } from 'react';
import { player_data, player } from '../main.js';

let win_interval;
let boost_interval;

class Game extends Component {
    constructor() {
        super();

        window.Game = this;

        this.state = { 
            data : Array.from(player_data.values()),
            mass : player.mass,
            boostWidth : 0,
            boostHeight : 80,
            endMsg : 0,
            endMsgColor : { color : "lime" },
            showDebrief : false,
            score1 : null,
            score2 : null,
            showWin : false,
            winner : '',
            winTimer : 0,
            topMass : 0,
            topColor : { color : "white" },
            showPU1 : false
        };
    }

    componentDidMount() {

        this.setLeaderboard();

    }

    setLeaderboard() {
        
        let sorted_arr = Array.from(player_data.values());
        sorted_arr.sort((a, b) => (a.mass >= b.mass) ? 1 : -1);
        sorted_arr.reverse();
        sorted_arr.slice(0, 10);

        this.setState({data : sorted_arr});
        this.setState({mass : player.mass});
        this.setState({topMass : sorted_arr[0].mass});
        this.setState({topColor : { color : `hsl(${this.state.topMass / 5}, 100%, 50%)` }});
        
    }

    showEndMsg(mass, type, attackerName, isEvader) {

        switch (type) {

            case "win": 

                this.setState({ endMsgColor : { color : "lime" }});
                this.setState({ endMsg : "+" + mass });
                break;

            case "lose":
                
                this.setState({ endMsgColor : { color : "red" }});
                this.setState({ endMsg : "-" + mass });
                break;

            case "draw":

                this.setState({ endMsgColor : { color : "yellow" }});
                this.setState({ endMsg : "Draw" });
                break;
                
            case "evade":

                if (isEvader) {

                    this.setState({ endMsgColor : { color : "lightblue" }});
                    this.setState({ endMsg : "Evaded Successfully" });    
                         
                } else {

                    this.setState({ endMsgColor : { color : "red" }});
                    this.setState({ endMsg : attackerName + " Evaded!" });

                }

                break;
                
        }


        setTimeout(() => {
            
            this.setState({ endMsg : 0 });

        }, 2000)


    }

    showDebrief(a, b) {

        this.setState({ score1 : a.toFixed(1) });
        this.setState({ score2 : b.toFixed(1) });
        this.setState({ showDebrief : true });

        setTimeout(() => {
            
            this.setState({ showDebrief : false });

        }, 4000)


    }

    boostBar(type, offset) {

        switch(type) {

            case 'animate':

                let width = 5;

                boost_interval = setInterval(() => {

                    if (width <= 0 || window.UIInstance.state.showBattle) {
            
                        clearInterval(boost_interval);
                        this.setState({ boostWidth : 0 });
                
                    } else {
                
                        width -= 0.010;
                        this.setState({ boostWidth : width + '%'});
                
                    }

                }, 10);
                break;

            case 'adjust':

                this.setState({ boostHeight : this.state.boostHeight + offset});
            
        }    

    }

    showPU1() {

        this.setState({ showPU1 : true});
        setTimeout(() => {this.setState({ showPU1 : false})}, 4000);

    }
    
    onWin(name) {

        this.setState({ winner : name })
        this.setState({ showWin : true })


        setTimeout(() => {

            clearInterval(win_interval);
            this.setState({ showWin : false });
            this.setState({ winTimer : 0 });

        }, 15000)

        setTimeout(() => {

            this.setState({ winTimer : 5 });
            win_interval = setInterval(() => {this.setState({winTimer : this.state.winTimer - 1})}, 1000);

        }, 10000)

    } 

    render() { 

        const { data, mass, endMsg, endMsgColor, boostWidth, boostHeight, showDebrief, score1, score2, showWin, winner, winTimer, topMass, topColor, showPU1} = this.state;

        return (
        <div className='game_font'>

            {endMsg && <h1 className='center mass_change' style={endMsgColor}>{endMsg}</h1>}

            <div className='leaderboard'>
                <div className='bg lb_bg'></div>
                <h1 className='lb_header'>Leaderboard</h1>
                <ol className='lb_list' type='1'>
                    {data.map((entry) => <li key={data.indexOf(entry)}>{entry.username}</li>)}
                </ol>
                <h1 className='lb_top' style={topColor}>{topMass}→ </h1>
            </div>

            <div className='score'>
                <h1 className='s_header'>Mass:</h1>
                <h1 className='s_mass'>{mass}</h1>
                <div className='bg s_bg'></div>
            </div> 

            {boostWidth && <div className="center boost_bar" style={{width : boostWidth, transform : `translate(-50%, ${boostHeight}px)`}}></div>}

            {showDebrief && <div className='debrief menu'>
                <div className='bg d_bg menu'></div>
                <h1 className='d_h'>Your Score:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Their Score:</h1>
                <h1 className='d_s'>{score1}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{score2}</h1>
            </div>}

            {showWin && <div className="win menu">
                <h1>{winner} is the winner!</h1>
            </div>}

            {winTimer && <h1 className='menu d_s'>Game resetting in {winTimer}...</h1>}

            {showPU1 && <h1 className="menu PU">You have acquired an <span style={{ color : "yellow"}}>Anti-Evade</span> powerup!</h1>}

        </div>);
    }
}
  
export default Game;