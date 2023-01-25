import * as React from "react";
import axios from 'axios';

const BLOG_REPO_TREE_URL = "https://api.github.com/repos/MyNameIsMikeGreen/blog/git/trees/master?recursive=1";

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
    return originalTitle.replace(/_/g, " ");
}

function isFileInPostsFolder(treeElement) {
    return treeElement.path.startsWith("posts/")
        && treeElement.path.split("/").length === 2
        && treeElement.type === "blob";
}

async function fetchBlogTitles(setter) {
    let titles = [];
    const response = await axios(BLOG_REPO_TREE_URL);
    const responseJson = response.data;
    for (let i = 0; i < responseJson.tree.length; i++) {
        let treeElement = responseJson.tree[i]
        if (isFileInPostsFolder(treeElement)) {
            let filePath = treeElement.path;
            titles.push(filePath.substring(6, filePath.length - 3));
        }
    }
    setter(titles);
}

export default Blog;
