import * as React from "react";
import {render} from "react-dom";
import ReactMarkdown from "react-markdown";

function BlogPost() {
    const markdownUrl = "https://raw.githubusercontent.com/MyNameIsMikeGreen/tech-notes/master/how-tos/Hosting_a_React_app_with_Cloudflare_Pages.md";
    const [markdown, setMarkdown] = React.useState('');

    React.useEffect(() => {
        const fetchMarkdown = async () => {
            const response = await fetch(markdownUrl);
            const text = await response.text();
            setMarkdown(text);

            console.log({ text, response });
        };

        fetchMarkdown();
    });

    return render(<ReactMarkdown>{markdown}</ReactMarkdown>, document.body);
}

export default BlogPost;