import React, { Component } from 'react';
import Battle from './battle.jsx';
import Game from './game.jsx';
import Menu from './menu.jsx';
import LoadingScreen from './loading_screen.jsx';

class UI extends Component {
    constructor() {
        super();

        window.UIInstance = this;

        this.state = {
          showLoadingScreen: true,
          showMenu: true,
          showGame: false,
          showBattle: false
        };

        this.changeVisibility = this.changeVisibility.bind(this);

    }

    changeVisibility(name) {
        switch (name) {
          case "Battle":
            this.setState({ showBattle: !this.state.showBattle });
            break;
          case "Game":
            this.setState({ showGame: !this.state.showGame });
            break;
          case "LoadingScreen":
            this.setState({ showLoadingScreen: !this.state.showLoadingScreen });
            break;
          case "Menu":
            this.setState({ showMenu: !this.state.showMenu });
            break;
          default:
            null;
        }
      }

    render() { 

        const { showBattle, showGame, showLoadingScreen, showMenu } = this.state;

        return (

        <React.Fragment>
            {showBattle && <Battle />}
            {showGame && <Game />}
            {showMenu && <Menu />}
            {showLoadingScreen && <LoadingScreen />}
        </React.Fragment>);
    }
}
 
export default UI;