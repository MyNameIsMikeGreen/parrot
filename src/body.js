import './style.css';
import LandingPage from "./body_components/landingPage";
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import BlogPost from "./body_components/blogPost";
import NotFound from "./body_components/notFound";
import Blog from "./body_components/blog";

function Body() {
  return (
      <Switch>
        <Route exact path='/' component={LandingPage}/>
        <Route exact path='/blog' component={Blog}/>
        <Route exact path='/blog/*' component={BlogPost}/>
        <Route path='*' component={NotFound}/>
      </Switch>
  );
}

export default Body;