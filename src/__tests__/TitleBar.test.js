import { render, screen } from '@testing-library/react';
import TitleBar from "../components/TitleBar";

test('name and role link to homepage', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Mike Green Solutions`)).toHaveAttribute("href", "/")
  expect(screen.getByText(`Software Freelancing`)).toHaveAttribute("href", "/")
});

test('blog button links to blog page', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Blog`)).toHaveAttribute("href", "/blog")
});

test('links button links to homepage', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Links`)).toHaveAttribute("href", "/")
});
