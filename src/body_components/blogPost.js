import * as React from "react";
import ReactMarkdown from "react-markdown";
import {useParams} from "react-router-dom";

function BlogPost() {
    let { title } = useParams();
    // Hosting_a_React_app_with_Cloudflare_Pages
    const markdownUrl = "https://raw.githubusercontent.com/MyNameIsMikeGreen/tech-notes/master/how-tos/" + title + ".md";
    const [markdown, setMarkdown] = React.useState('');

    React.useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(markdownUrl);
            const text = await response.text();
            setMarkdown(text);
        };
        fetchMarkdown();
    });

    return (<ReactMarkdown>{markdown}</ReactMarkdown>);
}

export default BlogPost;