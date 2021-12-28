import {findByText, render, screen} from '@testing-library/react';
import React from "react";
import BlogPost from "../body_components/blogPost";

test('loading message displayed when searching for post', () => {
    render(<BlogPost />);

    expect(screen.getByText("Fetching blog post...")).toBeInTheDocument()
});

test('finds and displays markdown posts', async () => {
    require('jest-fetch-mock').enableMocks()
    const expectedContent = "I am test text";
    fetch.mockResponse(expectedContent);

    render(<BlogPost />);

    const blogText = await findByText(document, expectedContent);
    expect(blogText).toBeInTheDocument()
});


