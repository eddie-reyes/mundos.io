import React, {Component} from 'react';
import * as CANNON from 'cannon-es';
import { player, socket, scene, worldBody, menuControls, skybox_b, atmosphereMesh, spawnPos, player_data, generateMass, canPlay} from '../main.js';
var Filter = require('bad-words');

const filter = new Filter();

class Menu extends Component {
    constructor() {
        super();

        this.state = {

            pleaseWait : false

        }

        this.input = React.createRef();

        this.clickPlay = this.clickPlay.bind(this);

    }

    componentDidMount() {

        (window.adsbygoogle = window.adsbygoogle || []).push({});

    }

    clickPlay() {

        if (canPlay) {

            //rest menu camera for win condition
            menuControls.reset();
            menuControls.autoRotateSpeed = 1;

            //set username
            if (this.input.current.value.replace(/\s/g, '').length && !filter.isProfane(this.input.current.value)) { //check if all whitespace or is profanity

                player.username = this.input.current.value;
                player_data.get(socket.id).username = player.username;

            }
            
            //send username to server and local data
            socket.emit("update_username", player.username);

            //spawn player
            player.playerBody.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
            scene.add(player.playerMesh);
            scene.add(player.dirIndicator);
            player.dirIndicator.material.depthTest = false;
            player.localPhysics.addBody(worldBody);
            player.localPhysics.addBody(player.playerBody);
            player.playerBody.type = CANNON.Body.DYNAMIC;
            
            //change background
            scene.background = skybox_b;
            scene.remove(atmosphereMesh);

            //enable game loop
            player.isPlaying = true;

            //change ui
            window.UIInstance.changeVisibility("Menu");
            window.UIInstance.changeVisibility("Game");

            //for testing
            //generateMass(player, 300, true);
        
        } else {

            this.setState({ pleaseWait : true });

        }

    }

    render() { 

        const {pleaseWait} = this.state;

        return (
        <div>

            <img className="menu logo" src="../client/UI/logo.png" alt="Mundos.io Logo"></img>
            <img className="menu menu_bottom" src="../client/UI/menu_bottom.png" alt="Menu Bottom" draggable={false}></img>
            <input className="menu input_user" ref={this.input} type="text" minLength="1" maxLength="14" placeholder="Nickname"></input>
            <button className="menu button play_button" type="button" onClick={this.clickPlay}>
                <img src="../client/UI/play_button_overlay.png" alt="Play Button Overlay" draggable={false}></img>
            </button>
            {pleaseWait && <h1 className='game_font menu menu_bottom' style={{bottom : "120px"}}>Please Wait..</h1>}
            <h1 className='game_font menu_br'>v0.1</h1>
            <p className="game_font menu_tr">
                <span style={{ fontSize : "150%" }}>Welcome to the mundos.io Alpha!</span><br>
                </br>Please report all bugs and feature<br>
                </br>requests to our discord.<br>
                </br>
                    <button className='button' onClick={() => {location.href="https://discord.gg/yed3s8KRCj"}} style={{width : "60px", height : "80px"}}>
                        <img src="../client/UI/discord.png"></img>
                    </button> 
            </p>
            <button className='button' onClick={() => {location.href="mailto:mundos.contact@gmail.com"}}>
                <h1 className='game_font menu_tl'>Contact</h1>
            </button>       
            <button className='button'>
                <h1 className='game_font menu_tl' style={{left : "100px"}} onClick={() => {location.href="https://simplyputgames.com/privacypolicy/"}}>Privacy Policy</h1>
            </button>

            <ins className="adsbygoogle"
                style={{ display : "inline-block", marginTop : "170px", width : "200px", height : "600px", float : "left"}}
                data-ad-client="ca-pub-5871103362092998"
                data-ad-slot="5017659161"
                data-ad-format="vertical"
                data-full-width-responsive="true">
            </ins>

            <ins className="adsbygoogle"
                style={{ display : "inline-block",  marginTop : "170px", width : "200px", height : "600px", float: "right"}}
                data-ad-client="ca-pub-5871103362092998"
                data-ad-slot="8730777113"
                data-ad-format="vertical"
                data-full-width-responsive="true">
            </ins>

            <img className="menu menu_bottom htp" src="../client/UI/htp.png" alt="How to Play" draggable={false} style={{right : "1200px", bottom : "-390px"}}></img>
            
        </div>);
    }
}
 
export default Menu;