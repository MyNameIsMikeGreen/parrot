import React from 'react';
import {BrowserRouter, Route, Switch} from "react-router-dom";
import Links from "../body_components/Links";
import Blog from "../body_components/blog";
import BlogPost from "../body_components/blogPost";
import NotFound from "../body_components/NotFound";

export default class BodyRouter extends React.Component {

    render() {
        return (
            <div id="parrot-main-content">
                <BrowserRouter>
                    <Switch>
                        <Route exact path='/' component={Links}/>
                        <Route exact path='/blog' component={Blog}/>
                        <Route exact path='/blog/:title' component={BlogPost}/>
                        <Route path='*' component={NotFound}/>
                    </Switch>
                </BrowserRouter>
            </div>
        );
    }

}
