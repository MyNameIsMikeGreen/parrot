import {findByText, render, screen} from '@testing-library/react';
import {MemoryRouter, Route} from "react-router-dom";
import React from "react";
import BlogPost from "../body_components/blogPost";

test('loading message displayed when searching for post', () => {
    render(
        <MemoryRouter initialEntries={["/blog/My_Test_Post"]}>
            <Route exact path='/blog/:title' component={BlogPost}/>
        </MemoryRouter>,
    );

    expect(screen.getByText("Fetching blog post...")).toBeInTheDocument()
});

test('finds and displays markdown posts', async () => {
    require('jest-fetch-mock').enableMocks()
    const expectedContent = "I am test text";
    fetch.mockResponse(expectedContent);

    render(
        <MemoryRouter initialEntries={["/blog/My_Test_Post"]}>
            <Route exact path='/blog/:title' component={BlogPost}/>
        </MemoryRouter>,
    );

    const blogText = await findByText(document, expectedContent);
    expect(blogText).toBeInTheDocument()
});


