import * as React from "react";
import ReactMarkdown from "react-markdown";
import {useParams} from "react-router-dom";

function BlogPost() {
    let { title } = useParams();
    const markdownUrl = "https://raw.githubusercontent.com/MyNameIsMikeGreen/blog/master/posts/" + title + ".md";
    console.log(markdownUrl);
    const [markdown, setMarkdown] = React.useState('');

    React.useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(markdownUrl);
            const text = await response.text();
            console.log(text)
            setMarkdown(text);
        };
        fetchMarkdown();
    });

    return (<ReactMarkdown>{markdown}</ReactMarkdown>);
}

export default BlogPost;