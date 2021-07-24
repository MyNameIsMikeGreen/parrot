import { render, screen } from '@testing-library/react';
import App from './App';

test('page has title block', () => {
  render(<App />);

  const titleBlock = document.querySelector(".parrot-title-block");

  const nameLabel = titleBlock.childNodes.item(0).firstChild
  expect(nameLabel).toHaveTextContent("Mike Green")

  const jobLabel = titleBlock.childNodes.item(1).firstChild
  expect(jobLabel).toHaveTextContent("Software Engineer")

});

test('all primary links are on page', () => {
  render(<App />);

  expect(screen.getByText("MyNameIsMikeGreen.co.uk (Food Recipes)"))
      .toHaveAttribute("href", "https://MyNameIsMikeGreen.co.uk")

  expect(screen.getByText("GitHub"))
      .toHaveAttribute("href", "https://github.com/MyNameIsMikeGreen")

  expect(screen.getByText("LinkedIn"))
      .toHaveAttribute("href", "https://uk.linkedin.com/in/MyNameIsMikeGreen")
});

test('GitHub link has image', async () => {
  render(<App />);
  expect(await screen.findByAltText("GitHub Logo")).toHaveAttribute("src", "GitHub_Logo.png");
});

test('LinkedIn link has image', async () => {
  render(<App />);
  expect(await screen.findByAltText("LinkedIn Logo")).toHaveAttribute("src", "LinkedIn_Logo.png");
});
