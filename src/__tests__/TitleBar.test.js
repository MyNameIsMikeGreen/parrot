import { render, screen } from '@testing-library/react';
import TitleBar from "../titleBar";

test('name and role link to homepage', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Mike Green`)).toHaveAttribute("href", "/")
  expect(screen.getByText(`Software Engineer`)).toHaveAttribute("href", "/")
});

test('blog button links to blog page', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Blog`)).toHaveAttribute("href", "/blog")
});

test('links button links to homepage', () => {
  render(<TitleBar />);
  expect(screen.getByText(`Links`)).toHaveAttribute("href", "/")
});
