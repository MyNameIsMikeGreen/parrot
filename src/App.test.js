import { render, screen } from '@testing-library/react';
import App from './App';

test('page has title block', () => {
  render(<App />);

  const nameLabel = screen.getByText("Mike Green");
  expect(nameLabel).toBeInTheDocument();

  const jobLabel = nameLabel.nextSibling;
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
