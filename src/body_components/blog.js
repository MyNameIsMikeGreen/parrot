import * as React from "react";
import axios from 'axios';

function Blog() {

    const [blogPostTitles, setBlogPostTitles] = React.useState([]);

    React.useEffect(() => {
        fetchBlogTitles(setBlogPostTitles)
    }, []);

    if (blogPostTitles.length === 0) {
        return ("Fetching list of blog posts...");
    }

    return (
        <div id="parrot-blog-post-list" data-testid="parrot-blog-post-list">
            <ul>
                {blogPostTitles.map((title, i) =>
                    <li key={i}><a href={"/blog/" + title}>{userReadableTitle(title)}</a></li>
                )}
            </ul>
        </div>
    );

}

function userReadableTitle(originalTitle) {
    return originalTitle.replaceAll("_", " ");
}

async function fetchBlogTitles(setter) {
    const repoTreeUrl = "https://api.github.com/repos/MyNameIsMikeGreen/blog/git/trees/master?recursive=1";
    let titles = [];
    const response = await axios(repoTreeUrl);
    const responseJson = response.data;
    for (let i = 0; i < responseJson.tree.length; i++) {
        if (responseJson.tree[i].path.startsWith("posts/")) {
            titles.push(responseJson.tree[i].path.substring(6, responseJson.tree[i].path.length - 3));
        }
    }
    setter(titles);
}

export default Blog;