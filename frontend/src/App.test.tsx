import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders Pulse heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /pulse/i })).toBeInTheDocument();
});
