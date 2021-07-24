import { render, screen } from '@testing-library/react';
import Footer from "../Footer";

test('contains copyright block extending to current year', () => {
  render(<Footer />);
  const currentYear = new Date().getFullYear()
  expect(screen.getByText(`© Copyright 2020-${currentYear} Mike Green`)).toBeInTheDocument()
});
