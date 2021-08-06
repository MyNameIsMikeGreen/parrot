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
        <ul>
            {blogPostTitles.map((item, i) =>
                <li key={i}>{item}</li>
            )}
        </ul>
    );

}

async function fetchBlogTitles(setter) {
    const repoTreeUrl = "https://api.github.com/repos/MyNameIsMikeGreen/tech-notes/git/trees/master?recursive=1";
    let titles = [];
    const response = await axios(repoTreeUrl);
    const responseJson = response.data;
    console.log(responseJson);
    for (let i = 0; i < responseJson.tree.length; i++) {
        if (responseJson.tree[i].path.startsWith("how-tos/")) {
            titles.push(responseJson.tree[i].path.substring(8, responseJson.tree[i].path.length - 3));
        }
    }
    setter(titles);
}

export default Blog;