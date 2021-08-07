import * as React from "react";
import ReactMarkdown from "react-markdown";
import {useParams} from "react-router-dom";

function BlogPost() {
    let { title } = useParams();
    const markdownUrl = "https://raw.githubusercontent.com/MyNameIsMikeGreen/blog/master/posts/" + title + ".md";
    const [markdown, setMarkdown] = React.useState('Fetching blog post...');

    React.useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(markdownUrl);
            const text = await response.text();
            setMarkdown(text);
        };
        fetchMarkdown();
    });

    return (
        <div id="parrot-blog-post">
            <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
    );
}

export default BlogPost;