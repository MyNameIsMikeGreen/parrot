import './style.css';
import LandingPage from "./body_components/landingPage";
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import MarkdownPost from "./body_components/markdownPost";
import NotFound from "./body_components/notFound";

function Body() {
  return (
      <Switch> {}
        <Route exact path='/' component={LandingPage}/>
        <Route exact path='/blog' component={MarkdownPost}/>
        <Route path='*' component={NotFound}/>
      </Switch>
  );
}

export default Body;