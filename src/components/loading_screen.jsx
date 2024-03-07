import React, {Component} from 'react';

class LoadingScreen extends Component {
    state = {  } 
    render() { 
        return (
        <div>
            <div className="loading_screen"></div>
            <img className="center" style={{zIndex : "2", transform : "translate(-50%, -350px)"}} src="../client/UI/loading_anim.gif" alt="Loading Animation"></img>  
        </div>);
    }
}
 
export default LoadingScreen;