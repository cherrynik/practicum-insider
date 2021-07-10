import { render, screen } from "@testing-library/react";
import PracticumInsider from "./PracticumInsider";

test("renders learn react link", () => {
  render(<PracticumInsider />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
