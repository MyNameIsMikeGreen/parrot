import * as React from "react";
import axios from 'axios';

/*
function App() {
      const result = await axios(
        `http://hn.algolia.com/api/v1/search?query=${query}`,
      );

      setData(result.data);
    };

    fetchData();
  }, []);

  return (
    ...
  );
}

export default App;
 */

function Blog() {

    const [blogPostTitles, setBlogPostTitles] = React.useState([]);
    const repoTreeUrl = "https://api.github.com/repos/MyNameIsMikeGreen/tech-notes/git/trees/master?recursive=1";

    React.useEffect(() => {
        const fetchData = async () => {
            let titles = [];
            const response = await axios(repoTreeUrl);
            const responseJson = response.data;
            console.log(responseJson);
            for (let i = 0; i < responseJson.tree.length; i++) {
                if (responseJson.tree[i].path.startsWith("how-tos/")) {
                    titles.push(responseJson.tree[i].path.substring(8, responseJson.tree[i].path.length - 3));
                }
            }
            setBlogPostTitles(titles);
        };
        fetchData();
    }, []);

    if (blogPostTitles.length === 0) {
        return ("Problem fetching list of blog posts. Try again later.");
    }

    return (
        <ul>
            {blogPostTitles.map((item, i) =>
                <li key={i}>item</li>
            )}
        </ul>
    );

}

async function fetchBlogTitles() {
    const repoTreeUrl = "https://api.github.com/repos/MyNameIsMikeGreen/tech-notes/git/trees/master?recursive=1";
    let blogPostTitles = [];
    fetch(repoTreeUrl).then(response => {
        response.json().then(responseJson => {
            console.log(responseJson);
            for (let i = 0; i < responseJson.tree.length; i++) {
                if (responseJson.tree[i].path.startsWith("how-tos/")) {
                    blogPostTitles.push(responseJson.tree[i].path.substring(8, responseJson.tree[i].path.length - 3));
                }
            }
            console.log(blogPostTitles);
        });
    });

    return blogPostTitles;
}

export default Blog;