import * as React from "react";
import ReactMarkdown from "react-markdown";
import {useParams} from "react-router-dom";

function BlogPost() {
    let {title} = useParams();
    const githubRawBaseUrl = "https://raw.githubusercontent.com/MyNameIsMikeGreen/blog/master/posts/";
    const githubUiBaseUrl = "https://github.com/MyNameIsMikeGreen/blog/blob/master/posts/";
    const [markdown, setMarkdown] = React.useState('Fetching blog post...');

    React.useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(githubRawBaseUrl + title + ".md");
            const text = await response.text();
            setMarkdown(text);
        };
        fetchMarkdown();
    });
    return (
        <div id="parrot-blog-post-wrapper">
            <div id="parrot-blog-post">
                <ReactMarkdown transformImageUri={uri => githubRawBaseUrl + uri}>{markdown}</ReactMarkdown>
            </div>
            <p><a href={githubUiBaseUrl + title + ".md"}>View this on GitHub</a></p>
        </div>
    );
}

export default BlogPost;
