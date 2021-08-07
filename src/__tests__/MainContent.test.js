import { render, screen } from '@testing-library/react';
import Body from '../MainContent';

test('page has title block', () => {
  render(<Body />);

  const titleBlock = document.querySelector("#parrot-title-block");

  const nameLabel = titleBlock.childNodes.item(0).firstChild
  expect(nameLabel).toHaveTextContent("Mike Green")

  const jobLabel = titleBlock.childNodes.item(1).firstChild
  expect(jobLabel).toHaveTextContent("Software Engineer")

});

test('Platypus has outlink', async () => {
  render(<Body />);
  const platypusLogo = await screen.findByAltText("Platypus Logo");
  expect(platypusLogo).toHaveAttribute("src", "Platypus_Logo.png");
  expect(platypusLogo.parentElement).toHaveAttribute("href", "https://MyNameIsMikeGreen.co.uk")

  const platypusMainText = platypusLogo.nextSibling
  expect(platypusMainText).toHaveTextContent("MyNameIsMikeGreen.co.uk");
  expect(platypusMainText.parentElement).toHaveAttribute("href", "https://MyNameIsMikeGreen.co.uk")

  const platypusAdditionalText = platypusMainText.nextSibling;
  expect(platypusAdditionalText).toHaveTextContent("Recipe Server");
  expect(platypusAdditionalText.parentElement).toHaveAttribute("href", "https://MyNameIsMikeGreen.co.uk")

});

test('GitHub has outlink', async () => {
  render(<Body />);
  const githubLogo = await screen.findByAltText("GitHub Logo");
  expect(githubLogo).toHaveAttribute("src", "GitHub_Logo.png");
  expect(githubLogo.parentElement).toHaveAttribute("href", "https://github.com/MyNameIsMikeGreen")

  const githubMainText = githubLogo.nextSibling;
  expect(githubMainText).toHaveTextContent("GitHub");
  expect(githubMainText.parentElement).toHaveAttribute("href", "https://github.com/MyNameIsMikeGreen")

  const githubAdditionalText = githubMainText.nextSibling;
  expect(githubAdditionalText).toHaveTextContent("Software Projects");
  expect(githubAdditionalText.parentElement).toHaveAttribute("href", "https://github.com/MyNameIsMikeGreen")
});

test('LinkedIn has outlink', async () => {
  render(<Body />);
  const linkedinLogo = await screen.findByAltText("LinkedIn Logo")
  expect(linkedinLogo).toHaveAttribute("src", "LinkedIn_Logo.png");
  expect(linkedinLogo.parentElement).toHaveAttribute("href", "https://uk.linkedin.com/in/MyNameIsMikeGreen")

  const linkedinMainText = linkedinLogo.nextSibling;
  expect(linkedinMainText).toHaveTextContent("LinkedIn");
  expect(linkedinMainText.parentElement).toHaveAttribute("href", "https://uk.linkedin.com/in/MyNameIsMikeGreen")

  const linkedinAdditionalText = linkedinMainText.nextSibling;
  expect(linkedinAdditionalText).toHaveTextContent("Networking");
  expect(linkedinAdditionalText.parentElement).toHaveAttribute("href", "https://uk.linkedin.com/in/MyNameIsMikeGreen")
});
