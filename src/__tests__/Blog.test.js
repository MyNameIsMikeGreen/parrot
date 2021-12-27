import {findByTestId, render, screen} from '@testing-library/react';
import Blog from "../body_components/blog";

test('loading message displayed when searching for posts', () => {
    render(<Blog/>);

    expect(screen.getByText("Fetching list of blog posts...")).toBeInTheDocument()
});

test('contains list of links to GitHub blog repo once searching has completed', async () => {
    render(<Blog/>);

    // TODO: Mock the HTTP response
    const blogPostListDiv = await findByTestId(document, "parrot-blog-post-list");
    expect(blogPostListDiv.children.length).toBeGreaterThan(0);

    for (let i = 0; i < blogPostListDiv.children.length; i++) {
        const blogPostLink = blogPostListDiv.children[i].firstChild.firstChild;
        expect(blogPostLink).toHaveAttribute("href", expect.stringMatching(/^\/blog\/[A-Za-z|_\-()]+$/))
    }

});

